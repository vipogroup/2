import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApiWithDevBypass } from '@/lib/devAdminBypass';

const CONFIRM_TOKEN = 'ENFORCE_EXACT_5';
const CONFIRM_TOKEN_2 = 'I_UNDERSTAND_PRODUCTS_ONLY';
const DEFAULT_TARGET = 5;

const VALID_TENANT_QUERY = {
  tenantId: { $exists: true, $ne: null, $ne: '' },
};

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

function buildSeedProduct({ tenantId, tenantName, index }) {
  const label = tenantName || String(tenantId);
  return {
    tenantId,
    name: `Test Product ${index} - ${label}`,
    description: 'Seeded test product for safe enforcement.',
    category: 'Test',
    price: 0,
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
 * POST /api/admin/enforce/exact-5-products-safe
 * Ensure each tenant has at least target products by adding seed products only.
 */
async function POSTHandler(req) {
  try {
    await requireAdminApiWithDevBypass(req);

    const body = await req.json().catch(() => ({}));
    const targetPerTenant = Number.isFinite(Number(body?.targetPerTenant))
      ? Math.max(0, Number(body.targetPerTenant))
      : DEFAULT_TARGET;
    const dryRun = body?.dryRun !== false;
    const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
    const confirm2 = typeof body?.confirm2 === 'string' ? body.confirm2 : '';

    if (confirm !== CONFIRM_TOKEN || confirm2 !== CONFIRM_TOKEN_2) {
      return NextResponse.json(
        { error: 'Confirm tokens required for safe enforcement' },
        { status: 400 },
      );
    }

    const db = await getDb();
    const tenantsCol = db.collection('tenants');
    const productsCol = db.collection('products');

    const [tenants, grouped] = await Promise.all([
      tenantsCol.find({}, { projection: { name: 1 } }).toArray(),
      productsCol
        .aggregate([
          { $match: VALID_TENANT_QUERY },
          {
            $group: {
              _id: '$tenantId',
              countAll: { $sum: 1 },
              countSeed: { $sum: { $cond: [{ $eq: ['$testSeed', true] }, 1, 0] } },
            },
          },
        ])
        .toArray(),
    ]);

    const counts = new Map(
      grouped.map((row) => [normalizeId(row._id), row]),
    );

    const perTenant = [];
    let createdTotal = 0;
    const inserts = [];

    for (const tenant of tenants) {
      const tenantId = tenant._id;
      const tenantKey = normalizeId(tenantId);
      const tenantName = tenant?.name || null;
      const row = counts.get(tenantKey) || { countAll: 0, countSeed: 0 };
      const countAll = row.countAll || 0;
      const countSeed = row.countSeed || 0;
      const countNonSeed = countAll - countSeed;

      let create = 0;
      let status = 'OK';

      if (countAll < targetPerTenant) {
        create = targetPerTenant - countAll;
        status = 'FILLED';
      } else if (countAll > targetPerTenant) {
        status = 'OVER_TARGET';
      }

      createdTotal += create;

      if (!dryRun && create > 0) {
        for (let i = 1; i <= create; i += 1) {
          inserts.push(
            buildSeedProduct({ tenantId, tenantName, index: countAll + i }),
          );
        }
      }

      perTenant.push({
        tenantId: tenantKey,
        tenantName,
        countAllBefore: countAll,
        countNonSeed,
        countSeed,
        create,
        after: countAll + create,
        status,
      });
    }

    if (!dryRun && inserts.length) {
      await productsCol.insertMany(inserts);
    }

    return NextResponse.json({
      ok: true,
      targetPerTenant,
      dryRun,
      createdTotal,
      perTenant,
    });
  } catch (err) {
    console.error('POST_ENFORCE_EXACT_PRODUCTS_SAFE_ERROR:', err);
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
