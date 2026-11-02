import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { registerHistoricalSourceCatalog, registerSourceCatalog, selectSourceCatalog } from './desktop-source-catalog.mjs';
import { prepareLocalRecovery } from './desktop-local-evidence.mjs';
import { artifactFiles } from './desktop-publish.mjs';
import { captureGameAssets, digest } from './desktop-release-assets.mjs';
import { capturePublishedBaseline } from './desktop-published-baseline.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { previousAssetFiles } from './retain-web-assets.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const save = (path, x) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, json(x), { mode: 0o600 }); return digest(json(x)); };
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const runtime = Buffer.from('downloaded current cloud runtime');
const html = game => `<html><head><title>A</title><link rel="canonical" href="https://gachia.com/zh/${game}/guides/one"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;

async function fixture(t, game = 'genshin') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-source-catalog-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: Object.fromEntries(SERVICES.map(s => [s, { compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] }])),
    bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES };
  const version = owner => snapshot.services[owner === 'main' ? 'gachia' : `gachia-game-${owner}`].versions[0].version_id;
  const original = Buffer.from('[{"id":"one","title":"O","content":"Original"}]');
  const published = Buffer.from('[{"id":"one","title":"A","content":"Original"}]');
  const plan = { game, owners: [game, 'main'], changed: ['one'], releaseKey: 'a'.repeat(64), preview: false, sourceSHA256: digest(original) };
  const form = new FormData(); form.set('worker.js', new Blob([runtime]), 'worker.js');
  const archive = Buffer.from(await new Response(form).arrayBuffer());
  const calls = [], reader = { snapshot: async () => structuredClone(snapshot), module: async (service, id) => {
    calls.push({ service, id }); return { code: runtime, moduleSHA256: digest(runtime), archive };
  } };
  const staticBytes = Buffer.from('old static'), history = join(root, 'history.json');
  const historicalPin = save(history, { status: 'stable_direct_origin_verified', origin: `https://gachia-game-${game}.aieasygames.workers.dev`,
    versionId: version(game), observations: [{ path: '/_next/static/old.js', bytes: staticBytes.length, sha256: digest(staticBytes) }] });
  const gameAssets = await captureGameAssets({ game, historicalPath: history, historicalPin, directory: join(root, 'capture'),
    observe: async () => ({ versionId: version(game), deploymentId: uuid(8), scriptEtag: 'b'.repeat(64), percentage: 100 }),
    archive: async () => archive, request: async () => new Response(staticBytes) });
  const mainStatic = join(root, 'main-static'); mkdirSync(mainStatic); writeFileSync(join(mainStatic, 'old.js'), staticBytes);
  const evidencePath = join(root, 'assets.json'), evidencePin = save(evidencePath, { schemaVersion: 1, game, gameAssets,
    main: { source: { versionId: version('main') }, previousStatic: mainStatic, files: previousAssetFiles(mainStatic) } });
  const receipt = { owners: {}, evidencePath, evidencePin }, retained = join(root, 'retained'), sources = {};
  const artifact = path => {
    for (const [name, bytes] of Object.entries({ 'worker.js': 'never execute this original', '.build/open-next.config.edge.mjs': 'export default {}',
      'assets/BUILD_ID': 'fixture', 'assets/_next/static/old.js': staticBytes, 'assets/guide.html': html(game) })) {
      mkdirSync(dirname(join(path, name)), { recursive: true }); writeFileSync(join(path, name), bytes);
    }
  };
  for (const owner of plan.owners) {
    const old = join(root, 'old', owner); artifact(old);
    if (owner === 'main') { mkdirSync(join(old, `assets/data/${game}`), { recursive: true }); writeFileSync(join(old, `assets/data/${game}/raw-guides.json`), published); }
    sources[owner] = { directory: old, versionId: version(owner), artifactSHA256: digest(json(artifactFiles(old))) };
    const current = join(retained, owner, '.open-next'); artifact(current); writeFileSync(join(current, 'assets/_next/static/new.js'), 'new static');
    receipt.owners[owner] = { previousVersion: version(owner), artifactSHA256: save(join(retained, `${owner}-inventory.json`), artifactFiles(current)) };
  }
  const verified = { plan, receipt, directory: retained, retentionPin: save(join(retained, 'receipt.json'), receipt) };
  const captured = await capturePublishedBaseline({ plan, importBytes: original, directory: join(root, 'baseline'), observe: reader.snapshot,
    request: async () => new Response(published, { headers: { 'content-type': 'application/json' } }) });
  const sourcePath = join(root, 'sources.json'), sourcePin = save(sourcePath, { schemaVersion: 1, game, owners: sources });
  let config;
  const request = async (url, options) => {
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    const parsed = new URL(url), local = parsed.hostname === '127.0.0.1', path = parsed.pathname;
    if (path.startsWith('/api/')) return new Response('{"code":"ACCOUNT_FEATURES_DISABLED"}', { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    if (path.startsWith('/data/')) return new Response(local ? readFileSync(join(config.assets.directory, path)) : published, { headers: { 'content-type': 'application/json' } });
    if (path === '/sitemap.xml') return new Response('<urlset/>', { headers: { 'content-type': 'application/xml' } });
    if (path.startsWith('/_next/static/')) return new Response(readFileSync(join(config.assets.directory, path)));
    return new Response(html(game), { headers: { 'content-type': 'text/html' } });
  };
  const recoveryResult = await prepareLocalRecovery({ verified, ...captured, sourcePath, sourcePin, run: root, directory: join(root, 'recovery'), reader, request,
    serve: async (_cwd, path, _home, _log, accept) => { config = JSON.parse(readFileSync(path)); return accept('http://127.0.0.1:12345'); } });
  const recovery = { path: recoveryResult.evidencePath, pin: recoveryResult.evidencePin };
  const input = { root: join(root, 'catalog'), directory: join(root, 'register'), verified, recovery, reader, request };
  const selection = () => ({ root: input.root, directory: join(root, 'select'), plan: { ...plan, releaseKey: 'c'.repeat(64) }, reader, request });
  calls.length = 0;
  return { root, game, plan, snapshot, version, original, published, reader, calls, verified, input, selection };
}

for (const game of ['genshin', 'nte']) test(`${game} catalog selects current A sources for a different candidate without authorizing it`, async t => {
  const f = await fixture(t, game), registered = await registerSourceCatalog(f.input), selected = await selectSourceCatalog(f.selection());
  assert.equal(registered.status, 'current_sources_registered'); assert.equal(selected.status, 'current_sources_selected');
  assert.equal(selected.sourcePin, registered.sourcePin); assert.equal(selected.evidencePin, f.verified.receipt.evidencePin);
  assert.equal(selected.productionReady, false); assert.equal(selected.cloudWrites, false);
  assert.equal(selected.freshAssetHTTPStillRequired, true); assert.equal(selected.freshCandidateRecoveryStillRequired, true);
  assert.equal(readFileSync(join(f.root, 'select/published.body')).toString(), f.published.toString());
  assert.notEqual(digest(f.published), f.plan.sourceSHA256);
  assert.deepEqual(f.calls.map(row => row.service), [`gachia-game-${game}`, 'gachia', `gachia-game-${game}`, 'gachia']);
  const sources = JSON.parse(readFileSync(selected.sourcePath));
  for (const owner of f.plan.owners) assert.equal(readFileSync(join(sources.owners[owner].directory, 'worker.js')).toString(), runtime.toString());
});

for (const failure of ['O-not-A', 'status', 'cookie', 'type', 'network', 'second-owner', 'module-hash', 'module-bytes', 'topology', 'asset-pin', 'recovery-pin', 'runtime', 'source-tree', 'proof-body', 'baseline-body', 'retained-receipt', 'wrong-game', 'wrong-version']) {
  test(`registration rejects ${failure} before publishing a selectable manifest`, async t => {
    const f = await fixture(t), input = f.input;
    if (failure === 'O-not-A') input.request = async () => new Response(f.original, { headers: { 'content-type': 'application/json' } });
    if (failure === 'status') input.request = async () => new Response('unavailable', { status: 503 });
    if (failure === 'cookie') input.request = async () => new Response(f.published, { headers: { 'content-type': 'application/json', 'set-cookie': 'bad=1' } });
    if (failure === 'type') input.request = async () => new Response(f.published);
    if (failure === 'network') input.request = async () => { throw Error('unavailable'); };
    if (failure === 'second-owner') f.reader.module = async service => { if (service === 'gachia') throw Error('second owner unavailable'); return { code: runtime, moduleSHA256: digest(runtime), archive: runtime }; };
    if (failure === 'module-hash') f.reader.module = async () => ({ code: runtime, moduleSHA256: digest('wrong'), archive: runtime });
    if (failure === 'module-bytes') f.reader.module = async () => ({ code: Buffer.from('wrong'), moduleSHA256: digest(runtime), archive: runtime });
    if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.snapshot); if (++n > 1) x.routes.push('drift'); return x; }; }
    if (failure === 'asset-pin') writeFileSync(f.verified.receipt.evidencePath, '{}');
    if (failure === 'recovery-pin') input.recovery.pin = '0'.repeat(64);
    if (failure === 'runtime' || failure === 'source-tree') writeFileSync(join(f.root, 'recovery/main/.open-next', failure === 'runtime' ? 'worker.js' : 'assets/guide.html'), 'tampered');
    if (failure === 'proof-body') writeFileSync(join(f.root, 'recovery/genshin-0.body'), 'tampered');
    if (failure === 'baseline-body') writeFileSync(join(f.root, 'baseline/published.body'), f.original);
    if (failure === 'retained-receipt') writeFileSync(join(f.verified.directory, 'receipt.json'), '{}');
    if (failure === 'wrong-game') f.verified.plan.game = 'nte';
    if (failure === 'wrong-version') f.snapshot.services.gachia.versions[0].version_id = uuid(999);
    await assert.rejects(registerSourceCatalog(input), /diagnostics:/);
    assert.equal(JSON.parse(readFileSync(join(input.directory, 'diagnostic.json'))).status, 'failed');
    await assert.rejects(selectSourceCatalog(f.selection()));
    assert(!existsSync(join(f.root, 'select/selection.json')));
  });
}

