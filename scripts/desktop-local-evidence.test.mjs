import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { prepareLocalRecovery, preparationReader, readPublicStatic, refreshAssetEvidence } from './desktop-local-evidence.mjs';
import { artifactFiles, options } from './desktop-publish.mjs';
import { captureGameAssets, digest } from './desktop-release-assets.mjs';
import { capturePublishedBaseline } from './desktop-published-baseline.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { previousAssetFiles } from './retain-web-assets.mjs';
import { verifyRecoveryCompatibility } from './desktop-release-readiness.mjs';
import { pageFingerprint, validatePreviewResponse } from './desktop-version-preview.mjs';
import { publicRobots, validatePublicResponse } from './desktop-public-acceptance.mjs';
import { GiB } from './desktop-disk-preflight.mjs';

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

const missingHTML = '<html><head><title>404: This page could not be found.</title><meta name="robots" content="noindex"/></head><body><h1>404</h1><h2>This page could not be found.</h2></body></html>';
test('404 fingerprints recognize a real streamed Next error but reject empty or article-shaped shells', () => {
  const streamed = '<html><head><meta name="robots" content="noindex"/></head><body><script>self.__next_f.push([1,"6:E{\\"digest\\":\\"NEXT_HTTP_ERROR_FALLBACK;404\\"}"])</script></body></html>';
  assert.equal(pageFingerprint(streamed, 404).mode, 'flight-404');
  for (const html of [streamed.replace('NEXT_HTTP_ERROR_FALLBACK;404', 'different'), streamed.replace('noindex', 'index'),
    streamed.replace('</head>', '<link rel="canonical" href="https://gachia.com/zh/genshin/guides/cms-new"/></head>'),
    streamed.replace('</head>', '<script type="application/ld+json">{"@type":"Article"}</script></head>')]) assert.throws(() => pageFingerprint(html, 404));
});
for (const game of ['genshin', 'nte']) test(`${game} new-guide recovery requires version-bound 404 evidence for all locales, never a fabricated 200`, async t => {
  const f = await recoveryFixture(t, game), id = 'cms-new';
  f.plan.added = [id]; f.plan.changed = ['one', id];
  const request = f.input.request;
  f.input.request = async (url, options) => new URL(url).pathname.endsWith('/' + id)
    ? new Response(missingHTML, { status: 404, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } }) : request(url, options);
  const result = await prepareLocalRecovery(f.input), evidence = JSON.parse(readFileSync(result.evidencePath));
  assert.equal(evidence.owners[game].observations.filter(row => row.status === 404).length, 3);
  const reference = { path: `/zh/${game}/guides/${id}`, status: 404, headers: { 'content-type': 'text/html', 'cache-control': 'no-store' },
    fingerprint: pageFingerprint(missingHTML, 404), expectedRobots: publicRobots(missingHTML) };
  validatePreviewResponse({ path: reference.path, response: new Response(null, { status: 404, headers: { ...reference.headers, 'x-robots-tag': 'noindex' } }), bytes: Buffer.from(missingHTML), reference });
  validatePublicResponse(new Response(null, { status: 404, headers: reference.headers }), Buffer.from(missingHTML), reference);
  const row = evidence.owners[game].observations.find(row => row.status === 404); row.status = 200;
  const pin = save(result.evidencePath, evidence);
  assert.throws(() => verifyRecoveryCompatibility(result.evidencePath, pin, f.input.verified));
});

test('recovery disk failure leaves no output directory, cloud reads, copy or local server', async t => {
  const f = await recoveryFixture(t);
  f.input.diskProbe = () => ({ filesystem: f.root, availableBytes: 7 * GiB });
  f.reader.snapshot = async () => assert.fail('Network started before disk preflight');
  f.input.serve = async () => assert.fail('Server started before disk preflight');
  await assert.rejects(prepareLocalRecovery(f.input), /Insufficient disk/);
  assert(!existsSync(f.input.directory));
});

