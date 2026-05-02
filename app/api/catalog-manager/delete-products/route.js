import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { getCloudinary } from '@/lib/cloudinary';
import Product from '@/models/Product';
import { requireAdminApi } from '@/lib/auth/server';
import { isSuperAdminUser } from '@/lib/superAdmins';
import { syncProductDelete } from '@/lib/productSync';
import {
  catalogRealDeleteGuardsOk,
  CATALOG_DELETE_TARGET_COLLECTIONS,
  normalizeList,
} from '@/lib/catalogDeleteGuards';

export const dynamic = 'force-dynamic';

function blockedCatalogDeleteResponse() {
  return NextResponse.json(
    {
      error: 'catalog_product_delete_blocked',
      message: 'Catalog product delete is blocked without explicit super-admin confirmation.',
    },
    { status: 403 },
  );
}

const hasCloudinaryConfig = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const extractPublicIdFromUrl = (url) => {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('res.cloudinary.com')) return '';
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex === -1) return '';
    let after = segments.slice(uploadIndex + 1);
    const versionIndex = after.findIndex((s) => /^v\d+$/.test(s));
    if (versionIndex !== -1) after = after.slice(versionIndex + 1);
    if (!after.length) return '';
    after[after.length - 1] = after[after.length - 1].replace(/\.[a-z0-9]+$/i, '');
    return after.join('/');
  } catch {
    return '';
  }
};

/**
 * POST /api/catalog-manager/delete-products
 * Deletes products from a tenant's store by SKU list.
 * Also deletes their images from Cloudinary.
 * Super Admin only.
 * 
 * Body: { tenantId: string, skus: string[] }
 */
