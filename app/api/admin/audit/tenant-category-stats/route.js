import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireAdminApiWithDevBypass } from '@/lib/devAdminBypass';
import { isSuperAdminUser } from '@/lib/superAdmins';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pickBestTenant(tenants, query) {
  const q = normalizeName(query);
  if (!q) return tenants?.[0] || null;

  const exact = (tenants || []).find((t) => normalizeName(t?.name) === q);
  if (exact) return exact;

  const starts = (tenants || []).find((t) => normalizeName(t?.name).startsWith(q));
  if (starts) return starts;

  const includes = (tenants || []).find((t) => normalizeName(t?.name).includes(q));
  if (includes) return includes;

  return tenants?.[0] || null;
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApiWithDevBypass(req);
    if (!admin?.isDevBypass && !isSuperAdminUser(admin)) {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tenantIdRaw = String(searchParams.get('tenantId') || '').trim();
    const tenantNameRaw = String(searchParams.get('tenantName') || searchParams.get('q') || '').trim();
    const queryName = tenantNameRaw || 'מחסני נירוסטה';

    const db = await getDb();
    const tenantsCol = db.collection('tenants');
    const productsCol = db.collection('products');

    let tenant = null;
    let tenantCandidates = [];

    if (tenantIdRaw) {
      const tenantQuery = ObjectId.isValid(tenantIdRaw)
        ? { _id: new ObjectId(tenantIdRaw) }
        : { _id: tenantIdRaw };

      tenant = await tenantsCol.findOne(tenantQuery, { projection: { name: 1, slug: 1, status: 1 } });
      if (tenant) {
        tenantCandidates = [tenant];
      }
    } else {
      const regex = new RegExp(escapeRegex(queryName), 'i');
      tenantCandidates = await tenantsCol
        .find({ name: { $regex: regex } })
        .project({ name: 1, slug: 1, status: 1 })
        .sort({ name: 1 })
        .limit(20)
        .toArray();

      tenant = pickBestTenant(tenantCandidates, queryName);
    }

    if (!tenant) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Tenant not found',
          query: { tenantId: tenantIdRaw || null, tenantName: queryName },
          candidates: (tenantCandidates || []).map((t) => ({
            _id: normalizeId(t?._id),
            name: t?.name || null,
            slug: t?.slug || null,
            status: t?.status || null,
          })),
        },
        { status: 404 },
      );
    }

    const tenantId = normalizeId(tenant._id);
    const tenantObjectId = ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : null;

    const tenantMatch = tenantObjectId
      ? { tenantId: { $in: [tenantObjectId, tenantId] } }
      : { tenantId };

    const [result] = await productsCol
      .aggregate([
        { $match: tenantMatch },
        {
          $project: {
            category: { $trim: { input: { $ifNull: ['$category', ''] } } },
            subCategory: { $trim: { input: { $ifNull: ['$subCategory', ''] } } },
            status: { $ifNull: ['$status', 'published'] },
          },
        },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  totalProducts: { $sum: 1 },
                  publishedProducts: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
                  draftProducts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                  archivedProducts: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
                },
              },
            ],
            byCategory: [
              { $match: { category: { $ne: '' } } },
              {
                $group: {
                  _id: '$category',
                  totalProducts: { $sum: 1 },
                  publishedProducts: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
                  draftProducts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                  archivedProducts: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
                },
              },
              { $sort: { publishedProducts: -1, totalProducts: -1, _id: 1 } },
            ],
            bySubCategory: [
              { $match: { subCategory: { $ne: '' } } },
              {
                $group: {
                  _id: '$subCategory',
                  totalProducts: { $sum: 1 },
                  publishedProducts: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
                  draftProducts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                  archivedProducts: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
                },
              },
              { $sort: { publishedProducts: -1, totalProducts: -1, _id: 1 } },
            ],
          },
        },
      ])
      .toArray();

    const overall = Array.isArray(result?.overall) && result.overall.length ? result.overall[0] : null;

    return NextResponse.json({
      ok: true,
      query: { tenantId: tenantIdRaw || null, tenantName: queryName },
      tenant: {
        _id: tenantId,
        name: tenant?.name || null,
        slug: tenant?.slug || null,
        status: tenant?.status || null,
      },
      candidates: (tenantCandidates || []).map((t) => ({
        _id: normalizeId(t?._id),
        name: t?.name || null,
        slug: t?.slug || null,
        status: t?.status || null,
      })),
      overall: overall
        ? {
            totalProducts: Number(overall.totalProducts || 0),
            publishedProducts: Number(overall.publishedProducts || 0),
            draftProducts: Number(overall.draftProducts || 0),
            archivedProducts: Number(overall.archivedProducts || 0),
          }
        : { totalProducts: 0, publishedProducts: 0, draftProducts: 0, archivedProducts: 0 },
      byCategory: (result?.byCategory || []).map((row) => ({
        name: String(row?._id || '').trim(),
        totalProducts: Number(row?.totalProducts || 0),
        publishedProducts: Number(row?.publishedProducts || 0),
        draftProducts: Number(row?.draftProducts || 0),
        archivedProducts: Number(row?.archivedProducts || 0),
      })),
      bySubCategory: (result?.bySubCategory || []).map((row) => ({
        name: String(row?._id || '').trim(),
        totalProducts: Number(row?.totalProducts || 0),
        publishedProducts: Number(row?.publishedProducts || 0),
        draftProducts: Number(row?.draftProducts || 0),
        archivedProducts: Number(row?.archivedProducts || 0),
      })),
    });
  } catch (err) {
    console.error('GET_TENANT_CATEGORY_STATS_ERROR:', err);
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
