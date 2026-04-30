import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApiWithDevBypass } from '@/lib/devAdminBypass';

const SEED_COUNT = 10;

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

function buildSeedProduct({ tenantId, tenantName, index }) {
  const label = tenantName || String(tenantId);
  return {
    tenantId,
    name: `Test Product ${index} - ${label}`,
    description: 'Seeded test product for automated QA.',
    category: 'Test',
    price: 1,
    type: 'online',
    purchaseType: 'regular',
    status: 'draft',
    inStock: false,
    stockCount: 0,
    testSeed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * POST /api/admin/seed/add-10-products-per-tenant
 * Create 10 test seed products per tenant (no deletions).
 */
async function POSTHandler(req) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await requireAdminApiWithDevBypass(req);

    const db = await getDb();
    const tenantsCol = db.collection('tenants');
    const productsCol = db.collection('products');

    const tenants = await tenantsCol
      .find({}, { projection: { name: 1 } })
      .toArray();

    const inserts = [];
    const perTenant = [];

    for (const tenant of tenants) {
      const tenantId = tenant._id;
      const tenantName = tenant?.name || null;
      for (let i = 1; i <= SEED_COUNT; i += 1) {
        inserts.push(buildSeedProduct({ tenantId, tenantName, index: i }));
      }
      perTenant.push({
        tenantId: normalizeId(tenantId),
        tenantName,
        created: SEED_COUNT,
      });
    }

    if (inserts.length) {
      await productsCol.insertMany(inserts, { ordered: false });
    }

    return NextResponse.json({
      tenantsProcessed: tenants.length,
      createdTotal: inserts.length,
      perTenant,
    });
  } catch (err) {
    console.error('POST_ADD_10_PRODUCTS_PER_TENANT_ERROR:', err);
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

export const POST = withErrorLogging(POSTHandler);
