import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';

/**
 * POST /api/admin/fix-order-types
 * Fix existing orders that contain group products but were saved as 'regular'
 * Updates orderType to 'group' and commissionAvailableAt to 100 days from order date
 */
async function POSTHandler(req) {
  try {
    await requireAdminApi(req);

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const productsCol = db.collection('products');

    // Get all group products
    const groupProducts = await productsCol
      .find({
        $or: [
          { purchaseType: 'group' },
          { type: 'group' }
        ]
      })
      .project({ _id: 1 })
      .toArray();

    const groupProductIds = new Set(groupProducts.map(p => p._id.toString()));

    if (groupProductIds.size === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No group products found',
        fixed: 0
      });
    }

    // Get all orders that are marked as 'regular' or have no orderType
    const ordersToCheck = await ordersCol
      .find({
        $or: [
          { orderType: 'regular' },
          { orderType: { $exists: false } },
          { orderType: null }
        ]
      })
      .toArray();

    let fixedCount = 0;
    const fixedOrders = [];

    for (const order of ordersToCheck) {
      // Check if any item in the order is a group product
      const hasGroupProduct = order.items?.some(item => {
        const productId = item.productId?.toString();
        const purchaseType = item.purchaseType;
        const type = item.type;
        
        return (
          groupProductIds.has(productId) ||
          purchaseType === 'group' ||
          type === 'group'
        );
      });

      if (hasGroupProduct) {
        // Calculate new commissionAvailableAt (100 days from order creation)
        const orderDate = new Date(order.createdAt);
        const newCommissionAvailableAt = new Date(orderDate.getTime() + 100 * 24 * 60 * 60 * 1000);

        // Update the order
        await ordersCol.updateOne(
          { _id: order._id },
          {
            $set: {
              orderType: 'group',
              commissionAvailableAt: order.commissionAmount > 0 ? newCommissionAvailableAt : null,
              updatedAt: new Date()
            }
          }
        );

        fixedCount++;
        fixedOrders.push({
          orderId: order._id.toString(),
          oldType: order.orderType || 'undefined',
          newType: 'group',
          oldAvailableAt: order.commissionAvailableAt,
          newAvailableAt: newCommissionAvailableAt
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Fixed ${fixedCount} orders`,
      fixed: fixedCount,
      details: fixedOrders
    });

  } catch (err) {
    console.error('FIX_ORDER_TYPES_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/admin/fix-order-types
 * Preview which orders would be fixed (dry run)
 */
async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    const db = await getDb();
    const ordersCol = db.collection('orders');
    const productsCol = db.collection('products');

    // Get all group products
    const groupProducts = await productsCol
      .find({
        $or: [
          { purchaseType: 'group' },
          { type: 'group' }
        ]
      })
      .project({ _id: 1, name: 1 })
      .toArray();

    const groupProductIds = new Set(groupProducts.map(p => p._id.toString()));
    const groupProductNames = new Map(groupProducts.map(p => [p._id.toString(), p.name]));

    // Get all orders that are marked as 'regular' or have no orderType
    const ordersToCheck = await ordersCol
      .find({
        $or: [
          { orderType: 'regular' },
          { orderType: { $exists: false } },
          { orderType: null }
        ]
      })
      .toArray();

    const ordersToFix = [];

    for (const order of ordersToCheck) {
      const groupItemsInOrder = [];
      
      const hasGroupProduct = order.items?.some(item => {
        const productId = item.productId?.toString();
        const purchaseType = item.purchaseType;
        const type = item.type;
        
        const isGroup = (
          groupProductIds.has(productId) ||
          purchaseType === 'group' ||
          type === 'group'
        );

        if (isGroup) {
          groupItemsInOrder.push({
            productId,
            name: item.name || groupProductNames.get(productId) || 'Unknown',
            purchaseType: purchaseType || type || 'from DB'
          });
        }

        return isGroup;
      });

      if (hasGroupProduct) {
        ordersToFix.push({
          orderId: order._id.toString(),
          createdAt: order.createdAt,
          currentType: order.orderType || 'undefined',
          totalAmount: order.totalAmount,
          commissionAmount: order.commissionAmount,
          currentAvailableAt: order.commissionAvailableAt,
          groupItems: groupItemsInOrder
        });
      }
    }

    return NextResponse.json({
      ok: true,
      groupProductsCount: groupProducts.length,
      ordersChecked: ordersToCheck.length,
      ordersToFix: ordersToFix.length,
      preview: ordersToFix
    });

  } catch (err) {
    console.error('FIX_ORDER_TYPES_PREVIEW_ERROR:', err);
    const status = err?.status || 500;
    const message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ error: message }, { status });
  }
}

export const POST = withErrorLogging(POSTHandler);
export const GET = withErrorLogging(GETHandler);
