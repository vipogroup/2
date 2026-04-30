import Tenant from '@/models/Tenant';
import { connectMongo } from '@/lib/mongoose';
import { getTenantById, syncTenantUpsert } from '@/lib/tenantSync';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

let didAttemptLoadEnvLocal = false;

function findEnvLocalPath() {
  try {
    let dir = process.cwd();
    for (let i = 0; i < 6; i += 1) {
      const candidate = path.join(dir, '.env.local');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (!parent || parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

function getEnvDebug() {
  let envLocalPath = null;
  let envLocalExists = false;
  try {
    envLocalPath = findEnvLocalPath();
    envLocalExists = !!envLocalPath;
  } catch {}
  return {
    hasTarget: !!process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL,
    hasSecret: !!process?.env?.CATALOG_TEMPLATE_SYNC_SECRET,
    targetLen: String(process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL || '').length,
    secretLen: String(process?.env?.CATALOG_TEMPLATE_SYNC_SECRET || '').length,
    cwd: (() => {
      try {
        return process.cwd();
      } catch {
        return null;
      }
    })(),
    envLocalExists,
    envLocalPath,
  };
}

function ensureSyncEnvLoaded() {
  if (didAttemptLoadEnvLocal) return;
  didAttemptLoadEnvLocal = true;
  try {
    const hasTarget = !!process?.env?.CATALOG_TEMPLATE_SYNC_TARGET_URL;
    const hasSecret = !!process?.env?.CATALOG_TEMPLATE_SYNC_SECRET;
    if (hasTarget && hasSecret) return;
    const envLocalPath = findEnvLocalPath();
    if (!envLocalPath) return;
    dotenv.config({ path: envLocalPath, override: true });
  } catch {
    // ignore
  }
}

function getTargetBaseUrl() {
  ensureSyncEnvLoaded();
  const raw = process.env.CATALOG_TEMPLATE_SYNC_TARGET_URL;
  const url = raw ? String(raw).trim() : '';
  return url ? url.replace(/\/$/, '') : null;
}

function getSyncSecret() {
  ensureSyncEnvLoaded();
  const raw = process.env.CATALOG_TEMPLATE_SYNC_SECRET;
  const secret = raw ? String(raw).trim() : '';
  return secret || null;
}

async function resolveTenantInfo(tenantId) {
  const id = String(tenantId || '').trim();
  if (!id) return null;
  await connectMongo();
  const tenant = await Tenant.findById(id, { slug: 1, name: 1 }).lean();
  const slug = String(tenant?.slug || '').trim();
  const name = String(tenant?.name || '').trim();
  return {
    slug: slug || null,
    name: name || null,
  };
}

function serializeTemplate(template) {
  const key = String(template?.key || '').trim();
  if (!key) return null;
  return {
    key,
    name: String(template?.name || '').trim(),
    titlePrefix: String(template?.titlePrefix || '').trim(),
    shortDescription: String(template?.shortDescription || '').trim(),
    description: String(template?.description || '').trim(),
    specs: String(template?.specs || '').trim(),
    faq: String(template?.faq || '').trim(),
    structuredData: String(template?.structuredData || '').trim(),
    category: String(template?.category || '').trim(),
    subCategory: String(template?.subCategory || '').trim(),
    tags: Array.isArray(template?.tags) ? template.tags : [],
    seo: {
      slugPrefix: String(template?.seo?.slugPrefix || '').trim(),
      metaTitle: String(template?.seo?.metaTitle || '').trim(),
      metaDescription: String(template?.seo?.metaDescription || '').trim(),
      keywords: Array.isArray(template?.seo?.keywords) ? template.seo.keywords : [],
    },
    purchaseModeBlocks: {
      stock: String(template?.purchaseModeBlocks?.stock || '').trim(),
      group: String(template?.purchaseModeBlocks?.group || '').trim(),
      shared_container: String(template?.purchaseModeBlocks?.shared_container || '').trim(),
    },
    isActive: template?.isActive !== false,
  };
}

export async function syncCatalogTemplateUpsert({ tenantId, template }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true, debug: getEnvDebug() };

  try {
    const tenantDoc = await getTenantById(tenantId);
    if (tenantDoc) {
      await syncTenantUpsert({ tenant: tenantDoc });
    }
  } catch {}

  const tenantInfo = await resolveTenantInfo(tenantId);
  if (!tenantInfo?.slug && !tenantInfo?.name) return { ok: false, skipped: true };

  const payloadTemplate = serializeTemplate(template);
  if (!payloadTemplate) return { ok: false, skipped: true };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/catalog-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'upsert',
        tenantSlug: tenantInfo?.slug,
        tenantName: tenantInfo?.name,
        template: payloadTemplate,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function syncCatalogTemplateDelete({ tenantId, templateKey }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true, debug: getEnvDebug() };

  try {
    const tenantDoc = await getTenantById(tenantId);
    if (tenantDoc) {
      await syncTenantUpsert({ tenant: tenantDoc });
    }
  } catch {}

  const tenantInfo = await resolveTenantInfo(tenantId);
  if (!tenantInfo?.slug && !tenantInfo?.name) return { ok: false, skipped: true };

  const key = String(templateKey || '').trim();
  if (!key) return { ok: false, skipped: true };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/catalog-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'delete',
        tenantSlug: tenantInfo?.slug,
        tenantName: tenantInfo?.name,
        templateKey: key,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, error: err?.message || String(err) };
  }
}
