import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Tenant from '@/models/Tenant';
import Product from '@/models/Product';

const PRODUCT_SYNC_DELETE_CONFIRM_TOKEN = 'DELETE_PRODUCTS_SYNC_IRREVERSIBLE';
const PRODUCT_SYNC_DELETE_TARGET_COLLECTIONS = ['products'];

function blockedProductSyncDeleteResponse() {
  return NextResponse.json(
    {
      error: 'product_sync_delete_blocked',
      message: 'Product sync delete is blocked without explicit production confirmation.',
    },
    { status: 403 },
  );
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
}

function hasExactCoverage(expectedItems, providedItems) {
  if (expectedItems.length !== providedItems.length) return false;
  const expected = [...expectedItems].sort();
  const provided = [...providedItems].sort();
  return expected.every((value, index) => value === provided[index]);
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

function buildProductUpdate(p) {
  return {
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
    price: Number(p.price) || 0,
    groupPrice: p.groupPrice != null ? Number(p.groupPrice) : null,
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    commission: Number(p.commission) || 0,
    currency: String(p.currency || 'ILS').toUpperCase(),
    type: p.type || 'online',
    purchaseType: p.purchaseType || 'regular',
    groupPurchaseType: p.groupPurchaseType || 'group',
    containerScope: p.containerScope || 'private',
    groupPurchaseDetails: p.groupPurchaseDetails || null,
    media: {
      images: Array.isArray(p.media?.images)
        ? p.media.images.map((img, idx) => ({
            url: String(img?.url || '').trim(),
            alt: String(img?.alt || '').trim(),
            position: img?.position ?? idx,
            publicId: String(img?.publicId || '').trim(),
          }))
        : [],
      videoUrl: String(p.media?.videoUrl || '').trim(),
    },
    inStock: p.inStock !== false,
    stockCount: Number(p.stockCount) || 0,
    inventoryMode: p.inventoryMode || 'stock',
    rating: Number(p.rating) || 0,
    reviews: Number(p.reviews) || 0,
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
    shippingPrice: Number(p.shippingPrice) || 0,
  };
}

async function POSTHandler(req) {
  const auth = isAuthorized(req);
  if (!auth.ok) return auth.response;

  try {
    await connectMongo();

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || '').trim().toLowerCase();
    const tenantSlug = payload?.tenantSlug;
    const tenantName = payload?.tenantName;

    const tenantId = await resolveTenantId({ tenantSlug, tenantName });
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenant_not_found' }, { status: 404 });
    }

    // ─── LIST ───
    if (action === 'list') {
      const products = await Product.find({ tenantId })
        .sort({ sku: 1 })
        .lean();

      return NextResponse.json({
        ok: true,
        tenantId: tenantId.toString(),
        count: products.length,
        products: products.map((p) => {
          const doc = { ...p };
          // Convert ObjectIds to strings for JSON serialization
          if (doc._id) doc._id = doc._id.toString();
          if (doc.tenantId) doc.tenantId = doc.tenantId.toString();
          return doc;
        }),
      });
    }

    // ─── UPSERT (batch) ───
    if (action === 'upsert') {
      const incoming = Array.isArray(payload?.products) ? payload.products : [];
      if (incoming.length === 0) {
        return NextResponse.json({ ok: false, error: 'no_products' }, { status: 400 });
      }

      const results = { upserted: 0, updated: 0, errors: [] };

      for (const p of incoming) {
        const sku = String(p.sku || '').trim();
        if (!sku) {
          results.errors.push({ sku: '(empty)', error: 'missing_sku' });
          continue;
        }

        try {
          const update = buildProductUpdate(p);
          const result = await Product.findOneAndUpdate(
            { tenantId, sku },
            {
              $set: update,
              $setOnInsert: { tenantId, sku },
            },
            { upsert: true, new: true, runValidators: true },
          );

          if (result.createdAt && result.updatedAt &&
              Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000) {
            results.upserted++;
          } else {
            results.updated++;
          }
        } catch (err) {
          results.errors.push({
            sku,
            error: err?.message || String(err),
            code: err?.code,
          });
        }
      }

      return NextResponse.json({
        ok: results.errors.length === 0,
        ...results,
        total: incoming.length,
      });
    }

    // ─── DELETE (batch by SKU) ───
    if (action === 'delete') {
      const dryRun = payload?.dryRun !== false;
      const nodeEnv = process.env.NODE_ENV || 'development';
      const allowDestructiveSync = process.env.ALLOW_INTERNAL_PRODUCT_DESTRUCTIVE_SYNC === 'true';
      const skus = Array.isArray(payload?.skus) ? payload.skus.filter(Boolean) : [];
      if (skus.length === 0) {
        return NextResponse.json({ ok: false, error: 'no_skus' }, { status: 400 });
      }

      // Include -GROUP variants
      const allVariants = [];
      skus.forEach((s) => {
        const base = s.replace(/-GROUP$/i, '');
        allVariants.push(base, `${base}-GROUP`);
      });
      const uniqueSkus = [...new Set(allVariants)];

      const deleteQuery = { tenantId, sku: { $in: uniqueSkus } };
      const productsToDelete = await Product.find(deleteQuery)
        .select({ _id: 1, name: 1, title: 1, tenantId: 1, slug: 1, sku: 1 })
        .lean();
      const resolvedProductIds = productsToDelete.map((p) => String(p._id));
      const matchedCount = resolvedProductIds.length;
      const operationSummary = {
        products: {
          operation: 'deleteMany',
          filter: 'tenantId + sku in requested variants',
        },
      };
      const mediaDeletionInvolved = false;
      const requestedProductKeys = normalizeList(skus.map((value) => String(value || '').trim()));

      if (dryRun) {
        return NextResponse.json({
          ok: true,
          action,
          dryRun: true,
          deleteEnabled: false,
          mediaDeleteEnabled: false,
          tenant: {
            tenantId: tenantId.toString(),
            tenantSlug: tenantSlug ? String(tenantSlug) : '',
            tenantName: tenantName ? String(tenantName) : '',
            tenantKey: tenantSlug ? String(tenantSlug) : (tenantName ? String(tenantName) : ''),
            tenantDomain: payload?.tenantDomain ? String(payload.tenantDomain) : '',
          },
          deleteFilter: {
            tenantId: tenantId.toString(),
            skuIn: uniqueSkus,
          },
          requested: {
            action,
            skus: requestedProductKeys,
            productKeys: requestedProductKeys,
          },
          resolvedProductIds,
          products: productsToDelete.map((product) => ({
            _id: String(product._id),
            name: product.name || product.title || '',
            tenantId: product.tenantId ? String(product.tenantId) : '',
            slug: product.slug || '',
            sku: product.sku || '',
          })),
          targetCollections: PRODUCT_SYNC_DELETE_TARGET_COLLECTIONS,
          matchedCount,
          mediaDeletionInvolved,
          operationSummary,
          message: 'Product sync delete dry-run preview only. No data was modified.',
        });
      }

      if (!allowDestructiveSync) {
        return blockedProductSyncDeleteResponse();
      }

      const confirm = String(payload?.confirm || '').trim();
      const acknowledgeDataLoss = payload?.acknowledgeDataLoss === true;
      const reason = String(payload?.reason || '').trim();
      const confirmEnvironment = String(payload?.confirmEnvironment || '').trim();
      const confirmCollections = normalizeList(payload?.confirmCollections);
      const confirmProductIds = normalizeList(payload?.confirmProductIds);
      const confirmProductKeys = normalizeList(payload?.confirmProductKeys);
      const confirmTenantId = String(payload?.confirmTenantId || '').trim();
      const acknowledgeMediaDeletion = payload?.acknowledgeMediaDeletion === true;
      const hasAllCollections = PRODUCT_SYNC_DELETE_TARGET_COLLECTIONS.every((name) =>
        confirmCollections.includes(name),
      );
      const idsCovered = resolvedProductIds.length > 0
        ? hasExactCoverage(resolvedProductIds, confirmProductIds)
        : true;
      const keysCovered = hasExactCoverage(requestedProductKeys, confirmProductKeys);

      const guardsOk =
        confirm === PRODUCT_SYNC_DELETE_CONFIRM_TOKEN &&
        acknowledgeDataLoss === true &&
        reason.length > 0 &&
        confirmEnvironment === nodeEnv &&
        hasAllCollections &&
        confirmTenantId === tenantId.toString() &&
        idsCovered &&
        keysCovered &&
        (!mediaDeletionInvolved || acknowledgeMediaDeletion === true);

      if (!guardsOk) {
        return blockedProductSyncDeleteResponse();
      }

      console.warn('[PRODUCT_SYNC_DELETE_AUDIT]', {
        action: 'product_sync_delete',
        tenantId: tenantId.toString(),
        tenantKey: tenantSlug ? String(tenantSlug) : (tenantName ? String(tenantName) : ''),
        reason,
        NODE_ENV: nodeEnv,
        ALLOW_INTERNAL_PRODUCT_DESTRUCTIVE_SYNC: allowDestructiveSync,
        dryRun: false,
        deleteFilter: {
          tenantId: tenantId.toString(),
          skuInCount: uniqueSkus.length,
        },
        requested: {
          skus: requestedProductKeys,
          productKeys: requestedProductKeys,
        },
        resolvedProductIds,
        matchedCount,
        targetCollections: PRODUCT_SYNC_DELETE_TARGET_COLLECTIONS,
        mediaDeletionInvolved,
        operationSummary,
      });

      const result = await Product.deleteMany(deleteQuery);

      return NextResponse.json({
        ok: true,
        deletedCount: result.deletedCount ?? 0,
        skusProcessed: uniqueSkus.length,
      });
    }

    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  } catch (error) {
    console.error('INTERNAL_PRODUCT_SYNC_ERROR', error);
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
