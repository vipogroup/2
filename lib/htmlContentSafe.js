/**
 * Minimal sanitization for trusted-ish admin/tenant HTML (product descriptions).
 * Not a full XSS filter — strips scripts/iframes and fixes <img> alt for SEO/a11y.
 */

export function stripScriptsHtml(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Ensures every <img> has a non-empty alt (Google "missing alt" audits).
 */
export function ensureImgAltsInHtml(html, contextLabel = 'מוצר') {
  const s = String(html || '');
  if (!/<img\b/i.test(s)) return s;
  const safe = String(contextLabel || 'מוצר').trim().slice(0, 120).replace(/"/g, '&quot;');
  return s.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/\balt\s*=\s*["'][^"']+["']/i.test(tag)) return tag;
    if (/\balt\s*=\s*["']\s*["']/i.test(tag)) {
      return tag.replace(/\balt\s*=\s*["']\s*["']/i, `alt="${safe}"`);
    }
    if (tag.endsWith('/>')) {
      return `${tag.slice(0, -2)} alt="${safe}" />`;
    }
    return `${tag.slice(0, -1)} alt="${safe}">`;
  });
}

/** Heuristic: render as HTML only when it looks like markup (not plain text with <). */
export function isProbablyRichHtml(s) {
  const t = String(s || '');
  if (!t.includes('<')) return false;
  return /<img\b/i.test(t)
    || /<\/(p|div|ul|ol|li|h[1-6]|table)\b/i.test(t)
    || /<br\s*\/?>/i.test(t);
}

export function sanitizeProductHtmlFragment(html, contextLabel) {
  return ensureImgAltsInHtml(stripScriptsHtml(html), contextLabel);
}
