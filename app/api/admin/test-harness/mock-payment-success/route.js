
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import dbConnect from '@/lib/dbConnect';
import { requireAdminApi } from '@/lib/auth/server';
import { assertTestHarnessAccess } from '@/lib/testHarness/gate';
import { applyOrderStatusUpdate } from '@/lib/orders/applyOrderStatusUpdate';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/orders/status';
import { createAuditLog, AUDIT_EVENTS } from '@/lib/security/auditLog';

import Order from '@/models/Order';

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    const error = new Error('Missing request body');
    error.status = 400;
    throw error;
  }

  const { orderId } = body;
  if (!orderId || typeof orderId !== 'string') {
    const error = new Error('orderId is required');
    error.status = 400;
    throw error;
  }

  if (!ObjectId.isValid(orderId)) {
    const error = new Error('orderId is invalid');
    error.status = 400;
    throw error;
  }

  return { orderId };
}

async function POSTHandler(request, _context, { requestId }) {
  const user = await requireAdminApi(request);
  assertTestHarnessAccess({ user, requestId, source: 'api/admin/test-harness' });

  await dbConnect();

  const body = await request.json().catch(() => {
    const error = new Error('Invalid JSON payload');
    error.status = 400;
    throw error;
  });

  const { orderId } = validateBody(body);

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }

  const statusResult = await applyOrderStatusUpdate({
    order,
    nextStatus: ORDER_STATUS.PAID,
    nextPaymentStatus: PAYMENT_STATUS.SUCCESS,
    actor: { type: 'admin', id: user.id, email: user.email },
    reason: 'test_harness:mock_payment_success',
    metadata: {
      requestId,
      source: 'api/admin/test-harness',
    },
  });

  await createAuditLog({
    type: AUDIT_EVENTS.MOCK_PAYMENT_SUCCESS,
    severity: 'info',
    actor: { type: 'admin', id: user.id, email: user.email },
    target: { type: 'order', id: orderId },
    details: {
      source: 'api/admin/test-harness',
      requestId,
      orderId,
      oldStatus: statusResult.oldStatus,
      newStatus: statusResult.newStatus,
      oldPaymentStatus: statusResult.oldPaymentStatus,
      newPaymentStatus: statusResult.newPaymentStatus,
    },
  });

  return NextResponse.json({
    orderId,
    oldStatus: statusResult.oldStatus,
    newStatus: statusResult.newStatus,
    oldPaymentStatus: statusResult.oldPaymentStatus,
    newPaymentStatus: statusResult.newPaymentStatus,
  });
}

export const POST = withErrorLogging(POSTHandler);
