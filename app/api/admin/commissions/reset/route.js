import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { apiDebugLog } from '@/lib/apiDebugLog';
import { isSuperAdminUser } from '@/lib/superAdmins';

const RESET_CONFIRM_TOKEN = 'RESET_COMMISSIONS_IRREVERSIBLE';
const TARGET_COLLECTIONS = ['orders', 'users', 'withdrawalRequests'];

function blockedCommissionResetResponse() {
  return NextResponse.json(
    {
      error: 'commission_reset_blocked',
      message: 'Commission reset is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

function normalizeCollectionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!isSuperAdminUser(admin)) {
      return blockedCommissionResetResponse();
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowCommissionReset = process.env.ALLOW_COMMISSION_RESET === 'true';

    const db = await getDb();
    const orders = db.collection('orders');
    const users = db.collection('users');
    const withdrawals = db.collection('withdrawalRequests');
    const now = new Date();
    const ordersFilter = { commissionAmount: { $gt: 0 } };
    const usersFilter = {
      $or: [{ commissionBalance: { $gt: 0 } }, { commissionOnHold: { $gt: 0 } }],
    };
    const withdrawalsFilter = {};

    const currentCounts = {
      orders: await orders.countDocuments(ordersFilter),
      users: await users.countDocuments(usersFilter),
      withdrawalRequests: await withdrawals.countDocuments(withdrawalsFilter),
    };

    const operationSummary = {
      orders: {
        operation: 'updateMany',
        filter: 'commissionAmount > 0',
        update: {
          commissionAmount: 0,
          commissionStatus: 'cancelled',
          updatedAt: 'now',
        },
      },
      users: {
        operation: 'updateMany',
        filter: 'commissionBalance > 0 OR commissionOnHold > 0',
        update: {
          commissionBalance: 0,
          commissionOnHold: 0,
          updatedAt: 'now',
        },
      },
      withdrawalRequests: {
        operation: 'deleteMany',
        filter: 'all documents',
      },
    };

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        deleteEnabled: false,
        updateEnabled: false,
        targetCollections: TARGET_COLLECTIONS,
        currentCounts,
        operationSummary,
        message: 'Commission reset dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowCommissionReset) {
      return blockedCommissionResetResponse();
    }

    const confirm = String(body?.confirm || '').trim();
    const acknowledgeDataLoss = body?.acknowledgeDataLoss === true;
    const reason = String(body?.reason || '').trim();
    const confirmEnvironment = String(body?.confirmEnvironment || '').trim();
    const confirmCollections = normalizeCollectionList(body?.confirmCollections);
    const hasAllCollections = TARGET_COLLECTIONS.every((name) => confirmCollections.includes(name));

    const guardsOk =
      confirm === RESET_CONFIRM_TOKEN &&
      acknowledgeDataLoss === true &&
      reason.length > 0 &&
      confirmEnvironment === nodeEnv &&
      hasAllCollections;

    if (!guardsOk) {
      return blockedCommissionResetResponse();
    }

    console.warn('[COMMISSION_RESET_AUDIT]', {
      action: 'commission_reset',
      actorId: admin?.id || admin?._id || null,
      actorEmail: admin?.email || null,
      actorRole: admin?.role || null,
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_COMMISSION_RESET: allowCommissionReset,
      dryRun: false,
      targetCollections: TARGET_COLLECTIONS,
      currentCounts,
      operationSummary,
    });

    // Reset all commission-related fields in orders
    const ordersResult = await orders.updateMany(
      ordersFilter,
      {
        $set: {
          commissionAmount: 0,
          commissionStatus: 'cancelled',
          updatedAt: now,
        },
      }
    );

    // Reset all commission balances for users
    const usersResult = await users.updateMany(
      usersFilter,
      {
        $set: {
          commissionBalance: 0,
          commissionOnHold: 0,
          updatedAt: now,
        },
      }
    );

    // Delete all withdrawal requests
    const withdrawalsResult = await withdrawals.deleteMany(withdrawalsFilter);

    apiDebugLog('ADMIN_RESET_ALL_COMMISSIONS:', {
      adminId: admin.id,
      ordersReset: ordersResult.modifiedCount,
      usersReset: usersResult.modifiedCount,
      withdrawalsDeleted: withdrawalsResult.deletedCount,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      ok: true,
      ordersReset: ordersResult.modifiedCount,
      usersReset: usersResult.modifiedCount,
      withdrawalsDeleted: withdrawalsResult.deletedCount,
    });
  } catch (error) {
    console.error('ADMIN_RESET_COMMISSIONS_ERROR:', error);
    const status = error?.status || 500;
    const message =
      status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : error?.message || 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
