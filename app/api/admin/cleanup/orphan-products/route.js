import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireSuperAdminApi } from '@/lib/auth/server';

const ORPHAN_QUERY = {
  $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }],
};

function toIdString(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

/**
 * POST /api/admin/cleanup/orphan-products
 * Dry-run by default; confirmed requests can delete orphan products
 */
async function POSTHandler(req) {
  try {
    await requireSuperAdminApi(req);

    const db = await getDb();
    const products = db.collection('products');

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const confirm = typeof body?.confirm === 'string' ? body.confirm : '';

    if (!dryRun && confirm !== 'DELETE_ORPHAN_PRODUCTS') {
      return NextResponse.json(
        { error: 'Confirm token required for deletion' },
        { status: 400 },
      );
    }

    if (dryRun) {
      const [total, sample] = await Promise.all([
        products.countDocuments(ORPHAN_QUERY),
        products
          .find(ORPHAN_QUERY)
          .project({ _id: 1 })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray(),
      ]);

      return NextResponse.json({
        ok: true,
        total,
        sampleIds: sample.map(toIdString),
        dryRun: true,
      });
    }

    const sample = await products
      .find(ORPHAN_QUERY)
      .project({ _id: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    const result = await products.deleteMany(ORPHAN_QUERY);

    console.warn('[ORPHAN-CLEANUP] Deleted', result.deletedCount, 'orphan products');
    try {
      await db.collection('auditlogs').insertOne({
        action: 'cleanup_orphan_products',
        deletedCount: result.deletedCount || 0,
        sampleIds: sample.map(toIdString),
        ip: req.headers.get('x-forwarded-for') || '',
        createdAt: new Date(),
      });
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount || 0,
      deletedIdsSample: sample.map(toIdString),
      dryRun: false,
    });
  } catch (err) {
    console.error('POST_ORPHAN_PRODUCTS_CLEANUP_DRY_RUN_ERROR:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
