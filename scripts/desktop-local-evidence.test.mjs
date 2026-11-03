import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { prepareLocalRecovery, preparationReader, refreshAssetEvidence } from './desktop-local-evidence.mjs';
import { artifactFiles, options } from './desktop-publish.mjs';
import { captureGameAssets, digest } from './desktop-release-assets.mjs';
import { capturePublishedBaseline } from './desktop-published-baseline.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { previousAssetFiles } from './retain-web-assets.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const save = (file, x) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, json(x)); return digest(json(x)); };
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function base(t, game = 'genshin') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-local-evidence-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: Object.fromEntries(SERVICES.map(s => [s, { compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] }])), bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES };
  const version = owner => snapshot.services[owner === 'main' ? 'gachia' : `gachia-game-${owner}`].versions[0].version_id;
  const original = Buffer.from('[{"id":"one","title":"O","content":"Original"}]');
  const published = Buffer.from('[{"id":"one","title":"A","content":"Original"}]');
  const plan = { game, owners: [game, 'main'], changed: ['one'], releaseKey: 'a'.repeat(64), preview: false, sourceSHA256: digest(original) };
  const reader = { snapshot: async () => structuredClone(snapshot), module: async () => ({ code: Buffer.from('downloaded current cloud runtime'), moduleSHA256: digest('downloaded current cloud runtime'), archive: Buffer.from('test remote archive') }) };
  return { root, game, plan, snapshot, version, original, published, reader };
}
const html = game => `<html><head><title>A</title><link rel="canonical" href="https://gachia.com/zh/${game}/guides/one"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Current content A</body></html>`;
function artifact(root, game, title = 'A') {
  for (const [file, bytes] of Object.entries({ 'worker.js': 'old executable must not be used', '.build/open-next.config.edge.mjs': 'export default {}',
    'assets/BUILD_ID': 'fixture', 'assets/_next/static/old.js': 'old static', 'assets/guide.html': html(game).replaceAll('>A<', `>${title}<`) })) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), bytes);
  }
}
async function recoveryFixture(t, game = 'genshin') {
  const f = base(t, game), owners = {}, receipt = { owners: {} }, retained = join(f.root, 'retained');
  for (const owner of f.plan.owners) {
    const old = join(f.root, 'old', owner); artifact(old, game);
    if (owner === 'main') { mkdirSync(join(old, `assets/data/${game}`), { recursive: true }); writeFileSync(join(old, `assets/data/${game}/raw-guides.json`), f.published); }
    const current = join(retained, owner, '.open-next'); artifact(current, game); writeFileSync(join(current, 'assets/_next/static/new.js'), 'new static');
    owners[owner] = { directory: old, versionId: f.version(owner), artifactSHA256: digest(json(artifactFiles(old))) };
    receipt.owners[owner] = { previousVersion: f.version(owner), artifactSHA256: save(join(retained, `${owner}-inventory.json`), artifactFiles(current)) };
  }
  const sourcePath = join(f.root, 'sources.json'), sourcePin = save(sourcePath, { schemaVersion: 1, game, owners });
  const captured = await capturePublishedBaseline({ plan: f.plan, importBytes: f.original, directory: join(f.root, 'baseline'), observe: f.reader.snapshot,
    request: async () => new Response(f.published, { headers: { 'content-type': 'application/json' } }) });
  const locals = new Map();
  const serve = async (_cwd, configPath, _home, _log, accept) => {
    const config = JSON.parse(readFileSync(configPath)); assert.equal(config.no_bundle, true);
    assert.equal(readFileSync(config.main, 'utf8'), 'downloaded current cloud runtime');
    assert(!config.services && !config.routes && !config.triggers);
    if (config.d1_databases) assert.equal(config.d1_databases[0].database_id, uuid(0));
    locals.set('http://127.0.0.1:12345', config); return accept('http://127.0.0.1:12345');
  };
  const request = async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    const parsed = new URL(url), config = locals.get(parsed.origin), path = parsed.pathname;
    let bytes, type = 'text/plain', status = 200;
    if (path.includes('/_next/static/')) { bytes = readFileSync(join(config.assets.directory, path)); type = 'application/javascript'; }
    else if (path.startsWith('/data/')) { bytes = config ? readFileSync(join(config.assets.directory, path)) : f.published; type = 'application/json'; }
    else if (path.startsWith('/api/')) { bytes = '{"code":"ACCOUNT_FEATURES_DISABLED"}'; type = 'application/json'; status = 404; }
    else if (path === '/sitemap.xml') { bytes = '<urlset/>'; type = 'application/xml'; }
    else { bytes = config ? readFileSync(join(config.assets.directory, 'guide.html')) : html(game); type = 'text/html'; }
    return new Response(bytes, { status, headers: { 'content-type': type, 'cache-control': 'no-store' } });
  };
  return { ...f, owners, input: { verified: { plan: f.plan, receipt, directory: retained, retentionPin: 'b'.repeat(64) }, run: f.root,
    ...captured, sourcePath, sourcePin, directory: join(f.root, 'recovery'), reader: f.reader, request, serve } };
}