async function POSTHandler(request) {
  try {
    let admin;
    try {
      admin = await requireAdminApi(request);
    } catch (authErr) {
      const status = authErr?.status && Number.isFinite(authErr.status) ? authErr.status : 401;
      return NextResponse.json({ error: authErr.message || 'Unauthorized' }, { status });
    }
    if (!isSuperAdminUser(admin)) {
      return blockedCatalogDeleteResponse();
    }

    const body = await request.json().catch(() => ({}));
    const { tenantId, skus } = body;
    const dryRun = body?.dryRun !== false;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowCatalogDelete = process.env.ALLOW_CATALOG_PRODUCT_DELETE === 'true';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (!Array.isArray(skus) || !skus.length) {
      return NextResponse.json({ error: 'skus array is required' }, { status: 400 });
    }

    await connectMongo();

    // Find all matching products (both regular and -GROUP variants)
    const allSkuVariants = [];
    skus.forEach(sku => {
      const base = sku.replace(/-GROUP$/i, '');
      allSkuVariants.push(base, `${base}-GROUP`);
    });
    const uniqueSkus = [...new Set(allSkuVariants)];
    const requestedProductKeys = normalizeList(skus);

    const query = { tenantId, sku: { $in: uniqueSkus } };
    
    // 1. Find products to get their media
    const productsToDelete = await Product.find(query)
      .select({ _id: 1, name: 1, title: 1, tenantId: 1, slug: 1, sku: 1, media: 1 })
      .lean();
    const resolvedProductIds = productsToDelete.map((p) => String(p._id));

    // 2. Collect Cloudinary public IDs
    const publicIds = [];
    const videoUrls = [];
    productsToDelete.forEach(product => {
      const images = Array.isArray(product?.media?.images) ? product.media.images : [];
      images.forEach(img => {
        if (!img) return;
        const pid = img.publicId || img.public_id || extractPublicIdFromUrl(img.url);
        if (pid) publicIds.push(pid);
      });
      if (product?.media?.videoUrl) {
        const vid = extractPublicIdFromUrl(product.media.videoUrl);
        if (vid) videoUrls.push(vid);
      }
    });
    const mediaDeletionInvolved = hasCloudinaryConfig() && (publicIds.length > 0 || videoUrls.length > 0);
    const operationSummary = {
      products: {
        operation: 'deleteMany',
        filter: 'tenantId + sku in requested variants',
      },
      media: {
        operation: 'cloudinary_delete_resources',
        imagePublicIds: publicIds.length,
        videoPublicIds: videoUrls.length,
        willExecute: mediaDeletionInvolved,
      },
      sync: {
        operation: 'syncProductDelete',
        willExecute: productsToDelete.length > 0,
      },
      auditlogs: {
        operation: 'insertOne',
      },
    };
    const matchedCount = resolvedProductIds.length;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        deleteEnabled: false,
        mediaDeleteEnabled: false,
        /** Client must echo this as `confirmEnvironment` on the real delete request */
        confirmEnvironmentHint: nodeEnv,
        requested: {
          tenantId: String(tenantId),
          tenantSlug: body?.tenantSlug ? String(body.tenantSlug) : '',
          tenantKey: body?.tenantKey ? String(body.tenantKey) : '',
          skus: requestedProductKeys,
          productKeys: requestedProductKeys,
        },
        resolvedTenantId: String(tenantId),
        deleteFilter: {
          tenantId: String(tenantId),
          skuIn: uniqueSkus,
        },
        resolvedProductIds,
        products: productsToDelete.map((product) => ({
          _id: String(product._id),
          name: product.name || product.title || '',
          tenantId: product.tenantId ? String(product.tenantId) : '',
          slug: product.slug || '',
          sku: product.sku || '',
        })),
        targetCollections: CATALOG_DELETE_TARGET_COLLECTIONS,
        mediaDeletionInvolved,
        matchedCount,
        operationSummary,
        message: 'Catalog product delete dry-run preview only. No data was modified.',
      });
    }

    if (nodeEnv === 'production' && !allowCatalogDelete) {
      return blockedCatalogDeleteResponse();
    }

    const guardsOk = catalogRealDeleteGuardsOk({
      body,
      nodeEnv,
      allowCatalogDelete,
      resolvedProductIds,
      requestedProductKeys,
      mediaDeletionInvolved,
      tenantId,
    });

    if (!guardsOk) {
      return blockedCatalogDeleteResponse();
    }

    console.warn('[CATALOG_PRODUCT_DELETE_AUDIT]', {
      action: 'catalog_product_delete',
      actorId: admin?.id || admin?._id || null,
      actorEmail: admin?.email || null,
      actorRole: admin?.role || null,
      tenantId: String(tenantId),
      tenantKey: body?.tenantKey ? String(body.tenantKey) : (body?.tenantSlug ? String(body.tenantSlug) : ''),
      reason,
      NODE_ENV: nodeEnv,
      ALLOW_CATALOG_PRODUCT_DELETE: allowCatalogDelete,
      dryRun: false,
      requested: {
        skus: requestedProductKeys,
        productKeys: requestedProductKeys,
      },
      resolvedProductIds,
      matchedCount,
      targetCollections: CATALOG_DELETE_TARGET_COLLECTIONS,
      mediaDeletionInvolved,
      operationSummary,
    });

    // 3. Delete products from MongoDB
    const result = await Product.deleteMany(query);

    console.warn('[CM-DELETE] Deleted', result.deletedCount, 'products for tenant', tenantId, '| SKUs:', uniqueSkus.length);
    try {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      await db.collection('auditlogs').insertOne({
        action: 'catalog_manager_delete_products',
        tenantId: String(tenantId),
        skusCount: uniqueSkus.length,
        deletedCount: result.deletedCount ?? 0,
        ip: request.headers.get('x-forwarded-for') || '',
        createdAt: new Date(),
      });
    } catch (_) {}

    // 3.5 Sync deletions to external server
    if (result.deletedCount > 0) {
      syncProductDelete({ tenantId, skus: uniqueSkus }).catch((err) => {
        console.warn('PRODUCT_SYNC_DELETE_WARNING', err?.message || err);
      });
    }

    // 4. Delete images from Cloudinary
    if (hasCloudinaryConfig() && (publicIds.length || videoUrls.length)) {
      const cloudinary = getCloudinary();
      
      // Delete images in batches of 100
      for (let i = 0; i < publicIds.length; i += 100) {
        const batch = publicIds.slice(i, i + 100);
        try {
          await cloudinary.api.delete_resources(batch, { resource_type: 'image' });
        } catch (err) {
          console.warn('[CLOUDINARY] Failed to delete images batch:', err?.message);
        }
      }

      // Delete videos
      for (let i = 0; i < videoUrls.length; i += 100) {
        const batch = videoUrls.slice(i, i + 100);
        try {
          await cloudinary.api.delete_resources(batch, { resource_type: 'video' });
        } catch (err) {
          console.warn('[CLOUDINARY] Failed to delete videos batch:', err?.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount ?? 0,
      cloudinaryDeleted: publicIds.length + videoUrls.length,
      skusProcessed: uniqueSkus.length,
    });
  } catch (err) {
    console.error('catalog-manager delete-products error:', err);
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export const POST = POSTHandler;
