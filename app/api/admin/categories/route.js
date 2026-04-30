import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import { requireSuperAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';

function normalizeId(value) {
  return value?._id?.toString?.() || value?.toString?.() || String(value);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function ensurePlatformOwner(req) {
  const user = await requireSuperAdminApi(req);
  if (!isSuperAdminUser(user)) {
    const err = new Error('Forbidden - Super Admin access required');
    err.status = 403;
    throw err;
  }
  return user;
}

async function GETHandler(req) {
  try {
    await ensurePlatformOwner(req);

    const db = await getDb();
    const productsCol = db.collection('products');
    const tenantsCol = db.collection('tenants');
    const categoriesCol = db.collection('categories');

    const categoryDocs = await categoriesCol
      .find({ type: 'product' }, { projection: { name: 1, active: 1 } })
      .toArray();

    const docByLower = new Map();
    for (const doc of categoryDocs || []) {
      const name = String(doc?.name || '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      const prev = docByLower.get(lower) || null;
      docByLower.set(lower, {
        name: prev?.name || name,
        active: (prev ? prev.active : true) && doc?.active !== false,
      });
    }

    const usage = await productsCol
      .aggregate([
        {
          $match: {
            tenantId: { $exists: true, $ne: null, $ne: '' },
            category: { $exists: true, $ne: null, $ne: '' },
          },
        },
        {
          $project: {
            tenantId: 1,
            category: { $trim: { input: '$category' } },
            status: { $ifNull: ['$status', 'published'] },
          },
        },
        { $match: { category: { $ne: '' } } },
        {
          $group: {
            _id: { category: '$category', tenantId: '$tenantId' },
            totalProducts: { $sum: 1 },
            publishedProducts: {
              $sum: {
                $cond: [{ $eq: ['$status', 'published'] }, 1, 0],
              },
            },
          },
        },
        {
          $group: {
            _id: '$_id.category',
            totalProducts: { $sum: '$totalProducts' },
            publishedProducts: { $sum: '$publishedProducts' },
            tenants: {
              $push: {
                tenantId: '$_id.tenantId',
                totalProducts: '$totalProducts',
                publishedProducts: '$publishedProducts',
              },
            },
          },
        },
        { $sort: { publishedProducts: -1, totalProducts: -1, _id: 1 } },
      ])
      .toArray();

    const usedMap = new Map();
    const tenantIds = new Set();

    for (const row of usage || []) {
      const name = String(row?._id || '').trim();
      if (!name) continue;

      const tenants = Array.isArray(row?.tenants) ? row.tenants : [];
      for (const t of tenants) {
        if (t?.tenantId) tenantIds.add(normalizeId(t.tenantId));
      }

      usedMap.set(name.toLowerCase(), {
        name,
        totalProducts: Number(row?.totalProducts || 0),
        publishedProducts: Number(row?.publishedProducts || 0),
        tenants,
      });
    }

    const objectIds = [];
    for (const raw of tenantIds) {
      if (ObjectId.isValid(raw)) {
        objectIds.push(new ObjectId(raw));
      }
    }

    const tenants = objectIds.length
      ? await tenantsCol.find({ _id: { $in: objectIds } }, { projection: { name: 1, slug: 1 } }).toArray()
      : [];

    const tenantById = new Map(
      (tenants || []).map((t) => [normalizeId(t._id), { name: t?.name || null, slug: t?.slug || null }]),
    );

    const mergedByLower = new Map();

    for (const [lower, entry] of usedMap.entries()) {
      const doc = docByLower.get(lower) || null;
      mergedByLower.set(lower, {
        name: doc?.name || entry.name,
        active: doc ? doc.active : true,
        hasCategoryDoc: !!doc,
        totalProducts: entry.totalProducts,
        publishedProducts: entry.publishedProducts,
        tenants: (entry.tenants || [])
          .map((t) => {
            const tenantId = normalizeId(t?.tenantId);
            const info = tenantById.get(tenantId) || {};
            return {
              tenantId,
              tenantName: info.name || null,
              tenantSlug: info.slug || null,
              totalProducts: Number(t?.totalProducts || 0),
              publishedProducts: Number(t?.publishedProducts || 0),
            };
          })
          .sort((a, b) => (b.publishedProducts || 0) - (a.publishedProducts || 0)),
      });
    }

    for (const doc of categoryDocs || []) {
      const name = String(doc?.name || '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (mergedByLower.has(lower)) continue;

      mergedByLower.set(lower, {
        name,
        active: doc?.active !== false,
        hasCategoryDoc: true,
        totalProducts: 0,
        publishedProducts: 0,
        tenants: [],
      });
    }

    const categories = Array.from(mergedByLower.values()).sort((a, b) => {
      const aPub = Number(a?.publishedProducts || 0);
      const bPub = Number(b?.publishedProducts || 0);
      if (aPub !== bPub) return bPub - aPub;
      const aTotal = Number(a?.totalProducts || 0);
      const bTotal = Number(b?.totalProducts || 0);
      if (aTotal !== bTotal) return bTotal - aTotal;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'he');
    });

    return NextResponse.json({ ok: true, categories });
  } catch (err) {
    console.error('GET_ADMIN_CATEGORIES_ERROR:', err);
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

async function DELETEHandler(req) {
  try {
    await ensurePlatformOwner(req);

    const { searchParams } = new URL(req.url);
    const nameRaw = searchParams.get('name');
    const nameManyRaw = searchParams.getAll('name');

    let body = {};
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = await req.json().catch(() => ({}));
      }
    } catch {
      body = {};
    }

    const candidateNames = [];
    const nameFromQuery = String(nameRaw || '').trim();
    if (nameFromQuery) candidateNames.push(nameFromQuery);

    for (const n of nameManyRaw || []) {
      const trimmed = String(n || '').trim();
      if (trimmed) candidateNames.push(trimmed);
    }

    const nameFromBody = String(body?.name || '').trim();
    if (nameFromBody) candidateNames.push(nameFromBody);

    const namesFromBody = Array.isArray(body?.names) ? body.names : [];
    for (const n of namesFromBody) {
      const trimmed = String(n || '').trim();
      if (trimmed) candidateNames.push(trimmed);
    }

    const names = Array.from(
      new Map(candidateNames.map((n) => [n.toLowerCase(), n])).values(),
    );

    if (!names.length) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const db = await getDb();
    const categoriesCol = db.collection('categories');
    const now = new Date();

    const ops = names.map((name) => {
      const escaped = escapeRegex(name);
      return {
        updateMany: {
          filter: {
            type: 'product',
            name: { $regex: new RegExp(`^${escaped}$`, 'i') },
          },
          update: {
            $set: {
              active: false,
              updatedAt: now,
            },
            $setOnInsert: {
              name,
              type: 'product',
              sortOrder: 0,
              tenantId: null,
              createdAt: now,
            },
          },
          upsert: true,
        },
      };
    });

    let result = null;
    if (ops.length === 1) {
      result = await categoriesCol.updateMany(ops[0].updateMany.filter, ops[0].updateMany.update, { upsert: true });
    } else {
      result = await categoriesCol.bulkWrite(ops, { ordered: false });
    }

    return NextResponse.json({
      ok: true,
      deleted: names.length,
      matchedCount: Number(result?.matchedCount ?? result?.nMatched ?? 0),
      modifiedCount: Number(result?.modifiedCount ?? result?.nModified ?? 0),
      upsertedCount: Number(result?.upsertedCount ?? result?.nUpserted ?? 0),
    });
  } catch (err) {
    console.error('DELETE_ADMIN_CATEGORY_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}

async function PATCHHandler(req) {
  try {
    await ensurePlatformOwner(req);

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const active = body?.active !== false;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const db = await getDb();
    const categoriesCol = db.collection('categories');

    const escaped = escapeRegex(name);
    const now = new Date();

    await categoriesCol.updateMany(
      {
        type: 'product',
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      },
      {
        $set: {
          active: !!active,
          updatedAt: now,
        },
        $setOnInsert: {
          name,
          type: 'product',
          sortOrder: 0,
          tenantId: null,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, active: !!active });
  } catch (err) {
    console.error('PATCH_ADMIN_CATEGORY_ERROR:', err);
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || 'Server error' }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const DELETE = withErrorLogging(DELETEHandler);
export const PATCH = withErrorLogging(PATCHHandler);
