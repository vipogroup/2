/**
 * API Route: /api/tenants
 * ניהול עסקים (tenants) - רק Super Admin
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { isSuperAdmin } from '@/lib/tenant';
import { ObjectId } from 'mongodb';
import { hashPassword } from '@/lib/auth/hash';
import { syncTenantUpsert } from '@/lib/tenantSync';
import { isAutomationRequest } from '@/lib/automationKey';

const FALLBACK_TENANTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-tenants.json');

function toFallbackTenant(tenant = {}) {
  const stats = tenant?.stats || {};
  return {
    ...tenant,
    _id: tenant?._id?.toString?.() ?? String(tenant?._id || '').trim(),
    stats: {
      totalSales: Number(stats.totalSales || 0),
      totalOrders: Number(stats.totalOrders || 0),
      totalProducts: Number(stats.totalProducts || 0),
      totalUsers: Number(stats.totalUsers || 0),
      totalAgents: Number(stats.totalAgents || 0),
      totalCustomers: Number(stats.totalCustomers || 0),
    },
    admin: null,
  };
}

async function loadFallbackTenants() {
  try {
    const raw = await fs.readFile(FALLBACK_TENANTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((tenant) => toFallbackTenant(tenant))
      .filter((tenant) => tenant._id && tenant.name);
  } catch (error) {
    console.warn('TENANTS_FALLBACK_LOAD_FAILED', error?.message || error);
    return [];
  }
}

async function buildFallbackTenantsResponse(reason = 'db_unavailable') {
  const tenants = await loadFallbackTenants();

  return NextResponse.json(
    {
      ok: true,
      tenants,
      total: tenants.length,
      dataMode: 'fallback',
      fallback: {
        reason,
        message: 'Database unavailable. Returning fallback tenants list.',
      },
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-data-mode': 'fallback',
        'x-vipo-fallback': 'true',
        'x-vipo-fallback-reason': reason,
      },
    },
  );
}

/**
 * GET /api/tenants - קבלת רשימת כל העסקים
 * רק Super Admin יכול לראות את כל העסקים
 */
async function GETHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    
    // Only super admin can list all tenants
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'אין הרשאה לצפות בעסקים' },
        { status: 403 }
      );
    }
    
    let db = null;
    try {
      db = await getDb();
    } catch (dbError) {
      if (isDbUnavailableError(dbError)) {
        return buildFallbackTenantsResponse('db_unavailable');
      }
      throw dbError;
    }

    if (!db) {
      return buildFallbackTenantsResponse('db_unavailable');
    }
    const { searchParams } = new URL(request.url);
    
    // Build query
    const query = {};
    const status = searchParams.get('status');
    if (status) {
      query.status = status;
    }
    
    const tenants = await db.collection('tenants')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    // Calculate stats and get admin info for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [ordersCount, usersCount, productsCount, adminUser] = await Promise.all([
          db.collection('orders').countDocuments({ tenantId: tenant._id }),
          db.collection('users').countDocuments({ tenantId: tenant._id }),
          db.collection('products').countDocuments({ tenantId: tenant._id }),
          db.collection('users').findOne(
            { tenantId: tenant._id, role: 'business_admin' },
            { projection: { _id: 1, fullName: 1, email: 1, phone: 1 } }
          ),
        ]);
        
        return {
          ...tenant,
          stats: {
            ...tenant.stats,
            totalOrders: ordersCount,
            totalUsers: usersCount,
            totalProducts: productsCount,
          },
          admin: adminUser ? {
            _id: adminUser._id,
            fullName: adminUser.fullName || '',
            email: adminUser.email || '',
            phone: adminUser.phone || '',
          } : null,
        };
      })
    );
    
    return NextResponse.json({
      ok: true,
      tenants: tenantsWithStats,
      total: tenantsWithStats.length,
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return buildFallbackTenantsResponse('db_unavailable');
    }
    console.error('GET /api/tenants error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה בטעינת העסקים' },
      { status: error.message?.includes('הרשאה') ? 403 : 500 }
    );
  }
}

/**
 * POST /api/tenants - יצירת עסק חדש
 * רק Super Admin יכול ליצור עסקים
 */
