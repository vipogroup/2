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

function failure(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status, headers: CORS_HEADERS });
}

function normalizeTenantId(raw) {
  if (!raw) return { ok: false };
  const s = String(raw).trim();
  if (!s) return { ok: false };
  if (ObjectId.isValid(s)) {
    const oid = new ObjectId(s);
    return { ok: true, objectId: oid, stringId: oid.toString() };
  }
  return { ok: true, objectId: null, stringId: s };
}

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);

    const requested = normalizeTenantId(params?.tenantId);
    if (!requested.ok) return failure('Missing tenantId', 400);

    const superAdmin = isSuperAdminUser(admin);

    const sessionTenantRaw = admin?.tenantId ? String(admin.tenantId) : '';
    if (!superAdmin) {
      if (!sessionTenantRaw) return failure('Forbidden', 403);
      if (requested.stringId !== String(sessionTenantRaw)) return failure('Forbidden', 403);
    }

    const db = await getDb();

    const tenantFilter = {};
    if (requested.objectId) {
      tenantFilter.tenantId = { $in: [requested.objectId, requested.stringId] };
    } else {
      tenantFilter.tenantId = requested.stringId;
    }

    // --- helpers ---
    const normalizeNames = (values) => (values || [])
      .map((v) => String(v || '').trim())
      .filter(Boolean);

    const dedupeLower = (values) => {
      const out = new Map();
      for (const v of values || []) {
        const name = String(v || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!out.has(key)) out.set(key, name);
      }
      return Array.from(out.values());
    };

    // --- 1) Primary source: dedicated `categories` collection (same as Product Manager) ---
    const catFilter = {};
    if (requested.objectId) {
      catFilter.tenantId = { $in: [requested.objectId, requested.stringId] };
    } else {
      catFilter.tenantId = requested.stringId;
    }
    catFilter.isActive = { $ne: false };

    const tenantCategoryDocs = await db
      .collection('categories')
      .find(catFilter, { projection: { name: 1 } })
      .toArray();

    let chosen = dedupeLower(
      normalizeNames(tenantCategoryDocs.map((d) => d.name)),
    );

    // --- 2) Fallback: distinct category / subCategory from products ---
    if (!chosen.length) {
      const [subCategories, categoryFallback] = await Promise.all([
        db.collection('products').distinct('subCategory', {
          ...tenantFilter,
          subCategory: { $exists: true, $nin: [null, ''] },
        }),
        db.collection('products').distinct('category', {
          ...tenantFilter,
          category: { $exists: true, $nin: [null, ''] },
        }),
      ]);

      const catNames = dedupeLower(normalizeNames(categoryFallback));
      const subNames = dedupeLower(normalizeNames(subCategories));
      chosen = catNames.length > 1 ? catNames : subNames.length ? subNames : catNames;
    }

    const normalized = chosen.sort((a, b) => a.localeCompare(b, 'he'));

    return NextResponse.json({
      ok: true,
      tenantId: requested.stringId,
      categories: normalized.map((name) => ({ id: name, name })),
    }, { headers: CORS_HEADERS });
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: CORS_HEADERS });
    }
    console.error('GET /api/studio/tenants/[tenantId]/categories error:', err);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500, headers: CORS_HEADERS });
  }
}

export const GET = withErrorLogging(GETHandler);
