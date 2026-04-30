import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';

const COMMISSION_STATUSES = ['pending', 'available', 'claimed', 'cancelled'];

function inferStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'ממתין לשחרור';
    case 'available':
      return 'זמין למשיכה';
    case 'claimed':
      return 'נמשך';
    case 'cancelled':
      return 'בוטל';
    default:
      return 'ממתין לשחרור';
  }
}

function inferOrderTypeMeta(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const groupItems = items.filter((item) => {
    const purchaseType = item?.purchaseType || item?.type;
    return (
      purchaseType === 'group' ||
      String(item?.groupPurchaseType || '').trim().toLowerCase() === 'shared_container'
    );
  });
  const isGroup = groupItems.length > 0 || order?.orderType === 'group';

  if (!isGroup) {
    return { kind: 'regular', label: 'רכישה רגילה' };
  }

  const allSharedContainer =
    groupItems.length > 0 &&
    groupItems.every(
      (item) => String(item?.groupPurchaseType || '').trim().toLowerCase() === 'shared_container',
    );

  if (allSharedContainer) {
    return { kind: 'shared_container', label: 'מכולה משותפת' };
  }

  return { kind: 'group', label: 'רכישה קבוצתית' };
}

async function GETHandler(req) {
  try {
    const user = await requireAuthApi(req);
    
    // Validate user object exists
    if (!user || !user.id) {
      console.error('COMMISSIONS_AUTH_ERROR: No user or user.id', { user });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const identifier = buildRateLimitKey(req, user.id);
    const rateLimit = rateLimiters.agentStats(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = await getDb();
    
    // Validate user.id is valid ObjectId
    if (!ObjectId.isValid(user.id)) {
      console.error('COMMISSIONS_INVALID_ID:', user.id);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const userId = new ObjectId(user.id);

    // Multi-Tenant: Get tenantId filter from query params
    // tenantId=all - get commissions from all tenants
    // tenantId=<id> - get commissions from specific tenant
    // no tenantId - get commissions from all tenants (default for multi-business agents)
    const { searchParams } = new URL(req.url);
    const tenantIdParam = searchParams.get('tenantId');
    const tenantFilter = (tenantIdParam && tenantIdParam !== 'all' && ObjectId.isValid(tenantIdParam))
      ? { tenantId: new ObjectId(tenantIdParam) } 
      : {}; // Empty filter = all tenants

    const usersCollection = db.collection('users');
    const ordersCollection = db.collection('orders');
    const groupPurchasesCollection = db.collection('grouppurchases');

    const [userDoc, orders] = await Promise.all([
      usersCollection
        .find({ _id: userId })
        .project({ commissionBalance: 1, commissionOnHold: 1, commissionOnHoldManual: 1 })
        .limit(1)
        .toArray(),
      ordersCollection
        .find({ 
          $or: [{ agentId: userId }, { refAgentId: userId }], 
          commissionAmount: { $gt: 0 },
          status: { $in: ['paid', 'completed', 'shipped'] },
          ...tenantFilter  // Multi-Tenant: Filter by tenant if provided
        })
        .project({
          commissionAmount: 1,
          commissionStatus: 1,
          commissionAvailableAt: 1,
          orderType: 1,
          deliveredAt: 1,
          createdAt: 1,
          customerName: 1,
          groupPurchaseId: 1,
          totalAmount: 1,
          items: 1,
          tenantId: 1,  // Include tenantId in response
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    if (!userDoc[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const commissionOnHold = Number(userDoc[0].commissionOnHold || 0);

    // Get total completed withdrawals (filtered by tenant if provided)
    const withdrawalsCollection = db.collection('withdrawalRequests');
    const withdrawalMatch = { userId: userId, status: 'completed', ...tenantFilter };
    const completedWithdrawalsAgg = await withdrawalsCollection.aggregate([
      { $match: withdrawalMatch },
      { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } },
    ]).toArray();
    const totalWithdrawn = completedWithdrawalsAgg[0]?.totalWithdrawn || 0;

    let pendingCommissions = 0;
    let availableCommissions = 0;
    let claimedCommissions = 0;
    let totalEarned = 0;

    const groupPurchaseIds = orders
      .filter((order) => order.groupPurchaseId)
      .map((order) => order.groupPurchaseId);

    let groupPurchaseMap = new Map();
    if (groupPurchaseIds.length > 0) {
      const uniqueGroupIds = [...new Set(groupPurchaseIds.map((id) => id.toString()))].map(
        (id) => new ObjectId(id),
      );
      if (uniqueGroupIds.length > 0) {
        const groupDocs = await groupPurchasesCollection
          .find({ _id: { $in: uniqueGroupIds } })
          .project({
            name: 1,
            status: 1,
            commissionReleaseDate: 1,
            closedAt: 1,
            shippedAt: 1,
            arrivedAt: 1,
            deliveryCompletedAt: 1,
          })
          .toArray();

        groupPurchaseMap = new Map(
          groupDocs.map((doc) => [doc._id.toString(), { ...doc, id: doc._id.toString() }]),
        );
      }
    }

    const commissions = orders.map((order) => {
      const status = order.commissionStatus || 'pending';
      const amount = Number(order.commissionAmount || 0);
      totalEarned += amount;

      const orderTypeMeta = inferOrderTypeMeta(order);

      if (status === 'pending') {
        pendingCommissions += amount;
      } else if (status === 'available') {
        availableCommissions += amount;
      } else if (status === 'claimed') {
        claimedCommissions += amount;
      }

      const groupInfo = order.groupPurchaseId
        ? groupPurchaseMap.get(order.groupPurchaseId.toString()) || null
        : null;

      // Extract product names from items
      const productNames = Array.isArray(order.items) 
        ? order.items.map(item => item.name).filter(Boolean).join(', ')
        : '';

      return {
        orderId: order._id ? order._id.toString() : null,
        orderType: order.orderType || 'regular',
        orderTypeKind: orderTypeMeta.kind,
        orderTypeLabel: orderTypeMeta.label,
        amount,
        status,
        statusLabel: inferStatusLabel(status),
        availableAt: order.commissionAvailableAt || null,
        deliveredAt: order.deliveredAt || null,
        customerName: order.customerName || '',
        productName: productNames,
        totalAmount: order.totalAmount || 0,
        createdAt: order.createdAt,
        groupPurchase: groupInfo
          ? {
              id: groupInfo.id,
              name: groupInfo.name || '',
              status: groupInfo.status || 'open',
              commissionReleaseDate: groupInfo.commissionReleaseDate || null,
              closedAt: groupInfo.closedAt || null,
              shippedAt: groupInfo.shippedAt || null,
              arrivedAt: groupInfo.arrivedAt || null,
              deliveryCompletedAt: groupInfo.deliveryCompletedAt || null,
            }
          : null,
      };
    });

    // Available for withdrawal = available commissions minus completed withdrawals minus pending requests
    const availableForWithdrawal = Math.max(0, availableCommissions - totalWithdrawn - commissionOnHold);

    return NextResponse.json({
      ok: true,
      summary: {
        availableBalance: availableForWithdrawal,
        availableCommissions,
        pendingCommissions,
        onHold: commissionOnHold,
        totalEarned,
        claimedCommissions,
      },
      commissions,
    });
  } catch (err) {
    console.error('AGENT_COMMISSIONS_GET_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
