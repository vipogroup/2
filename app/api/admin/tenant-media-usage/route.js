import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';
import { rateLimiters, buildRateLimitKey } from '@/lib/rateLimit';
import { isSuperAdmin } from '@/lib/tenant/tenantMiddleware';
import { getCloudinary } from '@/lib/cloudinary';
import { buildTenantMediaUsageFileFallback } from '@/lib/adminFallbackData';
import { jsonAdminFallback } from '@/lib/adminFallbackResponse';
import { isDbUnavailableError } from '@/lib/dbOutageClassifier';

const SIZE_CACHE_TTL_MS = 5 * 60 * 1000;
let sizeCache = {
  generatedAt: 0,
  promise: null,
  value: null,
};

function extractPublicIdFromCloudinaryUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes('res.cloudinary.com')) return '';
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex === -1) return '';
    let after = segments.slice(uploadIndex + 1);
    const versionIndex = after.findIndex((segment) => /^v\d+$/.test(segment));
    if (versionIndex !== -1) {
      after = after.slice(versionIndex + 1);
    } else {
      const folderIndex = after.indexOf('vipo-products');
      if (folderIndex > 0) {
        after = after.slice(folderIndex);
      }
    }
    if (!after.length) return '';
    const lastIndex = after.length - 1;
    after[lastIndex] = after[lastIndex].replace(/\.[a-z0-9]+$/i, '');
    return after.join('/');
  } catch {
    return '';
  }
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchBytesByPublicId(publicIds, resourceType) {
  const bytesById = new Map();
  const hasConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
  if (!hasConfig) return bytesById;

  const cloudinary = getCloudinary();
  const uniqueIds = Array.from(new Set(publicIds.filter(Boolean)));
  if (!uniqueIds.length) return bytesById;

  const batches = chunkArray(uniqueIds, 100);

  for (const batch of batches) {
    try {
      if (typeof cloudinary.api.resources_by_ids === 'function') {
        const res = await cloudinary.api.resources_by_ids(batch, {
          resource_type: resourceType,
          type: 'upload',
        });
        const resources = Array.isArray(res?.resources) ? res.resources : [];
        resources.forEach((r) => {
          if (!r?.public_id) return;
          bytesById.set(String(r.public_id), Number(r.bytes) || 0);
        });
      } else {
        const resources = await Promise.all(
          batch.map(async (id) => {
            try {
              return await cloudinary.api.resource(id, {
                resource_type: resourceType,
                type: 'upload',
              });
            } catch {
              return null;
            }
          }),
        );
        resources.forEach((r) => {
          if (!r?.public_id) return;
          bytesById.set(String(r.public_id), Number(r.bytes) || 0);
        });
      }
    } catch (err) {
      console.warn(
        `[CLOUDINARY] Failed to fetch bytes for ${resourceType} batch:`,
        err?.message || err,
      );
    }
  }

  return bytesById;
}

