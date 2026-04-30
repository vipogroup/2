import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import Tenant from '@/models/Tenant';
import {
  STAINLESS_SEO_CATEGORY_ARCHITECTURE,
  STAINLESS_SEO_CATEGORY_KEYS,
  buildStainlessBaseProductKey,
  chooseCanonicalStainlessProduct,
  compareStainlessCanonicalCandidates,
  dedupeStainlessProductsForSeo,
  getProductPublicPath,
  getStainlessSeoCategoryConfig,
  getStainlessSeoCategoryFromProduct,
  isIncludedStainlessProduct,
} from '@/lib/stainlessSeoCategories';

function serializeDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

async function getActiveTenantIds() {
  await connectMongo();
  const activeTenants = await Tenant.find({ status: 'active' }).select('_id').lean();
  return activeTenants.map((tenant) => tenant._id);
}

function buildMarketplacePublishedQuery({ categories = [] } = {}, activeTenantIds = []) {
  const query = {
    status: 'published',
    active: { $ne: false },
    $or: [
      { tenantId: { $in: activeTenantIds } },
      { tenantId: { $exists: false } },
      { tenantId: null },
    ],
    $and: [
      {
        $or: [
          { stockCount: { $gt: 0 } },
          { stockCount: { $exists: false } },
          { purchaseType: 'group' },
          { type: 'group' },
        ],
      },
    ],
  };

  if (Array.isArray(categories) && categories.length > 0) {
    query.category = { $in: categories };
  }

  return query;
}

function getAllMappedStainlessCategories() {
  return STAINLESS_SEO_CATEGORY_KEYS.flatMap((key) => {
    const config = STAINLESS_SEO_CATEGORY_ARCHITECTURE[key];
    return config?.sourceCategories || [];
  });
}

async function loadPublishedStainlessProducts({ seoCategory, categories } = {}) {
  const config = seoCategory ? getStainlessSeoCategoryConfig(seoCategory) : null;
  const effectiveCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : config?.sourceCategories || getAllMappedStainlessCategories();

  if (!effectiveCategories.length) {
    return [];
  }

  await connectMongo();
  const activeTenantIds = await getActiveTenantIds();
  const query = buildMarketplacePublishedQuery({ categories: effectiveCategories }, activeTenantIds);
  const products = await Product.find(query)
    .sort({ isFeatured: -1, position: 1, createdAt: -1 })
    .lean();

  return products
    .map((product) => serializeDoc(product))
    .filter((product) => isIncludedStainlessProduct(product));
}

async function getStainlessCategoryPageData(seoCategory) {
  const config = getStainlessSeoCategoryConfig(seoCategory);
  if (!config) {
    return null;
  }

  const allProducts = await loadPublishedStainlessProducts({ seoCategory });
  const { groups, canonicalProducts } = dedupeStainlessProductsForSeo(allProducts);

  return {
    seoCategory,
    config,
    allProducts,
    groups,
    canonicalProducts,
    productCount: allProducts.length,
    canonicalCount: canonicalProducts.length,
  };
}

async function getStainlessVariantGroupForProduct(product) {
  const seoCategory = getStainlessSeoCategoryFromProduct(product);
  if (!seoCategory) {
    return null;
  }

  const baseProductKey = buildStainlessBaseProductKey(product);
  if (!baseProductKey) {
    return null;
  }

  const peerProducts = await loadPublishedStainlessProducts({
    seoCategory,
    categories: [product.category],
  });

  const variants = peerProducts
    .filter((candidate) => buildStainlessBaseProductKey(candidate) === baseProductKey)
    .sort(compareStainlessCanonicalCandidates);

  if (!variants.length) {
    return null;
  }

  return {
    seoCategory,
    baseProductKey,
    canonicalProduct: chooseCanonicalStainlessProduct(variants),
    variants,
  };
}

async function resolveCanonicalStainlessProduct(product) {
  const variantGroup = await getStainlessVariantGroupForProduct(product);
  return variantGroup?.canonicalProduct || product || null;
}

async function resolveCanonicalStainlessProductPath(product) {
  const canonicalProduct = await resolveCanonicalStainlessProduct(product);
  return getProductPublicPath(canonicalProduct || product);
}

export {
  buildMarketplacePublishedQuery,
  getActiveTenantIds,
  getAllMappedStainlessCategories,
  getStainlessCategoryPageData,
  getStainlessVariantGroupForProduct,
  loadPublishedStainlessProducts,
  resolveCanonicalStainlessProduct,
  resolveCanonicalStainlessProductPath,
};
