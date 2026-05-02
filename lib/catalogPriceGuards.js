/**
 * Catalog Manager historically used 12345 as a silent fallback when USD price was missing.
 * Phase 0: forbid that value and non-positive prices on publish (upload/update).
 */
export const CATALOG_FORBIDDEN_PLACEHOLDER_PRICE = 12345;

export function isForbiddenCatalogPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  if (n === CATALOG_FORBIDDEN_PLACEHOLDER_PRICE) return true;
  if (n <= 0) return true;
  return false;
}
