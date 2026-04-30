import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import Tenant from '@/models/Tenant';
import Category from '@/models/Category';
import { loadMarketplaceVisibilityForUi } from '@/lib/loadMarketplaceVisibilityForUi';
import {
  buildAllowedCatalogModesForMarketplace,
  productPassesMarketplaceVisibility,
} from '@/lib/marketplaceProductVisibility';
import {
  buildCatalogModeVisibilityMatch,
  buildCatalogProductModeAddFieldsStage,
} from '@/lib/catalogProductModeMongo';

export const dynamic = 'force-dynamic';

const FALLBACK_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-products.json');
const FALLBACK_TENANTS_FILE = path.join(process.cwd(), 'data', 'fallback-marketplace-tenants.json');

/** חנויות שמוצגות במרקטפלייס — כולל pending (ברירת מחדל בסכמה) שלא הועברו ל-active */
const MARKETPLACE_TENANT_STATUSES = ['active', 'pending'];
let fallbackMarketplaceCache = null;
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

function normalizeGroupPurchaseType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'shared_container' || normalized === 'sharedcontainer') {
    return 'shared_container';
  }
  if (normalized === 'group' || normalized === 'regular_group') {
    return 'group';
  }
  return normalized;
}

function jsonWithCache(payload) {
  return NextResponse.json(payload, { headers: PUBLIC_CACHE_HEADERS });
}