test('catalog refuses replacement and never repairs or selects incomplete entries', async t => {
  const f = await fixture(t), entry = await registerSourceCatalog(f.input), original = readFileSync(entry.manifestPath);
  await assert.rejects(registerSourceCatalog({ ...f.input, directory: join(f.root, 'again') }), /EEXIST/);
  assert(readFileSync(entry.manifestPath).equals(original));
  rmSync(entry.manifestPath);
  await assert.rejects(selectSourceCatalog(f.selection()));
  await assert.rejects(registerSourceCatalog({ ...f.input, directory: join(f.root, 'retry') }), /EEXIST/);
});

for (const owner of ['genshin', 'main']) test(`a new ${owner} UUID has no implicit latest/fallback entry`, async t => {
  const f = await fixture(t); await registerSourceCatalog(f.input);
  f.snapshot.services[owner === 'main' ? 'gachia' : 'gachia-game-genshin'].versions[0].version_id = uuid(999);
  await assert.rejects(selectSourceCatalog(f.selection()), /ENOENT/);
});

test('other protected Worker historical changes do not invalidate unchanged game/Main identity', async t => {
  const f = await fixture(t); await registerSourceCatalog(f.input);
  f.snapshot.services['gachia-game-nte'].versions[0].version_id = uuid(999);
  assert.equal((await selectSourceCatalog(f.selection())).status, 'current_sources_selected');
});

