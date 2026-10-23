import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fixtureD1Args, localFixtureConfig, ROLLOUT_APPS } from './runtime-rollout-smoke.mjs';
import { parseWrangler, readAssetPlan, readReleasePlan } from './game-release.mjs';

const root = resolve(import.meta.dirname, '..');

test('rollout fixtures never inherit cloud resources, routes or credentials', () => {
  for (const app of ROLLOUT_APPS) {
    const before = readFileSync(resolve(root, 'apps', app, 'wrangler.jsonc'), 'utf8');
    const config = localFixtureConfig(app, root, 'synthetic-only-secret-'.repeat(3));
    assert.equal(config.name, `runtime-local-${app}`);
    for (const key of ['services', 'env', 'routes', 'route', 'account_id']) assert.equal(config[key], undefined);
    if (app === 'web') {
      const original = parseWrangler(before);
      assert.notEqual(config.d1_databases[0].database_id, original.d1_databases[0].database_id);
      assert.equal(config.d1_databases[0].remote, false);
      assert.equal(config.r2_buckets[0].remote, false);
      assert.equal(config.vars.BETTER_AUTH_URL, 'https://runtime-local.invalid');
      assert.equal(config.vars.GOOGLE_CLIENT_ID, '');
      assert.equal(config.vars.GOOGLE_CLIENT_SECRET, '');
    }
    assert.equal(readFileSync(resolve(root, 'apps', app, 'wrangler.jsonc'), 'utf8'), before);
  }
  assert.throws(() => localFixtureConfig('../web', root, 'x'.repeat(64)), /Unknown/);
  assert.throws(() => localFixtureConfig('web', root, 'short'), /secret required/);
});

test('fixture database commands always select local execution with isolated persistence', () => {
  for (const file of [undefined, '/fixture/seed.sql']) {
    const args = fixtureD1Args('/fixture/wrangler.json', '/fixture/state', file);
    assert(args.includes('--local'));
    assert(!args.includes('--remote'));
    assert.equal(args[args.indexOf('--config') + 1], '/fixture/wrangler.json');
    assert.equal(args[args.indexOf('--persist-to') + 1], '/fixture/state');
  }
});

test('asset preparation for remaining games does not expand deployment permission', () => {
  for (const game of ['genshin', 'lvmeng']) {
    assert.deepEqual(readAssetPlan({ game, environment: 'production' }), { game, app: `apps/game-${game}` });
    assert.throws(() => readAssetPlan({ game, environment: '' }), /asset environment/);
    assert.throws(() => readReleasePlan({ game, environment: 'production' }), /Unsupported game/);
    const pkg = JSON.parse(readFileSync(resolve(root, `apps/game-${game}/package.json`), 'utf8'));
    assert(pkg.scripts['build:worker'].includes(`prepare-assets --game ${game}`));
    assert(pkg.scripts.build.startsWith('node ../../scripts/require-app-runtime.mjs &&'));
  }
});