async function computeTenantSizeBytes(db) {
  const idsByTenant = new Map();

  const cursor = db.collection('products').find(
    { tenantId: { $ne: null } },
    {
      projection: {
        tenantId: 1,
        'media.images': 1,
        'media.videoUrl': 1,
      },
    },
  );

  for await (const doc of cursor) {
    const tenantId = doc?.tenantId;
    if (!tenantId) continue;
    const tenantKey = String(tenantId);
    if (!idsByTenant.has(tenantKey)) {
      idsByTenant.set(tenantKey, { imageIds: new Set(), videoIds: new Set() });
    }
    const sets = idsByTenant.get(tenantKey);

    const images = Array.isArray(doc?.media?.images) ? doc.media.images : [];
    images.forEach((img) => {
      if (typeof img === 'string') {
        const id = extractPublicIdFromCloudinaryUrl(img);
        if (id) sets.imageIds.add(id);
        return;
      }
      if (!img || typeof img !== 'object') return;
      const rawId =
        (typeof img.publicId === 'string' && img.publicId.trim()) ||
        (typeof img.public_id === 'string' && img.public_id.trim()) ||
        extractPublicIdFromCloudinaryUrl(img.url);
      if (rawId) sets.imageIds.add(rawId);
    });

    const videoUrl = typeof doc?.media?.videoUrl === 'string' ? doc.media.videoUrl.trim() : '';
    if (videoUrl) {
      const vid = extractPublicIdFromCloudinaryUrl(videoUrl);
      if (vid) sets.videoIds.add(vid);
    }
  }

  const allImageIds = [];
  const allVideoIds = [];
  idsByTenant.forEach((sets) => {
    sets.imageIds.forEach((id) => allImageIds.push(id));
    sets.videoIds.forEach((id) => allVideoIds.push(id));
  });

  const [imageBytesById, videoBytesById] = await Promise.all([
    fetchBytesByPublicId(allImageIds, 'image'),
    fetchBytesByPublicId(allVideoIds, 'video'),
  ]);

  const bytesByTenant = new Map();
  idsByTenant.forEach((sets, tenantKey) => {
    let imageBytes = 0;
    let videoBytes = 0;
    sets.imageIds.forEach((id) => {
      imageBytes += imageBytesById.get(id) || 0;
    });
    sets.videoIds.forEach((id) => {
      videoBytes += videoBytesById.get(id) || 0;
    });
    bytesByTenant.set(tenantKey, {
      imageBytes,
      videoBytes,
      totalBytes: imageBytes + videoBytes,
      imageCount: sets.imageIds.size,
      videoCount: sets.videoIds.size,
    });
  });

  return bytesByTenant;
}

async function getTenantSizeBytes(db) {
  const now = Date.now();
  if (sizeCache.value && now - sizeCache.generatedAt < SIZE_CACHE_TTL_MS) {
    return sizeCache.value;
  }

  if (sizeCache.promise) {
    return await sizeCache.promise;
  }

  sizeCache.promise = (async () => {
    try {
      const value = await computeTenantSizeBytes(db);
      sizeCache.value = value;
      sizeCache.generatedAt = Date.now();
      return value;
    } finally {
      sizeCache.promise = null;
    }
  })();

  return await sizeCache.promise;
}