for (const failure of ['manifest-link', 'profile-link', 'public-root', 'public-game', 'public-entry', 'public-manifest', 'public-profile', 'profile-tamper', 'source-tamper', 'proof-tamper', 'body-tamper', 'manifest-during-selection', 'topology']) {
  test(`selection fails closed on ${failure}`, async t => {
    const f = await fixture(t), entry = await registerSourceCatalog(f.input), input = f.selection();
    if (failure.endsWith('-link')) {
      const path = failure === 'manifest-link' ? entry.manifestPath : entry.sourcePath, raw = readFileSync(path), target = join(f.root, 'linked.json');
      writeFileSync(target, raw, { mode: 0o600 }); rmSync(path); symlinkSync(target, path);
    }
    const permissions = { 'public-root': f.input.root, 'public-game': join(f.input.root, f.game), 'public-entry': dirname(entry.manifestPath), 'public-manifest': entry.manifestPath, 'public-profile': entry.sourcePath };
    if (permissions[failure]) chmodSync(permissions[failure], failure === 'public-manifest' || failure === 'public-profile' ? 0o644 : 0o755);
    if (failure === 'profile-tamper') writeFileSync(entry.sourcePath, '{}');
    if (failure === 'source-tamper') writeFileSync(join(f.root, 'recovery/main/.open-next/worker.js'), 'tamper');
    if (failure === 'proof-tamper') writeFileSync(join(f.root, 'recovery/main-0.body'), 'tamper');
    if (failure === 'body-tamper') input.request = async () => new Response(f.original, { headers: { 'content-type': 'application/json' } });
    if (failure === 'manifest-during-selection') input.request = async (...args) => { writeFileSync(entry.manifestPath, readFileSync(entry.manifestPath).toString() + ' '); return f.input.request(...args); };
    if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.snapshot); if (++n > 1) x.routes.push('drift'); return x; }; }
    await assert.rejects(selectSourceCatalog(input)); assert(!existsSync(join(input.directory, 'selection.json')));
    assert.equal(JSON.parse(readFileSync(join(input.directory, 'diagnostic.json'))).status, 'failed');
  });
}

