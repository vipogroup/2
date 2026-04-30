import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { resolveCanonicalStainlessProductPath } from '@/lib/stainlessSeoServer';
import { getCatalogProductMode } from '@/lib/catalogProductMode';
import { clampSeoTitle } from '@/lib/seoTitleClamp';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();
const SITE_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'VIPO';

function normalizeDescription(value, fallback = '') {
  const text = String(value || fallback || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[|]+/g, ' ')
    .trim();

  if (!text) return '';
  if (text.length <= 160) return text;
  return `${text.substring(0, 157).trim()}...`;
}

function clampTitle(value) {
  const fallback = `מוצר נירוסטה | ${SITE_NAME}`;
  return clampSeoTitle(value, fallback) || fallback;
}

function buildProductMetaDescription(product) {
  const intro = [product?.name, product?.category].filter(Boolean).join(' - ');
  const featureHighlights = Array.isArray(product?.features)
    ? product.features
      .filter((value) => typeof value === 'string' && value.trim())
      .slice(0, 3)
      .join('. ')
    : '';

  const candidates = [
    product?.seo?.metaDescription,
    intro,
    product?.description,
    product?.fullDescription,
    featureHighlights,
    product?.suitableFor,
    product?.whyChooseUs,
    product?.warranty,
  ]
    .map((value) => normalizeDescription(value))
    .filter(Boolean);

  const deduped = [...new Set(candidates)];
  const base = deduped.join('. ') || product?.name || '';
  const priceText = Number.isFinite(product?.price) ? ` מחיר: ₪${product.price.toLocaleString('he-IL')}.` : '';
  const mode = getCatalogProductMode(product);
  const stockText =
    mode === 'shared_container'
      ? ' זמין במסלול מכולה משותפת.'
      : mode === 'group'
        ? ' זמין לרכישה קבוצתית.'
        : ' זמין לרכישה מיידית מהמלאי.';
  const description = normalizeDescription(`${base}${priceText}${stockText}`, product?.name || SITE_NAME);
  if (description.length >= 120) {
    return description;
  }

  const category = typeof product?.category === 'string' ? product.category.trim() : '';
  const enriched = [
    description,
    category ? `פתרון מקצועי בתחום ${category} למטבחים מוסדיים ותעשייתיים.` : 'פתרון מקצועי למטבחים מוסדיים ותעשייתיים.',
    'מפרט מלא, משלוח לכל הארץ ושירות מקצועי מ-VIPO.',
  ].filter(Boolean).join(' ');
  const normalized = normalizeDescription(enriched, product?.name || SITE_NAME);
  if (normalized.length >= 120) {
    return normalized;
  }

  const hardFallback = [
    `${product?.name || 'מוצר נירוסטה מקצועי'} מבית ${SITE_NAME}.`,
    category ? `מתאים לעסקי ${category} ולמטבחים מוסדיים ותעשייתיים.` : 'מתאים למטבחים מוסדיים, מסעדות ומטבחים תעשייתיים.',
    'כולל מפרט מלא, שירות מקצועי ואפשרויות אספקה מהירות לכל הארץ.',
  ].join(' ');

  return normalizeDescription(hardFallback, product?.name || SITE_NAME);
}

function getProductDimensionsToken(product) {
  const stainless = product?.stainless || {};
  const length = Number(stainless?.length);
  const width = Number(stainless?.width);
  const height = Number(stainless?.height);

  if (Number.isFinite(length) && Number.isFinite(width) && Number.isFinite(height)
    && length > 0 && width > 0 && height > 0) {
    return `${length}x${width}x${height}`;
  }

  return '';
}

function buildProductSeoTitle(product) {
  const manualTitle = typeof product?.seo?.metaTitle === 'string' ? product.seo.metaTitle.trim() : '';
  if (manualTitle && manualTitle.length >= 45) {
    return clampTitle(manualTitle);
  }

  const category = typeof product?.category === 'string' ? product.category.trim() : '';
  const dimensionsToken = getProductDimensionsToken(product);
  const catalogMode = getCatalogProductMode(product);
  const intentToken =
    catalogMode === 'shared_container'
      ? 'מכולה משותפת'
      : catalogMode === 'group'
        ? 'רכישה קבוצתית'
        : 'רכישה מיידית';

  const parts = [
    product?.name,
    category,
    dimensionsToken,
    intentToken,
    SITE_NAME,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());

  const title = clampTitle([...new Set(parts)].join(' | '));
  if (title.length >= 45) {
    return title;
  }

  const compact = [product?.name, category, SITE_NAME]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join(' | ');

  const fallbackBase = clampTitle(compact || `${product?.name || 'מוצר'} | ${SITE_NAME}`);
  if (fallbackBase.length >= 45) {
    return fallbackBase;
  }

  const enriched = clampTitle(`${fallbackBase} | מחיר, מפרט ומשלוח לכל הארץ`);
  if (enriched.length >= 45) {
    return enriched;
  }

  return clampTitle(`${product?.name || 'מוצר נירוסטה איכותי'} | פתרון למטבח מוסדי ותעשייתי | ${SITE_NAME}`);
}


