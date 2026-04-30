/**
 * Admin API - Priority Manual Sync
 * POST /api/admin/priority/sync/:orderId - סנכרון ידני של הזמנה
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import { isPriorityConfigured } from '@/lib/priority/client';
import { createPriorityDocuments } from '@/lib/priority/syncService';
import dbConnect from '@/lib/dbConnect';
import Order from '@/models/Order';
import PaymentEvent from '@/models/PaymentEvent';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';

async function POSTHandler(req, { params }) {
  try {
    await requireAdminApi(req);

    if (!isPriorityConfigured()) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Priority not configured' 
      }, { status: 400 });
    }

    await dbConnect();

    const { orderId } = params;
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get payment event
    const paymentEvent = await PaymentEvent.findOne({
      orderId: order._id,
      type: 'success',
      status: 'processed',
    });

    // Get or create sync map
    const syncMap = await IntegrationSyncMap.getOrCreate(order._id);

    // Run sync
    const result = await createPriorityDocuments(order, paymentEvent, syncMap);

    return NextResponse.json({
      ok: result.synced,
      message: result.synced ? 'Sync completed' : 'Sync failed',
      results: result.results,
      errors: result.errors,
      syncMap: {
        syncStatus: syncMap.syncStatus,
        priorityCustomerId: syncMap.priorityCustomerId,
        prioritySalesOrderId: syncMap.prioritySalesOrderId,
        priorityInvoiceId: syncMap.priorityInvoiceId,
        invoiceNumber: syncMap.invoiceNumber,
      },
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_SYNC]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function GETHandler(req, { params }) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { orderId } = params;
    
    const syncMap = await IntegrationSyncMap.findOne({ orderId }).lean();
    if (!syncMap) {
      return NextResponse.json({ error: 'Sync map not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      syncMap,
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_SYNC_GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
