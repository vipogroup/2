import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { assertTestHarnessAccess, isTestHarnessEnabled } from '@/lib/testHarness/gate';

async function POSTHandler(req) {
  try {
    if (!isTestHarnessEnabled()) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const user = await requireAdminApi(req);
    assertTestHarnessAccess({ user, source: 'api/orders/demo-complete' });
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: 'order_id_required' }, { status: 400 });
    }

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const orderObjectId = new ObjectId(orderId);
    const order = await ordersCol.findOne({ _id: orderObjectId });
    if (!order) {
      return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
    }

    await ordersCol.updateOne(
      { _id: orderObjectId },
      {
        $set: {
          status: 'paid',
          commissionSettled: order.commissionSettled ?? true,
          demoPayment: true,
          updatedAt: new Date(),
          'payplus.demoCompletedAt': new Date(),
        },
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('ORDER_DEMO_COMPLETE_ERROR', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: 'server_error' }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
