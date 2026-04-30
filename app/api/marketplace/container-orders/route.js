import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

function buildFallbackOrdersResponse(reason = 'db_unavailable') {
  return NextResponse.json(
    {
      ok: true,
      orders: [],
      total: 0,
      dataMode: 'fallback',
      fallback: {
        reason,
        message: 'Database unavailable. Returning empty container orders list.',
      },
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-data-mode': 'fallback',
        'x-vipo-fallback': 'true',
        'x-vipo-fallback-reason': reason,
      },
    },
  );
}

/**
 * GET /api/marketplace/container-orders
 * Returns all PAID orders containing shared_container products
 * across ALL tenants, enriched with tenant name.
 * Used by the Catalog Manager logistics tab for cross-tenant view.
 */
export async function GET(req) {
  try {
    const conn = await connectMongo();
    if (!conn) {
      return buildFallbackOrdersResponse('db_unavailable');
    }

    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    if (!db) {
      return buildFallbackOrdersResponse('db_unavailable');
    }

    // 1) Get all shared_container product IDs (only shared scope = cross-tenant)
    const scProducts = await Product.find({
      purchaseType: 'group',
      groupPurchaseType: 'shared_container',
      containerScope: 'shared',
    })
      .select('_id sku name tenantId containerScope')
      .lean();

    const scProductIds = new Set(scProducts.map((p) => p._id.toString()));
    const productTenantMap = new Map(
      scProducts.map((p) => [p._id.toString(), p.tenantId?.toString() || null])
    );

    // 2) Get all tenants for name lookup
    const tenants = await db.collection('tenants').find({}).project({ _id: 1, name: 1 }).toArray();
    const tenantNameMap = new Map(tenants.map((t) => [t._id.toString(), t.name]));

    // 3) Find all PAID/COMPLETED orders
    const paidOrders = await Order.find({
      status: { $in: ['paid', 'completed'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // 4) Filter to only orders that contain shared_container items
    const result = [];
    for (const order of paidOrders) {
      const items = Array.isArray(order.items) ? order.items : [];
      const scItems = items.filter((item) => {
        const pid = item.productId?.toString();
        return pid && scProductIds.has(pid);
      });

      if (scItems.length === 0) continue;

      // Determine tenant name from order or from product
      const orderTenantId = order.tenantId?.toString();
      let tenantName = orderTenantId ? tenantNameMap.get(orderTenantId) : null;

      // Fallback: get tenant from the first SC product in the order
      if (!tenantName && scItems.length > 0) {
        const firstPid = scItems[0].productId?.toString();
        const prodTenantId = firstPid ? productTenantMap.get(firstPid) : null;
        if (prodTenantId) tenantName = tenantNameMap.get(prodTenantId);
      }

      result.push({
        _id: order._id,
        status: order.status,
        items: scItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          purchaseType: item.purchaseType,
          groupPurchaseType: item.groupPurchaseType,
        })),
        totalAmount: order.totalAmount,
        tenantId: orderTenantId || null,
        tenantName: tenantName || 'לא ידוע',
        customerName:
          order.customerName ||
          order.customer?.name ||
          order.shippingDetails?.fullName ||
          '-',
        createdAt: order.createdAt,
      });
    }

    return NextResponse.json({
      ok: true,
      orders: result,
      total: result.length,
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return buildFallbackOrdersResponse('db_unavailable');
    }
    console.error('GET /api/marketplace/container-orders error:', error);
    return NextResponse.json(
      { error: 'Failed to load container orders' },
      { status: 500 }
    );
  }
}