test('registration rejects a linked catalog root', async t => {
  const f = await fixture(t), target = join(f.root, 'elsewhere'); mkdirSync(target, { mode: 0o700 }); symlinkSync(target, f.input.root);
  await assert.rejects(registerSourceCatalog(f.input), /Linked catalog/);
});

test('even re-pinned internal asset links cannot become catalog sources', async t => {
  const f = await fixture(t), artifact = join(f.root, 'recovery/main/.open-next'), path = join(artifact, 'assets/alias.js');
  symlinkSync('_next/static/old.js', path);
  const evidence = JSON.parse(readFileSync(f.input.recovery.path));
  evidence.owners.main.artifactSHA256 = save(join(f.root, 'recovery/main-inventory.json'), artifactFiles(artifact));
  f.input.recovery.pin = save(f.input.recovery.path, evidence);
  await assert.rejects(registerSourceCatalog(f.input), /Linked asset source/);
});

async function historicalFixture(t, game = 'nte') {
  const f = await fixture(t, game), previous = JSON.parse(readFileSync(f.input.recovery.path)), work = join(f.root, 'history');
  const proof = { status: 'passed', work, publishable: false, cloudWrites: false, rawUUIDRollbackAuthorized: false, recovery: {} };
  for (const owner of f.plan.owners) {
    const directory = join(work, 'recovery', owner, '.open-next'); mkdirSync(dirname(directory), { recursive: true });
    cpSync(join(f.root, 'recovery', owner, '.open-next'), directory, { recursive: true });
    const observations = [...previous.owners[owner].observations, ...previous.owners[owner].auxiliary].map((row, i) => {
      const bodyFile = `${i}.body`, path = join(work, `recovery-${owner}-http`, bodyFile);
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, readFileSync(join(f.root, 'recovery', row.bodyFile)));
      return { ...row, bodyFile };
    });
    proof.recovery[owner] = { status: 'passed', runtimeUnchanged: true, responses: observations.length, observations,
      artifactSHA256: save(join(work, `recovery-${owner}-inventory.json`), artifactFiles(directory)) };
  }
  const parent = structuredClone(proof); parent.work = join(f.root, 'parent-history');
  cpSync(work, parent.work, { recursive: true });
  const parentPath = join(f.root, 'parent-history.json'), parentPin = save(parentPath, parent);
  proof.schemaVersion = 1; proof.kind = 'downloaded_runtime_source_local_http'; proof.sourceOnly = true;
  proof.historical = { path: parentPath, pin: parentPin };
  for (const owner of f.plan.owners) {
    delete proof.recovery[owner].runtimeUnchanged;
    Object.assign(proof.recovery[owner], { runtimeUnchangedDuringSampling: true, runtimeOrigin: 'downloaded_exact_cloud_version', versionId: f.version(owner), runtimeModuleSHA256: digest(runtime) });
  }
  const proofPath = join(f.root, 'historical-proof.json');
  const origin = { kind: 'historical_local_recovery', sourceOnly: true, plan: { game, owners: [game, 'main'], sourceSHA256: f.plan.sourceSHA256 },
    assets: { path: f.verified.receipt.evidencePath, pin: f.verified.receipt.evidencePin }, proofPath, proofPin: save(proofPath, proof),
    baselinePath: previous.baselinePath, baselinePin: previous.baselinePin, sampleGuide: 'one' };
  return { ...f, proof, origin, historical: { ...f.input, verified: undefined, recovery: undefined, origin } };
}

for (const game of ['genshin', 'nte']) test(`${game} imports historical real-shaped source evidence without inventing a candidate`, async t => {
  const f = await historicalFixture(t, game), registered = await registerHistoricalSourceCatalog(f.historical);
  const manifest = JSON.parse(readFileSync(registered.manifestPath));
  assert.equal(manifest.origin.kind, 'historical_local_recovery'); assert.equal(manifest.origin.sourceOnly, true);
  assert.equal(manifest.origin.plan.releaseKey, undefined); assert.equal(manifest.origin.receipt, undefined); assert.equal(manifest.recovery, undefined);
  assert.equal(manifest.current.observations.length, 6);
  const selected = await selectSourceCatalog(f.selection());
  assert.equal(selected.sourcePin, registered.sourcePin); assert.equal(selected.productionReady, false);
  assert.equal(selected.freshAssetHTTPStillRequired, true); assert.equal(selected.freshCandidateRecoveryStillRequired, true);
  assert.equal(JSON.parse(readFileSync(join(f.root, 'select/current.json'))).observations.length, 6);
});

