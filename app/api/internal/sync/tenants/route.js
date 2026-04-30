import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getSyncSecret() {
  const raw = process.env.CATALOG_TEMPLATE_SYNC_SECRET;
  const secret = raw ? String(raw).trim() : '';
  return secret || null;
}

function isAuthorized(req) {
  const secret = getSyncSecret();
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'sync_secret_not_configured' }, { status: 503 }),
    };
  }

  const incoming = req.headers.get('x-template-sync-secret');
  if (!incoming || incoming !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true };
}

function sanitizeSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  return slug || '';
}

function sanitizeString(value) {
  return String(value || '').trim();
}

function destructiveBlockedResponse() {
  return NextResponse.json(
    {
      error: 'destructive_sync_blocked',
      message: 'Destructive tenant sync is blocked without explicit production confirmation.',
    },
    { status: 403 },
  );
}

function normalizeTenantPayload(value) {
  const slug = sanitizeSlug(value?.slug);
  const name = sanitizeString(value?.name);
  if (!slug || !name) return null;

  const status = sanitizeString(value?.status) || 'pending';
  const platformCommissionRate = Number.isFinite(Number(value?.platformCommissionRate))
    ? Math.min(100, Math.max(0, Number(value.platformCommissionRate)))
    : undefined;

  return {
    slug,
    name,
    status,
    platformCommissionRate,
    branding: value?.branding && typeof value.branding === 'object' ? value.branding : undefined,
    contact: value?.contact && typeof value.contact === 'object' ? value.contact : undefined,
    features: value?.features && typeof value.features === 'object' ? value.features : undefined,
  };
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) return auth.response;

  try {
    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || '').trim().toLowerCase();

    if (action !== 'upsert' && action !== 'delete' && action !== 'list') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    let db = null;
    try {
      db = await getDb();
    } catch (dbError) {
      console.error('INTERNAL_TENANT_SYNC_DB_UNAVAILABLE', dbError?.message || dbError);
    }

    if (!db) {
      return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 });
    }

    // ─── LIST ───
    if (action === 'list') {
      const tenants = await db.collection('tenants').find({}).sort({ createdAt: -1 }).toArray();

      const tenantsWithCounts = await Promise.all(
        tenants.map(async (t) => {
          let productsCount = 0;
          try {
            productsCount = await db.collection('products').countDocuments({ tenantId: t._id });
          } catch {}
          return {
            _id: t._id?.toString?.() ?? t._id,
            name: t.name,
            slug: t.slug,
            status: t.status,
            ownerId: t.ownerId?.toString?.() ?? t.ownerId,
            platformCommissionRate: t.platformCommissionRate,
            branding: t.branding,
            contact: t.contact,
            social: t.social,
            seo: t.seo,
            features: t.features,
            allowedMenus: t.allowedMenus,
            allowedMenusConfigured: t.allowedMenusConfigured,
            agentSettings: t.agentSettings,
            billing: t.billing,
            paymentMode: t.paymentMode,
            payplus: t.payplus,
            priority: t.priority,
            stats: t.stats,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            productsCount,
          };
        }),
      );

      return NextResponse.json({
        ok: true,
        count: tenantsWithCounts.length,
        tenants: tenantsWithCounts,
      });
    }

    // ─── DELETE ───
    if (action === 'delete') {
      const slug = sanitizeSlug(payload?.tenantSlug);
      if (!slug) {
        return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400 });
      }

      const tenant = await db.collection('tenants').findOne({ slug }, { projection: { _id: 1, name: 1 } });
      if (!tenant) {
        return NextResponse.json({ ok: true, message: 'tenant_not_found_already_deleted' });
      }

      const tenantId = tenant._id;
      const confirm = sanitizeString(payload?.confirm);
      const confirmTenantId = sanitizeString(payload?.confirmTenantId);
      const reason = sanitizeString(payload?.reason);
      const destructiveEnabled = process.env.ALLOW_INTERNAL_DESTRUCTIVE_SYNC === 'true';
      const tenantIdString = tenantId?.toString?.() || String(tenantId);

      const deleteGuardsOk =
        action === 'delete' &&
        destructiveEnabled &&
        confirm === 'DELETE_TENANT_SYNC' &&
        confirmTenantId &&
        confirmTenantId === tenantIdString &&
        reason;

      if (!deleteGuardsOk) {
        return destructiveBlockedResponse();
      }

      console.warn('[INTERNAL_TENANT_SYNC_DELETE_ALLOWED]', {
        action,
        tenantId: tenantIdString,
        confirmTenantId,
        reason,
        NODE_ENV: process.env.NODE_ENV || 'unknown',
        ALLOW_INTERNAL_DESTRUCTIVE_SYNC: destructiveEnabled,
      });

      // Delete all related data
      const collections = [
        'products', 'orders', 'commissions', 'withdrawals', 'transactions',
        'coupons', 'notifications', 'gamificationlevels', 'leads', 'messages',
        'tasks', 'automations', 'templates', 'categories', 'settings',
        'agentbusinesses', 'activities', 'catalogtemplates', 'users',
      ];

      const deletedCounts = {};
      for (const colName of collections) {
        try {
          const r = await db.collection(colName).deleteMany({ tenantId });
          if (r.deletedCount > 0) deletedCounts[colName] = r.deletedCount;
        } catch {}
      }

      await db.collection('tenants').deleteOne({ _id: tenantId });

      return NextResponse.json({
        ok: true,
        deleted: true,
        tenantName: tenant.name,
        deletedCounts,
      });
    }

    const tenant = normalizeTenantPayload(payload?.tenant);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'invalid_tenant' }, { status: 400 });
    }

    const previousSlug = sanitizeSlug(payload?.previousSlug);
    const lookupSlug = previousSlug || tenant.slug;

    const col = db.collection('tenants');

    const now = new Date();

    const defaultDoc = {
      ownerId: null,
      allowedMenus: [],
      allowedMenusConfigured: true,
      social: {},
      seo: {},
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
      createdAt: now,
      createdBy: null,
    };

    const update = {
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      platformCommissionRate: tenant.platformCommissionRate ?? 5,
      branding:
        tenant.branding ??
        {
          logo: null,
          favicon: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#10B981',
        },
      contact:
        tenant.contact ??
        {
          email: null,
          phone: null,
          whatsapp: null,
          address: null,
        },
      features:
        tenant.features ??
        {
          registration: true,
          groupPurchase: true,
          notifications: true,
          darkMode: false,
          agentSystem: true,
          coupons: true,
        },
      updatedAt: now,
    };

    const r = await col.updateOne(
      { slug: lookupSlug },
      {
        $set: update,
        $setOnInsert: defaultDoc,
      },
      { upsert: true },
    );

    const created = !!r.upsertedId;
    const tenantDoc = await col.findOne({ slug: tenant.slug }, { projection: { _id: 1, slug: 1, name: 1, status: 1 } });

    return NextResponse.json({
      ok: true,
      created,
      tenant: tenantDoc
        ? {
            _id: tenantDoc._id?.toString?.() ?? tenantDoc._id,
            slug: tenantDoc.slug,
            name: tenantDoc.name,
            status: tenantDoc.status,
          }
        : null,
    });
  } catch (error) {
    console.error('INTERNAL_TENANT_SYNC_ERROR', error);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
