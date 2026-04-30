(async () => {
  try {
    await import('./reset-demo-full.mjs');
  } catch (err) {
    console.error('[RESET_DEMO_FULL_WRAPPER_ERROR]', err?.message || err);
    process.exitCode = 1;
  }
})();
