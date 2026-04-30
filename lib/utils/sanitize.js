/**
 * Security utilities for input sanitization
 */

/**
 * Escape special regex characters to prevent RegEx Injection
 * @param {string} str - User input string
 * @returns {string} - Safe string for use in $regex
 */
export function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize search input for MongoDB queries
 * @param {string} str - User input string
 * @returns {string} - Trimmed and escaped string
 */
export function sanitizeSearch(str) {
  if (!str || typeof str !== 'string') return '';
  return escapeRegex(str.trim());
}
