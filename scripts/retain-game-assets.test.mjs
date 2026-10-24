import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { readPreviousGameAssets, retainPreviousGameAssets } from './retain-game-assets.mjs';
import { checkExecutionPermission, checkSourcePermission, executeRelease, parseArguments, readReleasePlan } from './game-release.mjs';
import { verifyOrigin } from './game-release-smoke.mjs';
import { verifyStagingHttp } from './game-staging-acceptance.mjs';

const game = 'azur-promilia';
const versionId = '472903c2-3fca-43c0-a613-8c54f108bf73';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'gachia-game-retention-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, bytes) => { const target = resolve(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes); };
  const bound = (path, bytes) => { put(path, bytes); return { path, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) }; };
  const files = [bound('static/chunks/app/[lang]/page-old.js', 'old client chunk'), bound('static/css/old.css', 'old css')].map(file => ({ ...file, path: file.path.slice(7) }));
  const service = `gachia-game-${game}`;
  const deploymentId = '06712d57-5067-4ceb-b039-bfe710b66126';
  const scriptEtag = 'a'.repeat(64);
  const observation = { versionId, deploymentId, scriptEtag, percentage: 100 };
  const receipt = {
    schemaVersion: 1, game, service, versionId, deploymentId, scriptEtag,
    capturedAt: '2026-10-24T00:00:00Z', before: observation, after: observation,
    sourceCommit: 'not_attested', cloudAssetManifestCompleteness: 'not_asserted',
    workerArchive: bound('worker.multipart', 'captured cloud multipart bytes'),
    inventory: bound('inventory.json', JSON.stringify({ service, versionId, logSha256: 'b'.repeat(64), nextStaticPaths: files.map(file => `/_next/static/${file.path}`) })),
    staticDirectory: 'static', files,
  };
  const receiptPath = resolve(root, 'receipt.json');
  const save = () => put('receipt.json', JSON.stringify(receipt));
  save();
  const options = { game, rollbackVersion: versionId };
  const makePlan = () => ({ ...readReleasePlan({ ...options, environment: 'production' }), previousAssets: readPreviousGameAssets(receiptPath, options).summary });
  return { root, put, receipt, receiptPath, save, makePlan, options };
}

test('retains only registered static files in both namespaces without changing worker or HTML', t => {
  const f = fixture(t); const plan = f.makePlan();
  f.put(`${plan.app}/.open-next/assets/current.html`, 'current html');
  f.put(`${plan.app}/.open-next/worker.js`, 'current worker');
  f.put('static/unregistered.js', 'not eligible');
  const first = retainPreviousGameAssets(plan, f.root);
  assert.equal(first.files, 2); assert.equal(first.copiedPaths, 4);
  assert.equal(first.verification, 'local_evidence_integrity_only_not_live_cloud_state');
  assert.equal(retainPreviousGameAssets(plan, f.root).copiedPaths, 0);
  assert.equal(readFileSync(resolve(f.root, plan.app, '.open-next/assets/current.html'), 'utf8'), 'current html');
  assert.equal(readFileSync(resolve(f.root, plan.app, '.open-next/worker.js'), 'utf8'), 'current worker');
  for (const prefix of ['_next/static', `_games/${game}/_next/static`]) {
    assert.equal(readFileSync(resolve(f.root, plan.app, '.open-next/assets', prefix, f.receipt.files[0].path), 'utf8'), 'old client chunk');
    assert.throws(() => readFileSync(resolve(f.root, plan.app, '.open-next/assets', prefix, 'unregistered.js')));
  }
});

for (const [name, mutate] of Object.entries({
  owner: r => { r.service = 'gachia'; },
  schema: r => { r.schemaVersion = 2; },
  version: r => { r.versionId = 'bad'; },
  'unstable capture': r => { r.after = { ...r.after, percentage: 50 }; },
  'unproved Git claim': r => { r.sourceCommit = 'a'.repeat(40); },
  'unproved asset completeness': r => { r.cloudAssetManifestCompleteness = 'complete'; },
  'duplicate file': r => { r.files.push(r.files[0]); },
  'missing logged file': r => { r.files.pop(); },
  traversal: r => { r.files[0].path = '../outside.js'; },
  absolute: r => { r.files[0].path = '/tmp/outside.js'; },
  encoded: r => { r.files[0].path = '%2e%2e/outside.js'; },
  backslash: r => { r.files[0].path = 'chunks\\outside.js'; },
  'overlong path': r => { r.files[0].path = 'x'.repeat(513) + '.js'; },
  'excessively deep path': r => { r.files[0].path = 'x/'.repeat(33) + 'old.js'; },
  'excessive file count': r => { r.files = Array(2001).fill(r.files[0]); },
  HTML: r => { r.files[0].path = 'old.html'; },
  'source escape': r => { r.staticDirectory = '../static'; },
  size: r => { r.files[0].bytes = 8 * 1024 * 1024 + 1; },
  digest: r => { r.files[0].sha256 = '0'.repeat(64); },
  archive: r => { r.workerArchive.sha256 = '0'.repeat(64); },
  inventory: r => { r.inventory.sha256 = '0'.repeat(64); },
})) test(`rejects ${name}`, t => {
  const f = fixture(t); mutate(f.receipt); f.save();
  assert.throws(() => readPreviousGameAssets(f.receiptPath, f.options));
});

