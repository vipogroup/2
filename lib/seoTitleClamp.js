/** SERP-friendly title length (Google typically shows ~50–60 chars). */
export const SEO_TITLE_MAX_LEN = 60;

/**
 * Trims whitespace and truncates to SEO_TITLE_MAX_LEN with ellipsis if needed.
 * @param {string} value
 * @param {string} [emptyFallback] used when value is empty after trim
 */
export function clampSeoTitle(value, emptyFallback = '') {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  const base = cleaned || String(emptyFallback || '').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  if (base.length <= SEO_TITLE_MAX_LEN) return base;
  const sliceLen = Math.max(1, SEO_TITLE_MAX_LEN - 3);
  return `${base.slice(0, sliceLen).trim()}...`;
}
