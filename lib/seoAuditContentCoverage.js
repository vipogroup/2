import { getProductSeoSlug } from './stainlessSeoCategories.js';

export function normalizeAuditText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildAuditContentCorpus(product) {
  const faqItems = Array.isArray(product?.faq) ? product.faq : [];
  const faqText = faqItems
    .flatMap((item) => [item?.q, item?.a])
    .map((value) => normalizeAuditText(value))
    .filter(Boolean)
    .join(' ');

  const fields = [
    product?.description,
    product?.fullDescription,
    product?.seo?.metaDescription,
    product?.suitableFor,
    product?.whyChooseUs,
    product?.warranty,
    faqText,
  ];

  return fields
    .map((value) => normalizeAuditText(value))
    .filter(Boolean)
    .join(' ')
    .trim();
}

/**
 * Bucket key for near-duplicate body detection in admin SEO audits.
 * Slug (or _id) suffix avoids false positives between intentional marketplace variants
 * that share long HTML templates (canonical is handled in product metadata).
 */
export function buildDuplicateSignature(product) {
  const corpus = buildAuditContentCorpus(product)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (corpus.length < 220) {
    return '';
  }

  const slug = getProductSeoSlug(product);
  const id = product?._id?.toString?.() ? String(product._id) : '';
  const suffix = slug || id;
  const prefix = corpus.slice(0, 260);
  return suffix ? `${prefix}||${suffix}` : prefix;
}