for (const failure of ['candidate-identity', 'source-only', 'proof-pin', 'parent-proof', 'parent-tree', 'non-runtime-change', 'wrong-game', 'version', 'proof-body', 'source-tree', 'missing-static', 'missing-locale', 'body-link', 'main-O', 'network', 'current-runtime', 'current-rendered', 'current-cache', 'current-cookie', 'current-auth', 'topology']) {
  test(`historical registration rejects ${failure} without creating a candidate or manifest`, async t => {
    const f = await historicalFixture(t), { origin, proof, historical } = f;
    if (failure === 'candidate-identity') origin.plan.releaseKey = 'f'.repeat(64);
    if (failure === 'source-only') origin.sourceOnly = false;
    if (failure === 'proof-pin') origin.proofPin = '0'.repeat(64);
    if (failure === 'parent-proof') writeFileSync(proof.historical.path, '{}');
    if (failure === 'parent-tree') writeFileSync(join(f.root, 'parent-history/recovery/nte/.open-next/worker.js'), 'tampered');
    if (failure === 'non-runtime-change') {
      const directory = join(proof.work, 'recovery/nte/.open-next'); writeFileSync(join(directory, 'assets/guide.html'), 'tampered');
      proof.recovery.nte.artifactSHA256 = save(join(proof.work, 'recovery-nte-inventory.json'), artifactFiles(directory));
      origin.proofPin = save(origin.proofPath, proof);
    }
    if (failure === 'wrong-game') { origin.plan.game = 'genshin'; origin.plan.owners = ['genshin', 'main']; }
    if (failure === 'version') f.snapshot.services.gachia.versions[0].version_id = uuid(999);
    if (failure === 'proof-body') writeFileSync(join(proof.work, 'recovery-nte-http/0.body'), 'tampered');
    if (failure === 'source-tree') writeFileSync(join(proof.work, 'recovery/nte/.open-next/worker.js'), 'tampered');
    if (failure === 'body-link') { const path = join(proof.work, 'recovery-nte-http/0.body'), target = join(f.root, 'linked.body'); writeFileSync(target, readFileSync(path)); rmSync(path); symlinkSync(target, path); }
    if (failure === 'main-O') {
      const directory = join(proof.work, 'recovery/main/.open-next'); writeFileSync(join(directory, 'assets/data/nte/raw-guides.json'), f.original);
      proof.recovery.main.artifactSHA256 = save(join(proof.work, 'recovery-main-inventory.json'), artifactFiles(directory));
      origin.proofPin = save(origin.proofPath, proof);
    }
    if (failure === 'missing-static' || failure === 'missing-locale') {
      proof.recovery.nte.observations = proof.recovery.nte.observations.filter(row => failure === 'missing-static' ? row.path !== '/_next/static/new.js' : row.path !== '/ja/nte/guides/one');
      proof.recovery.nte.responses = proof.recovery.nte.observations.length; origin.proofPin = save(origin.proofPath, proof);
    }
    if (failure === 'network') historical.request = async () => { throw Error('unavailable'); };
    if (failure === 'current-runtime') f.reader.module = async () => ({ code: Buffer.from('wrong'), moduleSHA256: digest('wrong'), archive: Buffer.from('wrong') });
    if (failure.startsWith('current-') && failure !== 'current-runtime') historical.request = async (url, options) => {
      const response = await f.input.request(url, options);
      if (url.includes('/data/')) return response;
      if (failure === 'current-rendered' && url.includes('/guides/')) return new Response(html(f.game).replace('Published A', 'Wrong'), { headers: response.headers });
      if (failure === 'current-cache') response.headers.set('cache-control', 'private');
      if (failure === 'current-cookie') response.headers.set('set-cookie', 'bad=1');
      if (failure === 'current-auth' && url.includes('/api/')) return new Response('{}', { headers: response.headers });
      return response;
    };
    if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.snapshot); if (++n > 1) x.routes.push('drift'); return x; }; }
    await assert.rejects(registerHistoricalSourceCatalog(historical));
    assert.equal(JSON.parse(readFileSync(join(historical.directory, 'diagnostic.json'))).status, 'failed');
    await assert.rejects(selectSourceCatalog(f.selection()));
  });
}

test('historical evidence is revalidated on selection, not trusted only at import', async t => {
  const f = await historicalFixture(t); await registerHistoricalSourceCatalog(f.historical);
  writeFileSync(join(f.proof.work, 'recovery-main-http/0.body'), 'tampered after registration');
  await assert.rejects(selectSourceCatalog(f.selection()), /Historical HTTP body changed/);
});