test('a changed legacy guide cannot be disguised as a new missing route', async t => {
  const f = await recoveryFixture(t), request = f.input.request;
  f.plan.added = ['one'];
  f.input.request = async (url, options) => new URL(url).pathname.endsWith('/one')
    ? new Response(missingHTML, { status: 404, headers: { 'content-type': 'text/html' } }) : request(url, options);
  await assert.rejects(prepareLocalRecovery(f.input));
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

test('static refresh overlaps reads while preserving exact evidence order and filenames', async t => {
  const f = await assetsFixture(t); let active = 0, peak = 0;
  f.input.request = async () => {
    peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 5)); active--;
    return new Response('old static');
  };
  const result = await refreshAssetEvidence(f.input);
  const proof = JSON.parse(readFileSync(result.evidencePath));
  const rows = JSON.parse(readFileSync(proof.freshCapture.observationsPath));
  assert.equal(peak, 2); assert.equal(active, 0);
  assert.deepEqual(rows.map(row => [row.owner, row.bodyFile]), [['genshin', '0.body'], ['main', '1.body']]);
  assert(rows.every(row => row.readAttempts.length === 1));
});

test('static body reset gets exactly one complete re-read and retains both attempts', async () => {
  let calls = 0; const attempts = [];
  const result = await readPublicStatic('/_next/static/fixed.js', async (url, options) => {
    assert.equal(url, 'https://gachia.com/_next/static/fixed.js'); assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    if (++calls === 1) return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(Buffer.from('partial'));
      controller.error(new TypeError('terminated', { cause: { code: 'UND_ERR_SOCKET' } }));
    } }));
    return new Response('complete');
  }, attempts);
  assert.equal(result.body.toString(), 'complete'); assert.equal(calls, 2);
  assert.equal(attempts[0].retry, true); assert.equal(attempts[0].phase, 'body');
  assert.equal(attempts[1].outcome, 'received');
});

test('only the static reader own timer may renew the request timeout', async () => {
  const attempts = [], signals = []; let calls = 0;
  const result = await readPublicStatic('/_next/static/fixed.js', async (_url, { signal }) => {
    signals.push(signal);
    if (++calls === 1) return new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(Error('Test timer failed')), 1000);
      signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
    });
    assert(!signal.aborted); return new Response('complete');
  }, attempts, () => AbortSignal.timeout(5));
  assert.equal(result.body.toString(), 'complete'); assert.equal(calls, 2); assert.notEqual(signals[0], signals[1]);
  assert.equal(attempts[0].error, 'TimeoutError'); assert.equal(attempts[0].retry, true);
});

for (const failure of ['http', 'external-abort', 'other-type-error', 'budget', 'persistent-reset']) {
  test(`static re-read refuses ${failure} without an unbounded retry`, async () => {
    let calls = 0; const attempts = [];
    await assert.rejects(readPublicStatic('/_next/static/fixed.js', async () => {
      calls++;
      if (failure === 'http') return new Response('unavailable', { status: 503 });
      if (failure === 'external-abort') throw new DOMException('Caller cancelled', 'AbortError');
      if (failure === 'other-type-error') throw new TypeError('programming error');
      if (failure === 'budget') return new Response(Buffer.alloc(16 * 1024 * 1024 + 1));
      return new Response(new ReadableStream({ start(controller) {
        controller.error(new TypeError('terminated', { cause: { code: 'UND_ERR_SOCKET' } }));
      } }));
    }, attempts));
    assert.equal(calls, failure === 'persistent-reset' ? 2 : 1);
    assert.equal(attempts.at(-1).retry, false);
  });
}

test('static reader rejects external origins, traversal and non-static endpoints before fetch', async () => {
  for (const path of ['https://example.invalid/_next/static/x.js', '//evil.invalid/_next/static/x.js', '/_next/static/%2e%2e/x.js',
    '/_next/static/x.js?escape', '/_next/static/x.js#escape', '/api/content-records', '/_games/unknown/_next/static/x.js']) {
    await assert.rejects(readPublicStatic(path, () => assert.fail('Request forbidden'), []));
  }
});

test('static refresh failure waits for active siblings and records no accepted evidence', async t => {
  const f = await assetsFixture(t); let completed = 0;
  f.input.request = async url => {
    await new Promise(resolve => setTimeout(resolve, url.includes('/_games/') ? 1 : 20)); completed++;
    return new Response(url.includes('/_games/') ? 'bad static' : 'old static');
  };
  await assert.rejects(refreshAssetEvidence(f.input), /Current public static bytes differ/);
  assert.equal(completed, 2); assert(!existsSync(join(f.input.directory, 'asset-evidence.json')));
  const diagnostic = JSON.parse(readFileSync(join(f.input.directory, 'diagnostic.json')));
  assert.equal(diagnostic.status, 'failed'); assert.equal(diagnostic.observations.length, 2);
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
