import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { isSuperAdminUser } from '@/lib/superAdmins';

const RESET_TENANTS_CONFIRM_TOKEN = 'RESET_TENANTS_IRREVERSIBLE';
const TARGET_COLLECTIONS = [
  'orders',
  'products',
  'commissions',
  'withdrawals',
  'transactions',
  'coupons',
  'notifications',
  'gamificationlevels',
  'levelrules',
  'leads',
  'messages',
  'tasks',
  'automations',
  'templates',
  'categories',
  'settings',
  'users',
  'tenants',
];

function blockedTenantResetResponse() {
  return NextResponse.json(
    {
      error: 'tenant_reset_blocked',
      message: 'Tenant reset is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

/**
 * DELETE /api/admin/reset-tenants - מחיקת כל העסקים והנתונים הקשורים (רק Super Admin)
 * [WARN] זהירות! פעולה זו בלתי הפיכה ומוחקת את כל העסקים!
 */
async function DELETEHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (!isSuperAdminUser(user)) {
      return blockedTenantResetResponse();
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowTenantReset = process.env.ALLOW_TENANT_RESET === 'true';
    
    const db = await getDb();
    
    // מציאת כל ה-tenantIds
    const tenants = await db.collection('tenants').find({}).toArray();
    const tenantIds = tenants.map(t => t._id);
    
    if (tenantIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'אין עסקים למחיקה',
        deletedCounts: {},
      });
    }

    const tenantFilter = { tenantId: { $in: tenantIds } };
    const currentCounts = {};
    for (const collectionName of TARGET_COLLECTIONS) {
      try {
        if (collectionName === 'users') {
          currentCounts.users = await db.collection('users').countDocuments({
            tenantId: { $in: tenantIds },
            role: { $ne: 'super_admin' },
          });
        } else if (collectionName === 'tenants') {
          currentCounts.tenants = await db.collection('tenants').countDocuments({});
        } else {
          currentCounts[collectionName] = await db.collection(collectionName).countDocuments(tenantFilter);
        }
      } catch {
        currentCounts[collectionName] = 0;
      }
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        deleteEnabled: false,
        scope: 'ALL_TENANTS',
        targetCollections: TARGET_COLLECTIONS,
        currentCounts,
        message: 'Dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowTenantReset) {
      return blockedTenantResetResponse();
    }

    const confirm = String(body?.confirm || '').trim();
    const reason = String(body?.reason || '').trim();
    const acknowledgeDataLoss = body?.acknowledgeDataLoss === true;
    const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
    const confirmCollections = normalizeCollectionList(body?.confirmCollections);
    const confirmScope = String(body?.confirmScope || '').trim();
    const hasAllCollections = TARGET_COLLECTIONS.every((name) => confirmCollections.includes(name));

    const guardsOk =
      confirm === RESET_TENANTS_CONFIRM_TOKEN &&
      acknowledgeDataLoss === true &&
      reason.length > 0 &&
      confirmEnvironment === nodeEnv &&
      hasAllCollections &&
      confirmScope === 'ALL_TENANTS';

    if (!guardsOk) {
      return blockedTenantResetResponse();
    }

    console.warn('[TENANT_RESET_AUDIT]', {
      action: 'tenant_reset',
      actorId: user?._id || user?.id || null,
      actorEmail: user?.email || null,
      actorRole: user?.role || null,
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_TENANT_RESET: allowTenantReset,
      dryRun: false,
      scope: 'ALL_TENANTS',
      tenantId: null,
      targetCollections: TARGET_COLLECTIONS,
      currentCounts,
    });
    
    // מחיקת כל הנתונים הקשורים לעסקים
    const deleteResults = await Promise.allSettled([
      // הזמנות
      db.collection('orders').deleteMany({ tenantId: { $in: tenantIds } }),
      // מוצרים
      db.collection('products').deleteMany({ tenantId: { $in: tenantIds } }),
      // עמלות
      db.collection('commissions').deleteMany({ tenantId: { $in: tenantIds } }),
      // בקשות משיכה
      db.collection('withdrawals').deleteMany({ tenantId: { $in: tenantIds } }),
      // עסקאות
      db.collection('transactions').deleteMany({ tenantId: { $in: tenantIds } }),
      // קופונים
      db.collection('coupons').deleteMany({ tenantId: { $in: tenantIds } }),
      // התראות
      db.collection('notifications').deleteMany({ tenantId: { $in: tenantIds } }),
      // רמות גיימיפיקציה
      db.collection('gamificationlevels').deleteMany({ tenantId: { $in: tenantIds } }),
      db.collection('levelrules').deleteMany({ tenantId: { $in: tenantIds } }),
      // לידים CRM
      db.collection('leads').deleteMany({ tenantId: { $in: tenantIds } }),
      // הודעות CRM
      db.collection('messages').deleteMany({ tenantId: { $in: tenantIds } }),
      // משימות CRM
      db.collection('tasks').deleteMany({ tenantId: { $in: tenantIds } }),
      // אוטומציות CRM
      db.collection('automations').deleteMany({ tenantId: { $in: tenantIds } }),
      // תבניות הודעות
      db.collection('templates').deleteMany({ tenantId: { $in: tenantIds } }),
      // קטגוריות
      db.collection('categories').deleteMany({ tenantId: { $in: tenantIds } }),
      // הגדרות
      db.collection('settings').deleteMany({ tenantId: { $in: tenantIds } }),
    ]);
    
    // מחיקת משתמשים השייכים לעסקים (לא כולל super_admin)
    const usersDeleted = await db.collection('users').deleteMany({ 
      tenantId: { $in: tenantIds },
      role: { $ne: 'super_admin' }
    });
    
    // מחיקת כל העסקים
    const tenantsDeleted = await db.collection('tenants').deleteMany({});
    
    // סיכום המחיקות
    const deletedCounts = {
      tenants: tenantsDeleted.deletedCount,
      users: usersDeleted.deletedCount,
    };
    
    const collections = [
      'orders', 'products', 'commissions', 'withdrawals', 'transactions',
      'coupons', 'notifications', 'gamificationlevels', 'levelrules', 'leads', 
      'messages', 'tasks', 'automations', 'templates', 'categories', 'settings'
    ];
    
    deleteResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.deletedCount) {
        deletedCounts[collections[index]] = result.value.deletedCount;
      }
    });
    
    const actorEmail = user?.email || 'unknown';
    console.warn(`[RESET-TENANTS] [WARNING] All tenants deleted by ${actorEmail}:`, deletedCounts);

    try {
      await db.collection('auditlogs').insertOne({
        action: 'reset_tenants',
        actorEmail,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        tenantIds: tenantIds.map(String),
        deletedCounts,
        ip: request.headers.get('x-forwarded-for') || '',
        createdAt: new Date(),
      });
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      message: `נמחקו ${tenantsDeleted.deletedCount} עסקים וכל הנתונים הקשורים`,
      deletedCounts,
    });
    
  } catch (error) {
    console.error('DELETE /api/admin/reset-tenants error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה באיפוס העסקים' },
      { status: 500 }
    );
  }
}

export const DELETE = withErrorLogging(DELETEHandler);
