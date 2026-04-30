/**
 * Next.js Instrumentation
 * This file is loaded once when the server starts.
 * Used to start the auto-sync polling service.
 */

export async function register() {
  // Only run on the server (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startAutoSync } = await import('./lib/autoSync.js');
      startAutoSync();
    } catch (err) {
      console.warn('[INSTRUMENTATION] Failed to start auto-sync:', err?.message || err);
    }
  }
}
