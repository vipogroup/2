
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { assertTestHarnessAccess } from '@/lib/testHarness/gate';

function requireObjectId(value, field) {
  if (!value || typeof value !== 'string' || !ObjectId.isValid(value)) {
    const error = new Error(`${field} is invalid`);
    error.status = 400;
    throw error;
  }
  return new ObjectId(value);
}

async function GETHandler(request, _context, { requestId }) {
  const admin = await requireAdminApi(request);
  assertTestHarnessAccess({ user: admin, requestId, source: 'api/admin/test-harness/agent-commissions' });

  const { searchParams } = new URL(request.url);
  const agentId = requireObjectId(searchParams.get('agentId'), 'agentId');

  const tenantIdParam = searchParams.get('tenantId');
  const tenantFilter = tenantIdParam && tenantIdParam !== 'all' && ObjectId.isValid(tenantIdParam)
    ? { tenantId: new ObjectId(tenantIdParam) }
    : {};

  const db = await getDb();
  const users = db.collection('users');
  const orders = db.collection('orders');
  const withdrawals = db.collection('withdrawalRequests');

  const [agent, agentOrders, completedWithdrawalsAgg] = await Promise.all([
    users.findOne(
      { _id: agentId },
      { projection: { fullName: 1, email: 1, phone: 1, role: 1, commissionBalance: 1, commissionOnHold: 1 } },
    ),
    orders
      .find({
        $or: [{ agentId }, { refAgentId: agentId }],
        commissionAmount: { $gt: 0 },
        status: { $in: ['paid', 'completed', 'shipped'] },
        ...tenantFilter,
      })
      .project({
        commissionAmount: 1,
        commissionStatus: 1,
        commissionAvailableAt: 1,
        orderType: 1,
        deliveredAt: 1,
        createdAt: 1,
        customerName: 1,
        totalAmount: 1,
        items: 1,
        tenantId: 1,
      })
      .sort({ createdAt: -1 })
      .toArray(),
    withdrawals
      .aggregate([
        { $match: { userId: agentId, status: 'completed', ...tenantFilter } },
        { $group: { _id: null, totalWithdrawn: { $sum: '$amount' } } },
      ])
      .toArray(),
  ]);

  if (!agent) {
    const error = new Error('Agent not found');
    error.status = 404;
    throw error;
  }

  const totalWithdrawn = completedWithdrawalsAgg[0]?.totalWithdrawn || 0;
  const commissionOnHold = Number(agent?.commissionOnHold || 0);

  let pendingCommissions = 0;
  let availableCommissions = 0;
  let claimedCommissions = 0;
  let totalEarned = 0;

  const commissions = agentOrders.map((order) => {
    const status = order.commissionStatus || 'pending';
    const amount = Number(order.commissionAmount || 0);
    totalEarned += amount;

    if (status === 'pending') pendingCommissions += amount;
    if (status === 'available') availableCommissions += amount;
    if (status === 'claimed') claimedCommissions += amount;

    const productNames = Array.isArray(order.items)
      ? order.items.map((item) => item.name).filter(Boolean).join(', ')
      : '';

    return {
      orderId: order._id ? order._id.toString() : null,
      orderType: order.orderType || 'regular',
      amount,
      status,
      availableAt: order.commissionAvailableAt || null,
      deliveredAt: order.deliveredAt || null,
      customerName: order.customerName || '',
      productName: productNames,
      totalAmount: order.totalAmount || 0,
      createdAt: order.createdAt,
      tenantId: order.tenantId ? order.tenantId.toString() : null,
    };
  });

  const availableForWithdrawal = Math.max(0, availableCommissions - totalWithdrawn - commissionOnHold);

  return NextResponse.json({
    ok: true,
    agent: {
      id: agentId.toString(),
      fullName: agent.fullName || '',
      email: agent.email || '',
      phone: agent.phone || '',
      role: agent.role || 'agent',
    },
    summary: {
      availableBalance: availableForWithdrawal,
      availableCommissions,
      pendingCommissions,
      onHold: commissionOnHold,
      totalEarned,
      claimedCommissions,
      totalWithdrawn,
    },
    commissions,
  });
}

export const GET = withErrorLogging(GETHandler);
