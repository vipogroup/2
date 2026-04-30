import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';

const ORPHAN_QUERY = {
  $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }],
};

function serializeProduct(doc) {
  return {
    _id: doc?._id?.toString?.() || String(doc?._id),
    name: doc?.name || null,
    createdAt: doc?.createdAt || null,
  };
}

/**
 * GET /api/admin/audit/orphan-products
 * Read-only audit of products without tenantId
 */
async function GETHandler(req) {
  try {
    await requireAdminApi(req);

    const db = await getDb();
    const products = await db
      .collection('products')
      .find(ORPHAN_QUERY)
      .project({ name: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      ok: true,
      total: products.length,
      products: products.map(serializeProduct),
    });
  } catch (err) {
    console.error('GET_ORPHAN_PRODUCTS_AUDIT_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
