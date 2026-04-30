/**
 * Admin API - PayPlus Reconciliation
 * GET /api/admin/payplus/reconciliation - דוח התאמות
 * POST /api/admin/payplus/reconciliation - סגירת פערים
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import PaymentEvent from '@/models/PaymentEvent';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';
import Order from '@/models/Order';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get all successful payment events in range
    const paymentEvents = await PaymentEvent.find({
      type: 'success',
      status: 'processed',
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).lean();

    // Get corresponding orders
    const orderIds = paymentEvents.map(e => e.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } }).lean();
    const ordersMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});

    // Get sync maps for amount comparison
    const syncMaps = await IntegrationSyncMap.find({ orderId: { $in: orderIds } }).lean();
    const syncMapsMap = syncMaps.reduce((acc, s) => {
      acc[s.orderId.toString()] = s;
      return acc;
    }, {});

    // Build reconciliation report
    const items = [];
    let totalPayments = 0;
    let totalOrders = 0;
    let mismatches = 0;
    let missing = 0;

    for (const event of paymentEvents) {
      const orderId = event.orderId.toString();
      const order = ordersMap[orderId];
      const syncMap = syncMapsMap[orderId];

      totalPayments += event.amount;

      if (!order) {
        missing++;
        items.push({
          eventId: event.eventId,
          orderId,
          status: 'missing_order',
          paymentAmount: event.amount,
          orderAmount: null,
          diff: event.amount,
          syncStatus: syncMap?.syncStatus || 'unknown',
        });
        continue;
      }

      totalOrders += order.totalAmount;
      const diff = Math.abs(event.amount - order.totalAmount);
      const hasMismatch = diff > 0.01;

      if (hasMismatch) {
        mismatches++;
      }

      items.push({
        eventId: event.eventId,
        orderId,
        orderNumber: order.orderNumber,
        status: hasMismatch ? 'mismatch' : 'matched',
        paymentAmount: event.amount,
        orderAmount: order.totalAmount,
        diff: hasMismatch ? diff : 0,
        syncStatus: syncMap?.syncStatus || 'pending',
        priorityInvoice: syncMap?.invoiceNumber,
        createdAt: event.createdAt,
      });
    }

    // Summary
    const summary = {
      period: { startDate, endDate },
      totalEvents: paymentEvents.length,
      totalPaymentAmount: totalPayments,
      totalOrderAmount: totalOrders,
      difference: totalPayments - totalOrders,
      matched: paymentEvents.length - mismatches - missing,
      mismatches,
      missingOrders: missing,
      reconciled: items.filter(i => i.status === 'matched').length,
    };

    return NextResponse.json({
      ok: true,
      summary,
      items: items.sort((a, b) => {
        // Sort: mismatches first, then missing, then matched
        const order = { mismatch: 0, missing_order: 1, matched: 2 };
        return (order[a.status] || 3) - (order[b.status] || 3);
      }),
    });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_RECONCILIATION]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);

    await dbConnect();

    const body = await req.json();
    const { action, orderId, notes, startDate, endDate } = body || {};

    if (action === 'mark_reconciled') {
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
      }
      const syncMap = await IntegrationSyncMap.findOne({ orderId });
      if (!syncMap) {
        return NextResponse.json({ error: 'Sync map not found' }, { status: 404 });
      }

      syncMap.reconciled = true;
      syncMap.reconciledAt = new Date();
      syncMap.reconciledBy = admin.id || admin._id || null;
      syncMap.reconciliationNotes = notes;
      await syncMap.save();

      return NextResponse.json({
        ok: true,
        message: 'Order marked as reconciled',
      });
    }

    if (action === 'close_period') {
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
      }
      
      // Mark all items in period as reconciled
      const result = await IntegrationSyncMap.updateMany(
        {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          reconciled: false,
          syncStatus: 'synced',
        },
        {
          $set: {
            reconciled: true,
            reconciledAt: new Date(),
            reconciledBy: admin.id || admin._id || null,
            reconciliationNotes: `Period closed: ${startDate} - ${endDate}`,
          },
        }
      );

      return NextResponse.json({
        ok: true,
        message: `Closed ${result.modifiedCount} items`,
        modifiedCount: result.modifiedCount,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[ADMIN_PAYPLUS_RECONCILIATION_ACTION]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