// Seed products for local dev when DB is unavailable
const SEED_MARKETPLACE_PRODUCTS = [
  { _id: 'seed-mechanical-keyboard', name: 'מקלדת מכנית RGB מקצועית', description: 'מקלדת מכנית איכותית עם תאורת RGB מלאה', category: 'אביזרי מחשב', price: 499, originalPrice: 699, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 25, rating: 4.7, reviews: 18, media: { images: [{ url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: true },
  { _id: 'seed-gaming-mouse', name: 'עכבר גיימינג אלחוטי', description: 'עכבר גיימינג קל משקל עם חיישן 26,000 DPI', category: 'אביזרי מחשב', price: 389, originalPrice: 459, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 40, rating: 4.5, reviews: 42, media: { images: [{ url: 'https://images.unsplash.com/photo-1584270354949-1ff37cfd84f0?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: false },
  { _id: 'seed-4k-monitor', name: 'מסך 27" 4K HDR מקצועי', description: 'מסך 27 אינץ׳ ברזולוציית 4K עם תמיכה ב-HDR', category: 'מסכים', price: 2190, originalPrice: 2490, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 12, rating: 4.8, reviews: 34, media: { images: [{ url: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: true },
  { _id: 'seed-ergonomic-chair', name: 'כיסא גיימינג ארגונומי', description: 'כיסא ארגונומי עם תמיכה מותנית', category: 'ריהוט', price: 1380, originalPrice: 1590, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 30, rating: 4.6, reviews: 27, media: { images: [{ url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: false },
  { _id: 'seed-standing-desk', name: 'שולחן עמידה מתכוונן חשמלי', description: 'שולחן עבודה מתכוונן חשמלית עם שני מנועים שקטים', category: 'ריהוט', price: 1890, originalPrice: 2190, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 18, rating: 4.6, reviews: 31, media: { images: [{ url: 'https://images.unsplash.com/photo-1616628188505-4047d9b51958?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: false },
  { _id: 'seed-wireless-headphones', name: 'אוזניות אלחוטיות ANC פרימיום', description: 'אוזניות Over-Ear עם ביטול רעשים אקטיבי', category: 'אודיו', price: 1190, originalPrice: 1390, purchaseType: 'regular', type: 'online', inStock: true, stockCount: 22, rating: 4.9, reviews: 105, media: { images: [{ url: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&w=600&q=80', alt: '' }], videoUrl: '' }, tenant: null, isFeatured: true },
];

async function getFallbackMarketplaceData() {
  if (fallbackMarketplaceCache) {
    return fallbackMarketplaceCache;
  }

  const [productsRaw, tenantsRaw] = await Promise.all([
    fs.readFile(FALLBACK_PRODUCTS_FILE, 'utf8'),
    fs.readFile(FALLBACK_TENANTS_FILE, 'utf8'),
  ]);

  fallbackMarketplaceCache = {
    allProducts: JSON.parse(productsRaw),
    allTenants: JSON.parse(tenantsRaw),
  };

  return fallbackMarketplaceCache;
}

async function loadFileFallbackMarketplace({ searchParams, page, limit }) {
  const tenantSlug = searchParams.get('tenant');
  const category = searchParams.get('category');
  const purchaseType = searchParams.get('type');
  const groupPurchaseType = searchParams.get('groupPurchaseType');
  const search = searchParams.get('search');
  const skip = (page - 1) * limit;

  const { allProducts, allTenants } = await getFallbackMarketplaceData();

  const activeTenants = (allTenants || []).filter((t) =>
    MARKETPLACE_TENANT_STATUSES.includes(t?.status),
  );
  const activeTenantIdSet = new Set(activeTenants.map((t) => String(t._id)));
  const tenantsMap = {};
  activeTenants.forEach((t) => {
    tenantsMap[String(t._id)] = t;
  });

  let filtered = (allProducts || []).filter((p) => {
    if (p?.status !== 'published') return false;
    if (!p?.tenantId) return true;
    return activeTenantIdSet.has(String(p.tenantId));
  });

  if (tenantSlug) {
    const tenant = activeTenants.find((t) => t.slug === tenantSlug);
    if (tenant) {
      filtered = filtered.filter((p) => String(p.tenantId) === String(tenant._id));
    } else {
      filtered = [];
    }
  }

  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (purchaseType === 'group') {
    if (groupPurchaseType === 'shared_container') {
      filtered = filtered.filter((p) => normalizeGroupPurchaseType(p.groupPurchaseType) === 'shared_container');
    } else if (groupPurchaseType === 'group') {
      filtered = filtered.filter((p) => {
        const normalizedGroupType = normalizeGroupPurchaseType(p.groupPurchaseType);
        const normalizedPurchaseType = String(p.purchaseType || p.type || '').trim().toLowerCase();
        return normalizedPurchaseType === 'group' && normalizedGroupType !== 'shared_container';
      });
    } else {
      filtered = filtered.filter((p) => {
        const normalizedGroupType = normalizeGroupPurchaseType(p.groupPurchaseType);
        const normalizedPurchaseType = String(p.purchaseType || p.type || '').trim().toLowerCase();
        return normalizedPurchaseType === 'group' || normalizedGroupType === 'shared_container';
      });
    }
  } else if (purchaseType === 'regular') {
    filtered = filtered.filter((p) => {
      const normalizedGroupType = normalizeGroupPurchaseType(p.groupPurchaseType);
      const normalizedPurchaseType = String(p.purchaseType || p.type || '').trim().toLowerCase();
      return (
        Number(p.stockCount || 0) > 0 &&
        p.inStock === true &&
        normalizedPurchaseType !== 'group' &&
        normalizedGroupType !== 'shared_container'
      );
    });
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filtered = filtered.filter((p) =>
      searchRegex.test(String(p.name || '')) ||
      searchRegex.test(String(p.description || '')) ||
      searchRegex.test(String(p.category || '')),
    );
  }

  try {
    const visibilityForUi = await loadMarketplaceVisibilityForUi();
    filtered = filtered.filter((p) => productPassesMarketplaceVisibility(p, visibilityForUi));
  } catch {
    /* אם אין DB להגדרות — משאירים את הרשימה לפי הפילטרים הקיימים */
  }

  filtered.sort((a, b) => {
    const featuredCmp = Number(Boolean(b?.isFeatured)) - Number(Boolean(a?.isFeatured));
    if (featuredCmp !== 0) return featuredCmp;
    const posA = Number.isFinite(a?.position) ? a.position : 999999;
    const posB = Number.isFinite(b?.position) ? b.position : 999999;
    if (posA !== posB) return posA - posB;
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const totalCount = filtered.length;
  const paged = filtered.slice(skip, skip + limit);

  const products = paged.map((product) => {
    const tenantId = product?.tenantId ? String(product.tenantId) : null;
    const tenant = tenantId ? tenantsMap[tenantId] : null;
    const mediaImages = Array.isArray(product?.media?.images) ? product.media.images : [];
    return {
      _id: product.legacyId || String(product._id),
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      groupPrice: product.groupPrice,
      originalPrice: product.originalPrice,
      commission: product.commission,
      media: {
        images: mediaImages,
        videoUrl: product?.media?.videoUrl || '',
      },
      purchaseType: product.purchaseType,
      groupPurchaseType: product.groupPurchaseType || 'group',
      type: product.type,
      inStock: product.inStock,
      stockCount: product.stockCount,
      rating: product.rating,
      reviews: product.reviews,
      isFeatured: product.isFeatured,
      groupEndDate: product.groupEndDate,
      groupMinQuantity: product.groupMinQuantity,
      groupCurrentQuantity: product.groupCurrentQuantity,
      tenant: tenant
        ? {
            _id: String(tenant._id),
            name: tenant.name,
            slug: tenant.slug,
            logo: tenant?.branding?.logo,
            primaryColor: tenant?.branding?.primaryColor,
          }
        : null,
    };
  });

  const categories = [...new Set(filtered.map((p) => p.category).filter(Boolean))];

  return {
    products,
    tenants: activeTenants.map((t) => ({
      _id: String(t._id),
      name: t.name,
      slug: t.slug,
      logo: t?.branding?.logo,
      primaryColor: t?.branding?.primaryColor,
    })),
    categories,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    fallback: true,
  };
}

/**
 * GET /api/marketplace/products
 * מחזיר מוצרים מכל העסקים הפעילים עם פרטי העסק
 * לשימוש בדף הבית - מרקטפלייס מוצרים
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 24;
    const skip = (page - 1) * limit;
    const conn = await connectMongo();

    // No DB connection — return file fallback with full marketplace dataset.
    if (!conn) {
      console.warn('[WARN] No DB connection — using file fallback marketplace data');
      try {
        const fallback = await loadFileFallbackMarketplace({ searchParams, page, limit });
        return jsonWithCache(fallback);
      } catch (fallbackError) {
        console.error('[ERROR] File fallback failed:', fallbackError);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        let filtered = SEED_MARKETPLACE_PRODUCTS;
        if (category) filtered = filtered.filter((p) => p.category === category);
        if (search) {
          const re = new RegExp(search, 'i');
          filtered = filtered.filter((p) => re.test(p.name) || re.test(p.description));
        }
        const categories = [...new Set(SEED_MARKETPLACE_PRODUCTS.map((p) => p.category))];
        return jsonWithCache({
          products: filtered,
          tenants: [],
          categories,
          pagination: { page: 1, limit: 24, total: filtered.length, pages: 1 },
          fallback: true,
        });
      }
    }

    // `next dev`: Mongo מחובר אבל אין מוצרים מפורסמים — snapshot מה-repo (תואם לייצוא קטלוג)
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.MARKETPLACE_DEV_EMPTY_DB_FALLBACK !== '0' &&
      process.env.VIPO_DEV_EMPTY_MONGO_FALLBACK !== '0'
    ) {
      const publishedCount = await Product.countDocuments({ status: 'published' });
      if (publishedCount === 0) {
        try {
          const devFallback = await loadFileFallbackMarketplace({ searchParams, page, limit });
          const total = devFallback.pagination?.total ?? 0;
          if (total > 0 || (devFallback.products && devFallback.products.length > 0)) {
            console.warn(
              '[MONGO] Development: Mongo has no published products — using data/fallback-marketplace-*.json',
            );
            return jsonWithCache({
              ...devFallback,
              fallback: true,
              source: 'dev_empty_db_snapshot',
            });
          }
        } catch (devFbErr) {
          console.warn('[WARN] Dev empty-DB marketplace snapshot failed:', devFbErr?.message || devFbErr);
        }
      }
    }

    // פרמטרים לסינון
    const tenantSlug = searchParams.get('tenant'); // סינון לפי עסק ספציפי
    const category = searchParams.get('category');
    const purchaseType = searchParams.get('type'); // 'group' או 'regular'
    const groupPurchaseType = searchParams.get('groupPurchaseType'); // 'group' או 'shared_container'
    const search = searchParams.get('search');
    // עסקים שמוצגים במרקטפלייס (כולל pending — אחרת מוצרים תחת tenant ברירת מחדל לא יופיעו)
    const activeTenants = await Tenant.find({ status: { $in: MARKETPLACE_TENANT_STATUSES } })
      .select('_id name slug branding contact')
      .lean();
    
    const activeTenantIds = activeTenants.map(t => t._id);
    const tenantsMap = {};
    activeTenants.forEach(t => {
      tenantsMap[t._id.toString()] = t;
    });

    // בניית Query למוצרים
    // מציג מוצרים מפורסמים מעסקים פעילים + מוצרים ללא tenant (גלובליים)
    // חשוב: לא מסננים לפי מלאי בברירת מחדל, כדי להציג את כל קטלוג המרקטפלייס.
    // סינון נראות מנהל מוצרים (מלאי/קבוצה/מכולה) — בשרת דרך aggregate, תואם ל־MarketplaceHome
    const query = {
      status: 'published', // מוצרים מפורסמים בלבד
      $or: [
        { tenantId: { $in: activeTenantIds } }, // מוצרים מעסקים פעילים
        { tenantId: { $exists: false } }, // מוצרים ללא tenant
        { tenantId: null }, // מוצרים עם tenant null
      ]
    };

    // סינון לפי עסק
    if (tenantSlug) {
      const tenant = activeTenants.find(t => t.slug === tenantSlug);
      if (tenant) {
        query.tenantId = tenant._id;
      }
    }

    // סינון לפי קטגוריה
    if (category) {
      query.category = category;
    }

    // סינון לפי סוג רכישה
    // רכישה קבוצתית - כל המוצרים (type: group)
    // מכירה רגילה - רק מוצרים עם מלאי (stockCount > 0)
    if (purchaseType === 'group') {
      query.$and = query.$and || [];

      if (groupPurchaseType === 'shared_container') {
        // Shared-container products should be matched by groupPurchaseType even if legacy purchaseType is inconsistent.
        query.$and.push({
          $or: [
            { groupPurchaseType: 'shared_container' },
            { groupPurchaseType: 'shared-container' },
            { groupPurchaseType: 'shared container' },
            { groupPurchaseType: 'sharedContainer' },
          ],
        });
      } else if (groupPurchaseType === 'group') {
        query.$and.push({ $or: [{ purchaseType: 'group' }, { type: 'group' }] });
        query.$and.push({
          $or: [
            { groupPurchaseType: 'group' },
            { groupPurchaseType: { $exists: false } },
            { groupPurchaseType: null },
          ],
        });
      } else {
        query.$and.push({
          $or: [
            { purchaseType: 'group' },
            { type: 'group' },
            { groupPurchaseType: 'shared_container' },
            { groupPurchaseType: 'shared-container' },
            { groupPurchaseType: 'shared container' },
            { groupPurchaseType: 'sharedContainer' },
          ],
        });
      }
    } else if (purchaseType === 'regular') {
      // רק מוצרים עם מלאי מופיעים במכירה רגילה
      query.$and = query.$and || [];
      query.$and.push({ stockCount: { $gt: 0 } });
      query.$and.push({ inStock: true });
      query.$and.push({ purchaseType: { $ne: 'group' } });
      query.$and.push({ type: { $ne: 'group' } });
      query.$and.push({
        groupPurchaseType: {
          $nin: ['shared_container', 'shared-container', 'shared container', 'sharedContainer'],
        },
      });
    }

    // חיפוש טקסט
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ]
      });
    }

    const visibilityForUi = await loadMarketplaceVisibilityForUi();
    const allowedModes = buildAllowedCatalogModesForMarketplace(visibilityForUi);
    const modeStage = buildCatalogProductModeAddFieldsStage();
    const visMatch = buildCatalogModeVisibilityMatch(allowedModes);

    const listPipeline = [
      { $match: query },
      modeStage,
      { $match: visMatch },
      { $sort: { isFeatured: -1, position: 1, createdAt: -1 } },
      {
        $facet: {
          pageItems: [
            { $skip: skip },
            { $limit: limit },
            { $project: { catalogProductMode: 0 } },
          ],
          totalCount: [{ $count: 'n' }],
        },
      },
    ];

    const categoryFacetQuery = { ...query };
    delete categoryFacetQuery.category;

    const catPipeline = [
      { $match: categoryFacetQuery },
      modeStage,
      { $match: visMatch },
      { $group: { _id: '$category' } },
      { $match: { _id: { $nin: [null, ''] } } },
    ];

    const [listAgg, catRows, inactiveCategoryDocs] = await Promise.all([
      Product.aggregate(listPipeline),
      Product.aggregate(catPipeline),
      Category.find({ type: 'product', active: false }).select('name').lean(),
    ]);

    const products = listAgg?.pageItems ?? [];
    const totalCount = listAgg?.totalCount?.[0]?.n ?? 0;

    // הוספת פרטי העסק לכל מוצר
    const productsWithTenant = products.map(product => {
      const tenantId = product.tenantId?.toString();
      const tenant = tenantId ? tenantsMap[tenantId] : null;
      const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
      
      return {
        _id: product.legacyId || product._id.toString(),
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        groupPrice: product.groupPrice,
        originalPrice: product.originalPrice,
        commission: product.commission,
        media: {
          images: mediaImages,
          videoUrl: product.media?.videoUrl || '',
        },
        purchaseType: product.purchaseType,
        groupPurchaseType: product.groupPurchaseType || 'group',
        type: product.type,
        inStock: product.inStock,
        stockCount: product.stockCount,
        rating: product.rating,
        reviews: product.reviews,
        isFeatured: product.isFeatured,
        groupEndDate: product.groupEndDate,
        groupMinQuantity: product.groupMinQuantity,
        groupCurrentQuantity: product.groupCurrentQuantity,
        // פרטי העסק
        tenant: tenant ? {
          _id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          logo: tenant.branding?.logo,
          primaryColor: tenant.branding?.primaryColor,
        } : null,
      };
    });

    const allCategories = (catRows || []).map((r) => r._id).filter(Boolean);

    const inactiveCategorySet = new Set(
      (inactiveCategoryDocs || [])
        .map((c) => String(c?.name || '').trim().toLowerCase())
        .filter(Boolean),
    );

    const filteredCategories = [];
    const seenLower = new Set();
    for (const name of allCategories || []) {
      if (!name) continue;
      const normalized = String(name).trim();
      if (!normalized) continue;
      const lower = normalized.toLowerCase();
      if (inactiveCategorySet.has(lower)) continue;
      if (seenLower.has(lower)) continue;
      seenLower.add(lower);
      filteredCategories.push(normalized);
    }

    return jsonWithCache({
      products: productsWithTenant,
      tenants: activeTenants.map(t => ({
        _id: t._id.toString(),
        name: t.name,
        slug: t.slug,
        logo: t.branding?.logo,
        primaryColor: t.branding?.primaryColor,
      })),
      categories: filteredCategories,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      }
    });

  } catch (error) {
    console.error('GET /api/marketplace/products error:', error);

    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 24;
      const fallback = await loadFileFallbackMarketplace({ searchParams, page, limit });
      return jsonWithCache(fallback);
    } catch (fallbackError) {
      console.error('[ERROR] Emergency file fallback failed:', fallbackError);
      return jsonWithCache({
        products: SEED_MARKETPLACE_PRODUCTS,
        tenants: [],
        categories: [...new Set(SEED_MARKETPLACE_PRODUCTS.map((p) => p.category))],
        pagination: {
          page: 1,
          limit: 24,
          total: SEED_MARKETPLACE_PRODUCTS.length,
          pages: 1,
        },
        fallback: true,
        error: 'Marketplace fallback mode: DB temporarily unavailable',
      });
    }
  }
}
