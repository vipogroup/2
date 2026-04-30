import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  buildStainlessVariantFlags,
  getProductPublicPath,
} from '@/lib/stainlessSeoCategories';
import { getStainlessCategoryPageData } from '@/lib/stainlessSeoServer';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();
const SITE_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'VIPO';
const priceFormatter = new Intl.NumberFormat('he-IL');

export const revalidate = 300;
export const dynamic = 'force-dynamic';

async function safeGetStainlessCategoryPageData(seoCategory) {
  try {
    return await getStainlessCategoryPageData(seoCategory);
  } catch (error) {
    console.error('Stainless SEO page data error:', seoCategory, error?.message || error);
    return null;
  }
}

function getPrimaryImage(product) {
  const firstImage = Array.isArray(product?.media?.images)
    ? product.media.images.find((image) => image?.url)
    : null;

  return firstImage?.url || 'https://placehold.co/800x600/f3f4f6/94a3b8?text=VIPO';
}

function getDisplayPrice(product) {
  const flags = buildStainlessVariantFlags(product);
  if ((flags.isGroup || flags.isSharedContainer) && Number(product?.groupPrice) > 0) {
    return Number(product.groupPrice);
  }

  return Number(product?.price) || 0;
}

function getVariantBadge(product) {
  const flags = buildStainlessVariantFlags(product);

  if (flags.isSharedContainer) {
    return 'מכולה משותפת';
  }

  if (flags.isGroup) {
    return 'רכישה קבוצתית';
  }

  return 'מכירה רגילה';
}

function getDimensionsText(product) {
  const stainless = product?.stainless || {};
  const length = Number(stainless?.length);
  const width = Number(stainless?.width);
  const height = Number(stainless?.height);

  if (length > 0 && width > 0 && height > 0) {
    return `${length}×${width}×${height}`;
  }

  return '';
}

function buildCategoryKeywords(data, leadProduct) {
  const dimensionsText = getDimensionsText(leadProduct);
  const source = [
    data?.config?.title,
    data?.config?.h1,
    ...(Array.isArray(data?.config?.sourceCategories) ? data.config.sourceCategories : []),
    'נירוסטה',
    'ציוד נירוסטה',
    'מטבח תעשייתי',
    'מטבח מוסדי',
    'ריהוט נירוסטה למטבח',
    'VIPO',
  ];

  if (typeof data?.config?.title === 'string' && data.config.title.trim()) {
    source.push(`${data.config.title} למטבח תעשייתי`);
    source.push(`${data.config.title} למטבח מוסדי`);
  }

  if (dimensionsText) {
    source.push(`מידות ${dimensionsText}`);
    source.push(dimensionsText);
  }

  return [...new Set(source
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))].slice(0, 18);
}

