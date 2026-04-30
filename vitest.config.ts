import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    // Satisfy lib/mongoConfig.js during test imports (no real DB connection required for mocked routes)
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/vitest',
      MONGODB_DB: 'vitest',
    },
    environment: 'node',
    include: [
      'tests/**/*.test.{js,ts}',
      'tests/**/*.spec.{js,ts}',
    ],
    exclude: [
      'tests/ui/**',
      'tests/visual.*',
      'tests/visual/**',
      'tests/auth-middleware.spec.*',
      '**/node_modules/**',
      '**/whatsapp-server/**',
      'dist/**',
    ],
  },
});
