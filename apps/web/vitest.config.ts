import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Resolve Next's extensionless subpaths through Vite in real navigation tests.
    server: { deps: { inline: ['next-intl'] } },
    include: ['__tests__/**/*.test.ts'],
    restoreMocks: true,
  },
});