function buildCategoryFaqEntities(data) {
  if (!data?.config) return [];

  const categoryTitle = data.config.title || 'ציוד נירוסטה';
  const answerFamilies = Array.isArray(data.config.sourceCategories)
    ? data.config.sourceCategories.slice(0, 3).join(', ')
    : '';

  const entities = [
    {
      '@type': 'Question',
      name: `אילו סוגי ${categoryTitle} זמינים באתר?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answerFamilies
          ? `הקטגוריה כוללת דגמים פעילים מהמשפחות: ${answerFamilies}.`
          : `הקטגוריה כוללת דגמים קנוניים של ${categoryTitle} עם וריאציות מסחריות פעילות.`,
      },
    },
    {
      '@type': 'Question',
      name: `מה ההבדל בין דגם קנוני לוריאציה מסחרית ב-${categoryTitle}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'דף קנוני מייצג את גרסת ה-SEO הראשית של המוצר, בעוד וריאציות מסחריות (כמו רכישה קבוצתית או מכולה משותפת) נשמרות לפעילות מסחרית כדי לצמצם כפילות תוכן.',
      },
    },
    {
      '@type': 'Question',
      name: `איך לבחור ${categoryTitle} לפי מידות למטבח מוסדי?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'מומלץ להתאים את אורך, רוחב וגובה המוצר לתכנון המטבח, לאזורי עבודה ולזרימת התפעול היומית, ולהשוות בין הדגמים הקנוניים לפי המידות המופיעות בכרטיס המוצר.',
      },
    },
  ];

  return entities;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const data = await safeGetStainlessCategoryPageData(resolvedParams.seoCategory);
  if (!data) {
    return {};
  }

  const leadProduct = data.canonicalProducts[0] || null;
  const leadImage = getPrimaryImage(leadProduct);
  const canonicalUrl = `${SITE_URL}${data.config.canonicalPath}`;
  const description = `${data.config.seoDescription} ${data.canonicalCount} דגמים קנוניים מתוך ${data.productCount} וריאציות מסחריות פעילות.`;
  const keywords = buildCategoryKeywords(data, leadProduct);

  return {
    title: data.config.seoTitle,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: data.config.seoTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: leadImage
        ? [
            {
              url: leadImage,
              width: 1200,
              height: 630,
              alt: data.config.title,
            },
          ]
        : [],
      locale: 'he_IL',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.config.seoTitle,
      description,
      images: leadImage ? [leadImage] : [],
    },
  };
}

export default async function StainlessSeoCategoryPage({ params }) {
  const resolvedParams = await params;
  const data = await safeGetStainlessCategoryPageData(resolvedParams.seoCategory);
  if (!data) {
    notFound();
  }

  const hiddenVariantsCount = Math.max(0, data.productCount - data.canonicalCount);
  const canonicalUrl = `${SITE_URL}${data.config.canonicalPath}`;

  const itemListElement = data.groups
    .map((group, index) => {
      const product = group?.canonicalProduct;
      const path = getProductPublicPath(product);
      if (!path) return null;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: product?.name || `${data.config.title} ${index + 1}`,
        url: `${SITE_URL}${path}`,
      };
    })
    .filter(Boolean)
    .slice(0, 30);

  const itemListSchema = itemListElement.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: data.config.title,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: itemListElement.length,
      itemListElement,
    }
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'דף הבית',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: data.config.title,
        item: canonicalUrl,
      },
    ],
  };

  const faqEntities = buildCategoryFaqEntities(data);
  const faqSchema = faqEntities.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntities,
    }
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <section className="bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium text-cyan-200">Stainless SEO Category</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{data.config.h1}</h1>
            <p className="mt-4 text-sm leading-7 text-blue-100 sm:text-base">{data.config.seoDescription}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{data.canonicalCount}</div>
                <div className="mt-1 text-sm text-blue-100">מוצרים קנוניים ל-SEO</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{data.productCount}</div>
                <div className="mt-1 text-sm text-blue-100">וריאציות מסחריות חיות</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{hiddenVariantsCount}</div>
                <div className="mt-1 text-sm text-blue-100">וריאציות מוסתרות מ-cannibalization</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">משפחות category קנוניות</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {data.config.sourceCategories.map((family) => (
              <span
                key={family}
                className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-900"
              >
                {family}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">דפי המוצר הקנוניים</h2>
              <p className="mt-1 text-sm text-slate-600">
                כל כרטיס מייצג base product אחד אחרי dedupe של group/shared_container variants על בסיס `category` והמאפיינים המבניים.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-900"
            >
              חזרה למרקטפלייס
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.groups.map((group) => {
              const product = group.canonicalProduct;
              const dimensionsText = getDimensionsText(product);
              const price = getDisplayPrice(product);
              const productPath = getProductPublicPath(product);
              const variantBadges = Array.from(new Set(group.variants.map((variant) => getVariantBadge(variant))));

              return (
                <article
                  key={group.baseProductKey}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={getPrimaryImage(product)}
                      alt={product.name || data.config.title}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {product.category}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {getVariantBadge(product)}
                      </span>
                      {group.variants.length > 1 && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {group.variants.length} וריאציות מסחריות
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-bold leading-7 text-slate-900">{product.name}</h3>

                    {dimensionsText && (
                      <p className="mt-2 text-sm text-slate-600">מידות: {dimensionsText}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500">מחיר מוצג</div>
                        <div className="mt-1 text-2xl font-bold text-blue-950">
                          ₪{priceFormatter.format(price)}
                        </div>
                      </div>
                      <Link
                        href={productPath}
                        className="rounded-full bg-gradient-to-r from-blue-900 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        לדף המוצר
                      </Link>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Commercial variants</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {variantBadges.map((badge) => (
                          <span
                            key={`${group.baseProductKey}-${badge}`}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
