import { getCatalogProductMode, normalizeGroupPurchaseType } from '@/lib/catalogProductMode';

const SHARED_RAW_BLOCKED = new Set([
  'shared_container',
  'shared-container',
  'shared container',
  'sharedcontainer',
]);

/**
 * Extra post-fetch guard: block shared-container variants before emitting XML.
 * @param {Record<string, unknown>} product
 * @returns {boolean} true if product must be excluded
 */
export function isSharedContainerBlocked(product) {
  const raw = String(product?.groupPurchaseType ?? '').trim();
  const rawLower = raw.toLowerCase();
  const compact = rawLower.replace(/[\s_-]+/g, '');
  if (SHARED_RAW_BLOCKED.has(rawLower)) return true;
  if (compact === 'sharedcontainer') return true;
  if (normalizeGroupPurchaseType(product?.groupPurchaseType) === 'shared_container') return true;
  return false;
}

/**
 * Stock-only catalog mode; excludes group and shared_container.
 * @param {Record<string, unknown>} product
 * @returns {boolean}
 */
export function passesStockOnlyCatalogMode(product) {
  return getCatalogProductMode(product) === 'stock';
}
