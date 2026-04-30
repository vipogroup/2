import fs from 'node:fs/promises';
import path from 'node:path';

const FALLBACK_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-products.json');
const FALLBACK_TENANTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-tenants.json');
const FALLBACK_CACHE_TTL_MS = Math.max(
  5000,
  Number(process.env.ADMIN_FALLBACK_CACHE_TTL_MS || 60000),
);
const FALLBACK_SOURCE = 'fallback_marketplace_files';
const FALLBACK_REASON = 'db_unavailable';
const FALLBACK_SCHEMA_VERSION = 2;

let fallbackCache = {
  value: null,
  loadedAt: 0,
};

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toTenantKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return '';
}

function getActiveTenants(allTenants) {
  return (allTenants || []).filter((tenant) => {
    const status = normalizeString(tenant?.status).toLowerCase();
    return !status || status === 'active';
  });
}

function getVisibleProducts(allProducts, activeTenantIdSet) {
  return (allProducts || []).filter((product) => {
    const status = normalizeString(product?.status).toLowerCase();
    if (status && status !== 'published') {
      return false;
    }

    const tenantKey = toTenantKey(product?.tenantId);
    if (!tenantKey) {
      return true;
    }

    return activeTenantIdSet.has(tenantKey);
  });
}

function getImageUrls(product) {
  const images = Array.isArray(product?.media?.images) ? product.media.images : [];
  const urls = [];
  images.forEach((img) => {
    if (typeof img === 'string') {
      const value = img.trim();
      if (value) urls.push(value);
      return;
    }
    if (!img || typeof img !== 'object') return;
    const url = normalizeString(img.url);
    if (url) urls.push(url);
  });
  return urls;
}

function hasVideo(product) {
  return Boolean(normalizeString(product?.media?.videoUrl));
}

async function loadFallbackMarketplaceData() {
  const now = Date.now();
  if (fallbackCache.value && now - fallbackCache.loadedAt < FALLBACK_CACHE_TTL_MS) {
    return fallbackCache.value;
  }

  try {
    const [productsRaw, tenantsRaw] = await Promise.all([
      fs.readFile(FALLBACK_PRODUCTS_FILE, 'utf8'),
      fs.readFile(FALLBACK_TENANTS_FILE, 'utf8'),
    ]);

    const parsedProducts = JSON.parse(productsRaw);
    const parsedTenants = JSON.parse(tenantsRaw);

    fallbackCache = {
      loadedAt: now,
      value: {
        allProducts: Array.isArray(parsedProducts) ? parsedProducts : [],
        allTenants: Array.isArray(parsedTenants) ? parsedTenants : [],
      },
    };
  } catch (error) {
    console.error('[ADMIN_FALLBACK] Failed to read fallback marketplace files:', error);
    fallbackCache = {
      loadedAt: now,
      value: {
        allProducts: [],
        allTenants: [],
      },
    };
  }

  return fallbackCache.value;
}

function buildFallbackMeta() {
  const generatedAt = new Date().toISOString();
  return {
    degraded: true,
    fallback: true,
    reason: FALLBACK_REASON,
    source: FALLBACK_SOURCE,
    generatedAt,
    fallbackSchemaVersion: FALLBACK_SCHEMA_VERSION,
  };
}

function buildTenantProductsMap(products) {
  const byTenant = new Map();
  products.forEach((product) => {
    const tenantKey = toTenantKey(product?.tenantId);
    if (!tenantKey) return;
    if (!byTenant.has(tenantKey)) {
      byTenant.set(tenantKey, []);
    }
    byTenant.get(tenantKey).push(product);
  });
  return byTenant;
}

export async function buildAdminDashboardFileFallback() {
  const meta = buildFallbackMeta();
  const { allProducts, allTenants } = await loadFallbackMarketplaceData();
  const activeTenants = getActiveTenants(allTenants);
  const activeTenantIdSet = new Set(activeTenants.map((tenant) => toTenantKey(tenant?._id)));
  const visibleProducts = getVisibleProducts(allProducts, activeTenantIdSet);

  const groupProducts = visibleProducts.filter((product) => {
    const type = normalizeString(product?.type).toLowerCase();
    const purchaseType = normalizeString(product?.purchaseType).toLowerCase();
    return type === 'group' || purchaseType === 'group';
  }).length;

  const onlineProducts = visibleProducts.filter((product) => {
    const type = normalizeString(product?.type).toLowerCase();
    const purchaseType = normalizeString(product?.purchaseType).toLowerCase();
    return type === 'online' || purchaseType === 'regular';
  }).length;

  return {
    ok: true,
    ...meta,
    stats: {
      totalUsers: 0,
      totalAgents: 0,
      totalCustomers: 0,
      totalOrders: 0,
      totalProducts: visibleProducts.length,
      groupProducts,
      onlineProducts,
      totalCommissions: 0,
      totalClicks: 0,
      activeTenants: activeTenants.length,
    },
    snapshot: {
      activeTenants: activeTenants.length,
      visibleProducts: visibleProducts.length,
    },
    newUsers: [],
    agentStats: [],
    recentOrders: [],
  };
}