test('wrong rollback owner/version and unsupported game fail before a release', t => {
  const f = fixture(t);
  assert.throws(() => readPreviousGameAssets(f.receiptPath, { ...f.options, rollbackVersion: '01234567-89ab-cdef-0123-456789abcdef' }), /rollback version/);
  assert.throws(() => readPreviousGameAssets(f.receiptPath, { game: 'nte' }), /reviewed Azur/);
  const plan = readReleasePlan({ game, environment: 'production', rollbackVersion: versionId });
  assert.throws(() => checkExecutionPermission(plan, { action: 'deploy', confirmation: plan.service }), /previous-assets-receipt/);
  assert.doesNotThrow(() => checkExecutionPermission(plan, { action: 'verify' }));
  assert.doesNotThrow(() => checkExecutionPermission(f.makePlan(), { action: 'deploy', confirmation: plan.service }));
});

test('receipt bytes are bound into plan revalidation and mutation prevents deploy', async t => {
  const f = fixture(t);
  const options = { ...f.options, environment: 'staging', previousAssetsReceipt: f.receiptPath };
  const plan = readReleasePlan(options);
  let runs = 0;
  await assert.rejects(executeRelease(plan, { action: 'deploy' }, {
    refreshPlan: () => readReleasePlan(options),
    run: async () => { runs++; f.receipt.capturedAt = '2026-10-24T00:01:00Z'; f.save(); },
    verifyArtifacts: () => { throw new Error('should not reach assets'); },
  }), /inputs changed/);
  assert.equal(runs, 1);
  assert.throws(() => retainPreviousGameAssets(plan, f.root), /evidence changed/);
});

for (const location of ['source', 'destination', 'dangling-destination']) test(`rejects ${location} symlink`, t => {
  const f = fixture(t); const plan = f.makePlan();
  if (location === 'source') {
    rmSync(resolve(f.root, 'static/chunks'), { recursive: true });
    symlinkSync(resolve(f.root, 'other'), resolve(f.root, 'static/chunks'));
    assert.throws(() => readPreviousGameAssets(f.receiptPath, f.options), /symlinks/);
  } else {
    const directory = `${plan.app}/.open-next/assets`;
    f.put(`${directory}/placeholder`, 'x');
    if (location === 'destination') mkdirSync(resolve(f.root, 'other'));
    symlinkSync(resolve(f.root, 'other'), resolve(f.root, directory, '_next'));
    assert.throws(() => retainPreviousGameAssets(plan, f.root), /symlinks/);
  }
});

test('asset collision preflight never overwrites or partially copies earlier files', t => {
  const f = fixture(t); const plan = f.makePlan();
  const path = `${plan.app}/.open-next/assets/_games/${game}/_next/static/css/old.css`;
  f.put(path, 'different current css');
  assert.throws(() => retainPreviousGameAssets(plan, f.root), /collision/);
  assert.equal(readFileSync(resolve(f.root, path), 'utf8'), 'different current css');
  assert.throws(() => readFileSync(resolve(f.root, plan.app, '.open-next/assets/_next/static', f.receipt.files[0].path)));
});

test('CLI receipt is explicit and cannot be silently ignored by prepare-assets', () => {
  const args = ['--game', game, '--environment', 'staging', '--previous-assets-receipt', 'capture/receipt.json'];
  assert.equal(parseArguments(['verify', ...args]).previousAssetsReceipt, 'capture/receipt.json');
  assert.throws(() => parseArguments(['prepare-assets', ...args]), /controlled/);
  assert.throws(() => parseArguments(['plan', ...args, '--previous-assets-receipt', 'other.json']));
});

test('Azur remote deployment rejects dirty source while local verification remains usable', () => {
  for (const environment of ['staging', 'production']) {
    const plan = readReleasePlan({ game, environment });
    assert.throws(() => checkSourcePermission(plan, { action: 'deploy' }, { dirty: true }), /clean committed/);
    assert.throws(() => checkSourcePermission(plan, { action: 'deploy' }, { dirty: false, commit: 'new-head', expectedCommit: 'original-head' }), /clean committed/);
    assert.doesNotThrow(() => checkSourcePermission(plan, { action: 'deploy' }, { dirty: false }));
    assert.doesNotThrow(() => checkSourcePermission(plan, { action: 'verify' }, { dirty: true }));
  }
});

