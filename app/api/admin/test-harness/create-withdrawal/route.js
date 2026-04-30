
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

async function POSTHandler(request, _context, { requestId }) {
  const admin = await requireAdminApi(request);
  assertTestHarnessAccess({ user: admin, requestId, source: 'api/admin/test-harness/create-withdrawal' });

  const body = await request.json().catch(() => {
    const error = new Error('Invalid JSON payload');
    error.status = 400;
    throw error;
  });

  const agentId = requireObjectId(body?.agentId, 'agentId');
  const tenantId = requireObjectId(body?.tenantId, 'tenantId');
  const notes = typeof body?.notes === 'string' ? body.notes : '';
  const paymentDetails = body?.paymentDetails || null;

  const db = await getDb();
  const users = db.collection('users');
  const withdrawals = db.collection('withdrawalRequests');
  const orders = db.collection('orders');

  const agent = await users.findOne(
    { _id: agentId },
    { projection: { fullName: 1, email: 1, phone: 1, role: 1, commissionBalance: 1, commissionOnHold: 1 } },
  );

  if (!agent) {
    const error = new Error('Agent not found');
    error.status = 404;
    throw error;
  }

  const availableOrders = await orders
    .find({
      tenantId,
      $or: [{ agentId }, { refAgentId: agentId }],
      commissionAmount: { $gt: 0 },
      commissionStatus: 'available',
      status: { $in: ['paid', 'completed', 'shipped'] },
    })
    .project({ commissionAmount: 1 })
    .toArray();

  const availableFromOrders = availableOrders.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const currentOnHold = Number(agent.commissionOnHold || 0);
  const availableForWithdrawal = Math.max(0, availableFromOrders - currentOnHold);

  const requestedAmountRaw = body?.amount;
  const requestedAmount =
    typeof requestedAmountRaw === 'number' && Number.isFinite(requestedAmountRaw) && requestedAmountRaw > 0
      ? requestedAmountRaw
      : availableForWithdrawal;

  const amount = Number(requestedAmount.toFixed(2));

  if (!amount || amount < 1) {
    return NextResponse.json(
      {
        error: 'Insufficient balance',
        balance: availableForWithdrawal,
        requested: amount,
      },
      { status: 400 },
    );
  }

  if (amount > availableForWithdrawal) {
    return NextResponse.json(
      {
        error: 'Insufficient balance',
        balance: availableForWithdrawal,
        requested: amount,
      },
      { status: 400 },
    );
  }

  const syncResult = await users.findOneAndUpdate(
    { _id: agentId },
    { $set: { commissionBalance: availableForWithdrawal, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );

  const syncedDoc = syncResult?.value || syncResult;

  const lockResult = await users.findOneAndUpdate(
    { _id: agentId, commissionBalance: { $gte: amount } },
    { $inc: { commissionBalance: -amount, commissionOnHold: amount } },
    { returnDocument: 'after' },
  );

  const lockedDoc = lockResult?.value || lockResult;

  if (!lockedDoc || !lockedDoc._id) {
    return NextResponse.json(
      {
        error: 'Insufficient balance',
        balance: availableForWithdrawal,
        requested: amount,
        syncedBalance: syncedDoc?.commissionBalance,
      },
      { status: 400 },
    );
  }

  const snapshotBalance = lockedDoc.commissionBalance ?? 0;
  const snapshotOnHold = lockedDoc.commissionOnHold ?? 0;

  const doc = {
    userId: agentId,
    tenantId,
    amount,
    notes,
    paymentDetails,
    status: 'pending',
    adminNotes: '',
    snapshotBalance,
    snapshotOnHold,
    autoSettled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      testHarness: true,
      requestId,
    },
  };

  const result = await withdrawals.insertOne(doc);

  return NextResponse.json(
    {
      ok: true,
      requestId: String(result.insertedId),
      amount,
      status: 'pending',
      tenantId: tenantId.toString(),
      agentId: agentId.toString(),
      availableFromOrders,
      availableForWithdrawal,
      onHold: snapshotOnHold,
    },
    { status: 201 },
  );
}

export const POST = withErrorLogging(POSTHandler);
