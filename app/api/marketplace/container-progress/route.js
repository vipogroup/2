import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/container-progress
 * Returns aggregated shared container progress across ALL tenants.
 * Sums up quantities from all PAID orders for shared_container products.
 * Container capacity: 68 CBM (40HQ).
 * 
 * Query params:
 * - productId: optional, filter for a specific product
 * - scope: optional, 'shared' (default) or 'all' — 'shared' only counts products with containerScope='shared'
 */
export async function GET(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const productIdParam = searchParams.get('productId');
    const scopeParam = searchParams.get('scope') || 'shared';

    // Find all PAID orders that contain shared_container items
    const paidOrders = await Order.find({
      status: { $in: ['paid', 'completed'] },
    })
      .select('items totalAmount status createdAt tenantId')
      .lean();

    // Get shared_container products — filter by containerScope if needed
    const productFilter = {
      purchaseType: 'group',
      groupPurchaseType: 'shared_container',
    };
    if (scopeParam === 'shared') {
      productFilter.containerScope = 'shared';
    }
    if (productIdParam) {
      const { ObjectId } = (await import('mongodb'));
      if (ObjectId.isValid(productIdParam)) {
        productFilter._id = new ObjectId(productIdParam);
      }
    }

    const sharedContainerProducts = await Product.find(productFilter)
      .select('_id name sku size groupPurchaseDetails groupCurrentQuantity price tenantId containerScope')
      .lean();

    const scProductIds = new Set(
      sharedContainerProducts.map((p) => p._id.toString())
    );

    // Aggregate quantities from orders
    let totalUnits = 0;
    let totalRevenue = 0;
    const perProduct = {};

    for (const order of paidOrders) {
      const items = order.items || [];
      for (const item of items) {
        const pid = item.productId?.toString();
        if (!pid || !scProductIds.has(pid)) continue;
        // Only count shared_container items
        if (
          item.groupPurchaseType !== 'shared_container' &&
          item.purchaseType !== 'group'
        ) {
          // Check if the product itself is shared_container
          if (!scProductIds.has(pid)) continue;
        }

        const qty = item.quantity || 1;
        totalUnits += qty;
        totalRevenue += (item.totalPrice || item.unitPrice * qty) || 0;

        if (!perProduct[pid]) {
          const prod = sharedContainerProducts.find(
            (p) => p._id.toString() === pid
          );
          perProduct[pid] = {
            productId: pid,
            name: prod?.name || item.name || 'Unknown',
            sku: prod?.sku || item.sku || '',
            ordered: 0,
          };
        }
        perProduct[pid].ordered += qty;
      }
    }

    // Also count from product-level groupCurrentQuantity (fallback for orders without items array)
    let totalFromProducts = 0;
    for (const prod of sharedContainerProducts) {
      const current =
        prod.groupCurrentQuantity ||
        prod.groupPurchaseDetails?.currentQuantity ||
        0;
      totalFromProducts += current;
    }

    // Use the higher of the two counts (orders vs product counters)
    const finalTotalUnits = Math.max(totalUnits, totalFromProducts);

    // Container capacity: 68 CBM for 40HQ
    const CONTAINER_CBM = 68;

    return NextResponse.json({
      totalUnits: finalTotalUnits,
      totalUnitsFromOrders: totalUnits,
      totalUnitsFromProducts: totalFromProducts,
      totalRevenue,
      containerCapacityCBM: CONTAINER_CBM,
      productsCount: sharedContainerProducts.length,
      perProduct: Object.values(perProduct),
    });
  } catch (error) {
    console.error('GET /api/marketplace/container-progress error:', error);
    return NextResponse.json(
      { error: 'Failed to load container progress' },
      { status: 500 }
    );
  }
}
