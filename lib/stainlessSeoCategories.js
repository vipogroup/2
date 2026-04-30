const STAINLESS_EXCLUDED_CATEGORIES = Object.freeze([
  'עגלות מטבח מנירוסטה',
  'עגלת משטח מורכבת מנירוסטה',
  'עגלת תבניות מנירוסטה',
  'מדפי מטבח מנירוסטה',
]);

const STAINLESS_SEO_CATEGORY_ARCHITECTURE = Object.freeze({
  tables: Object.freeze({
    key: 'tables',
    routeSegment: 'tables',
    canonicalPath: '/stainless/tables',
    title: 'שולחנות נירוסטה',
    h1: 'שולחנות נירוסטה למטבחים תעשייתיים ומוסדיים',
    seoTitle: 'שולחנות נירוסטה למטבח תעשייתי ומוסדי | VIPO',
    seoDescription: 'שולחנות עבודה מנירוסטה לבתי מלון, מסעדות ומטבחים מוסדיים — דגמים 2 ו-3 שכבות, עם מדפים ומשטחי עבודה עמידים. מחירים תחרותיים ומשלוח לכל הארץ.',
    sourceCategories: Object.freeze([
      'שולחן עבודה מנירוסטה 2 שכבות',
      'שולחן עבודה מנירוסטה 3 שכבות',
    ]),
  }),
  sinks: Object.freeze({
    key: 'sinks',
    routeSegment: 'sinks',
    canonicalPath: '/stainless/sinks',
    title: 'כיורי נירוסטה',
    h1: 'כיורי נירוסטה למטבחים תעשייתיים ומוסדיים',
    seoTitle: 'כיורי נירוסטה למטבח תעשייתי ומוסדי | VIPO',
    seoDescription: 'כיורי נירוסטה לבתי אוכל, בתי מלון ומטבחים מסחריים — יחיד, כפול ומשולש עם משטחי עבודה. ייצור עמיד לדרישות היגיינה מחמירות.',
    sourceCategories: Object.freeze([
      'כיור נירוסטה יחיד',
      'כיור כפול/יחיד מנירוסטה עם משטח',
      'כיור משולש/כפול מנירוסטה עם משטח',
    ]),
  }),
  cabinets: Object.freeze({
    key: 'cabinets',
    routeSegment: 'cabinets',
    canonicalPath: '/stainless/cabinets',
    title: 'ארונות נירוסטה',
    h1: 'ארונות נירוסטה למטבחים תעשייתיים ומוסדיים',
    seoTitle: 'ארונות נירוסטה למטבח תעשייתי ומוסדי | VIPO',
    seoDescription: 'ארונות נירוסטה לאחסון ועבודה במטבחים מוסדיים ותעשייתיים — ארונות עבודה ועם שולחן משולב בגדלים שונים. חומר נירוסטה אנטי-חיידקי ועמיד לאורך שנים.',
    sourceCategories: Object.freeze([
      'ארון עבודה',
      'ארון שולחן עבודה מנירוסטה',
    ]),
  }),
});

const STAINLESS_DIAGNOSTIC_FAMILY_SLUG_PREFIXES = Object.freeze({
  'שולחן עבודה מנירוסטה 2 שכבות': Object.freeze(['stainless-steel-table']),
  'שולחן עבודה מנירוסטה 3 שכבות': Object.freeze(['stainless-steel-table-middle-shelf']),
  'כיור נירוסטה יחיד': Object.freeze(['stainless-steel-sink-single']),
  'כיור כפול/יחיד מנירוסטה עם משטח': Object.freeze(['stainless-steel-sink-single', 'stainless-steel-sink-double']),
  'כיור משולש/כפול מנירוסטה עם משטח': Object.freeze(['stainless-steel-sink-double', 'stainless-steel-sink-triple']),
  'ארון עבודה': Object.freeze(['stainless-steel-cabinet']),
  'ארון שולחן עבודה מנירוסטה': Object.freeze([]),
});

const STAINLESS_SEO_CATEGORY_KEYS = Object.freeze(Object.keys(STAINLESS_SEO_CATEGORY_ARCHITECTURE));

