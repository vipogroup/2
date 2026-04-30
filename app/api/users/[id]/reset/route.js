import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyJwt } from '@/src/lib/auth/createToken.js';
import { getDb } from '@/lib/db';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { apiDebugLog } from '@/lib/apiDebugLog';

const CANONICAL_PRIMARY_ADMIN_EMAIL = 'm0587009938@gmail.com';
const PRIMARY_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || CANONICAL_PRIMARY_ADMIN_EMAIL)
  .trim()
  .toLowerCase();
const LEGACY_ADMIN_EMAIL = '0587009938@gmail.com';
const USER_SCOPED_RESET_CONFIRM_TOKEN = 'RESET_USER_SCOPED_IRREVERSIBLE';
const USER_SCOPED_RESET_TARGET_COLLECTIONS = ['orders', 'withdrawalRequests', 'users'];

function blockedUserScopedResetResponse() {
  return NextResponse.json(
    {
      error: 'user_scoped_reset_blocked',
      message: 'User scoped reset is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function getToken(req) {
  return req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value || '';
}

async function ensureAdmin(req) {
  const decoded = verifyJwt(getToken(req));
  if (decoded?.role !== 'admin' && decoded?.role !== 'super_admin' && decoded?.role !== 'business_admin') {
    return null;
  }
  
  const db = await getDb();
  const usersCol = db.collection('users');
  const userId = decoded.userId || decoded.sub || decoded.id;
  const objectId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  
  if (objectId) {
    const user = await usersCol.findOne({ _id: objectId }, { projection: { email: 1, role: 1 } });
    if (user) {
      return { ...decoded, email: user.email, role: user.role, _id: user._id };
    }
  }
  
  return decoded;
}

function parseObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function POSTHandler(req, { params }) {
  try {
    const currentUser = await ensureAdmin(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can reset users
    if (!isSuperAdminUser(currentUser)) {
      return blockedUserScopedResetResponse();
    }

    const { id } = params || {};
    const userId = parseObjectId(id);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowUserScopedReset = process.env.ALLOW_USER_SCOPED_RESET === 'true';

    const db = await getDb();
    const users = db.collection('users');
    const orders = db.collection('orders');
    const withdrawals = db.collection('withdrawalRequests');

    // Get the user first
    const user = await users.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot reset admins
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'לא ניתן לאפס מנהלים' }, { status: 400 });
    }
    
    // הגנה נוספת על מנהלים מוגנים
    const PROTECTED_ADMINS = [CANONICAL_PRIMARY_ADMIN_EMAIL, PRIMARY_ADMIN_EMAIL, LEGACY_ADMIN_EMAIL];
    if (PROTECTED_ADMINS.includes(user.email) || user.protected === true) {
      return NextResponse.json({ 
        error: 'משתמש זה מוגן ולא ניתן לאיפוס' 
      }, { status: 403 });
    }

    const ordersFilter = {
      $or: [{ agentId: userId }, { refAgentId: userId }],
    };
    const withdrawalsFilter = { userId };
    const userFilter = { _id: userId };
    const operationSummary = {
      orders: {
        operation: 'deleteMany',
        filter: 'agentId == userId OR refAgentId == userId',
      },
      withdrawalRequests: {
        operation: 'deleteMany',
        filter: 'userId == target user',
      },
      users: {
        operation: 'updateOne',
        filter: '_id == target user',
        update: {
          commissionBalance: 0,
          commissionOnHold: 0,
          commissionOnHoldManual: 0,
          totalSales: 0,
          updatedAt: 'now',
        },
      },
    };
    const currentCounts = {
      orders: await orders.countDocuments(ordersFilter),
      withdrawalRequests: await withdrawals.countDocuments(withdrawalsFilter),
      users: await users.countDocuments(userFilter),
    };

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        deleteEnabled: false,
        updateEnabled: false,
        targetUserId: id,
        user: {
          _id: String(user._id),
          email: user.email || '',
          role: user.role || '',
          fullName: user.fullName || '',
        },
        targetCollections: USER_SCOPED_RESET_TARGET_COLLECTIONS,
        currentCounts,
        operationSummary,
        message: 'User scoped reset dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowUserScopedReset) {
      return blockedUserScopedResetResponse();
    }

    const confirm = String(body?.confirm || '').trim();
    const confirmUserId = String(body?.confirmUserId || '').trim();
    const acknowledgeDataLoss = body?.acknowledgeDataLoss === true;
    const reason = String(body?.reason || '').trim();
    const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
    const confirmCollections = normalizeCollectionList(body?.confirmCollections);
    const hasAllCollections = USER_SCOPED_RESET_TARGET_COLLECTIONS.every((name) =>
      confirmCollections.includes(name),
    );

    const guardsOk =
      confirm === USER_SCOPED_RESET_CONFIRM_TOKEN &&
      confirmUserId === String(id) &&
      acknowledgeDataLoss === true &&
      reason.length > 0 &&
      confirmEnvironment === nodeEnv &&
      hasAllCollections;

    if (!guardsOk) {
      return blockedUserScopedResetResponse();
    }

    console.warn('[USER_SCOPED_RESET_AUDIT]', {
      action: 'user_scoped_reset',
      actorId: currentUser?._id || currentUser?.id || currentUser?.userId || null,
      actorEmail: currentUser?.email || null,
      actorRole: currentUser?.role || null,
      targetUserId: String(id),
      targetUserEmail: user?.email || '',
      targetUserRole: user?.role || '',
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_USER_SCOPED_RESET: allowUserScopedReset,
      dryRun: false,
      targetCollections: USER_SCOPED_RESET_TARGET_COLLECTIONS,
      currentCounts,
      operationSummary,
    });

    // Delete all orders where user is the agent
    const ordersDeleted = await orders.deleteMany(ordersFilter);

    // Delete all withdrawal requests for this user
    const withdrawalsDeleted = await withdrawals.deleteMany(withdrawalsFilter);

    // Reset user commission fields
    const resetResult = await users.updateOne(
      userFilter,
      {
        $set: {
          commissionBalance: 0,
          commissionOnHold: 0,
          commissionOnHoldManual: 0,
          totalSales: 0,
          updatedAt: new Date()
        }
      }
    );

    apiDebugLog('USER_RESET', {
      userId: id,
      userName: user.fullName,
      ordersDeleted: ordersDeleted.deletedCount,
      withdrawalsDeleted: withdrawalsDeleted.deletedCount,
      userUpdated: resetResult.modifiedCount,
      resetBy: currentUser.email || currentUser._id
    });

    return NextResponse.json({
      success: true,
      message: 'המשתמש אופס בהצלחה',
      stats: {
        ordersDeleted: ordersDeleted.deletedCount,
        withdrawalsDeleted: withdrawalsDeleted.deletedCount,
        userUpdated: resetResult.modifiedCount,
      }
    });
  } catch (e) {
    console.error('USER_RESET_ERROR:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