for (const game of ['genshin', 'nte']) test(`${game} command generates complete recovery evidence for A, never O`, async t => {
  const f = await recoveryFixture(t, game), result = await prepareLocalRecovery(f.input);
  assert.equal(result.status, 'local_recovery_evidence_verified'); assert.equal(result.cloudRecoveryAccepted, false);
  assert.equal(result.cloudWrites, false); assert.equal(result.productionReady, false);
  const evidence = JSON.parse(readFileSync(result.evidencePath));
  assert.equal(evidence.owners.main.observations.find(row => row.path.startsWith('/data/')).sha256, digest(f.published));
  assert.notEqual(digest(f.published), f.plan.sourceSHA256);
  assert.equal(readFileSync(join(f.owners[game].directory, 'worker.js'), 'utf8'), 'old executable must not be used');
  assert(existsSync(join(f.input.directory, game, '.open-next/assets/_next/static/new.js')));
});

for (const failure of ['wrong-game', 'wrong-version', 'source-tamper', 'collision', 'second-target', 'baseline-O', 'public-content', 'topology']) test(`local recovery rejects ${failure} and never authorizes cloud writes`, async t => {
  const f = await recoveryFixture(t);
  if (failure === 'wrong-game') { const x = JSON.parse(readFileSync(f.input.sourcePath)); x.game = 'nte'; f.input.sourcePin = save(f.input.sourcePath, x); }
  if (failure === 'wrong-version') { const x = JSON.parse(readFileSync(f.input.sourcePath)); x.owners.main.versionId = uuid(999); f.input.sourcePin = save(f.input.sourcePath, x); }
  if (failure === 'source-tamper') writeFileSync(join(f.owners.main.directory, 'worker.js'), 'tampered');
  if (failure === 'collision' || failure === 'public-content' || failure === 'baseline-O') {
    const owner = failure === 'baseline-O' ? 'main' : 'genshin';
    const path = failure === 'collision' ? 'assets/_next/static/new.js' : failure === 'public-content' ? 'assets/guide.html' : 'assets/data/genshin/raw-guides.json';
    writeFileSync(join(f.owners[owner].directory, path), failure === 'baseline-O' ? f.original : failure === 'public-content' ? html('genshin').replace('Current content A', 'Wrong content') : 'collision');
    const x = JSON.parse(readFileSync(f.input.sourcePath)); x.owners[owner].artifactSHA256 = digest(json(artifactFiles(f.owners[owner].directory))); f.input.sourcePin = save(f.input.sourcePath, x);
  }
  if (failure === 'second-target') f.reader.module = async service => { if (service === 'gachia') throw Error('second target unavailable'); return { code: Buffer.from('downloaded current cloud runtime'), archive: Buffer.from('archive'), moduleSHA256: digest('downloaded current cloud runtime') }; };
  if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const copy = structuredClone(f.snapshot); if (++n > 1) copy.routes.push('drift'); return copy; }; }
  await assert.rejects(prepareLocalRecovery(f.input));
  assert(!existsSync(join(f.input.directory, 'recovery-evidence.json')));
  if (existsSync(join(f.input.directory, 'diagnostic.json'))) assert.equal(JSON.parse(readFileSync(join(f.input.directory, 'diagnostic.json'))).status, 'failed');
});

test('project inventory takes no target or write flags', () => {
  assert.equal(options(['project-inventory']).action, 'project-inventory');
  for (const flag of ['--target', '--token', '--force', '--run']) assert.throws(() => options(['project-inventory', flag, 'x']));
});

test('preparation transport only GETs fixed services and rejects origin injection', async () => {
  const calls = [], reader = preparationReader('fixture-token', async (url, options) => { calls.push({ url, options }); return new Response('unavailable', { status: 401 }); });
  await assert.rejects(reader.module('https://example.invalid', uuid(1)));
  await assert.rejects(reader.version('gachia-router', uuid(1)));
  await assert.rejects(reader.version('gachia', 'latest'));
  assert.equal(calls.length, 0);
  await assert.rejects(reader.module('gachia', uuid(1)), /independent source handoff/);
  assert.equal(calls.length, 0);
  await assert.rejects(reader.version('gachia', uuid(1)), /401/);
  assert.equal(calls.length, 1); assert.equal(calls[0].options.method, 'GET'); assert(!calls[0].options.body);
});

