/**
 * Admin API - Priority Documents
 * GET /api/admin/priority/documents - רשימת מסמכים (חשבוניות, קבלות, זיכויים)
 */

import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/server';
import dbConnect from '@/lib/dbConnect';
import IntegrationSyncMap from '@/models/IntegrationSyncMap';
import Order from '@/models/Order';

async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const docType = searchParams.get('type'); // invoice, receipt, credit_note, sales_order
    const syncStatus = searchParams.get('syncStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (docType === 'invoice') {
      query.priorityInvoiceId = { $exists: true, $ne: null };
    } else if (docType === 'receipt') {
      query.priorityReceiptId = { $exists: true, $ne: null };
    } else if (docType === 'credit_note') {
      query.priorityCreditNoteId = { $exists: true, $ne: null };
    } else if (docType === 'sales_order') {
      query.prioritySalesOrderId = { $exists: true, $ne: null };
    } else {
      // All documents
      query.$or = [
        { priorityInvoiceId: { $exists: true, $ne: null } },
        { prioritySalesOrderId: { $exists: true, $ne: null } },
      ];
    }

    if (syncStatus) {
      query.syncStatus = syncStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [syncMaps, total] = await Promise.all([
      IntegrationSyncMap.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IntegrationSyncMap.countDocuments(query),
    ]);

    // Get order details
    const orderIds = syncMaps.map(s => s.orderId);
    const orders = await Order.find({ _id: { $in: orderIds } })
      .select('totalAmount customerName status createdAt')
      .lean();
    const ordersMap = orders.reduce((acc, o) => {
      acc[o._id.toString()] = o;
      return acc;
    }, {});

    // Build documents list
    const documents = syncMaps.map(syncMap => {
      const order = ordersMap[syncMap.orderId?.toString()];
      
      const docs = [];
      
      if (syncMap.prioritySalesOrderId) {
        docs.push({
          type: 'sales_order',
          typeHe: 'הזמנה',
          docId: syncMap.prioritySalesOrderId,
          docNumber: syncMap.prioritySalesOrderId,
        });
      }
      
      if (syncMap.priorityInvoiceId) {
        docs.push({
          type: 'invoice',
          typeHe: 'חשבונית',
          docId: syncMap.priorityInvoiceId,
          docNumber: syncMap.invoiceNumber,
        });
      }
      
      if (syncMap.priorityReceiptId) {
        docs.push({
          type: 'receipt',
          typeHe: 'קבלה',
          docId: syncMap.priorityReceiptId,
          docNumber: syncMap.receiptNumber,
        });
      }
      
      if (syncMap.priorityCreditNoteId) {
        docs.push({
          type: 'credit_note',
          typeHe: 'זיכוי',
          docId: syncMap.priorityCreditNoteId,
          docNumber: syncMap.creditNoteNumber,
        });
      }

      return {
        syncMapId: syncMap._id,
        orderId: syncMap.orderId,
        orderAmount: order?.totalAmount,
        customerName: order?.customerName,
        orderStatus: order?.status,
        syncStatus: syncMap.syncStatus,
        documents: docs,
        priorityCustomerId: syncMap.priorityCustomerId,
        createdAt: syncMap.createdAt,
        lastSyncAttempt: syncMap.lastSyncAttempt,
        lastError: syncMap.errorLog?.slice(-1)[0],
      };
    });

    // Stats
    const stats = await IntegrationSyncMap.aggregate([
      {
        $group: {
          _id: null,
          totalInvoices: {
            $sum: { $cond: [{ $ne: ['$priorityInvoiceId', null] }, 1, 0] },
          },
          totalReceipts: {
            $sum: { $cond: [{ $ne: ['$priorityReceiptId', null] }, 1, 0] },
          },
          totalCreditNotes: {
            $sum: { $cond: [{ $ne: ['$priorityCreditNoteId', null] }, 1, 0] },
          },
          totalSalesOrders: {
            $sum: { $cond: [{ $ne: ['$prioritySalesOrderId', null] }, 1, 0] },
          },
        },
      },
    ]);

    return NextResponse.json({
      ok: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalInvoices: 0,
        totalReceipts: 0,
        totalCreditNotes: 0,
        totalSalesOrders: 0,
      },
    });

  } catch (err) {
    console.error('[ADMIN_PRIORITY_DOCUMENTS]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