function normalizeStainlessCategoryValue(value = '') {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

const STAINLESS_CATEGORY_TO_SEO_CATEGORY = Object.freeze(
  STAINLESS_SEO_CATEGORY_KEYS.reduce((accumulator, key) => {
    const config = STAINLESS_SEO_CATEGORY_ARCHITECTURE[key];
    for (const category of config.sourceCategories) {
      accumulator[normalizeStainlessCategoryValue(category)] = key;
    }
    return accumulator;
  }, {}),
);

function getStainlessSeoCategoryConfig(seoCategory) {
  return STAINLESS_SEO_CATEGORY_ARCHITECTURE[seoCategory] || null;
}

function getAllowedStainlessCategoriesForSeoCategory(seoCategory) {
  const config = getStainlessSeoCategoryConfig(seoCategory);
  return config?.sourceCategories || [];
}

function getStainlessSeoCategoryFromCategory(category) {
  return STAINLESS_CATEGORY_TO_SEO_CATEGORY[normalizeStainlessCategoryValue(category)] || null;
}

function getStainlessSeoCategoryFromProduct(product = {}) {
  return getStainlessSeoCategoryFromCategory(product?.category);
}

function isMappedStainlessCategory(category) {
  return Boolean(getStainlessSeoCategoryFromCategory(category));
}

function isIncludedStainlessProduct(product = {}) {
  return Boolean(getStainlessSeoCategoryFromProduct(product));
}

function filterProductsByStainlessSeoCategory(products = [], seoCategory) {
  const allowedCategories = new Set(getAllowedStainlessCategoriesForSeoCategory(seoCategory));
  if (!allowedCategories.size) {
    return [];
  }

  return (Array.isArray(products) ? products : []).filter((product) => {
    const normalizedCategory = normalizeStainlessCategoryValue(product?.category);
    return allowedCategories.has(normalizedCategory);
  });
}

function getProductSeoSlug(product = {}) {
  return typeof product?.seo?.slug === 'string' && product.seo.slug.trim()
    ? product.seo.slug.trim().toLowerCase()
    : '';
}

function stripKnownVariantSuffix(value = '') {
  return String(value || '')
    .trim()
    .replace(/(?:-|_)(?:group|sc|sharedcontainer|shared_container)$/i, '');
}

function normalizeBaseSku(value = '') {
  return stripKnownVariantSuffix(value).toUpperCase();
}

function normalizeBaseName(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s*-\s*מחיר קבוצתי מוזל$/i, '')
    .replace(/\s*-\s*מכולה משותפת$/i, '')
    .replace(/\s*-\s*קבוצה$/i, '')
    .replace(/\s*-\s*shared container$/i, '')
    .replace(/\s*-\s*group$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function buildStainlessVariantFlags(product = {}) {
  const purchaseType = String(product?.purchaseType || '').trim().toLowerCase();
  const type = String(product?.type || '').trim().toLowerCase();
  const inventoryMode = String(product?.inventoryMode || '').trim().toLowerCase();
  const groupPurchaseType = String(product?.groupPurchaseType || '').trim().toLowerCase();
  const isGroup = purchaseType === 'group' || type === 'group' || inventoryMode === 'group';
  const isSharedContainer = isGroup && groupPurchaseType === 'shared_container';
  const isRegular = !isGroup || purchaseType === 'regular' || type === 'online' || inventoryMode === 'stock';

  return {
    isRegular,
    isGroup,
    isSharedContainer,
    purchaseType,
    type,
    inventoryMode,
    groupPurchaseType,
  };
}

function buildStainlessDimensionsSignature(product = {}) {
  const stainless = product?.stainless || {};
  const length = Number(stainless?.length);
  const width = Number(stainless?.width);
  const height = Number(stainless?.height);
  const layers = Number(stainless?.layers);
  const parts = [];

  if (Number.isFinite(length) && length > 0) parts.push(`l:${length}`);
  if (Number.isFinite(width) && width > 0) parts.push(`w:${width}`);
  if (Number.isFinite(height) && height > 0) parts.push(`h:${height}`);
  if (Number.isFinite(layers) && layers > 0) parts.push(`layers:${layers}`);

  if (typeof stainless?.material === 'string' && stainless.material.trim()) {
    parts.push(`material:${stainless.material.trim().toLowerCase()}`);
  }

  if (typeof stainless?.thickness === 'string' && stainless.thickness.trim()) {
    parts.push(`thickness:${stainless.thickness.trim().toLowerCase()}`);
  }

  if (stainless?.hasMiddleShelf === true) {
    parts.push('middle:1');
  }

  return parts.join('|');
}

function buildStainlessBaseProductKey(product = {}) {
  const seoCategory = getStainlessSeoCategoryFromProduct(product);
  const category = normalizeStainlessCategoryValue(product?.category);

  if (!seoCategory || !category) {
    return '';
  }

  const dimensionsSignature = buildStainlessDimensionsSignature(product);
  const baseSku = normalizeBaseSku(product?.sku);
  const baseName = normalizeBaseName(product?.name);

  return [
    `seo:${seoCategory}`,
    `category:${category}`,
    dimensionsSignature ? `dimensions:${dimensionsSignature}` : '',
    !dimensionsSignature && baseSku ? `sku:${baseSku}` : '',
    !dimensionsSignature && !baseSku && baseName ? `name:${baseName}` : '',
  ]
    .filter(Boolean)
    .join('|');
}

function getStainlessCanonicalPreferenceScore(product = {}) {
  const flags = buildStainlessVariantFlags(product);
  const slug = getProductSeoSlug(product);
  const stockCount = Number(product?.stockCount);
  const position = Number(product?.position);
  let score = 0;

  if (flags.isRegular) {
    score += 300;
  } else if (flags.isGroup && !flags.isSharedContainer) {
    score += 200;
  } else if (flags.isSharedContainer) {
    score += 100;
  }

  if (slug) {
    score += 40;
  }

  if (slug && !/(?:-group|-sc)$/i.test(slug)) {
    score += 30;
  }

  if (product?.inStock === true) {
    score += 20;
  }

  if (Number.isFinite(stockCount) && stockCount > 0) {
    score += 10;
  }

  if (product?.isFeatured === true) {
    score += 5;
  }

  if (Number.isFinite(position) && position >= 0) {
    score += Math.max(0, 5 - Math.min(position, 5));
  }

  return score;
}

function compareStainlessCanonicalCandidates(a = {}, b = {}) {
  const scoreDifference = getStainlessCanonicalPreferenceScore(b) - getStainlessCanonicalPreferenceScore(a);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const updatedAtA = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
  const updatedAtB = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
  if (updatedAtB !== updatedAtA) {
    return updatedAtB - updatedAtA;
  }

  const routeParamA = getProductPublicRouteParam(a);
  const routeParamB = getProductPublicRouteParam(b);
  return routeParamA.localeCompare(routeParamB, 'en');
}

function chooseCanonicalStainlessProduct(products = []) {
  const candidates = Array.isArray(products) ? products.filter(Boolean) : [];
  if (!candidates.length) {
    return null;
  }

  return [...candidates].sort(compareStainlessCanonicalCandidates)[0] || null;
}

function groupStainlessProductsByBaseKey(products = []) {
  const groups = new Map();

  for (const product of Array.isArray(products) ? products : []) {
    if (!isIncludedStainlessProduct(product)) {
      continue;
    }

    const baseProductKey = buildStainlessBaseProductKey(product);
    if (!baseProductKey) {
      continue;
    }

    if (!groups.has(baseProductKey)) {
      groups.set(baseProductKey, []);
    }

    groups.get(baseProductKey).push(product);
  }

  return groups;
}

function dedupeStainlessProductsForSeo(products = []) {
  const groups = [];
  const groupedProducts = groupStainlessProductsByBaseKey(products);

  for (const [baseProductKey, variants] of groupedProducts.entries()) {
    const sortedVariants = [...variants].sort(compareStainlessCanonicalCandidates);
    const canonicalProduct = sortedVariants[0] || null;

    if (!canonicalProduct) {
      continue;
    }

    groups.push({
      baseProductKey,
      canonicalProduct,
      variants: sortedVariants,
    });
  }

  groups.sort((a, b) => compareStainlessCanonicalCandidates(a.canonicalProduct, b.canonicalProduct));

  return {
    groups,
    canonicalProducts: groups.map((group) => group.canonicalProduct),
  };
}

function getProductPublicRouteParam(product = {}) {
  const slug = getProductSeoSlug(product);
  if (slug) {
    return slug;
  }

  if (product?._id) {
    return String(product._id);
  }

  if (product?.legacyId) {
    return String(product.legacyId);
  }

  return '';
}

function getProductPublicPath(product = {}) {
  const routeParam = getProductPublicRouteParam(product);
  return routeParam ? `/products/${routeParam}` : '/products';
}

function getDiagnosticSlugPrefixesForCategory(category) {
  return STAINLESS_DIAGNOSTIC_FAMILY_SLUG_PREFIXES[normalizeStainlessCategoryValue(category)] || [];
}

function getStainlessFamilySlugTable(seoCategory) {
  const config = getStainlessSeoCategoryConfig(seoCategory);
  if (!config) {
    return [];
  }

  return config.sourceCategories.map((family) => ({
    family,
    slugPrefixes: getDiagnosticSlugPrefixesForCategory(family),
  }));
}

export {
  STAINLESS_CATEGORY_TO_SEO_CATEGORY,
  STAINLESS_DIAGNOSTIC_FAMILY_SLUG_PREFIXES,
  STAINLESS_EXCLUDED_CATEGORIES,
  STAINLESS_SEO_CATEGORY_ARCHITECTURE,
  STAINLESS_SEO_CATEGORY_KEYS,
  buildStainlessBaseProductKey,
  buildStainlessDimensionsSignature,
  buildStainlessVariantFlags,
  chooseCanonicalStainlessProduct,
  compareStainlessCanonicalCandidates,
  dedupeStainlessProductsForSeo,
  filterProductsByStainlessSeoCategory,
  getDiagnosticSlugPrefixesForCategory,
  getAllowedStainlessCategoriesForSeoCategory,
  getProductPublicPath,
  getProductPublicRouteParam,
  getProductSeoSlug,
  getStainlessCanonicalPreferenceScore,
  getStainlessFamilySlugTable,
  getStainlessSeoCategoryConfig,
  getStainlessSeoCategoryFromCategory,
  getStainlessSeoCategoryFromProduct,
  groupStainlessProductsByBaseKey,
  isIncludedStainlessProduct,
  isMappedStainlessCategory,
  normalizeBaseName,
  normalizeBaseSku,
  normalizeStainlessCategoryValue,
  stripKnownVariantSuffix,
};
