const ALLOWED_CURRENCIES = new Set(['ILS', 'USD', 'EUR']);

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeXml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} title
 * @param {number} maxLen
 * @returns {string}
 */
export function cleanTitle(title, maxLen = 150) {
  const cleaned = String(title ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * @param {unknown} currency
 * @returns {'ILS' | 'USD' | 'EUR'}
 */
export function normalizeCurrencyToAllowed(currency) {
  const upper = String(currency ?? '')
    .trim()
    .toUpperCase();
  if (ALLOWED_CURRENCIES.has(upper)) return upper;
  return 'ILS';
}

/**
 * @param {number} price
 * @param {string} currency
 * @returns {string} e.g. "1200.00 ILS"
 */
export function formatGPrice(price, currency) {
  const cur = normalizeCurrencyToAllowed(currency);
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `${n.toFixed(2)} ${cur}`;
}

/**
 * image_link: https URL, length > 20
 * @param {unknown} url
 * @returns {boolean}
 */
export function isValidHttpsImageUrl(url) {
  if (typeof url !== 'string') return false;
  const s = url.trim();
  if (s.length <= 20) return false;
  if (!s.startsWith('https://')) return false;
  return true;
}
