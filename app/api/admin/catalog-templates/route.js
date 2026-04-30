import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';
import CatalogTemplate from '@/models/CatalogTemplate';
import { ensureSeedCatalogTemplates } from '@/lib/catalogTemplates';
import { syncCatalogTemplateUpsert } from '@/lib/catalogTemplateSync';
import { isAutomationRequest } from '@/lib/automationKey';

const parsedDbTimeoutMs = Number(process.env.CATALOG_TEMPLATES_DB_TIMEOUT_MS || 6000);
const CATALOG_TEMPLATES_DB_TIMEOUT_MS = Number.isFinite(parsedDbTimeoutMs)
  ? Math.max(1000, parsedDbTimeoutMs)
  : 6000;

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

const sanitizeKey = (value) => {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return '';
  if (!/^[a-z0-9-_]+$/.test(key)) return '';
  return key;
};

const getTenantIdFromRequest = (req, payload) => {
  const url = new URL(req.url);
  const rawTenantId = payload?.tenantId ?? url.searchParams.get('tenantId');
  const tenantId = String(rawTenantId || '').trim();
  return tenantId || null;
};

const normalizePurchaseModeBlocks = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    stock: String(src.stock || '').trim(),
    group: String(src.group || '').trim(),
    shared_container: String(src.shared_container || '').trim(),
  };
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
  purchaseModeBlocks: normalizePurchaseModeBlocks(doc.purchaseModeBlocks),
  isActive: doc.isActive !== false,
  createdAt: doc.createdAt ?? null,
  updatedAt: doc.updatedAt ?? null,
});

function buildFallbackTemplatesResponse(reason = 'db_unavailable') {
  return NextResponse.json(
    {
      ok: true,
      items: [],
      dataMode: 'fallback',
      fallback: {
        reason,
        message: 'Database unavailable. Returning empty templates list.',
      },
    },
    {
      headers: {
        'cache-control': 'no-store',
        'x-data-mode': 'fallback',
        'x-vipo-fallback': 'true',
        'x-vipo-fallback-reason': reason,
      },
    },
  );
}

async function connectMongoWithTimeout() {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), CATALOG_TEMPLATES_DB_TIMEOUT_MS);
  });

  try {
    const conn = await Promise.race([connectMongo(), timeoutPromise]);
    return conn || null;
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function GETHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (admin.role !== 'admin' && admin.role !== 'super_admin' && admin.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_required' }, { status: 400 });
    }

    const conn = await connectMongoWithTimeout();
    if (!conn) {
      return buildFallbackTemplatesResponse('db_unavailable');
    }

    await ensureSeedCatalogTemplates(tenantId);

    const templates = await CatalogTemplate.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      items: templates.map(serializeTemplate),
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return buildFallbackTemplatesResponse('db_unavailable');
    }
    console.error('ADMIN_CATALOG_TEMPLATES_LIST_ERROR', error);
    const status = error?.status ?? 500;
    const message =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function POSTHandler(req) {
  try {
    const admin = await requireAdminApi(req);
    if (admin.role !== 'admin' && admin.role !== 'super_admin' && admin.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const conn = await connectMongoWithTimeout();
    if (!conn) {
      return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 });
    }

    const payload = await req.json().catch(() => ({}));
    const tenantId = getTenantIdFromRequest(req, payload);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_required' }, { status: 400 });
    }
    const key = sanitizeKey(payload.key);
    const name = String(payload.name || '').trim();

    if (!key) {
      return NextResponse.json({ ok: false, error: 'invalid_key' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
    }

    const template = await CatalogTemplate.create({
      key,
      tenantId,
      name,
      titlePrefix: String(payload.titlePrefix || '').trim(),
      description: String(payload.description || '').trim(),
      shortDescription: String(payload.shortDescription || '').trim(),
      specs: String(payload.specs || '').trim(),
      faq: String(payload.faq || '').trim(),
      structuredData: String(payload.structuredData || '').trim(),
      category: String(payload.category || '').trim(),
      subCategory: String(payload.subCategory || '').trim(),
      tags: normalizeList(payload.tags),
      seo: {
        slugPrefix: String(payload.seo?.slugPrefix || '').trim(),
        metaTitle: String(payload.seo?.metaTitle || '').trim(),
        metaDescription: String(payload.seo?.metaDescription || '').trim(),
        keywords: normalizeList(payload.seo?.keywords),
      },
      purchaseModeBlocks: normalizePurchaseModeBlocks(payload.purchaseModeBlocks),
      isActive: payload.isActive !== false,
    });

    let sync = null;
    const shouldAwaitSync = isAutomationRequest(req);
    if (shouldAwaitSync) {
      sync = await syncCatalogTemplateUpsert({ tenantId, template }).catch((err) => ({
        ok: false,
        error: err?.message || String(err),
      }));
    } else {
      syncCatalogTemplateUpsert({ tenantId, template }).catch((err) => {
        console.warn('CATALOG_TEMPLATE_SYNC_UPSERT_FAILED', err?.message || err);
      });
    }

    return NextResponse.json({ ok: true, template: serializeTemplate(template), ...(sync ? { sync } : {}) });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 });
    }
    if (error?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'duplicate_key' }, { status: 400 });
    }
    console.error('ADMIN_CATALOG_TEMPLATES_CREATE_ERROR', error);
    const status = error?.status ?? 500;
    const message =
      status === 401
        ? 'unauthorized'
        : status === 403
          ? 'forbidden'
          : 'server_error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
