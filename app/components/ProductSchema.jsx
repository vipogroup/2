'use client';

import Script from 'next/script';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFaqEntities(product) {
  const rawItems = [
    { q: 'למי המוצר מתאים?', a: product?.suitableFor },
    { q: 'למה לבחור במוצר הזה?', a: product?.whyChooseUs },
    { q: 'מה כוללת האחריות?', a: product?.warranty },
    { q: 'מה חשוב לדעת על המוצר?', a: product?.fullDescription || product?.description },
  ];

  return rawItems
    .map((item) => ({
      question: cleanText(item.q),
      answer: cleanText(item.a),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 4)
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }));
}

export default function ProductSchema({ product, productUrl = '' }) {
  if (!product) return null;

  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
  const imageSources = mediaImages.map((item) => item?.url).filter(Boolean);
  const canonicalProductUrl = productUrl || SITE_URL;
  const inStock = (typeof product.stockCount === 'number' ? product.stockCount > 0 : false)
    || product.stock > 0
    || product.inStock !== false;

  const cleanSku = String(product.sku || product._id || '').trim();
  const cleanBrand = String(product.brand || 'VIPO').trim();
  const cleanCategory = String(product.category || '').trim();
  const gtin = String(product.gtin || product.gtin13 || product.gtin12 || '').trim();
  const mpn = String(product.mpn || '').trim();
  const fullDescription = cleanText(product.fullDescription || product.description || product.name || '');

  const featureList = Array.isArray(product.features)
    ? product.features.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8)
    : [];

  const additionalProperty = featureList.map((feature, index) => ({
    '@type': 'PropertyValue',
    name: `feature_${index + 1}`,
    value: feature,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalProductUrl}#product`,
    url: canonicalProductUrl,
    mainEntityOfPage: canonicalProductUrl,
    name: product.name || '',
    description: fullDescription || product.name || '',
    image: imageSources,
    video: typeof product.media?.videoUrl === 'string' ? product.media.videoUrl : '',
    sku: cleanSku,
    category: cleanCategory || undefined,
    mpn: mpn || undefined,
    gtin13: gtin || undefined,
    brand: {
      '@type': 'Brand',
      name: cleanBrand,
    },
    offers: {
      '@type': 'Offer',
      url: canonicalProductUrl,
      itemCondition: 'https://schema.org/NewCondition',
      priceCurrency: 'ILS',
      price: String(product.price || 0),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'VIPO',
      },
    },
  };

  // Add original price if on sale
  if (product.originalPrice && product.originalPrice > product.price) {
    schema.offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const reviewCountForSchema = product.reviews != null ? product.reviews : product.reviewCount;
  if (product.rating && reviewCountForSchema) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: reviewCountForSchema,
    };
  }

  if (additionalProperty.length > 0) {
    schema.additionalProperty = additionalProperty;
  }

  // Remove undefined optional fields to keep JSON-LD clean.
  Object.keys(schema).forEach((key) => {
    if (schema[key] === undefined || schema[key] === null || schema[key] === '') {
      delete schema[key];
    }
  });

  const faqEntities = buildFaqEntities(product);
  const faqSchema = faqEntities.length
    ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqEntities,
    }
    : null;

  return (
    <>
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {faqSchema && (
        <Script
          id="product-faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </>
  );
}

// Organization schema for homepage
export function OrganizationSchema({ settings = {} }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName || 'VIPO',
    description: settings.siteDescription || settings.metaDescription || '',
    url: SITE_URL,
    logo: settings.logoUrl || '',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings.phone || '',
      email: settings.email || '',
      contactType: 'customer service',
      availableLanguage: ['Hebrew', 'English'],
    },
    sameAs: [
      settings.facebook,
      settings.instagram,
      settings.twitter,
      settings.linkedin,
    ].filter(Boolean),
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VIPO',
    url: SITE_URL,
    inLanguage: 'he-IL',
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb schema
export function BreadcrumbSchema({ items = [] }) {
  if (!items.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
