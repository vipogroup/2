/**
 * Normalize MONGODB_URI from env (trim, strip wrapping quotes, strip BOM).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMongoEnvUri(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  return s;
}

export function isValidMongoConnectionString(s) {
  return typeof s === 'string' && (s.startsWith('mongodb://') || s.startsWith('mongodb+srv://'));
}
