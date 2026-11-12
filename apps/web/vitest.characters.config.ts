import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const game = process.env.CHARACTER_GAME;
if (!['genshin', 'nte', 'azur-promilia', 'lvmeng'].includes(game ?? '')) throw new Error('Explicit dedicated character consumer required');

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fileURLToPath(new URL(`../game-${game}`, import.meta.url)) } },
  test: { environment: 'node', include: ['test-support/character-text-consumer.test.mjs',
    ...(game === 'nte' ? ['test-support/nte-material-detail.test.mjs'] : []),
    ...(game === 'genshin' ? ['test-support/genshin-character-reference.test.mjs', 'test-support/genshin-build-recommender.test.mjs', 'test-support/genshin-calculator.test.mjs', 'test-support/genshin-compare.test.mjs', 'test-support/genshin-teams.test.mjs', 'test-support/genshin-tier-list.test.mjs', 'test-support/genshin-map-public.test.mjs', 'test-support/genshin-map.test.mjs'] : [])], restoreMocks: true, testTimeout: 60000 },
});
