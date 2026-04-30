/**
 * Admin API - Priority Reconciliation
 * GET /api/admin/priority/reconciliation - דוח התאמות מול פריוריטי
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';
import Order from '@/models/Order';
import PaymentEvent from '@/models/PaymentEvent';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get all sync maps in range
    const syncMaps = await IntegrationSyncMap.find({
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).lean();

    // Get orders
    const orderIds = syncMaps.map(s => s.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    const ordersMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});

    // Build reconciliation items
    const items = [];
    let synced = 0;
    let pending = 0;
    let failed = 0;
    let amountMismatches = 0;
    let totalOrderAmount = 0;
    let totalPayplusAmount = 0;

    for (const syncMap of syncMaps) {
      const order = ordersMap[syncMap.orderId?.toString()];
      if (!order) continue;

      totalOrderAmount += order.totalAmount || 0;
      totalPayplusAmount += syncMap.payplusAmount || 0;

      const hasAmountMismatch = syncMap.amountMismatch;
      if (hasAmountMismatch) amountMismatches++;

      let status = 'unknown';
      if (syncMap.syncStatus === 'synced' && syncMap.priorityInvoiceId) {
        status = 'complete';
        synced++;
      } else if (syncMap.syncStatus === 'failed') {
        status = 'failed';
        failed++;
      } else if (syncMap.syncStatus === 'pending' || syncMap.syncStatus === 'partial') {
        status = 'pending';
        pending++;
      }

      items.push({
        orderId: syncMap.orderId,
        orderNumber: order.orderNumber || order._id.toString().slice(-6),
        orderAmount: order.totalAmount,
        payplusAmount: syncMap.payplusAmount,
        amountMismatch: hasAmountMismatch,
        diff: Math.abs((order.totalAmount || 0) - (syncMap.payplusAmount || 0)),
        syncStatus: syncMap.syncStatus,
        status,
        hasInvoice: !!syncMap.priorityInvoiceId,
        invoiceNumber: syncMap.invoiceNumber,
        hasReceipt: !!syncMap.priorityReceiptId,
        hasCreditNote: !!syncMap.priorityCreditNoteId,
        priorityCustomerId: syncMap.priorityCustomerId,
        createdAt: syncMap.createdAt,
        lastError: syncMap.errorLog?.slice(-1)[0]?.errorMessage,
      });
    }

    // Summary
    const summary = {
      period: { startDate, endDate },
      total: syncMaps.length,
      synced,
      pending,
      failed,
      amountMismatches,
      totalOrderAmount,
      totalPayplusAmount,
      difference: totalOrderAmount - totalPayplusAmount,
      completionRate: syncMaps.length > 0 
        ? Math.round((synced / syncMaps.length) * 100) 
        : 0,
    };

    // Sort: failed first, then pending, then complete
    items.sort((a, b) => {
      const order = { failed: 0, pending: 1, complete: 2, unknown: 3 };
      return (order[a.status] || 3) - (order[b.status] || 3);
    });

    return NextResponse.json({
      ok: true,
      summary,
      items: items.slice(0, 200), // Limit to 200 items
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_RECONCILIATION]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
