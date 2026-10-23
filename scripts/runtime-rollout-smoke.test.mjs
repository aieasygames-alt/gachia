import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fixtureIpHeaders, localFixtureConfig, ROLLOUT_APPS } from './runtime-rollout-smoke.mjs';
import { readAssetPlan, readReleasePlan } from './game-release.mjs';

const root = resolve(import.meta.dirname, '..');

test('remote acceptance never sends synthetic Cloudflare trusted-IP headers', () => {
  assert.deepEqual(fixtureIpHeaders('http://127.0.0.1:8080', '192.0.2.1'), { 'cf-connecting-ip': '192.0.2.1' });
  for (const origin of ['https://gachia-staging.aieasygames.workers.dev', 'https://gachia.com', 'http://example.test:8080', 'http://127.0.0.1']) {
    assert.deepEqual(fixtureIpHeaders(origin, '192.0.2.1'), {});
  }
});

test('rollout fixtures never inherit cloud resources, routes or credentials', () => {
  for (const app of ROLLOUT_APPS) {
    const before = readFileSync(resolve(root, 'apps', app, 'wrangler.jsonc'), 'utf8');
    const config = localFixtureConfig(app, root);
    assert.equal(config.name, `runtime-local-${app}`);
    for (const key of ['services', 'env', 'routes', 'route', 'account_id']) assert.equal(config[key], undefined);
    if (app === 'web') {
      assert.equal(config.d1_databases, undefined);
      assert.equal(config.r2_buckets, undefined);
      for (const name of ['BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
        assert.equal(config.vars[name], undefined);
      }
    }
    assert.equal(readFileSync(resolve(root, 'apps', app, 'wrangler.jsonc'), 'utf8'), before);
  }
  assert.throws(() => localFixtureConfig('../web', root), /Unknown/);
});

test('disabled account runtime acceptance neither migrates nor seeds a database', () => {
  const source = readFileSync(resolve(root, 'scripts/runtime-rollout-smoke.mjs'), 'utf8');
  assert.doesNotMatch(source, /migrations.*apply|INSERT INTO|fixtureD1Args/);
  assert.match(source, /verifyDisabledAccounts\(origin\)/);
  assert.match(source, /assert.deepEqual\(accountRequests, \[\]/);
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