function buildProductKeywords(product) {
  const stainless = product?.stainless || {};
  const length = Number(stainless?.length);
  const width = Number(stainless?.width);
  const height = Number(stainless?.height);
  const hasDimensions = Number.isFinite(length) && Number.isFinite(width) && Number.isFinite(height)
    && length > 0 && width > 0 && height > 0;
  const category = typeof product?.category === 'string' ? product.category.trim() : '';
  const kwMode = getCatalogProductMode(product);
  const purchaseLabel =
    kwMode === 'shared_container'
      ? 'מכולה משותפת'
      : kwMode === 'group'
        ? 'רכישה קבוצתית'
        : 'רכישה מיידית';

  const source = [
    product?.name,
    category,
    product?.type,
    product?.inventoryMode,
    product?.purchaseType,
    product?.groupPurchaseType,
    product?.seo?.slug,
    ...(Array.isArray(product?.features) ? product.features.slice(0, 6) : []),
    category ? `${category} נירוסטה` : '',
    category ? `${category} למטבח מוסדי` : '',
    category ? `${category} למטבח תעשייתי` : '',
    `${purchaseLabel} ${category || 'ציוד נירוסטה'}`,
    hasDimensions ? `${length}x${width}x${height}` : '',
    hasDimensions ? `מידות ${length}x${width}x${height}` : '',
    'נירוסטה',
    'ציוד למטבח תעשייתי',
    'ציוד למטבח מוסדי',
    'VIPO',
  ];

  return [...new Set(source
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))].slice(0, 20);
}

function buildProductLookupQuery(id) {
  const normalizedId = typeof id === 'string' ? id.trim() : '';
  if (!normalizedId) {
    return null;
  }

  const conditions = [];

  if (ObjectId.isValid(normalizedId)) {
    conditions.push({ _id: new ObjectId(normalizedId) });
  }

  conditions.push({ legacyId: normalizedId });
  conditions.push({ 'seo.slug': normalizedId.toLowerCase() });

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

function withTimeout(promise, timeoutMs, fallbackValue = null) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  return Promise.race([
    Promise.resolve(promise).catch(() => fallbackValue),
    timeoutPromise,
  ]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

async function findProductWithTimeout(db, filter, timeoutMs = 1800) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const result = await Promise.race([
      db.collection('products').findOne(filter),
      timeoutPromise,
    ]);
    return result || null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function getDbWithTimeout(timeoutMs = 800) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    const db = await Promise.race([
      getDb(),
      timeoutPromise,
    ]);
    return db || null;
  } catch (error) {
    console.error('Error fetching DB for product metadata:', error);
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function getProduct(id) {
  try {
    const lookupQuery = buildProductLookupQuery(id);
    if (!lookupQuery) return null;

    const filter = {
      $and: [
        lookupQuery,
        { active: { $ne: false } },
        {
          $or: [
            { status: 'published' },
            { status: { $exists: false } },
            { status: null },
            { status: '' },
          ],
        },
      ],
    };

    const db = await getDbWithTimeout();
    if (!db) {
      return null;
    }

    const product = await findProductWithTimeout(db, filter);
    return product;
  } catch (error) {
    console.error('Error fetching product for metadata:', error);
    return null;
  }
}

function ensureAbsoluteUrl(url) {
  if (!url) return `${SITE_URL}/icons/512.png`;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${SITE_URL}${url}`;
  }
  return `${SITE_URL}/${url}`;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    return {
      title: `מוצר | ${SITE_NAME}`,
      description: 'עמוד מוצר',
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const seoTitle = buildProductSeoTitle(product);
  const rawImage = product.media?.images?.[0]?.url || null;
  const productImage = ensureAbsoluteUrl(rawImage);
  const publicProductPath = getProductPublicPath(product);
  let canonicalProductPath = publicProductPath;
  try {
    canonicalProductPath = await withTimeout(
      resolveCanonicalStainlessProductPath(product),
      600,
      publicProductPath,
    ) || publicProductPath;
  } catch (error) {
    console.warn('Product canonical resolution failed, using public path fallback:', error?.message || error);
  }
  const productUrl = `${SITE_URL}${canonicalProductPath || publicProductPath}`;
  
  const seoDescription = buildProductMetaDescription(product);
  const keywords = buildProductKeywords(product);

  return {
    title: seoTitle,
    description: seoDescription,
    keywords,
    alternates: {
      canonical: productUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: productUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 630,
          alt: product.name,
          secureUrl: productImage,
        },
      ],
      locale: 'he_IL',
      type: 'website',
    },
    
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [productImage],
    },

    other: {
      'product:price:amount': product.price?.toString() || '',
      'product:price:currency': 'ILS',
      'product:availability': product.stockCount > 0 ? 'in stock' : 'out of stock',
      'og:type': 'product',
      'product:brand': product.brand || SITE_NAME,
      'product:condition': 'new',
      'product:retailer_item_id': String(product.sku || product._id || ''),
      'og:updated_time': new Date(product.updatedAt || product.createdAt || Date.now()).toISOString(),
    },
  };
}

export default function ProductLayout({ children }) {
  return children;
}
