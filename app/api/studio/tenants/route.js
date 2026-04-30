import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,content-type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    const db = await getDb();

    if (isSuperAdminUser(admin)) {
      const tenants = await db
        .collection('tenants')
        .find({})
        .project({ _id: 1, name: 1, slug: 1, status: 1 })
        .sort({ name: 1 })
        .toArray();

      return NextResponse.json({
        ok: true,
        tenants: tenants.map((t) => ({
          _id: normalizeId(t._id),
          name: t?.name || 'ללא שם',
          slug: t?.slug || null,
          status: t?.status || 'active',
        })),
      }, { headers: CORS_HEADERS });
    }

    const tenantIdRaw = admin?.tenantId ? String(admin.tenantId) : '';
    if (!tenantIdRaw) {
      return NextResponse.json({ ok: true, tenants: [] }, { headers: CORS_HEADERS });
    }

    const tenantQuery = ObjectId.isValid(tenantIdRaw)
      ? { _id: new ObjectId(tenantIdRaw) }
      : { _id: tenantIdRaw };

    const tenant = await db
      .collection('tenants')
      .findOne(tenantQuery, { projection: { _id: 1, name: 1, slug: 1, status: 1 } });

    if (!tenant) {
      return NextResponse.json({ ok: true, tenants: [] }, { headers: CORS_HEADERS });
    }

    return NextResponse.json({
      ok: true,
      tenants: [
        {
          _id: normalizeId(tenant._id),
          name: tenant?.name || 'ללא שם',
          slug: tenant?.slug || null,
          status: tenant?.status || 'active',
        },
      ],
    }, { headers: CORS_HEADERS });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: CORS_HEADERS });
    }
    console.error('GET /api/studio/tenants error:', err);
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500, headers: CORS_HEADERS });
  }
}

export const GET = withErrorLogging(GETHandler);