async function GETHandler(req) {
  const { searchParams } = new URL(req.url);
  const includeSize = ['1', 'true', 'yes'].includes(
    String(searchParams.get('includeSize') || '').toLowerCase(),
  );

  const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

  const sizeAvailable = includeSize ? hasCloudinaryConfig : undefined;
  const sizeError = includeSize && !hasCloudinaryConfig ? 'Cloudinary not configured' : undefined;

  try {
    const admin = await requireAdminApi(req);
    const identifier = buildRateLimitKey(req, admin.id);
    const rateLimit = rateLimiters.admin(req, identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
    }

    if (!isSuperAdmin(admin)) {
      return NextResponse.json({ ok: false, error: 'אין הרשאה' }, { status: 403 });
    }

    const db = await getDb();

    const tenants = await db
      .collection('tenants')
      .find(
        { status: 'active' },
        {
          projection: {
            _id: 1,
            name: 1,
            slug: 1,
            domain: 1,
            subdomain: 1,
          },
        },
      )
      .toArray();

    const agg = await db
      .collection('products')
      .aggregate([
        {
          $match: {
            tenantId: { $ne: null },
          },
        },
        {
          $project: {
            tenantId: 1,
            videoUrl: { $ifNull: ['$media.videoUrl', ''] },
            images: { $ifNull: ['$media.images', []] },
          },
        },
        {
          $project: {
            tenantId: 1,
            hasVideo: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$videoUrl', null] },
                    { $ne: ['$videoUrl', ''] },
                  ],
                },
                1,
                0,
              ],
            },
            imageUrls: {
              $map: {
                input: '$images',
                as: 'img',
                in: {
                  $cond: [
                    { $eq: [{ $type: '$$img' }, 'string'] },
                    '$$img',
                    { $ifNull: ['$$img.url', ''] },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            tenantId: 1,
            hasVideo: 1,
            imageUrls: {
              $filter: {
                input: '$imageUrls',
                as: 'u',
                cond: {
                  $and: [{ $ne: ['$$u', null] }, { $ne: ['$$u', ''] }],
                },
              },
            },
          },
        },
        {
          $group: {
            _id: {
              tenantId: '$tenantId',
              productId: '$_id',
            },
            tenantId: { $first: '$tenantId' },
            hasVideo: { $first: '$hasVideo' },
            imageUrls: { $first: '$imageUrls' },
          },
        },
        {
          $group: {
            _id: '$tenantId',
            productCount: { $sum: 1 },
            imageCount: { $sum: { $size: '$imageUrls' } },
            uniqueImages: { $addToSet: '$imageUrls' },
            videoCount: { $sum: '$hasVideo' },
          },
        },
        {
          $project: {
            _id: 0,
            tenantId: '$_id',
            productCount: 1,
            imageCount: 1,
            uniqueImageCount: {
              $size: {
                $reduce: {
                  input: '$uniqueImages',
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] },
                },
              },
            },
            videoCount: 1,
          },
        },
      ])
      .toArray();

    const byTenantId = new Map();
    agg.forEach((row) => {
      byTenantId.set(String(row.tenantId), row);
    });

    const rows = tenants.map((tenant) => {
      const key = String(tenant._id);
      const stats = byTenantId.get(key);
      return {
        tenantId: key,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        domain: tenant.domain || tenant.subdomain || '',
        productCount: stats?.productCount || 0,
        imageCount: stats?.imageCount || 0,
        uniqueImageCount: stats?.uniqueImageCount || 0,
        videoCount: stats?.videoCount || 0,
      };
    });

    if (includeSize && hasCloudinaryConfig) {
      const bytesByTenant = await getTenantSizeBytes(db);
      rows.forEach((row) => {
        const bytes = bytesByTenant.get(String(row.tenantId));
        const totalBytes = bytes?.totalBytes || 0;
        row.totalBytes = totalBytes;
        row.totalMB = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
        row.imageBytes = bytes?.imageBytes || 0;
        row.videoBytes = bytes?.videoBytes || 0;
      });
      rows.sort((a, b) => (b.totalBytes || 0) - (a.totalBytes || 0));
    } else {
      rows.sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0));
    }

    const totals = {
      activeTenants: rows.length,
      productCount: rows.reduce((sum, r) => sum + (r.productCount || 0), 0),
      imageCount: rows.reduce((sum, r) => sum + (r.imageCount || 0), 0),
      uniqueImageCount: rows.reduce((sum, r) => sum + (r.uniqueImageCount || 0), 0),
      videoCount: rows.reduce((sum, r) => sum + (r.videoCount || 0), 0),
    };

    if (includeSize && hasCloudinaryConfig) {
      const totalBytes = rows.reduce((sum, r) => sum + (r.totalBytes || 0), 0);
      totals.totalBytes = totalBytes;
      totals.totalMB = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      includeSize,
      sizeAvailable,
      sizeError,
      tenants: rows,
      totals,
    });
  } catch (error) {
    console.error('GET /api/admin/tenant-media-usage error:', error);
    const status = error?.status || 500;

    if (status === 401 || status === 403) {
      const message = status === 401 ? 'Unauthorized' : 'Forbidden';
      return NextResponse.json({ ok: false, error: message }, { status });
    }

    if (isDbUnavailableError(error)) {
      return jsonAdminFallback(
        await buildTenantMediaUsageFileFallback({
          includeSize,
          sizeAvailable,
          sizeError,
        }),
      );
    }

    const message =
      status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export const GET = withErrorLogging(GETHandler);
