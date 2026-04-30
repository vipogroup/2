import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { requireAdminApi } from '@/lib/auth/server';
import CatalogTemplate from '@/models/CatalogTemplate';
import { syncCatalogTemplateDelete, syncCatalogTemplateUpsert } from '@/lib/catalogTemplateSync';
import { isAutomationRequest } from '@/lib/automationKey';

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

async function GETHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    if (admin.role !== 'admin' && admin.role !== 'super_admin' && admin.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_required' }, { status: 400 });
    }

    await connectMongo();
    const template = await CatalogTemplate.findOne({ _id: params.id, tenantId }).lean();
    if (!template) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template: serializeTemplate(template) });
  } catch (error) {
    console.error('ADMIN_CATALOG_TEMPLATES_GET_ERROR', error);
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

async function PATCHHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    if (admin.role !== 'admin' && admin.role !== 'super_admin' && admin.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    await connectMongo();
    const payload = await req.json().catch(() => ({}));
    const tenantId = getTenantIdFromRequest(req, payload);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_required' }, { status: 400 });
    }

    const template = await CatalogTemplate.findOne({ _id: params.id, tenantId });
    if (!template) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    if ('name' in payload) {
      const name = String(payload.name || '').trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
      }
      template.name = name;
    }

    if ('titlePrefix' in payload) template.titlePrefix = String(payload.titlePrefix || '').trim();
    if ('shortDescription' in payload) template.shortDescription = String(payload.shortDescription || '').trim();
    if ('description' in payload) template.description = String(payload.description || '').trim();
    if ('specs' in payload) template.specs = String(payload.specs || '').trim();
    if ('faq' in payload) template.faq = String(payload.faq || '').trim();
    if ('structuredData' in payload) template.structuredData = String(payload.structuredData || '').trim();
    if ('category' in payload) template.category = String(payload.category || '').trim();
    if ('subCategory' in payload) template.subCategory = String(payload.subCategory || '').trim();
    if ('tags' in payload) template.tags = normalizeList(payload.tags);

    if ('seo' in payload) {
      const nextSeo = payload.seo || {};
      template.seo = {
        slugPrefix: String(nextSeo.slugPrefix || '').trim(),
        metaTitle: String(nextSeo.metaTitle || '').trim(),
        metaDescription: String(nextSeo.metaDescription || '').trim(),
        keywords: normalizeList(nextSeo.keywords),
      };
    }

    if ('purchaseModeBlocks' in payload) {
      template.purchaseModeBlocks = normalizePurchaseModeBlocks(payload.purchaseModeBlocks);
    }

    if ('isActive' in payload) template.isActive = payload.isActive !== false;

    await template.save();

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
    console.error('ADMIN_CATALOG_TEMPLATES_UPDATE_ERROR', error);
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

async function DELETEHandler(req, { params }) {
  try {
    const admin = await requireAdminApi(req);
    if (admin.role !== 'admin' && admin.role !== 'super_admin' && admin.role !== 'business_admin') {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_required' }, { status: 400 });
    }

    await connectMongo();
    const deleted = await CatalogTemplate.findOneAndDelete({ _id: params.id, tenantId });
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    let sync = null;
    const shouldAwaitSync = isAutomationRequest(req);
    if (shouldAwaitSync) {
      sync = await syncCatalogTemplateDelete({ tenantId, templateKey: deleted?.key }).catch((err) => ({
        ok: false,
        error: err?.message || String(err),
      }));
    } else {
      syncCatalogTemplateDelete({ tenantId, templateKey: deleted?.key }).catch((err) => {
        console.warn('CATALOG_TEMPLATE_SYNC_DELETE_FAILED', err?.message || err);
      });
    }

    return NextResponse.json({ ok: true, ...(sync ? { sync } : {}) });
  } catch (error) {
    console.error('ADMIN_CATALOG_TEMPLATES_DELETE_ERROR', error);
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
export const PATCH = withErrorLogging(PATCHHandler);
export const DELETE = withErrorLogging(DELETEHandler);
