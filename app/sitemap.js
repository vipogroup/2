import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb } from '@/lib/db';
import {
  STAINLESS_SEO_CATEGORY_KEYS,
  getProductPublicPath,
  getStainlessSeoCategoryConfig,
  getStainlessSeoCategoryFromProduct,
  isIncludedStainlessProduct,
} from '@/lib/stainlessSeoCategories';

function sanitizeRuntimeEnvValue(rawValue) {
  return String(rawValue ?? '')
    .replace(/\uFEFF/g, '')
    .trim()
    .replace(/^(?:\\r\\n|\\n|\\r|[\r\n])+/g, '')
    .replace(/(?:\\r\\n|\\n|\\r|[\r\n])+$/g, '');
}

function normalizeSiteUrl(rawValue) {
  const cleaned = sanitizeRuntimeEnvValue(rawValue).replace(/\/+$/, '');
  if (!cleaned) return 'https://www.vipo-group.com';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value._id) return String(value._id).trim();
  return String(value).trim();
}

const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com');
const FALLBACK_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-products.json');
const FALLBACK_TENANTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-tenants.json');

export const revalidate = 600;

function toValidDate(value, fallback = new Date()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

function getMostRecentDate(values, fallback = new Date()) {
  let latestTimestamp = 0;

  for (const value of values) {
    const date = new Date(value);
    const timestamp = date.getTime();
    if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
    }
  }

  return latestTimestamp > 0 ? new Date(latestTimestamp) : fallback;
}

function getProductImageUrls(product) {
  const mediaImages = Array.isArray(product?.media?.images) ? product.media.images : [];
  const urls = mediaImages
    .map((item) => item?.url)
    .filter((url) => typeof url === 'string' && url.trim())
    .slice(0, 6)
    .map((url) => url.trim());

  return [...new Set(urls)].map((url) => ({
    url,
    title: product?.name || 'VIPO Product',
  }));
}

function getProductPriority(product) {
  if (product?.isFeatured) return 0.9;
  if (product?.purchaseType === 'group') return 0.85;
  return 0.8;
}

async function loadFallbackMarketplaceSitemapData() {
  try {
    const [productsRaw, tenantsRaw] = await Promise.all([
      fs.readFile(FALLBACK_PRODUCTS_FILE, 'utf8'),
      fs.readFile(FALLBACK_TENANTS_FILE, 'utf8'),
    ]);

    const products = JSON.parse(productsRaw);
    const tenants = JSON.parse(tenantsRaw);

    return {
      products: Array.isArray(products) ? products : [],
      tenants: Array.isArray(tenants) ? tenants : [],
    };
  } catch (error) {
    console.error('Sitemap: Fallback files are unavailable:', error);
    return null;
  }
}

