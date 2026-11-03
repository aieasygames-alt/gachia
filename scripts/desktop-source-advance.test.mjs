import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { advanceSourceCatalog, readPublishedCandidate } from './desktop-source-advance.mjs';
import { selectSourceCatalog } from './desktop-source-catalog.mjs';
import { prepareCandidate, artifactFiles, verifyBuilt } from './desktop-publish.mjs';
import { captureGameAssets, digest, retainCandidate } from './desktop-release-assets.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { previousAssetFiles, retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';
import { pageFingerprint } from './desktop-version-preview.mjs';
import { publicReferences } from './desktop-public-acceptance.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, bytes, { mode: 0o600 }); return digest(bytes); };
const save = (path, value) => put(path, json(value));
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

async function fixture(t, game = 'genshin') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-source-advance-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'), directory = join(root, 'candidate'); mkdirSync(repo); mkdirSync(directory);
  const original = json([{ id: 'one', title: 'O', content: 'Original' }]), content = json([{ id: 'one', title: 'A', content: 'Published A' }]);
  const paths = [`packages/data/games/${game}/raw-guides.json`, `apps/web/public/data/${game}/raw-guides.json`];
  for (const path of paths) put(join(repo, path), original);
  save(join(repo, 'packages/core/route-ownership.json'), { games: { [game]: { pages: ['guides'], details: ['guides'] } } });
  const git = args => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
  git(['init']); git(['add', '.']); git(['-c', 'user.name=CMS test', '-c', 'user.email=fixture@localhost.invalid', 'commit', '-m', 'isolated fixture']);
  const sourceSHA256 = digest(original), candidateSHA256 = digest(content), releaseKey = digest(JSON.stringify({ game, source: sourceSHA256, candidate: candidateSHA256, preview: false }));
  put(join(directory, 'raw-guides.json'), content);
  save(join(directory, 'manifest.json'), { game, sourcePath: paths[0], sourceSHA256, candidateSHA256, releaseKey, preview: false, preparedOn: 'desktop', changed: ['one'] });
  const prepared = prepareCandidate({ repo, directory, runs: join(root, 'runs') }), run = prepared.directory, pin = prepared.planSHA256;
  const state = { status: 'built_local_only', owners: {} };
  for (const owner of [game, 'main']) {
    const artifact = join(run, 'artifacts', owner);
    for (const [path, bytes] of Object.entries({ 'worker.js': 'uncompiled original', '.build/open-next.config.edge.mjs': 'export default {};', 'assets/BUILD_ID': 'fixture', 'assets/_next/static/new.js': 'new static' })) put(join(artifact, path), bytes);
    if (owner === 'main') put(join(artifact, `assets/data/${game}/raw-guides.json`), content);
    state.owners[owner] = { status: 'built', artifactSHA256: save(join(run, `${owner}-artifact.json`), artifactFiles(artifact)), releaseKey, previewOnly: true };
  }
  save(join(run, 'state.json'), state); verifyBuilt(run, pin);
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, routes: [], domains: [], scripts: [...SERVICES] };
  const version = owner => baseline.services[owner === 'main' ? 'gachia' : `gachia-game-${owner}`].versions[0].version_id;
  const form = new FormData(); form.set('worker.js', new Blob(['old']), 'worker.js'); const oldArchive = Buffer.from(await new Response(form).arrayBuffer());
  const history = join(root, 'history.json'), staticBytes = Buffer.from('old static');
  const historicalPin = save(history, { status: 'stable_direct_origin_verified', origin: `https://gachia-game-${game}.aieasygames.workers.dev`, versionId: version(game), observations: [{ path: '/_next/static/old.js', bytes: staticBytes.length, sha256: digest(staticBytes) }] });
  const gameAssets = await captureGameAssets({ game, historicalPath: history, historicalPin, directory: join(root, 'old-assets'), observe: async () => ({ versionId: version(game), deploymentId: uuid(8), scriptEtag: digest('old'), percentage: 100 }), archive: async () => oldArchive, request: async () => new Response(staticBytes) });
  const mainStatic = join(root, 'main-static'); put(join(mainStatic, 'old.js'), staticBytes);
  const evidencePath = join(root, 'assets.json'), evidencePin = save(evidencePath, { schemaVersion: 1, game, gameAssets, main: { source: { versionId: version('main'), artifactId: '123', archiveSha256: digest('fixture archive') }, previousStatic: mainStatic, files: previousAssetFiles(mainStatic) } });
  const retained = await retainCandidate(run, pin, evidencePath, evidencePin), id = 'a'.repeat(16), bundle = join(run, 'cloud-bundles', id);
  const owners = {}, accepted = {}, responses = new Map(), modules = {}, remoteVersions = {};
  const publicDirectory = join(run, `promotion-evidence-${retained.id}`), publicOwners = {};
  for (const [i, owner] of [game, 'main'].entries()) {
    const service = owner === 'main' ? 'gachia' : `gachia-game-${game}`, code = Buffer.from(`sealed ${owner}`), versionId = uuid(100 + i), bindings = [{ name: 'ASSETS', type: 'assets' }];
    if (owner === 'main') bindings.push(...['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'].map(name => ({ name, type: 'secret_text' })));
    if (owner === 'nte') bindings.push({ name: 'NTE_DEPLOYMENT_MODE', type: 'plain_text', text: 'live' });
    const config = { name: service, main: join(bundle, owner, 'worker.js'), compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'], assets: { directory: join(retained.directory, owner, '.open-next/assets') }, vars: owner === 'nte' ? { NTE_DEPLOYMENT_MODE: 'live' } : {} };
    baseline.settings[service] = { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, tags: owner === 'main' ? ['cf:service=gachia'] : [], bindings };
    baseline.bindings[service] = bindings; baseline.subdomains[service] = { enabled: true, previews_enabled: true };
    put(join(bundle, owner, 'worker.js'), code);
    const configSHA256 = save(join(bundle, owner, 'upload.json'), config);
    const dynamic = owner === 'main' ? [`/data/${game}/raw-guides.json`, '/sitemap.xml', '/api/auth/get-session'] : ['/sitemap.xml', ...['zh', 'en', 'ja'].map(lang => `/${lang}/${game}/guides/one`)];
    const refs = [];
    for (const path of [...dynamic, ...artifactFiles(join(retained.directory, owner, '.open-next')).filter(row => (row.path.startsWith('assets/_next/static/') || row.path.startsWith(`assets/_games/${game}/_next/static/`)) && row.type === 'file').map(row => '/' + row.path.slice(7))]) {
      const html = `<html><head><title>A</title><link rel="canonical" href="https://gachia.com${path}"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;
      const body = Buffer.from(path.includes('/guides/') ? html : path.startsWith('/data/') ? content : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}' : path === '/sitemap.xml' ? '<urlset/>' : readFileSync(join(config.assets.directory, path)));
      const headers = { 'content-type': path.includes('/guides/') ? 'text/html' : path.endsWith('.json') || path.startsWith('/api/') ? 'application/json' : path.endsWith('.xml') ? 'application/xml' : 'text/javascript', 'cache-control': path.startsWith('/api/') ? 'no-store' : 'public, max-age=0' };
      const ref = { path, status: path.startsWith('/api/') ? 404 : 200, headers, sha256: digest(body), ...(path.includes('/guides/') ? { fingerprint: pageFingerprint(html), expectedRobots: [] } : {}) };
      put(join(bundle, owner, `${refs.length}.body`), body); refs.push(ref); responses.set(`${service}:${path}`, { body, ref });
    }
    const referencesSHA256 = save(join(bundle, owner, 'references.json'), refs);
    owners[owner] = { service, moduleSHA256: digest(code), configSHA256, referencesSHA256, artifactSHA256: retained.owners[owner].artifactSHA256, paths: refs.length };
    accepted[service] = { service, versionId, releaseKey, artifactSHA256: owners[owner].artifactSHA256, moduleSHA256: digest(code), status: 'passed', evidenceSHA256: digest('preview'), acceptedAt: 1 };
    const observations = publicReferences(owner, refs, game).map((ref, j) => {
      const originalPath = owner === 'main' ? ref.path : ref.path.startsWith('/sitemaps/') ? '/sitemap.xml' : ref.path.replace(`/_games/${game}`, '');
      const body = responses.get(`${service}:${originalPath}`).body; put(join(publicDirectory, `${owner}-public/${j}.body`), body);
      return { path: ref.path, status: ref.status, headers: ref.headers, bytes: body.length, sha256: digest(body), bodyFile: `${j}.body` };
    });
    publicOwners[owner] = { status: 'passed', responses: observations.length, evidenceSHA256: save(join(publicDirectory, `${owner}-public/result.json`), { status: 'passed', origin: 'https://gachia.com', owner, observations }) };
    const currentForm = new FormData(); currentForm.set('worker.js', new Blob([code]), 'worker.js');
    modules[service] = { code, moduleSHA256: digest(code), archive: Buffer.from(await new Response(currentForm).arrayBuffer()) };
    const assets = { serve_directly: true, raw_run_worker_first: false, base_path: '/' };
    if (owner === 'main') Object.assign(assets, { headers: { version: 2, rules: { '/_next/static/*': { set: { 'cache-control': 'public,max-age=31536000,immutable' }, unset: [] } } }, raw_headers: '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n' });
    remoteVersions[service] = { id: versionId, metadata: { has_preview: true }, resources: { script: { etag: digest(code) }, bindings, script_runtime: { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, usage_model: 'standard', assets } } };
  }
  const manifest = { schemaVersion: 1, id, planSHA256: pin, retentionId: retained.id, retentionPin: retained.retentionPin, releaseKey, owners, snapshot: baseline, previewCandidate: false };
  const bundlePin = save(join(bundle, 'manifest.json'), manifest);
  const versions = Object.fromEntries(Object.entries(accepted).map(([service, row]) => [service, row.versionId]));
  const remote = { status: 'passed', versions, modules: Object.fromEntries(Object.entries(owners).map(([, row]) => [row.service, row.moduleSHA256])) };
  const remoteProof = { ...remote, evidenceSHA256: save(join(publicDirectory, 'remote-versions.json'), remote) };
  const proof = { status: 'passed', releaseKey, versions, owners: publicOwners };
  const finalProof = { ...proof, evidenceSHA256: save(join(publicDirectory, 'public-acceptance.json'), proof) };
  const journal = [{ phase: 'baseline', baseline, accepted }, { phase: 'remote_versions_verified', proof: remoteProof }, ...[game, 'main'].flatMap(owner => ['promotion_intent', 'promoted'].map(phase => ({ phase, owner, service: owners[owner].service, versionId: versions[owners[owner].service] }))), { phase: 'production_accepted', proof: finalProof }].map(row => ({ at: '2026-11-01T00:00:00Z', releaseKey, previewJournalPin: digest('preview'), recoveryPin: digest('recovery'), ...row }));
  const journalPath = join(run, `promotion-${retained.id}.jsonl`), promotionJournalPin = put(journalPath, journal.map(row => JSON.stringify(row) + '\n').join(''));
  const current = structuredClone(baseline);
  for (const service of Object.keys(versions)) current.services[service] = { id: uuid(900 + Object.keys(versions).indexOf(service)), versions: [{ version_id: versions[service], percentage: 100 }] };
  const calls = [], reader = { snapshot: async () => structuredClone(current), module: async service => { calls.push(['module', service]); return modules[service]; }, version: async service => { calls.push(['version', service]); return remoteVersions[service]; } };
  const request = async (url, opts) => {
    assert.equal(opts.method, 'GET'); assert.equal(opts.credentials, 'omit'); assert.equal(opts.redirect, 'error'); calls.push(['GET', url]);
    const parsed = new URL(url), service = parsed.hostname.includes(`gachia-game-${game}`) ? `gachia-game-${game}` : 'gachia';
    assert(parsed.origin.includes('-gachia') && parsed.origin.endsWith('.aieasygames.workers.dev'));
    const { body, ref } = responses.get(`${service}:${parsed.pathname}`);
    return new Response(body, { status: ref.status, headers: { ...ref.headers, 'x-robots-tag': 'noindex' } });
  };
  const input = { run, pin, id, bundlePin, promotionJournalPin, repo };
  return { root, game, run, pin, journal, journalPath, manifest, input, current, reader, request, calls, original, content, responses,
    args: { input, root: join(root, 'catalog'), directory: join(run, 'advance'), reader, request } };
}

for (const game of ['genshin', 'nte']) test(`${game}: completed publication advances A sources and selects them for B without publishing`, async t => {
  const f = await fixture(t, game), result = await advanceSourceCatalog(f.args);
  assert.equal(result.status, 'current_sources_registered'); assert.equal(result.cloudWrites, false); assert.equal(result.newPublicationAuthorized, false);
  const selected = await selectSourceCatalog({ root: f.args.root, directory: join(f.root, 'select'), plan: { game, owners: [game, 'main'] }, reader: f.reader, request: f.request });
  assert.equal(selected.sourcePin, result.sourcePin); assert.equal(selected.freshAssetHTTPStillRequired, true); assert.equal(selected.freshCandidateRecoveryStillRequired, true);
  const source = JSON.parse(readFileSync(selected.sourcePath));
  assert.equal(readFileSync(join(source.owners.main.directory, `assets/data/${game}/raw-guides.json`), 'utf8'), f.content);
  assert.notEqual(digest(f.content), digest(f.original));
  const evidence = JSON.parse(readFileSync(selected.evidencePath)), next = join(f.root, 'next-main');
  put(join(next, 'worker.js'), 'next runtime'); put(join(next, 'assets/_next/static/B.js'), 'next static');
  retainWebAssets({ previousStatic: evidence.main.previousStatic, artifactDirectory: next, source: evidence.main.source });
  assert.equal(verifyRetainedWebAssets(next, evidence.main.source.versionId).verified, true);
  assert.equal(readFileSync(join(f.run, 'retained', f.manifest.retentionId, game, '.open-next/worker.js'), 'utf8'), 'uncompiled original');
  assert(f.calls.every(([method]) => ['GET', 'module', 'version'].includes(method)));
  const again = { ...f.args, directory: join(f.run, 'again') };
  await assert.rejects(advanceSourceCatalog(again), /EEXIST/);
});

for (const failure of ['partial', 'torn', 'journal-pin', 'wrong-version', 'split', 'wrong-release', 'reordered', 'public-body', 'public-pin', 'public-cookie', 'preview-only', 'module', 'module-archive', 'version-metadata', 'network', 'current-O', 'current-cookie', 'missing-noindex', 'cache', 'topology', 'static-body', 'source-body']) test(`source advancement rejects ${failure} without a selectable entry`, async t => {
  const f = await fixture(t);
  const repin = () => { f.input.promotionJournalPin = put(f.journalPath, f.journal.map(row => JSON.stringify(row) + '\n').join('')); };
  if (failure === 'partial') { f.journal.pop(); repin(); }
  if (failure === 'torn') { f.input.promotionJournalPin = put(f.journalPath, readFileSync(f.journalPath).subarray(0, -1)); }
  if (failure === 'journal-pin') f.input.promotionJournalPin = digest('wrong');
  if (failure === 'wrong-version') f.current.services.gachia.versions[0].version_id = uuid(999);
  if (failure === 'split') f.current.services.gachia.versions[0].percentage = 50;
  if (failure === 'wrong-release') { f.journal.at(-1).releaseKey = digest('wrong'); repin(); }
  if (failure === 'reordered') { [f.journal[2], f.journal[4]] = [f.journal[4], f.journal[2]]; repin(); }
  if (failure === 'public-body') put(join(f.run, `promotion-evidence-${f.manifest.retentionId}/main-public/0.body`), 'tampered');
  if (failure === 'public-pin') { f.journal.at(-1).proof.evidenceSHA256 = digest('wrong'); repin(); }
  if (failure === 'public-cookie') {
    const dir = join(f.run, `promotion-evidence-${f.manifest.retentionId}`), proof = JSON.parse(readFileSync(join(dir, 'public-acceptance.json'))), result = JSON.parse(readFileSync(join(dir, 'main-public/result.json')));
    result.observations[0].headers['set-cookie'] = 'bad=1'; proof.owners.main.evidenceSHA256 = save(join(dir, 'main-public/result.json'), result);
    f.journal.at(-1).proof = { ...proof, evidenceSHA256: save(join(dir, 'public-acceptance.json'), proof) }; repin();
  }
  if (failure === 'preview-only') { f.journal.at(-1).phase = 'cloud_previews_accepted_no_promotion'; repin(); }
  if (failure === 'module') f.reader.module = async () => ({ code: Buffer.from('wrong'), moduleSHA256: digest('wrong'), archive: Buffer.from('wrong') });
  if (failure === 'module-archive') { const original = f.reader.module; f.reader.module = async (...args) => ({ ...await original(...args), archive: Buffer.from('wrong') }); }
  if (failure === 'version-metadata') { const original = f.reader.version; f.reader.version = async (...args) => ({ ...await original(...args), id: uuid(999) }); }
  if (failure === 'network') f.args.request = async () => { throw Error('unavailable'); };
  if (['current-O', 'current-cookie', 'static-body', 'missing-noindex', 'cache'].includes(failure)) f.args.request = async (url, opts) => {
    const response = await f.request(url, opts);
    if (failure === 'current-O' && url.includes('/data/')) return new Response(f.original, { headers: response.headers });
    if (failure === 'static-body' && url.includes('/_next/static/')) return new Response('tampered', { headers: response.headers });
    if (failure === 'current-cookie') response.headers.set('set-cookie', 'bad=1');
    if (failure === 'missing-noindex') response.headers.delete('x-robots-tag');
    if (failure === 'cache') response.headers.set('cache-control', 'wrong');
    return response;
  };
  if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.current); if (++n > 2) x.routes.push('drift'); return x; }; }
  if (failure === 'source-body') put(join(f.run, 'retained', f.manifest.retentionId, 'main/.open-next', `assets/data/${f.game}/raw-guides.json`), f.original);
  await assert.rejects(advanceSourceCatalog(f.args));
  assert.equal(JSON.parse(readFileSync(join(f.args.directory, 'diagnostic.json'))).status, 'failed');
  assert(!existsSync(join(f.args.root, f.game)));
});

test('published source evidence and original publication bodies are revalidated on selection', async t => {
  const f = await fixture(t), result = await advanceSourceCatalog(f.args);
  const manifest = JSON.parse(readFileSync(result.manifestPath)), proof = JSON.parse(readFileSync(manifest.origin.proofPath));
  put(join(dirname(manifest.origin.proofPath), 'main-http/0.body'), 'tampered');
  await assert.rejects(selectSourceCatalog({ root: f.args.root, directory: join(f.root, 'select'), plan: { game: f.game, owners: [f.game, 'main'] }, reader: f.reader, request: f.request }));
  assert.equal(proof.cloudWrites, false);
  assert.equal(readPublishedCandidate(f.input).plan.game, f.game);
});

for (const failure of ['bundle-pin', 'journal-pin', 'unknown-kind', 'wrong-version', 'capture-static', 'derived-runtime', 'saved-public']) test(`new sources cannot retain/select after ${failure} drift`, async t => {
  const f = await fixture(t), result = await advanceSourceCatalog(f.args);
  const evidence = JSON.parse(readFileSync(result.evidencePath)), source = evidence.main.source;
  if (failure === 'bundle-pin') source.bundlePin = digest('wrong');
  if (failure === 'journal-pin') source.promotionJournalPin = digest('wrong');
  if (failure === 'unknown-kind') source.kind = 'anything';
  if (failure === 'wrong-version') source.versionId = uuid(999);
  if (['bundle-pin', 'journal-pin', 'unknown-kind', 'wrong-version'].includes(failure)) {
    const next = join(f.root, 'next'); put(join(next, 'worker.js'), 'next'); put(join(next, 'assets/_next/static/B.js'), 'next');
    assert.throws(() => retainWebAssets({ previousStatic: evidence.main.previousStatic, artifactDirectory: next, source }));
    assert(!existsSync(join(next, 'retained-web-assets.json')));
    return;
  }
  if (failure === 'capture-static') put(join(dirname(result.evidencePath), 'game-assets/static/new.js'), 'tampered');
  if (failure === 'derived-runtime') put(join(dirname(result.evidencePath), 'main/.open-next/worker.js'), 'tampered');
  if (failure === 'saved-public') put(join(f.run, `promotion-evidence-${f.manifest.retentionId}/main-public/0.body`), 'tampered');
  await assert.rejects(selectSourceCatalog({ root: f.args.root, directory: join(f.root, 'select'), plan: { game: f.game, owners: [f.game, 'main'] }, reader: f.reader, request: f.request }));
});

test('actual loopback HTTP persists source bodies while cloud topology and UUIDs remain simulated', async t => {
  const f = await fixture(t), rows = [];
  const server = createServer(async (req, res) => {
    const response = await f.request(decodeURIComponent(req.url.slice(1)), { method: 'GET', redirect: 'error', credentials: 'omit' });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  f.args.request = async (url, opts) => { rows.push(url); return fetch(`http://127.0.0.1:${server.address().port}/${encodeURIComponent(url)}`, opts); };
  const result = await advanceSourceCatalog(f.args);
  assert.equal(result.cloudWrites, false); assert(rows.length > 15);
  assert(rows.every(url => url.startsWith('https://00000000-gachia')));
  const origin = JSON.parse(readFileSync(result.manifestPath)).origin;
  assert.equal(JSON.parse(readFileSync(origin.proofPath)).status, 'passed');
});
