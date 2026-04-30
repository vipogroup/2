/** Meta Catalog feed (Phase 1) — constants only */

export const META_FEED_CANONICAL_ORIGIN = 'https://www.vipo-group.com';
export const META_FEED_BRAND = 'מחסני נירוסטה';
export const META_FEED_LIMIT = 100;

export const META_FEED_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
};

export const META_FEED_PROJECTION = {
  _id: 1,
  legacyId: 1,
  sku: 1,
  tenantId: 1,
  name: 1,
  category: 1,
  subCategory: 1,
  description: 1,
  fullDescription: 1,
  price: 1,
  currency: 1,
  stockCount: 1,
  inStock: 1,
  status: 1,
  active: 1,
  purchaseType: 1,
  type: 1,
  groupPurchaseType: 1,
  inventoryMode: 1,
  'media.images': 1,
  'seo.slug': 1,
  updatedAt: 1,
};
