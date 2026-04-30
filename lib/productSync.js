import Tenant from '@/models/Tenant';
import { connectMongo } from '@/lib/mongoose';
import { syncTenantUpsert, getTenantById } from '@/lib/tenantSync';
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
  } catch {}
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
  return {
    slug: String(tenant?.slug || '').trim() || null,
    name: String(tenant?.name || '').trim() || null,
  };
}

function serializeProduct(product) {
  if (!product) return null;
  const p = typeof product.toObject === 'function' ? product.toObject() : product;

  return {
    sku: String(p.sku || '').trim(),
    name: String(p.name || '').trim(),
    description: String(p.description || '').trim(),
    fullDescription: String(p.fullDescription || '').trim(),
    category: String(p.category || '').trim(),
    subCategory: String(p.subCategory || '').trim(),
    templateKey: String(p.templateKey || '').trim(),
    titlePrefix: String(p.titlePrefix || '').trim(),
    tags: Array.isArray(p.tags) ? p.tags : [],
    faq: String(p.faq || '').trim(),
    structuredData: String(p.structuredData || '').trim(),
    price: p.price || 0,
    groupPrice: p.groupPrice || null,
    originalPrice: p.originalPrice || null,
    commission: p.commission || 0,
    currency: p.currency || 'ILS',
    type: p.type || 'online',
    purchaseType: p.purchaseType || 'regular',
    groupPurchaseType: p.groupPurchaseType || 'group',
    containerScope: p.containerScope || 'private',
    groupPurchaseDetails: p.groupPurchaseDetails || null,
    media: {
      images: Array.isArray(p.media?.images)
        ? p.media.images.map((img, idx) => ({
            url: typeof img === 'string' ? img : (img?.url || ''),
            alt: img?.alt || '',
            position: img?.position ?? idx,
            publicId: img?.publicId || img?.public_id || '',
          }))
        : [],
      videoUrl: typeof p.media?.videoUrl === 'string' ? p.media.videoUrl : '',
    },
    inStock: p.inStock !== false,
    stockCount: p.stockCount || 0,
    inventoryMode: p.inventoryMode || 'stock',
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    features: Array.isArray(p.features) ? p.features : [],
    specs: String(p.specs || '').trim(),
    suitableFor: String(p.suitableFor || '').trim(),
    whyChooseUs: String(p.whyChooseUs || '').trim(),
    warranty: String(p.warranty || '').trim(),
    customFields: Array.isArray(p.customFields) ? p.customFields : [],
    seo: {
      slug: String(p.seo?.slug || '').trim(),
      slugPrefix: String(p.seo?.slugPrefix || '').trim(),
      metaTitle: String(p.seo?.metaTitle || '').trim(),
      metaDescription: String(p.seo?.metaDescription || '').trim(),
      keywords: Array.isArray(p.seo?.keywords) ? p.seo.keywords : [],
    },
    stainless: {
      length: p.stainless?.length ?? null,
      width: p.stainless?.width ?? null,
      height: p.stainless?.height ?? null,
      thickness: String(p.stainless?.thickness || '').trim(),
      material: String(p.stainless?.material || '').trim(),
      layers: p.stainless?.layers ?? null,
      hasMiddleShelf: p.stainless?.hasMiddleShelf || false,
    },
    status: p.status || 'published',
    isFeatured: p.isFeatured || false,
    shippingEnabled: p.shippingEnabled || false,
    shippingPrice: p.shippingPrice || 0,
  };
}

/**
 * Sync a batch of products (upsert) to the external server.
 * Products are matched by { tenantSlug + sku }.
 */
export async function syncProductUpsert({ tenantId, products }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true };

  // Ensure tenant exists on external
  try {
    const tenantDoc = await getTenantById(tenantId);
    if (tenantDoc) {
      await syncTenantUpsert({ tenant: tenantDoc });
    }
  } catch {}

  const tenantInfo = await resolveTenantInfo(tenantId);
  if (!tenantInfo?.slug && !tenantInfo?.name) return { ok: false, skipped: true };

  const serialized = (Array.isArray(products) ? products : [products])
    .map(serializeProduct)
    .filter((p) => p && p.sku);

  if (serialized.length === 0) return { ok: false, skipped: true };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'upsert',
        tenantSlug: tenantInfo.slug,
        tenantName: tenantInfo.name,
        products: serialized,
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

/**
 * Sync product deletions to the external server.
 * Products are matched by { tenantSlug + sku[] }.
 */
export async function syncProductDelete({ tenantId, skus }) {
  const baseUrl = getTargetBaseUrl();
  const secret = getSyncSecret();
  if (!baseUrl || !secret) return { ok: false, skipped: true };

  const tenantInfo = await resolveTenantInfo(tenantId);
  if (!tenantInfo?.slug && !tenantInfo?.name) return { ok: false, skipped: true };

  const skuList = (Array.isArray(skus) ? skus : [skus]).filter(Boolean);
  if (skuList.length === 0) return { ok: false, skipped: true };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(baseUrl + '/api/internal/sync/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-template-sync-secret': secret,
      },
      body: JSON.stringify({
        action: 'delete',
        tenantSlug: tenantInfo.slug,
        tenantName: tenantInfo.name,
        skus: skuList,
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
