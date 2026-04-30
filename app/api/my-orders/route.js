import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

/**
 * GET /api/my-orders
 * Returns orders where the current user is the CUSTOMER (not as agent)
 */
async function GETHandler(req) {
  let user;
  try {
    user = await requireAuthApi(req);
  } catch (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: authErr.status || 401 });
  }

  try {
    const db = await getDb();
    const ordersCol = db.collection('orders');

    // Build query to find orders where user is the customer
    const customerCriteria = [];
    
    if (ObjectId.isValid(user.id)) {
      customerCriteria.push({ customerId: new ObjectId(user.id) });
      customerCriteria.push({ userId: new ObjectId(user.id) });
    }
    
    if (user.email) {
      customerCriteria.push({ customerEmail: user.email });
      customerCriteria.push({ 'customer.email': user.email });
    }
    
    if (user.phone) {
      customerCriteria.push({ customerPhone: user.phone });
      customerCriteria.push({ 'customer.phone': user.phone });
    }

    if (customerCriteria.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const orders = await ordersCol
      .find({ $or: customerCriteria })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

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
      console.warn('My orders product enrichment failed:', enrichErr?.message || enrichErr);
    }

    return NextResponse.json({ ok: true, orders });
  } catch (err) {
    console.error('MY_ORDERS_ERROR', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
