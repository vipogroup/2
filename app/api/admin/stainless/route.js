import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import StainlessProduct from '@/models/StainlessProduct';

function serializeCatalogProduct(doc) {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return {
    ...obj,
    _id: obj._id?.toString?.() ?? obj._id,
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : null,
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : null,
  };
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    await connectMongo();

    const tenantId = admin?.tenantId ? String(admin.tenantId) : null;
    if (!tenantId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const items = await StainlessProduct.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      items: items.map((item) => serializeCatalogProduct(item)),
    });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/admin/catalog-manager error:', err);
    return NextResponse.json({ error: 'Failed to load catalog products' }, { status: 500 });
  }
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    await connectMongo();

    const tenantId = admin?.tenantId ? String(admin.tenantId) : null;
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const body = await req.json();
    const payload = {
      title: typeof body?.title === 'string' ? body.title.trim() : '',
      description: typeof body?.description === 'string' ? body.description : '',
      price: Number(body?.price) || 0,
      images: Array.isArray(body?.images) ? body.images : [],
      category: typeof body?.category === 'string' ? body.category.trim() : '',
      tenantId,
    };

    const doc = await StainlessProduct.create(payload);

    return NextResponse.json(
      { ok: true, product: serializeCatalogProduct(doc) },
      { status: 201 },
    );
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/admin/catalog-manager error:', err);
    return NextResponse.json({ error: 'Failed to create catalog product' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
