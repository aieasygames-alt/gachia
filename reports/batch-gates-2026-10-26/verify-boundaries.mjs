import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { localFixtureConfig } from '../../scripts/runtime-rollout-smoke.mjs';
import { verifyLocalWorker } from '../../scripts/game-release-smoke.mjs';

const root = resolve(import.meta.dirname, '../..');
const records = resolve(root, '.release-records/batch-gates-2026-10-26');
mkdirSync(records, { recursive: true });
const directory = mkdtempSync(resolve(records, 'boundaries-'));
const state = resolve(directory, 'state');
const configPath = resolve(directory, 'wrangler.json');
const config = localFixtureConfig('web', root);
config.d1_databases = [{ binding: 'DB', database_name: 'audit-synthetic', database_id: '00000000-0000-0000-0000-000000000001' }];
config.r2_buckets = [{ binding: 'IMAGES', bucket_name: 'audit-synthetic-images' }];
writeFileSync(configPath, JSON.stringify(config, null, 2));
const run = args => {
  const output = execFileSync('pnpm', ['exec', 'wrangler', ...args, '--local', '--persist-to', state, '--config', configPath], {
    cwd: resolve(root, 'apps/web'), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  appendFileSync(resolve(directory, 'fixture.log'), output);
};
const sql = `CREATE TABLE shared_builds (id TEXT PRIMARY KEY, user_id TEXT, game_id TEXT NOT NULL, character_id TEXT NOT NULL, build_data TEXT NOT NULL, view_count INTEGER, created_at INTEGER NOT NULL, expires_at INTEGER);
INSERT INTO shared_builds VALUES ('permanent', 'synthetic-private-owner', 'genshin', 'amber', '{"weapon":"fixture"}', 123, 1700000000, NULL);
INSERT INTO shared_builds VALUES ('expired', 'synthetic-private-owner', 'genshin', 'amber', '{"weapon":"fixture"}', 123, 1700000000, 1700000001);
INSERT INTO shared_builds VALUES ('future', 'synthetic-private-owner', 'genshin', 'amber', '{"weapon":"fixture"}', 123, 1700000000, 4102444800);`;
writeFileSync(resolve(directory, 'fixture.sql'), sql);
run(['d1', 'execute', 'DB', '--file', resolve(directory, 'fixture.sql')]);
const urls = ['Aa', 'BB'].map(name => `https://act-webstatic.hoyoverse.com/map_manage/20261025/${name}.png`);
for (const url of urls) {
  const digest = createHash('sha256').update(url).digest('hex');
  const file = resolve(directory, `${digest}.bin`);
  writeFileSync(file, `synthetic:${url}`);
  run(['r2', 'object', 'put', `audit-synthetic-images/map-tiles/v2/2/${digest}`, '--file', file]);
}

const observations = [];
try {
  await verifyLocalWorker({ app: 'apps/web', wranglerEnvironment: '', buildEnvironment: {} }, root, {
    configPath, persistTo: state,
    onOutput: text => appendFileSync(resolve(directory, 'worker.log'), text),
    verify: async (_, origin) => {
      const get = async (path, status) => {
        const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
        const body = await response.text();
        observations.push({ path, status: response.status, cacheControl: response.headers.get('cache-control'), location: response.headers.get('location') });
        assert.equal(response.status, status, `${path}: ${body.slice(0, 100)}`);
        return { response, body };
      };
      for (const id of ['permanent', 'future', 'expired', 'missing']) {
        const valid = ['permanent', 'future'].includes(id);
        const api = await get(`/api/shared-builds?id=${id}`, valid ? 200 : 404);
        assert.match(api.response.headers.get('cache-control'), /no-store/);
        if (valid) assert.deepEqual(Object.keys(JSON.parse(api.body)).sort(), ['id', 'gameId', 'characterId', 'buildData', 'createdAt'].sort());
        const page = await get(`/en/genshin/shared/${id}`, valid ? 200 : 404);
        assert.match(page.response.headers.get('cache-control'), /no-store/);
        for (const text of [api.body, page.body]) assert(!text.includes('synthetic-private-owner'));
        if (valid) assert(page.body.includes('fixture'));
      }
      await get('/en/starrail/shared/permanent', 404);
      run(['d1', 'execute', 'DB', '--command', "INSERT INTO shared_builds SELECT 'soon', user_id, game_id, character_id, build_data, view_count, created_at, unixepoch()+5 FROM shared_builds WHERE id='permanent'"]);
      await get('/api/shared-builds?id=soon', 200);
      await get('/en/genshin/shared/soon', 200);
      await new Promise(resolve => setTimeout(resolve, 6000));
      await get('/api/shared-builds?id=soon', 404);
      await get('/en/genshin/shared/soon', 404);
      for (const url of urls) {
        const tile = await get(`/api/map/tile?${new URLSearchParams({ url, map_id: '2' })}`, 200);
        assert.equal(tile.response.headers.get('x-cache'), 'HIT');
        assert.equal(tile.body, `synthetic:${url}`);
      }
      for (const path of ['/zh/%', '/zh/%E0%A4%A', '/zh/%2F', '/zh/%5C']) await get(path, 400);
      await get('/zh/%E4%BD%A0', 404);
      const normalized = await get('/zh/%61bout?q=a%2Fb', 301);
      assert.equal(new URL(normalized.response.headers.get('location')).pathname, '/zh/about');
      assert.equal(new URL(normalized.response.headers.get('location')).search, '?q=a%2Fb');
      await get('/zh/about', 200);
    },
  });
  writeFileSync(resolve(directory, 'result.json'), JSON.stringify({ status: 'passed', cloud: 'not_accessed', syntheticOnly: true, observations }, null, 2));
} catch (error) {
  writeFileSync(resolve(directory, 'result.json'), JSON.stringify({ status: 'failed', error: error.message, observations }, null, 2));
  throw error;
} finally {
  console.log(directory);
}
