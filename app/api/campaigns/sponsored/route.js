import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/campaigns/sponsored
 * Returns active sponsored campaigns with their product data,
 * filtered by placement slot (homepage / category / search).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get('placement') || 'homepage';
    const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 20);

    const db = await getDb();
    const now = new Date();

    // Fetch active campaigns matching the placement
    const campaigns = await db
      .collection('paid_campaigns')
      .find({
        status: 'active',
        placement: placement,
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
      })
      .sort({ dailyBudget: -1 }) // Higher budget = higher priority
      .limit(limit)
      .toArray();

    if (campaigns.length === 0) {
      return NextResponse.json({ sponsored: [] });
    }

    // Fetch product details for each campaign
    const productIds = campaigns
      .map((c) => {
        try {
          return ObjectId.isValid(c.productId) ? new ObjectId(c.productId) : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const products = await db
      .collection('products')
      .find({ _id: { $in: productIds }, status: 'published', active: { $ne: false } })
      .project({ name: 1, images: 1, price: 1, originalPrice: 1, groupPrice: 1, seo: 1, legacyId: 1, tenant: 1, purchaseType: 1, inventoryMode: 1, groupPurchaseType: 1, isFeatured: 1 })
      .toArray();

    const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

    const sponsored = campaigns
      .map((c) => {
        const product = productMap[c.productId?.toString()];
        if (!product) return null;
        return {
          ...product,
          _id: product._id,
          _campaignId: c._id.toString(),
          isSponsored: true,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ sponsored });
  } catch (err) {
    console.error('[sponsored/route] error:', err);
    return NextResponse.json({ sponsored: [] });
  }
}
