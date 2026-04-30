export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { requireAuthApi } from '@/lib/auth/server';

/**
 * GET /api/customer/orders
 * Get all orders for logged in customer, grouped by business
 */
export async function GET(req) {
  try {
    const user = await requireAuthApi(req);
    
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const userId = new ObjectId(user.id);

    // Get all orders for this customer
    const orders = await db.collection('orders')
      .find({
        $or: [
          { createdBy: userId },
          { createdBy: user.id },
          { 'customer.email': user.email },
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (orders.length === 0) {
      return NextResponse.json({ ok: true, businesses: [], totalOrders: 0 });
    }

    try {
      const productIds = [];

      orders.forEach((order) => {
        const orderItems = Array.isArray(order?.items) ? order.items : [];
        orderItems.forEach((item) => {
          const productId = item?.productId;
          if (!productId) return;
          if (productId instanceof ObjectId) {
            productIds.push(productId);
            return;
          }
          if (ObjectId.isValid(productId)) {
            productIds.push(new ObjectId(productId));
          }
        });
      });

      const uniqueProductIds = Array.from(
        new Map(productIds.map((id) => [id.toHexString(), id])).values(),
      );

      if (uniqueProductIds.length > 0) {
        const products = await db
          .collection('products')
          .find({ _id: { $in: uniqueProductIds } })
          .project({ _id: 1, groupPurchaseType: 1, purchaseType: 1, type: 1, sku: 1 })
          .toArray();

        const productMap = new Map(products.map((p) => [p._id.toHexString(), p]));

        orders.forEach((order) => {
          if (!Array.isArray(order?.items)) return;
          order.items.forEach((item) => {
            const rawId = item?.productId;
            const key =
              rawId instanceof ObjectId
                ? rawId.toHexString()
                : ObjectId.isValid(rawId)
                  ? String(rawId)
                  : null;
            if (!key) return;

            const product = productMap.get(key);
            if (!product) return;

            if (item.groupPurchaseType == null && product.groupPurchaseType != null) {
              item.groupPurchaseType = product.groupPurchaseType;
            }

            if (item.purchaseType == null) {
              item.purchaseType = product.purchaseType || product.type || item.purchaseType;
            }

            if (item.sku == null && product.sku) {
              item.sku = product.sku;
            }
          });
        });
      }
    } catch (enrichErr) {
      console.warn(
        'Customer orders product enrichment failed:',
        enrichErr?.message || enrichErr,
      );
    }

    // Get unique tenant IDs
    const tenantIds = [...new Set(
      orders
        .filter(o => o.tenantId)
        .map(o => o.tenantId.toString())
    )].map(id => new ObjectId(id));

    // Get tenant details
    const tenants = tenantIds.length > 0
      ? await db.collection('tenants')
          .find({ _id: { $in: tenantIds } })
          .project({ name: 1, slug: 1, logo: 1 })
          .toArray()
      : [];

    const tenantMap = new Map(tenants.map(t => [t._id.toString(), t]));

    // Group orders by tenant
    const ordersByTenant = {};
    let globalOrders = [];

    for (const order of orders) {
      const tenantIdStr = order.tenantId?.toString();
      
      if (tenantIdStr) {
        if (!ordersByTenant[tenantIdStr]) {
          ordersByTenant[tenantIdStr] = [];
        }
        ordersByTenant[tenantIdStr].push(order);
      } else {
        globalOrders.push(order);
      }
    }

    // Build response
    const businesses = Object.entries(ordersByTenant).map(([tenantId, tenantOrders]) => {
      const tenant = tenantMap.get(tenantId);
      return {
        tenantId,
        tenantName: tenant?.name || 'חנות',
        tenantSlug: tenant?.slug || '',
        tenantLogo: tenant?.logo || null,
        ordersCount: tenantOrders.length,
        totalSpent: tenantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        lastOrderDate: tenantOrders[0]?.createdAt || null,
        orders: tenantOrders.map(o => ({
          _id: o._id.toString(),
          createdAt: o.createdAt,
          status: o.status,
          orderType: o.orderType,
          totalAmount: o.totalAmount || 0,
          itemsCount: o.items?.length || 0,
          items: o.items?.slice(0, 3).map(item => ({
            name: item.name || item.productName,
            price: item.price,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            quantity: item.quantity,
            image: item.image,
            purchaseType: item.purchaseType || item.type,
            groupPurchaseType: item.groupPurchaseType,
          })) || [],
        })),
      };
    });

    // Sort businesses by last order date
    businesses.sort((a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate));

    // Add global orders if any
    if (globalOrders.length > 0) {
      businesses.push({
        tenantId: null,
        tenantName: 'הזמנות כלליות',
        tenantSlug: '',
        tenantLogo: null,
        ordersCount: globalOrders.length,
        totalSpent: globalOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        lastOrderDate: globalOrders[0]?.createdAt || null,
        orders: globalOrders.map(o => ({
          _id: o._id.toString(),
          createdAt: o.createdAt,
          status: o.status,
          orderType: o.orderType,
          totalAmount: o.totalAmount || 0,
          itemsCount: o.items?.length || 0,
          items: o.items?.slice(0, 3).map(item => ({
            name: item.name || item.productName,
            price: item.price,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            quantity: item.quantity,
            image: item.image,
            purchaseType: item.purchaseType || item.type,
            groupPurchaseType: item.groupPurchaseType,
          })) || [],
        })),
      });
    }

    return NextResponse.json({
      ok: true,
      businesses,
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    });

  } catch (err) {
    console.error('CUSTOMER_ORDERS_GET_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
