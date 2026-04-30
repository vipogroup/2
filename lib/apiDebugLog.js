/**
 * Debug-only logging for API route handlers.
 * - Production / test: silent unless API_DEBUG=1
 * - Local dev (NODE_ENV=development): logs
 */
export function apiDebugLog(...args) {
  if (process.env.API_DEBUG !== '1' && process.env.NODE_ENV !== 'development') {
    return;
  }
  console.log('[api]', ...args);
}
