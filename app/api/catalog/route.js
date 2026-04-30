import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import { getCurrentTenant } from '@/lib/tenant';

async function GETHandler(req) {
  try {
    await connectMongo();

    // Multi-Tenant: Filter by tenant
    const tenant = await getCurrentTenant(req);
    const filter = {};
    if (tenant) {
      filter.tenantId = tenant._id;
    }

    const products = await Product.find(filter).sort({ sortOrder: 1 }).lean();

    return new Response(JSON.stringify({ ok: true, products }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'catalog_fetch_failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export const GET = withErrorLogging(GETHandler);
