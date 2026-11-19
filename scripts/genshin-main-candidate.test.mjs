import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { artifactFiles, withLocalWorker } from './desktop-publish.mjs';
import { prepareGenshinMainCandidate, verifyGenshinMainCandidate } from './genshin-main-candidate.mjs';
import { genshinMigrationLocalConfigs } from './genshin-migration-local-smoke.mjs';

const ROOT = resolve(import.meta.dirname, '..');
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-main-candidate-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
  const copy = (file, to = file) => { mkdirSync(dirname(join(root, to)), { recursive: true }); cpSync(join(ROOT, file), join(root, to), { recursive: true }); };
  copy('packages/core/genshin-content.json'); copy('packages/data/games/genshin'); copy('packages/data/raw-content-review.json');
  copy('packages/data/main-manifest-contract.json');
  for (const entry of readdirSync(join(ROOT, 'packages/data/games'), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'genshin') symlinkSync(join(ROOT, 'packages/data/games', entry.name), join(root, 'packages/data/games', entry.name));
  }
  const source = 'apps/web/.open-next';
  write(`${source}/worker.js`, 'export default {};\n'); write(`${source}/.build/open-next.config.edge.mjs`, 'export default {};\n');
  write(`${source}/assets/BUILD_ID`, 'local-candidate');
  write(`${source}/cache/zh/genshin.html`, '<main>Duplicate server content deliberately remains.</main>');
  write(`${source}/assets/data/other/raw-guides.json`, '["other game unchanged"]');
  copy('apps/web/public/data/genshin', `${source}/assets/data/genshin`);
  copy('apps/web/public/data-manifest', `${source}/assets/data-manifest`);
  for (const file of ['genshin-platform.json', 'tier-list-genshin.json']) copy(`apps/web/public/data-client/${file}`, `${source}/assets/data-client/${file}`);
  return { root, source: join(root, source), output: join(root, 'candidate'), write };
}

test('isolated candidate prunes only owned data assets and preserves every server module, cached page and other-game file', async t => {
  const f = fixture(t), original = artifactFiles(f.source);
  const result = await prepareGenshinMainCandidate(f.output, f.root);
  assert.equal(result.removed, 11); assert.equal(result.replaced, 4); assert.equal(result.productionReady, false);
  assert.deepEqual(artifactFiles(f.source), original);
  assert.equal(readFileSync(join(result.artifact, 'cache/zh/genshin.html'), 'utf8'), '<main>Duplicate server content deliberately remains.</main>');
  assert.equal(readFileSync(join(result.artifact, 'assets/data/other/raw-guides.json'), 'utf8'), '["other game unchanged"]');
  verifyGenshinMainCandidate(f.output, result.pin);
  f.write('apps/web/.open-next/worker.js', 'export default { rebuilt: true };\n');
  verifyGenshinMainCandidate(f.output, result.pin);
  await assert.rejects(prepareGenshinMainCandidate(f.output, f.root), /already exists/);
  assert.throws(() => verifyGenshinMainCandidate(f.output, '0'.repeat(64)), /evidence changed/);
  f.write('candidate/artifact/cache/zh/genshin.html', 'unexpected server edit');
  assert.throws(() => verifyGenshinMainCandidate(f.output, result.pin), /artifact changed/);
});

for (const fault of ['raw-drift', 'index-drift', 'unknown-mirror', 'linked-input']) test(`candidate refuses ${fault} before creating output`, async t => {
  const f = fixture(t);
  if (fault === 'raw-drift') f.write('apps/web/.open-next/assets/data/genshin/raw-guides.json', '[]');
  if (fault === 'index-drift') f.write('apps/web/.open-next/assets/data-manifest/games.json', '{}');
  if (fault === 'unknown-mirror') f.write('apps/web/.open-next/assets/data/genshin/private.json', '{}');
  if (fault === 'linked-input') {
    const file = join(f.source, 'assets/data-client/genshin-platform.json');
    rmSync(file); symlinkSync(join(ROOT, 'apps/web/public/data-client/genshin-platform.json'), file);
  }
  await assert.rejects(prepareGenshinMainCandidate(f.output, f.root));
  assert.throws(() => readFileSync(join(f.output, 'candidate.json')), /ENOENT/);
});

for (const file of ['apps/web/public/data/genshin/raw-guides.json', 'apps/web/public/data-client/genshin-platform.json',
  'apps/web/public/data-client/tier-list-genshin.json', 'packages/data/games/genshin/raw-guides.json']) {
  test(`candidate refuses a server trace copy of ${file}`, async t => {
    const f = fixture(t);
    f.write(`apps/web/.open-next/server-functions/default/${file}`, '[]');
    await assert.rejects(prepareGenshinMainCandidate(f.output, f.root), /Genshin server data copy must be excluded/);
    assert.throws(() => readFileSync(join(f.output, 'candidate.json')), /ENOENT/);
  });
}

test('local migration configs bind real artifacts only to local services and disposable storage', () => {
  for (const failure of [false, true]) {
    const configs = genshinMigrationLocalConfigs({ root: ROOT, directory: '/tmp/r101', mainArtifact: '/tmp/main', gameArtifact: '/tmp/game', failure });
    assert.equal(configs.main.main, '/tmp/main/worker.js');
    assert.equal(configs.main.vars.GENSHIN_CONTENT_ENABLED, 'true');
    assert.equal(configs.router.vars.GENSHIN_CONTENT_ENABLED, 'true');
    assert.equal(configs.genshin.main, failure ? '/tmp/r101/unavailable.mjs' : '/tmp/game/worker.js');
    for (const config of Object.values(configs)) {
      for (const key of ['account_id', 'env', 'routes', 'route', 'build', 'triggers', 'secrets']) assert(!Object.hasOwn(config, key));
      for (const service of config.services ?? []) assert(Object.values(configs).some(value => value.name === service.service));
      for (const db of config.d1_databases ?? []) assert.equal(db.database_id, '00000000-0000-0000-0000-000000000000');
      for (const bucket of config.r2_buckets ?? []) assert.equal(bucket.bucket_name, 'r101-local-only');
    }
  }
});

for (const extra of [[], ['/tmp/auxiliary.json']]) test(`loopback helper retains local isolation with ${extra.length} auxiliary configs`, async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-loopback-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = join(root, 'fake-wrangler.mjs'); mkdirSync(join(root, 'home'));
  writeFileSync(entry, `import { createServer } from 'node:http';
    const server = createServer((_req, res) => { res.setHeader('content-type','application/json'); res.end(JSON.stringify({ args:process.argv.slice(2), token:process.env.CLOUDFLARE_API_TOKEN ?? null })); });
    server.listen(0,'127.0.0.1',()=>console.log('Ready on http://127.0.0.1:'+server.address().port));\n`);
  await withLocalWorker(root, '/tmp/primary.json', join(root, 'home'), join(root, 'worker.log'), async origin => {
    const value = await (await fetch(origin)).json();
    assert.deepEqual(value.args, ['dev', '--local', '--ip', '127.0.0.1', '--port', '0', '--inspector-port', '0', '--env', '', '--config', '/tmp/primary.json',
      ...extra.flatMap(file => ['--config', file])]);
    assert.equal(value.token, null);
  }, { wranglerEntrypoint: entry, additionalConfigs: extra });
});

test('loopback helper refuses malformed auxiliary configs before starting any process', async () => {
  for (const additionalConfigs of [null, {}, [null], [''], ['--remote']]) {
    await assert.rejects(withLocalWorker(ROOT, '/unused.json', '/unused', '/unused.log', () => {}, { additionalConfigs }), /Invalid auxiliary/);
  }
});
