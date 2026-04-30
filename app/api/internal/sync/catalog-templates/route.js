import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Tenant from '@/models/Tenant';
import CatalogTemplate from '@/models/CatalogTemplate';

let ensureIndexesPromise = null;

async function ensureCatalogTemplateIndexes() {
  if (ensureIndexesPromise) return ensureIndexesPromise;

  ensureIndexesPromise = (async () => {
    const indexes = await CatalogTemplate.collection.indexes().catch(() => []);
    const uniqueKeyIndexes = indexes.filter((idx) => {
      if (!idx?.unique) return false;
      const keySpec = idx?.key;
      return keySpec && typeof keySpec === 'object' && keySpec.key === 1 && Object.keys(keySpec).length === 1;
    });

    for (const idx of uniqueKeyIndexes) {
      if (!idx?.name) continue;
      try {
        await CatalogTemplate.collection.dropIndex(idx.name);
      } catch (err) {
        console.warn('CATALOG_TEMPLATE_DROP_INDEX_FAILED', idx.name, err?.message || err);
      }
    }

    await CatalogTemplate.collection.createIndex({ key: 1 }, { name: 'key_1' });
    await CatalogTemplate.collection.createIndex(
      { tenantId: 1, key: 1 },
      { unique: true, name: 'tenantId_1_key_1' },
    );
  })();

  return ensureIndexesPromise;
}

function getSyncSecret() {
  const raw = process.env.CATALOG_TEMPLATE_SYNC_SECRET;
  const secret = raw ? String(raw).trim() : '';
  return secret || null;
}

function isAuthorized(req) {
  const secret = getSyncSecret();
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'sync_secret_not_configured' }, { status: 503 }),
    };
  }

  const incoming = req.headers.get('x-template-sync-secret');
  if (!incoming || incoming !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true };
}

const sanitizeKey = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';
  if (!/^[a-z0-9-_]+$/.test(key)) return '';
  return key;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const serializeTemplate = (doc) => ({
  id: doc._id?.toString?.() ?? doc._id,
  key: doc.key || '',
  name: doc.name || '',
  titlePrefix: doc.titlePrefix || '',
  shortDescription: doc.shortDescription || '',
  description: doc.description || '',
  specs: doc.specs || '',
  faq: doc.faq || '',
  structuredData: doc.structuredData || '',
  category: doc.category || '',
  subCategory: doc.subCategory || '',
  tags: Array.isArray(doc.tags) ? doc.tags : [],
  seo: {
    slugPrefix: doc.seo?.slugPrefix || '',
    metaTitle: doc.seo?.metaTitle || '',
    metaDescription: doc.seo?.metaDescription || '',
    keywords: Array.isArray(doc.seo?.keywords) ? doc.seo.keywords : [],
  },
  purchaseModeBlocks: {
    stock: String(doc.purchaseModeBlocks?.stock || '').trim(),
    group: String(doc.purchaseModeBlocks?.group || '').trim(),
    shared_container: String(doc.purchaseModeBlocks?.shared_container || '').trim(),
  },
  isActive: doc.isActive !== false,
  createdAt: doc.createdAt ?? null,
  updatedAt: doc.updatedAt ?? null,
});

async function resolveTenantId({ tenantSlug, tenantName }) {
  const slug = String(tenantSlug || '').trim().toLowerCase();
  const name = String(tenantName || '').trim();

  if (!slug && !name) return null;

  if (slug) {
    const tenant = await Tenant.findOne({ slug }, { _id: 1 }).lean();
    if (tenant?._id) return tenant._id;
  }

  if (name) {
    const tenant = await Tenant.findOne({ name }, { _id: 1 }).lean();
    if (tenant?._id) return tenant._id;
  }

  return null;
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();
    await ensureCatalogTemplateIndexes();

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || '').trim().toLowerCase();
    const fallbackToLegacy = payload?.fallbackToLegacy === true;

    const tenantSlug = payload?.tenantSlug;
    const tenantName = payload?.tenantName;
    let tenantId = await resolveTenantId({ tenantSlug, tenantName });
    const usedLegacyScope = !tenantId && fallbackToLegacy;
    if (!tenantId && !fallbackToLegacy) {
      return NextResponse.json({ ok: false, error: 'tenant_not_found' }, { status: 404 });
    }
    if (!tenantId && fallbackToLegacy) {
      tenantId = null;
    }

    if (action === 'list') {
      const templates = await CatalogTemplate.find(
        tenantId ? { tenantId } : { tenantId: null },
      )
        .sort({ key: 1 })
        .lean();

      return NextResponse.json({
        ok: true,
        tenantId: tenantId?.toString() || null,
        count: templates.length,
        templates: templates.map(serializeTemplate),
      });
    }

    if (action === 'upsert') {
      const tpl = payload?.template || {};
      const key = sanitizeKey(tpl.key);
      const name = String(tpl.name || '').trim();

      if (!key) {
        return NextResponse.json({ ok: false, error: 'invalid_key' }, { status: 400 });
      }
      if (!name) {
        return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
      }

      const update = {
        name,
        titlePrefix: String(tpl.titlePrefix || '').trim(),
        description: String(tpl.description || '').trim(),
        shortDescription: String(tpl.shortDescription || '').trim(),
        specs: String(tpl.specs || '').trim(),
        faq: String(tpl.faq || '').trim(),
        structuredData: String(tpl.structuredData || '').trim(),
        category: String(tpl.category || '').trim(),
        subCategory: String(tpl.subCategory || '').trim(),
        tags: normalizeList(tpl.tags),
        seo: {
          slugPrefix: String(tpl.seo?.slugPrefix || '').trim(),
          metaTitle: String(tpl.seo?.metaTitle || '').trim(),
          metaDescription: String(tpl.seo?.metaDescription || '').trim(),
          keywords: normalizeList(tpl.seo?.keywords),
        },
        purchaseModeBlocks: {
          stock: String(tpl.purchaseModeBlocks?.stock || '').trim(),
          group: String(tpl.purchaseModeBlocks?.group || '').trim(),
          shared_container: String(tpl.purchaseModeBlocks?.shared_container || '').trim(),
        },
        isActive: tpl.isActive !== false,
      };

      const doc = await CatalogTemplate.findOneAndUpdate(
        { tenantId, key },
        {
          $set: update,
          $setOnInsert: { tenantId, key },
        },
        { upsert: true, new: true },
      );

      return NextResponse.json({ ok: true, template: serializeTemplate(doc), usedLegacyScope });
    }

    if (action === 'delete') {
      const templateKey = sanitizeKey(payload?.templateKey);
      if (!templateKey) {
        return NextResponse.json({ ok: false, error: 'invalid_key' }, { status: 400 });
      }

      const deleted = await CatalogTemplate.findOneAndDelete({ tenantId, key: templateKey });
      return NextResponse.json({ ok: true, deleted: !!deleted, usedLegacyScope });
    }

    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  } catch (error) {
    console.error('INTERNAL_TEMPLATE_SYNC_ERROR', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'server_error',
        details: {
          message: error?.message || String(error),
          name: error?.name,
          code: error?.code,
        },
      },
      { status: 500 },
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
