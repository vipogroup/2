import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import {
  cleanTitle,
  escapeXml,
  formatGPrice,
  isValidHttpsImageUrl,
  stripHtml,
} from '@/lib/meta/metaFeedUtils';
import {
  META_FEED_BRAND,
  META_FEED_CANONICAL_ORIGIN,
} from '@/lib/meta/metaFeedConstants';
import { isSharedContainerBlocked, passesStockOnlyCatalogMode } from '@/lib/meta/metaFeedGuards';

/**
 * Pick primary image URL: sort by position, then first valid https URL.
 * @param {Record<string, unknown>} product
 * @returns {string|null}
 */
function pickPrimaryImageUrl(product) {
  const images = Array.isArray(product?.media?.images) ? product.media.images : [];
  const sorted = [...images].sort((a, b) => {
    const pa = Number.isFinite(Number(a?.position)) ? Number(a.position) : 0;
    const pb = Number.isFinite(Number(b?.position)) ? Number(b.position) : 0;
    return pa - pb;
  });
  for (const img of sorted) {
    const url = typeof img?.url === 'string' ? img.url.trim() : '';
    if (isValidHttpsImageUrl(url)) return url;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} product
 * @returns {{ id: string, title: string, description: string, price: string, link: string, image: string, inventory: string, productType: string } | null}
 */
export function mapProductToFeedItem(product) {
  if (!product || typeof product !== 'object') return null;
  if (isSharedContainerBlocked(product)) return null;
  if (!passesStockOnlyCatalogMode(product)) return null;

  const id =
    typeof product.legacyId === 'string' && product.legacyId.trim()
      ? product.legacyId.trim()
      : String(product._id ?? '').trim();
  if (!id) return null;

  const title = cleanTitle(product.name, 150);
  if (!title) return null;

  let description = stripHtml(
    typeof product.fullDescription === 'string' && product.fullDescription.trim()
      ? product.fullDescription
      : product.description,
  );
  if (!description) {
    description = title;
  }
  description = cleanTitle(description, 5000);
  if (!description) return null;

  const priceStr = formatGPrice(product.price, product.currency);
  if (!priceStr) return null;

  const path = getProductPublicPath(product);
  if (!path || typeof path !== 'string' || !path.startsWith('/products/')) return null;
  const link = `${META_FEED_CANONICAL_ORIGIN}${path}`;

  const image = pickPrimaryImageUrl(product);
  if (!image) return null;

  const inv = Number(product.stockCount);
  const inventory = Number.isFinite(inv) && inv >= 1 ? String(Math.floor(inv)) : '';

  const cat = typeof product.category === 'string' ? product.category.trim() : '';
  const sub = typeof product.subCategory === 'string' ? product.subCategory.trim() : '';
  const productType =
    cat && sub ? `${cat} > ${sub}` : cat || sub || '';

  return {
    id,
    title,
    description,
    price: priceStr,
    link,
    image,
    inventory,
    productType,
  };
}

/**
 * @param {{ id: string, title: string, description: string, price: string, link: string, image: string, inventory: string, productType: string }} item
 */
export function buildItemXml(item) {
  const brand = escapeXml(META_FEED_BRAND);
  const lines = [
    '    <item>',
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <g:title>${escapeXml(item.title)}</g:title>`,
    `      <g:description>${escapeXml(item.description)}</g:description>`,
    '      <g:availability>in stock</g:availability>',
    '      <g:condition>new</g:condition>',
    `      <g:price>${escapeXml(item.price)}</g:price>`,
    `      <g:link>${escapeXml(item.link)}</g:link>`,
    `      <g:image_link>${escapeXml(item.image)}</g:image_link>`,
    `      <g:brand>${brand}</g:brand>`,
  ];
  if (item.inventory) {
    lines.push(`      <g:inventory>${escapeXml(item.inventory)}</g:inventory>`);
  }
  if (item.productType) {
    lines.push(`      <g:product_type>${escapeXml(item.productType)}</g:product_type>`);
  }
  lines.push('    </item>');
  return lines.join('\n');
}