export async function buildTenantStatsFileFallback({ period, startDate }) {
  const meta = buildFallbackMeta();
  const { allProducts, allTenants } = await loadFallbackMarketplaceData();
  const activeTenants = getActiveTenants(allTenants);
  const activeTenantIdSet = new Set(activeTenants.map((tenant) => toTenantKey(tenant?._id)));
  const visibleProducts = getVisibleProducts(allProducts, activeTenantIdSet);
  const productsByTenant = buildTenantProductsMap(visibleProducts);

  const tenants = activeTenants.map((tenant) => {
    const tenantKey = toTenantKey(tenant?._id);
    const productCount = (productsByTenant.get(tenantKey) || []).length;

    return {
      tenantId: tenantKey,
      tenantName: tenant?.name || '',
      tenantSlug: tenant?.slug || '',
      domain: tenant?.domain || tenant?.subdomain || '',
      platformCommissionRate: Number(tenant?.platformCommissionRate) || 5,
      productCount,
      totalSales: 0,
      orderCount: 0,
      avgOrderValue: 0,
      platformCommission: 0,
      tenantEarnings: 0,
      pendingBalance: Number(tenant?.billing?.pendingBalance) || 0,
      totalPaid: Number(tenant?.billing?.totalPaid) || 0,
    };
  });

  const totals = {
    totalSales: 0,
    totalOrders: 0,
    totalPlatformCommission: 0,
    totalTenantEarnings: 0,
    totalPendingBalance: tenants.reduce((sum, tenant) => sum + (tenant.pendingBalance || 0), 0),
    activeTenants: tenants.length,
  };

  return {
    ok: true,
    ...meta,
    period,
    startDate,
    tenants,
    totals,
  };
}

export async function buildTenantMediaUsageFileFallback({
  includeSize,
  sizeAvailable,
  sizeError,
}) {
  const meta = buildFallbackMeta();
  const { allProducts, allTenants } = await loadFallbackMarketplaceData();
  const activeTenants = getActiveTenants(allTenants);
  const activeTenantIdSet = new Set(activeTenants.map((tenant) => toTenantKey(tenant?._id)));
  const visibleProducts = getVisibleProducts(allProducts, activeTenantIdSet);
  const productsByTenant = buildTenantProductsMap(visibleProducts);

  const tenants = activeTenants.map((tenant) => {
    const tenantKey = toTenantKey(tenant?._id);
    const tenantProducts = productsByTenant.get(tenantKey) || [];

    let imageCount = 0;
    let videoCount = 0;
    const uniqueImages = new Set();

    tenantProducts.forEach((product) => {
      const imageUrls = getImageUrls(product);
      imageCount += imageUrls.length;
      imageUrls.forEach((url) => uniqueImages.add(url));
      if (hasVideo(product)) {
        videoCount += 1;
      }
    });

    return {
      tenantId: tenantKey,
      tenantName: tenant?.name || '',
      tenantSlug: tenant?.slug || '',
      domain: tenant?.domain || tenant?.subdomain || '',
      productCount: tenantProducts.length,
      imageCount,
      uniqueImageCount: uniqueImages.size,
      videoCount,
    };
  });

  tenants.sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0));

  const totals = {
    activeTenants: tenants.length,
    productCount: tenants.reduce((sum, row) => sum + (row.productCount || 0), 0),
    imageCount: tenants.reduce((sum, row) => sum + (row.imageCount || 0), 0),
    uniqueImageCount: tenants.reduce((sum, row) => sum + (row.uniqueImageCount || 0), 0),
    videoCount: tenants.reduce((sum, row) => sum + (row.videoCount || 0), 0),
  };

  if (includeSize && sizeAvailable) {
    totals.totalBytes = 0;
    totals.totalMB = 0;
  }

  return {
    ok: true,
    ...meta,
    includeSize,
    sizeAvailable,
    sizeError,
    tenants,
    totals,
  };
}

export function resetAdminFallbackCacheForTests() {
  fallbackCache = {
    value: null,
    loadedAt: 0,
  };
}
