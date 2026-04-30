import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApiWithDevBypass } from '@/lib/devAdminBypass';

const VALID_TENANT_QUERY = {
  tenantId: { $exists: true, $ne: null, $ne: '' },
};

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

/**
 * GET /api/admin/audit/tenants-products-summary
 * Read-only summary of tenants and products counts
 */
async function GETHandler(req) {
  try {
    await requireAdminApiWithDevBypass(req);

    const db = await getDb();
    const tenantsCol = db.collection('tenants');
    const productsCol = db.collection('products');

    const [tenants, totalProducts, grouped] = await Promise.all([
      tenantsCol.find({}, { projection: { name: 1 } }).toArray(),
      productsCol.countDocuments({}),
      productsCol
        .aggregate([
          { $match: VALID_TENANT_QUERY },
          { $group: { _id: '$tenantId', productsCount: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const counts = new Map(
      grouped.map((row) => [normalizeId(row._id), row.productsCount || 0]),
    );

    const perTenant = tenants
      .map((tenant) => {
        const tenantId = normalizeId(tenant._id);
        const productsCount = counts.get(tenantId) || 0;
        return {
          tenantId,
          tenantName: tenant.name || null,
          productsCount,
          hasAtLeast5Products: productsCount >= 5,
        };
      })
      .sort((a, b) => a.productsCount - b.productsCount);

    return NextResponse.json({
      ok: true,
      totalTenants: tenants.length,
      totalProducts,
      perTenant,
    });
  } catch (err) {
    console.error('GET_TENANTS_PRODUCTS_SUMMARY_ERROR:', err);
    const status = err?.status || 500;

    if (status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status });
    }

    if (status === 403) {
      return NextResponse.json({ error: err?.message || 'Forbidden' }, { status });
    }

    const body = { error: 'Server error' };
    if (process.env.NODE_ENV === 'development' && err?.stack) {
      body.stack = err.stack;
    }
    return NextResponse.json(body, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
