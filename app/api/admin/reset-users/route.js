import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminGuard } from '@/lib/auth/requireAuth';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { apiDebugLog } from '@/lib/apiDebugLog';

const CANONICAL_PRIMARY_ADMIN_EMAIL = 'm0587009938@gmail.com';
const PRIMARY_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || CANONICAL_PRIMARY_ADMIN_EMAIL)
  .trim()
  .toLowerCase();
const LEGACY_ADMIN_EMAIL = '0587009938@gmail.com';
const RESET_USERS_CONFIRM_TOKEN = 'RESET_USERS_IRREVERSIBLE';
const TARGET_COLLECTIONS = [
  'orders',
  'commissions',
  'withdrawals',
  'transactions',
  'coupons',
  'notifications',
  'leads',
  'messages',
  'tasks',
  'pushsubscriptions',
  'users',
];

function blockedUserResetResponse() {
  return NextResponse.json(
    {
      error: 'user_reset_blocked',
      message: 'User reset is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

/**
 * DELETE /api/admin/reset-users - מחיקת כל המשתמשים והנתונים הקשורים (רק Super Admin)
 * [WARN] זהירות! פעולה זו בלתי הפיכה ומוחקת את כל המשתמשים!
 */
async function DELETEHandler(request) {
  try {
    const authResult = await requireAdminGuard(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    if (!isSuperAdminUser(user)) {
      return blockedUserResetResponse();
    }
    
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const db = await getDb();
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowUserReset = process.env.ALLOW_USER_RESET === 'true';
    const PROTECTED_ADMINS = [CANONICAL_PRIMARY_ADMIN_EMAIL, PRIMARY_ADMIN_EMAIL, LEGACY_ADMIN_EMAIL];
    const usersDeleteFilter = {
      $and: [
        { role: { $ne: 'super_admin' } },
        { email: { $nin: PROTECTED_ADMINS } },
        { protected: { $ne: true } },
      ],
    };

    const currentCounts = {};
    for (const collectionName of TARGET_COLLECTIONS) {
      try {
        if (collectionName === 'users') {
          currentCounts.users = await db.collection('users').countDocuments(usersDeleteFilter);
        } else {
          currentCounts[collectionName] = await db.collection(collectionName).countDocuments({});
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
        targetCollections: TARGET_COLLECTIONS,
        currentCounts,
        message: 'Dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowUserReset) {
      return blockedUserResetResponse();
    }

    const confirm = String(body?.confirm || '').trim();
    const reason = String(body?.reason || '').trim();
    const acknowledgeDataLoss = body?.acknowledgeDataLoss === true;
    const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
    const confirmCollections = normalizeCollectionList(body?.confirmCollections);
    const hasAllCollections = TARGET_COLLECTIONS.every((name) => confirmCollections.includes(name));

    const guardsOk =
      confirm === RESET_USERS_CONFIRM_TOKEN &&
      acknowledgeDataLoss === true &&
      reason.length > 0 &&
      confirmEnvironment === nodeEnv &&
      hasAllCollections;

    if (!guardsOk) {
      return blockedUserResetResponse();
    }

    console.warn('[USER_RESET_AUDIT]', {
      action: 'user_reset',
      actorId: user?._id || user?.id || null,
      actorEmail: user?.email || null,
      actorRole: user?.role || null,
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_USER_RESET: allowUserReset,
      dryRun: false,
      targetCollections: TARGET_COLLECTIONS,
      currentCounts,
    });
    
    // מחיקת כל הנתונים הקשורים למשתמשים
    const deleteResults = await Promise.allSettled([
      // הזמנות
      db.collection('orders').deleteMany({}),
      // עמלות
      db.collection('commissions').deleteMany({}),
      // בקשות משיכה
      db.collection('withdrawals').deleteMany({}),
      // עסקאות
      db.collection('transactions').deleteMany({}),
      // קופונים
      db.collection('coupons').deleteMany({}),
      // התראות
      db.collection('notifications').deleteMany({}),
      // לידים CRM
      db.collection('leads').deleteMany({}),
      // הודעות CRM
      db.collection('messages').deleteMany({}),
      // משימות CRM
      db.collection('tasks').deleteMany({}),
      // מנויי התראות
      db.collection('pushsubscriptions').deleteMany({}),
    ]);
    
    // מחיקת משתמשים - הגנה על מנהלים ראשיים מוגנים
    const usersDeleted = await db.collection('users').deleteMany(usersDeleteFilter);
    
    // סיכום המחיקות
    const deletedCounts = {
      users: usersDeleted.deletedCount,
    };
    
    const collections = [
      'orders', 'commissions', 'withdrawals', 'transactions', 'coupons',
      'notifications', 'leads', 'messages', 'tasks', 'pushsubscriptions'
    ];
    
    deleteResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.deletedCount) {
        deletedCounts[collections[index]] = result.value.deletedCount;
      }
    });
    
    apiDebugLog(`[DEL] RESET USERS: All users deleted by ${user.email || user._id}:`, deletedCounts);
    
    return NextResponse.json({
      ok: true,
      message: `נמחקו ${usersDeleted.deletedCount} משתמשים וכל הנתונים הקשורים`,
      deletedCounts,
    });
    
  } catch (error) {
    console.error('DELETE /api/admin/reset-users error:', error);
    return NextResponse.json(
      { error: error.message || 'שגיאה באיפוס המשתמשים' },
      { status: 500 }
    );
  }
}

export const DELETE = withErrorLogging(DELETEHandler);
