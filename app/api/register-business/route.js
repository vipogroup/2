import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

async function POSTHandler(req) {
  try {
    const body = await req.json();
    const { businessName, slug, owner, contact } = body;

    // Validate required fields
    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'שם העסק הוא שדה חובה' }, { status: 400 });
    }
    if (!slug?.trim() || slug.length < 3) {
      return NextResponse.json({ error: 'מזהה העסק חייב להכיל לפחות 3 תווים' }, { status: 400 });
    }
    if (!owner?.fullName?.trim()) {
      return NextResponse.json({ error: 'שם מלא הוא שדה חובה' }, { status: 400 });
    }
    if (!owner?.email?.trim() || !owner.email.includes('@')) {
      return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
    }
    if (!owner?.phone?.trim()) {
      return NextResponse.json({ error: 'מספר טלפון הוא שדה חובה' }, { status: 400 });
    }
    if (!owner?.password || owner.password.length < 8) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים, מספר אחד ואות אחת' }, { status: 400 });
    }
    if (!/\d/.test(owner.password)) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות מספר אחד' }, { status: 400 });
    }
    if (!/[a-zA-Zא-ת]/.test(owner.password)) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות אות אחת' }, { status: 400 });
    }

    const db = await getDb();
    const normalizedSlug = slug.toLowerCase().trim().replace(/^-+|-+$/g, '');
    const normalizedEmail = owner.email.toLowerCase().trim();

    // Check if slug already exists
    const existingTenant = await db.collection('tenants').findOne({ slug: normalizedSlug });
    if (existingTenant) {
      return NextResponse.json({ error: 'מזהה העסק כבר קיים במערכת' }, { status: 409 });
    }

    // Check if email already exists
    const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'כתובת האימייל כבר רשומה במערכת' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(owner.password, 10);

    // Create owner user first
    const now = new Date();
    const userDoc = {
      fullName: owner.fullName.trim(),
      email: normalizedEmail,
      phone: owner.phone.trim(),
      role: 'business_admin', // Business owner - NOT Super Admin
      passwordHash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const userResult = await db.collection('users').insertOne(userDoc);
    const ownerId = userResult.insertedId;

    // Create tenant
    const tenantDoc = {
      name: businessName.trim(),
      slug: normalizedSlug,
      ownerId,
      status: 'pending', // Requires admin approval
      platformCommissionRate: 5,
      allowedMenus: [],
      allowedMenusConfigured: true,
      branding: {
        logo: null,
        favicon: null,
        primaryColor: '#1e3a8a',
        secondaryColor: '#0891b2',
        accentColor: '#06b6d4',
        useGlobalBranding: true,
      },
      contact: {
        email: contact?.email || normalizedEmail,
        phone: contact?.phone || owner.phone.trim(),
        whatsapp: contact?.whatsapp || owner.phone.trim(),
        address: contact?.address || null,
      },
      social: {
        facebook: null,
        instagram: null,
        twitter: null,
        linkedin: null,
      },
      seo: {
        title: businessName.trim(),
        description: null,
        keywords: null,
      },
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
        bankDetails: {
          bankName: null,
          branchNumber: null,
          accountNumber: null,
          accountName: null,
        },
      },
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalAgents: 0,
        totalCustomers: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    const tenantResult = await db.collection('tenants').insertOne(tenantDoc);
    const tenantId = tenantResult.insertedId;

    // Update user with tenantId
    await db.collection('users').updateOne(
      { _id: ownerId },
      { $set: { tenantId } }
    );

    // Multi-Tenant: Create default gamification levels for new tenant
    const defaultLevels = [
      { name: 'מתחיל', minSalesAmount: 0, minDeals: 0, commissionBoostPct: 0, badgeColor: 'bronze', sortOrder: 1 },
      { name: 'מתקדם', minSalesAmount: 5000, minDeals: 5, commissionBoostPct: 2, badgeColor: 'silver', sortOrder: 2 },
      { name: 'מקצוען', minSalesAmount: 15000, minDeals: 15, commissionBoostPct: 5, badgeColor: 'gold', sortOrder: 3 },
      { name: 'אלוף', minSalesAmount: 50000, minDeals: 50, commissionBoostPct: 10, badgeColor: 'platinum', sortOrder: 4 },
    ];
    
    const levelDocs = defaultLevels.map(level => ({
      ...level,
      tenantId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));
    
    await db.collection('levelrules').insertMany(levelDocs).catch(err => {
      console.error('Failed to create default levels:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'העסק נרשם בהצלחה וממתין לאישור',
      tenantId: String(tenantId),
    }, { status: 201 });

  } catch (err) {
    console.error('POST /api/register-business error:', err);
    
    // הודעות שגיאה מפורטות לפי סוג השגיאה
    let errorMessage = 'שגיאה ברישום העסק';
    
    if (err.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === 'email') {
        errorMessage = 'כתובת האימייל כבר רשומה במערכת';
      } else if (field === 'slug') {
        errorMessage = 'מזהה העסק כבר קיים במערכת';
      } else if (field === 'phone') {
        errorMessage = 'מספר הטלפון כבר רשום במערכת';
      } else {
        errorMessage = `השדה "${field}" כבר קיים במערכת`;
      }
    } else if (err.name === 'ValidationError') {
      // Mongoose validation error
      const messages = Object.values(err.errors || {}).map(e => e.message);
      errorMessage = messages.length > 0 ? messages.join(', ') : 'נתונים לא תקינים';
    } else if (err.message) {
      // כל שגיאה אחרת עם הודעה
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