function buildTenantPages(tenants, buildTimestamp, tenantIdsWithProducts = null) {
  const seenTenantSlugs = new Set();
  const normalizedTenants = (Array.isArray(tenants) ? tenants : [])
    .filter((tenant) => {
      const slug = typeof tenant?.slug === 'string' ? tenant.slug.trim() : '';
      if (!slug) return false;

      const status = String(tenant?.status || '').trim().toLowerCase();
      if (!status || !['active', 'approved'].includes(status)) {
        return false;
      }

      if (tenantIdsWithProducts && tenantIdsWithProducts.size > 0) {
        const tenantId = toIdString(tenant?._id);
        if (!tenantId || !tenantIdsWithProducts.has(tenantId)) {
          return false;
        }
      }

      return true;
    })
    .map((tenant) => ({
      slug: tenant.slug.trim().toLowerCase(),
      updatedAt: toValidDate(tenant.updatedAt || tenant.createdAt, buildTimestamp),
    }))
    .filter((tenant) => {
      if (seenTenantSlugs.has(tenant.slug)) return false;
      seenTenantSlugs.add(tenant.slug);
      return true;
    });

  return {
    tenantDates: normalizedTenants.map((tenant) => tenant.updatedAt),
    tenantPages: normalizedTenants.map((tenant) => ({
      url: `${SITE_URL}/t/${tenant.slug}`,
      lastModified: tenant.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  };
}

function buildProductPages(products, buildTimestamp) {
  const sourceProducts = Array.isArray(products) ? products : [];
  const pages = [];
  const productDates = [];
  const tenantIdsWithProducts = new Set();
  const stainlessCategoryLastModified = new Map(
    STAINLESS_SEO_CATEGORY_KEYS.map((key) => [key, 0]),
  );

  for (const product of sourceProducts) {
    const tenantId = toIdString(product?.tenantId);
    if (tenantId) {
      tenantIdsWithProducts.add(tenantId);
    }

    const routePath = getProductPublicPath(product);
    if (!routePath) continue;

    const lastModified = toValidDate(product?.updatedAt || product?.createdAt, buildTimestamp);
    productDates.push(lastModified);

    if (isIncludedStainlessProduct(product)) {
      const seoCategory = getStainlessSeoCategoryFromProduct(product);
      if (seoCategory && stainlessCategoryLastModified.has(seoCategory)) {
        const previous = stainlessCategoryLastModified.get(seoCategory) || 0;
        if (lastModified.getTime() > previous) {
          stainlessCategoryLastModified.set(seoCategory, lastModified.getTime());
        }
      }

      // Include every indexable stainless URL (regular, -group, -sc). SEO audits expect
      // public variant URLs in sitemap.xml alongside canonical product pages.
    }

    pages.push({
      url: `${SITE_URL}${routePath}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: getProductPriority(product),
      images: getProductImageUrls(product),
    });
  }

  const seenUrls = new Set();
  const productPages = pages.filter((page) => {
    if (!page?.url) return false;
    if (seenUrls.has(page.url)) return false;
    seenUrls.add(page.url);
    return true;
  });

  return {
    productDates,
    productPages,
    stainlessCategoryLastModified,
    tenantIdsWithProducts,
  };
}

function buildStainlessCategoryPages(stainlessCategoryLastModified) {
  return STAINLESS_SEO_CATEGORY_KEYS
    .map((seoCategory) => {
      const config = getStainlessSeoCategoryConfig(seoCategory);
      if (!config) return null;

      const timestamp = stainlessCategoryLastModified?.get?.(seoCategory) || 0;
      if (timestamp <= 0) {
        return null;
      }

      return {
        url: `${SITE_URL}${config.canonicalPath}`,
        lastModified: new Date(timestamp),
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    })
    .filter(Boolean);
}

export default async function sitemap() {
  const buildTimestamp = new Date();

  // Get all published products
  let productPages = [];
  let tenantPages = [];
  let stainlessCategoryPages = [];
  let latestContentDate = buildTimestamp;
  let isFallbackMode = false;
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Sitemap: MongoDB unavailable (no URI or connection skipped)');
    }
    const [tenants, products] = await Promise.all([
      db.collection('tenants')
        .find({
          slug: { $exists: true, $ne: '' },
          status: { $in: ['active', 'approved'] },
        })
        .project({ _id: 1, slug: 1, status: 1, updatedAt: 1, createdAt: 1 })
        .toArray(),
      db.collection('products')
      .find({ status: 'published', active: { $ne: false } })
      .project({
        _id: 1,
        tenantId: 1,
        legacyId: 1,
        updatedAt: 1,
        createdAt: 1,
        seo: 1,
        category: 1,
        purchaseType: 1,
        type: 1,
        inventoryMode: 1,
        groupPurchaseType: 1,
        stockCount: 1,
        inStock: 1,
        isFeatured: 1,
        position: 1,
        stainless: 1,
        sku: 1,
        name: 1,
        media: 1,
      })
      .toArray(),
    ]);

    const {
      productDates,
      productPages: dbProductPages,
      stainlessCategoryLastModified,
      tenantIdsWithProducts,
    } = buildProductPages(products, buildTimestamp);

    const { tenantPages: dbTenantPages, tenantDates } = buildTenantPages(
      tenants,
      buildTimestamp,
      tenantIdsWithProducts,
    );

    productPages = dbProductPages;
    tenantPages = dbTenantPages;
    latestContentDate = getMostRecentDate([...productDates, ...tenantDates], buildTimestamp);
    stainlessCategoryPages = buildStainlessCategoryPages(stainlessCategoryLastModified);
  } catch (error) {
    console.error('Sitemap: Error fetching products:', error);
    isFallbackMode = true;

    const fallbackData = await loadFallbackMarketplaceSitemapData();
    if (fallbackData) {
      const indexableTenants = fallbackData.tenants.filter(
        (tenant) => ['active', 'approved'].includes(String(tenant?.status || '').trim().toLowerCase()) && typeof tenant?.slug === 'string' && tenant.slug.trim(),
      );
      const activeTenantIds = new Set(indexableTenants.map((tenant) => toIdString(tenant?._id)).filter(Boolean));

      const fallbackProducts = fallbackData.products.filter((product) => {
        if (product?.status !== 'published') return false;
        if (product?.active === false) return false;
        if (!product?.tenantId) return true;
        return activeTenantIds.has(toIdString(product.tenantId));
      });

      const {
        productDates,
        productPages: fallbackProductPages,
        stainlessCategoryLastModified,
        tenantIdsWithProducts,
      } = buildProductPages(fallbackProducts, buildTimestamp);

      const { tenantPages: fallbackTenantPages, tenantDates } = buildTenantPages(
        indexableTenants,
        buildTimestamp,
        tenantIdsWithProducts,
      );

      tenantPages = fallbackTenantPages;
      productPages = fallbackProductPages;
      latestContentDate = getMostRecentDate([...productDates, ...tenantDates], buildTimestamp);
      stainlessCategoryPages = buildStainlessCategoryPages(stainlessCategoryLastModified);
    }
  }

  // Static pages (only 200-status canonical URLs, no redirects)
  const staticPages = [
    {
      url: SITE_URL,
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: buildTimestamp,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: buildTimestamp,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/for-business`,
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/for-agents`,
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/join`,
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: buildTimestamp,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: buildTimestamp,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/returns-policy`,
      lastModified: buildTimestamp,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Fallback mode: static URLs always; include product URLs when fallback JSON supplied them.
  if (isFallbackMode) {
    if (productPages && productPages.length > 0) {
      return [...staticPages, ...productPages];
    }
    return staticPages;
  }

  return [...staticPages, ...stainlessCategoryPages, ...tenantPages, ...productPages];
}