for (const failure of [null, 'missing', 'soft-404', 'redirect']) test(`local HTTP verifies every retained byte in both namespaces: ${failure ?? 'success'}`, async t => {
  const f = fixture(t); const plan = f.makePlan(); const retained = [];
  const request = async (url, init) => {
    const path = decodeURIComponent(url.pathname);
    const file = f.receipt.files.find(file => path.endsWith(`/static/${file.path}`));
    if (file) {
      retained.push({ path, init });
      return new Response(failure === 'soft-404' ? '<h1>Not found</h1>' : readFileSync(resolve(f.root, 'static', file.path)), { status: failure === 'missing' ? 404 : failure === 'redirect' ? 302 : 200 });
    }
    if (path === '/robots.txt') return new Response('Allow: /');
    if (path === '/sitemap.xml') return new Response(`<urlset><url><loc>https://gachia.com/zh/${game}/characters/example</loc></url></urlset>`, { headers: { 'content-type': 'application/xml' } });
    if (/\.(js|css)$/.test(path)) return new Response('current asset', { headers: { 'content-type': path.endsWith('.js') ? 'application/javascript' : 'text/css' } });
    if (path.endsWith('__release_smoke_missing__')) return new Response('Missing', { status: 404 });
    return new Response(`<h1>Game</h1><link rel="canonical" href="https://gachia.com${path}"><script src="/_games/${game}/_next/current.js"></script><link href="/_games/${game}/_next/current.css">`, { headers: { 'content-type': 'text/html' } });
  };
  if (failure) await assert.rejects(verifyOrigin(plan, 'http://127.0.0.1:1234', request), /retained asset/);
  else {
    const result = await verifyOrigin(plan, 'http://127.0.0.1:1234', request);
    assert.equal(result.retainedStaticPaths, 4); assert.equal(retained.length, 4);
    for (const { init } of retained) { assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit'); }
  }
});

for (const failure of [null, 'missing', 'soft-404', 'redirect', 'sitemap-difference']) test(`isolated staging compares candidate sitemap and retained bytes: ${failure ?? 'success'}`, async t => {
  const f = fixture(t); const calls = [];
  const sitemap = '<urlset>' + ['zh', 'en', 'ja'].map(locale => `<url><loc>https://gachia.com/${locale}/${game}/characters/example</loc></url>`).join('') + '</urlset>';
  f.put('candidate.xml', failure === 'sitemap-difference' ? sitemap.replaceAll('example', 'other') : sitemap);
  const options = { game, subdomain: 'fixture-account', previousAssetsReceipt: f.receiptPath, expectedSitemap: resolve(f.root, 'candidate.xml') };
  const request = async (url, init) => {
    calls.push({ url, init });
    const path = decodeURIComponent(url.pathname);
    const file = f.receipt.files.find(file => path.endsWith(`/static/${file.path}`));
    if (file) return new Response(failure === 'soft-404' ? '<h1>Not found</h1>' : readFileSync(resolve(f.root, 'static', file.path)), { status: failure === 'missing' ? 404 : failure === 'redirect' ? 302 : 200 });
    if (path === '/robots.txt') return new Response('Disallow: /');
    if (path === '/sitemap.xml') return new Response(sitemap, { headers: { 'content-type': 'application/xml' } });
    if (/\.(js|css)$/.test(path)) return new Response('current asset', { headers: { 'content-type': path.endsWith('.js') ? 'application/javascript' : 'text/css' } });
    if (path.endsWith('__staging_acceptance_missing__')) return new Response('Missing', { status: 404, headers: { 'x-robots-tag': 'noindex' } });
    return new Response(`<h1>Game</h1><meta name="robots" content="noindex"><link rel="canonical" href="https://gachia.com${path}"><script src="/_games/${game}/_next/current.js"></script><link href="/_games/${game}/_next/current.css">`, { headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' } });
  };
  if (failure) await assert.rejects(verifyStagingHttp(options, request), /retained asset|differs from the candidate/);
  else {
    const result = await verifyStagingHttp(options, request);
    assert.equal(result.retainedStaticPaths, 4); assert.equal(result.candidateSitemapCompared, true); assert.equal(calls.length, 20);
    for (const { url, init } of calls) { assert.equal(url.origin, 'https://gachia-game-azur-promilia-staging.fixture-account.workers.dev'); assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit'); }
  }
});