test('project inventory observes ten services, redacts secret values and keeps seven-service promotion scope', async t => {
  const f = base(t), calls = [], extra = ['gachia-router-staging', 'gachia-game-genshin-staging', 'gachia-game-azur-promilia-staging'];
  const reader = preparationReader('fixture-token', async (url, options) => {
    assert.equal(options.method, 'GET'); assert(!options.body); calls.push(url);
    let result;
    if (url.endsWith('/workers/scripts')) result = [...SERVICES, ...extra].map(id => ({ id }));
    else if (url.endsWith('/routes') || url.endsWith('/workers/domains')) result = [];
    else if (url.endsWith('/deployments')) result = { deployments: [{ id: uuid(1), created_on: '2026-11-02T00:00:00Z', versions: [{ version_id: uuid(2), percentage: 100 }] }] };
    else if (url.endsWith('/settings')) result = { bindings: [{ name: 'SECRET', type: 'secret_text', text: 'never-serialize-this-value' }] };
    else if (url.endsWith('/subdomain')) result = { enabled: true };
    else assert.fail('Unexpected API path');
    return Response.json({ success: true, result });
  });
  const result = await reader.project();
  assert.equal(result.projectScripts.length, 10); assert.equal(result.protectedServices.length, 7);
  assert.equal(Object.keys(result.additionalStaging).length, 3); assert.equal(calls.length, 33);
  assert(!JSON.stringify(result).includes('never-serialize-this-value')); assert.equal(result.cloudWrites, false);
});

async function assetsFixture(t) {
  const f = base(t), body = Buffer.from('old static'), form = new FormData(); form.set('worker.js', new Blob(['cloud module']), 'worker.js');
  const archive = Buffer.from(await new Response(form).arrayBuffer());
  const historicalPath = join(f.root, 'history.json');
  const historicalPin = save(historicalPath, { status: 'stable_direct_origin_verified', origin: 'https://gachia-game-genshin.aieasygames.workers.dev', versionId: f.version('genshin'), observations: [{ path: '/_next/static/old.js', bytes: body.length, sha256: digest(body) }] });
  const gameAssets = await captureGameAssets({ game: 'genshin', historicalPath, historicalPin, directory: join(f.root, 'capture'),
    observe: async () => ({ versionId: f.version('genshin'), deploymentId: uuid(8), scriptEtag: 'b'.repeat(64), percentage: 100 }), archive: async () => archive,
    request: async () => new Response(body) });
  const mainStatic = join(f.root, 'main-static'); mkdirSync(mainStatic); writeFileSync(join(mainStatic, 'old.js'), body);
  const evidencePath = join(f.root, 'assets.json'), evidencePin = save(evidencePath, { schemaVersion: 1, game: 'genshin', gameAssets,
    main: { source: { versionId: f.version('main') }, previousStatic: mainStatic, files: previousAssetFiles(mainStatic) } });
  f.reader.module = async () => ({ archive, code: Buffer.from('cloud module'), moduleSHA256: digest('cloud module') });
  return { ...f, input: { plan: f.plan, evidencePath, evidencePin, directory: join(f.root, 'fresh'), reader: f.reader, request: async () => new Response(body) } };
}
test('asset refresh saves new HTTP bytes/pins without replacing historical evidence', async t => {
  const f = await assetsFixture(t), before = readFileSync(f.input.evidencePath), result = await refreshAssetEvidence(f.input);
  assert.equal(result.responses, 2); assert.equal(result.cloudWrites, false); assert(readFileSync(f.input.evidencePath).equals(before));
});
for (const failure of ['hash', 'cookie', 'module', 'version', 'topology', 'network']) test(`asset refresh rejects ${failure} and preserves failed diagnostics`, async t => {
  const f = await assetsFixture(t);
  if (failure === 'hash') f.input.request = async () => new Response('wrong');
  if (failure === 'cookie') f.input.request = async () => new Response('old static', { headers: { 'set-cookie': 'session=bad' } });
  if (failure === 'network') f.input.request = async () => { throw Error('network unavailable'); };
  if (failure === 'module') f.reader.module = async () => ({ archive: Buffer.from('wrong'), moduleSHA256: digest('wrong') });
  if (failure === 'version') f.snapshot.services.gachia.versions[0].version_id = uuid(999);
  if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.snapshot); if (++n > 1) x.routes.push('changed'); return x; }; }
  await assert.rejects(refreshAssetEvidence(f.input)); assert(!existsSync(join(f.input.directory, 'asset-evidence.json')));
  assert.equal(JSON.parse(readFileSync(join(f.input.directory, 'diagnostic.json'))).status, 'failed');
});
