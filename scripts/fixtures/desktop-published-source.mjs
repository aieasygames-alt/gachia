import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { prepareCandidate, artifactFiles, verifyBuilt } from '../desktop-publish.mjs';
import { captureGameAssets, digest, retainCandidate } from '../desktop-release-assets.mjs';
import { SERVICES } from '../desktop-cloud-release.mjs';
import { previousAssetFiles } from '../retain-web-assets.mjs';
import { pageFingerprint } from '../desktop-version-preview.mjs';
import { publicReferences } from '../desktop-public-acceptance.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, bytes, { mode: 0o600 }); return digest(bytes); };
const save = (path, value) => put(path, json(value));
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export async function fixture(t, game = 'genshin', options = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-source-advance-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'), directory = join(root, 'candidate'); mkdirSync(repo); mkdirSync(directory);
  const original = options.original ?? json([{ id: 'one', title: 'O', content: 'Original' }]), content = options.content ?? json([{ id: 'one', title: 'A', content: 'Published A' }]);
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
    if (owner === 'main') { put(join(artifact, `assets/data/${game}/raw-guides.json`), content);
      if (options.otherContent) put(join(artifact, `assets/data/${game === 'genshin' ? 'nte' : 'genshin'}/raw-guides.json`), options.otherContent); }
    state.owners[owner] = { status: 'built', artifactSHA256: save(join(run, `${owner}-artifact.json`), artifactFiles(artifact)), releaseKey, previewOnly: true };
  }
  save(join(run, 'state.json'), state); verifyBuilt(run, pin);
  if (options.builtOnly) return { root, repo, run, pin, plan: prepared.plan, original, content };
  const baseline = options.snapshot ? structuredClone(options.snapshot) : { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, routes: [], domains: [], scripts: [...SERVICES] };
  for (const service of SERVICES) {
    baseline.settings[service] ??= { compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] };
    baseline.bindings[service] ??= [{ name: 'ASSETS', type: 'assets' }];
  }
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
    const service = owner === 'main' ? 'gachia' : `gachia-game-${game}`, code = Buffer.from(`sealed ${owner}`), versionId = uuid((options.uuidBase ?? 100) + i), bindings = [{ name: 'ASSETS', type: 'assets' }];
    if (owner === 'main') bindings.push(...['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'].map(name => ({ name, type: 'secret_text' })));
    if (owner === 'nte') bindings.push({ name: 'NTE_DEPLOYMENT_MODE', type: 'plain_text', text: 'live' });
    const config = { name: service, main: join(bundle, owner, 'worker.js'), compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'], assets: { directory: join(retained.directory, owner, '.open-next/assets') }, vars: owner === 'nte' ? { NTE_DEPLOYMENT_MODE: 'live' } : {} };
    baseline.settings[service] = { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, tags: owner === 'main' ? ['cf:service=gachia'] : [], bindings };
    baseline.bindings[service] = bindings; baseline.subdomains[service] = { enabled: true, previews_enabled: true };
    put(join(bundle, owner, 'worker.js'), code);
    const configSHA256 = save(join(bundle, owner, 'upload.json'), config);
    const dynamic = owner === 'main' ? [`/data/${game}/raw-guides.json`, '/sitemap.xml', '/api/auth/get-session'] : ['/sitemap.xml', ...['zh', 'en', 'ja'].map(lang => `/${lang}/${game}/guides/one`)];
    if (owner === 'main' && options.preserveReferences) dynamic.push(`/data/${game === 'genshin' ? 'nte' : 'genshin'}/raw-guides.json`);
    const refs = [];
    for (const path of [...dynamic, ...artifactFiles(join(retained.directory, owner, '.open-next')).filter(row => (row.path.startsWith('assets/_next/static/') || row.path.startsWith(`assets/_games/${game}/_next/static/`)) && row.type === 'file').map(row => '/' + row.path.slice(7))]) {
      const html = `<html><head><title>A</title><link rel="canonical" href="https://gachia.com${path}"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;
      const body = Buffer.from(path.includes('/guides/') ? html : path.startsWith('/data/') ? path === `/data/${game}/raw-guides.json` ? content : options.otherContent : path.startsWith('/api/') ? '{"code":"ACCOUNT_FEATURES_DISABLED"}' : path === '/sitemap.xml' ? '<urlset/>' : readFileSync(join(config.assets.directory, path)));
      const headers = { 'content-type': path.includes('/guides/') ? 'text/html' : path.endsWith('.json') || path.startsWith('/api/') ? 'application/json' : path.endsWith('.xml') ? 'application/xml' : 'text/javascript', 'cache-control': path.startsWith('/api/') ? 'no-store' : 'public, max-age=0' };
      const ref = { path, status: path.startsWith('/api/') ? 404 : 200, headers, sha256: digest(body), ...(path.includes('/guides/') ? { fingerprint: pageFingerprint(html), expectedRobots: [] } : {}) };
      if (path.startsWith('/data/') && path !== `/data/${game}/raw-guides.json`) ref.preservedMainVersion = version('main');
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