async function POSTHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user;
    
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'אין הרשאה ליצור עסקים' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      name, slug, domain, subdomain, ownerId, platformCommissionRate = 5, status = 'pending',
      // Contact fields
      contactAddress, contactWhatsapp,
      // Admin fields for creating admin with tenant
      createAdmin, adminName, adminEmail, adminPhone, adminPassword
    } = body;

    const normalizedDomain = typeof domain === 'string' ? domain.trim().toLowerCase() : '';
    const normalizedSubdomain = typeof subdomain === 'string' ? subdomain.trim().toLowerCase() : '';
    
    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'שם ו-slug הם שדות חובה' },
        { status: 400 }
      );
    }

    // Validate admin fields if creating admin
    if (createAdmin) {
      if (!adminName || !adminEmail || !adminPassword) {
        return NextResponse.json(
          { error: 'יש למלא שם, מייל וסיסמה למנהל העסק' },
          { status: 400 }
        );
      }
      if (adminPassword.length < 8) {
        return NextResponse.json(
          { error: 'הסיסמה חייבת להכיל לפחות 8 תווים, מספר אחד ואות אחת' },
          { status: 400 }
        );
      }
      if (!/\d/.test(adminPassword)) {
        return NextResponse.json(
          { error: 'הסיסמה חייבת להכיל לפחות מספר אחד' },
          { status: 400 }
        );
      }
      if (!/[a-zA-Zא-ת]/.test(adminPassword)) {
        return NextResponse.json(
          { error: 'הסיסמה חייבת להכיל לפחות אות אחת' },
          { status: 400 }
        );
      }
    }
    
    const db = await getDb();

    // Check if admin email already exists
    if (createAdmin && adminEmail) {
      const existingUser = await db.collection('users').findOne({ email: adminEmail.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: 'כתובת המייל כבר קיימת במערכת' },
          { status: 400 }
        );
      }
    }
    
    // Check for duplicate slug
    const existingSlug = await db.collection('tenants').findOne({ slug: slug.toLowerCase() });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'קיים כבר עסק עם slug זהה' },
        { status: 400 }
      );
    }
    
    // Check for duplicate domain/subdomain
    if (normalizedDomain) {
      const existingDomain = await db.collection('tenants').findOne({ domain: normalizedDomain });
      if (existingDomain) {
        return NextResponse.json(
          { error: 'קיים כבר עסק עם דומיין זהה' },
          { status: 400 }
        );
      }
    }
    
    if (normalizedSubdomain) {
      const existingSubdomain = await db.collection('tenants').findOne({ subdomain: normalizedSubdomain });
      if (existingSubdomain) {
        return NextResponse.json(
          { error: 'קיים כבר עסק עם subdomain זהה' },
          { status: 400 }
        );
      }
    }
    
    // Create tenant
    const newTenant = {
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      ownerId: ownerId ? new ObjectId(ownerId) : null,
      status: status || 'pending',
      platformCommissionRate: Math.min(100, Math.max(0, platformCommissionRate)),
      allowedMenus: [],
      allowedMenusConfigured: true,
      branding: {
        logo: null,
        favicon: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#10B981',
      },
      contact: {
        email: adminEmail ? adminEmail.toLowerCase().trim() : null,
        phone: adminPhone ? adminPhone.trim() : null,
        whatsapp: contactWhatsapp ? contactWhatsapp.trim() : (adminPhone ? adminPhone.trim() : null),
        address: contactAddress ? contactAddress.trim() : null,
      },
      social: {},
      seo: {},
      features: {
        registration: true,
        groupPurchase: true,
        notifications: true,
        darkMode: false,
        agentSystem: true,
        coupons: true,
      },
      agentSettings: {
        defaultCommissionPercent: 12,
        defaultDiscountPercent: 10,
        commissionHoldDays: 30,
        groupPurchaseHoldDays: 100,
      },
      billing: {
        pendingBalance: 0,
        totalPaid: 0,
        lastPaymentAt: null,
        paymentMethod: null,
        bankDetails: {},
      },
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalAgents: 0,
        totalCustomers: 0,
      },
      createdAt: new Date(),
      createdBy: user._id,
    };

    if (normalizedDomain) {
      newTenant.domain = normalizedDomain;
    }
    if (normalizedSubdomain) {
      newTenant.subdomain = normalizedSubdomain;
    }
    
    const result = await db.collection('tenants').insertOne(newTenant);
    const tenantId = result.insertedId;
    
    // If ownerId provided, update user to be business_admin
    if (ownerId) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(ownerId) },
        { 
          $set: { 
            tenantId: tenantId,
            role: 'admin',
          } 
        }
      );
    }

    // Create admin user if requested
    let createdAdmin = null;
    if (createAdmin && adminEmail && adminPassword) {
      const hashedPassword = await hashPassword(adminPassword);
      
      const newAdmin = {
        fullName: adminName.trim(),
        email: adminEmail.toLowerCase().trim(),
        phone: adminPhone ? adminPhone.trim() : null,
        password: hashedPassword,
        role: 'business_admin',
        tenantId: tenantId,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        createdBy: user._id,
      };
      
      const adminResult = await db.collection('users').insertOne(newAdmin);
      createdAdmin = { ...newAdmin, _id: adminResult.insertedId };
      delete createdAdmin.password;

      // Update tenant with ownerId
      await db.collection('tenants').updateOne(
        { _id: tenantId },
        { $set: { ownerId: adminResult.insertedId } }
      );
    }

    let sync = null;
    const shouldAwaitSync = isAutomationRequest(request);
    if (shouldAwaitSync) {
      sync = await syncTenantUpsert({ tenant: { ...newTenant, _id: tenantId } }).catch((err) => ({
        ok: false,
        error: err?.message || String(err),
      }));
    } else {
      syncTenantUpsert({ tenant: { ...newTenant, _id: tenantId } }).catch((err) => {
        console.warn('TENANT_SYNC_UPSERT_FAILED', err?.message || err);
      });
    }
    
    return NextResponse.json({
      ok: true,
      tenant: { ...newTenant, _id: tenantId },
      admin: createdAdmin,
      ...(sync ? { sync } : {}),
      message: createAdmin ? 'העסק והמנהל נוצרו בהצלחה' : 'העסק נוצר בהצלחה',
    });
  } catch (error) {
    console.error('POST /api/tenants error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה ביצירת העסק' },
      { status: 500 }
    );
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
