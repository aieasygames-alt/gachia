import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const game = process.env.GUIDE_GAME;
if (game !== 'genshin' && game !== 'nte') throw new Error('Explicit guide consumer required');

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL(`../game-${game}`, import.meta.url)) } },
  test: { environment: 'node', include: [`../game-${game}/__tests__/**/*.test.ts`], restoreMocks: true, testTimeout: 30000 },
});
