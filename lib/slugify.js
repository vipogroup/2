export function normalizeSlug(input = '') {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function ensureNonEmptySlug(value, fallback) {
  const slug = normalizeSlug(value || fallback || '');
  if (!slug) {
    throw new Error('Slug value cannot be empty');
  }
  return slug;
}
