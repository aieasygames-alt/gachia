import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { prepareLocalRecovery } from '../desktop-local-evidence.mjs';
import { artifactFiles } from '../desktop-publish.mjs';
import { captureGameAssets, digest } from '../desktop-release-assets.mjs';
import { capturePublishedBaseline } from '../desktop-published-baseline.mjs';
import { SERVICES } from '../desktop-cloud-release.mjs';
import { previousAssetFiles } from '../retain-web-assets.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const save = (path, x) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, json(x), { mode: 0o600 }); return digest(json(x)); };
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const runtime = Buffer.from('downloaded current cloud runtime');
const html = game => `<html><head><title>A</title><link rel="canonical" href="https://gachia.com/zh/${game}/guides/one"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;

export async function fixture(t, game = 'genshin', options = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-source-catalog-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = options.snapshot ? structuredClone(options.snapshot) : { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
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
    if (path === '/sitemap.xml') return new Response('<urlset/>', { headers: { 'content-type': 'application/xml', 'cache-control': 'public, max-age=0' } });
    if (path.startsWith('/_next/static/')) return new Response(readFileSync(join(config.assets.directory, path)));
    return new Response(html(game), { headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=0' } });
  };
  const recoveryResult = await prepareLocalRecovery({ verified, ...captured, sourcePath, sourcePin, run: root, directory: join(root, 'recovery'), reader, request,
    serve: async (_cwd, path, _home, _log, accept) => { config = JSON.parse(readFileSync(path)); return accept('http://127.0.0.1:12345'); } });
  const recovery = { path: recoveryResult.evidencePath, pin: recoveryResult.evidencePin };
  const input = { root: join(root, 'catalog'), directory: join(root, 'register'), verified, recovery, reader, request };
  const selection = () => ({ root: input.root, directory: join(root, 'select'), plan: { ...plan, releaseKey: 'c'.repeat(64) }, reader, request });
  calls.length = 0;
  return { root, game, plan, snapshot, version, original, published, reader, calls, verified, input, selection };
}

export async function historicalFixture(t, game = 'nte', options = {}) {
  const f = await fixture(t, game, options), previous = JSON.parse(readFileSync(f.input.recovery.path)), work = join(f.root, 'history');
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
