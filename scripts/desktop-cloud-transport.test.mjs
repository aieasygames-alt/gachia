import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertEditorialRecovery, assertOwnerSettings, assertUploadedVersion, assertUploadMetadata, multipartModule, normalizedBindings, uploadCloudPreview, uploadRecoveryPreview } from './desktop-cloud-transport.mjs';
import { boundedBody, exactPreviewOrigin, pageFingerprint, validatePreviewResponse, verifyVersionPreview } from './desktop-version-preview.mjs';
import { digest } from './desktop-release-assets.mjs';

const versionId = '00000000-0000-0000-0000-000000000001';
const html = '<html><head><title>Guide</title><meta name="description" content="Description"/><link rel="canonical" href="https://gachia.com/zh/genshin/guides/one"/></head><body><h1>Guide</h1><article>Rendered content</article><img src="/image.png"/><script type="application/ld+json">{"name":"Guide"}</script><script>flight()</script></body></html>';
function settings(owner = 'genshin') {
  const service = owner === 'main' ? 'gachia' : `gachia-game-${owner}`;
  const config = { name: service, compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'], vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com' } };
  const bindings = [{ name: 'ASSETS', type: 'assets' }, { name: 'NEXT_PUBLIC_APP_URL', type: 'plain_text', text: 'https://gachia.com' }];
  if (owner === 'nte') { config.vars.NTE_DEPLOYMENT_MODE = 'live'; bindings.push({ name: 'NTE_DEPLOYMENT_MODE', type: 'plain_text', text: 'live' }); }
  if (owner === 'main') {
    config.d1_databases = [{ binding: 'DB', database_id: versionId }]; config.r2_buckets = [{ binding: 'IMAGES', bucket_name: 'images' }]; config.services = [{ binding: 'WORKER_SELF_REFERENCE', service }];
    bindings.push({ name: 'DB', type: 'd1', id: versionId, database_id: versionId }, { name: 'IMAGES', type: 'r2_bucket', bucket_name: 'images' }, { name: 'WORKER_SELF_REFERENCE', type: 'service', service, environment: 'production' });
    bindings.push(...['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'].map(name => ({ name, type: 'secret_text' })));
  }
  return { service, config, snapshot: { services: { [service]: { id: versionId, versions: [{ version_id: versionId, percentage: 100 }] } }, settings: { [service]: { compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, tags: owner === 'main' ? ['cf:service=gachia'] : [], bindings } }, subdomains: { [service]: { enabled: true, previews_enabled: true } } } };
}

for (const owner of ['genshin', 'nte', 'main']) test(`${owner}: bind exact live bindings, existing preview capability and environment tags`, () => {
  const f = settings(owner); assertOwnerSettings(owner, f.config, f.snapshot);
  for (const mutate of [x => x.snapshot.settings[f.service].tags.push('unreviewed'), x => x.snapshot.settings[f.service].bindings.push({ name: 'new', type: 'assets' }), x => x.snapshot.subdomains[f.service].previews_enabled = false, x => x.snapshot.settings[f.service].compatibility_date = '2020-01-01']) {
    const changed = structuredClone(f); mutate(changed); assert.throws(() => assertOwnerSettings(owner, changed.config, changed.snapshot));
  }
});

test('NTE live runtime drift and staging service cannot pass the local seal gate', () => {
  const f = settings('nte');
  f.snapshot.settings[f.service].bindings.find(x => x.name === 'NTE_DEPLOYMENT_MODE').text = 'preview';
  assert.throws(() => assertOwnerSettings('nte', f.config, f.snapshot));
  const other = settings('nte'); other.config.name = 'gachia-game-nte-staging';
  assert.throws(() => assertOwnerSettings('nte', other.config, other.snapshot));
  assert.equal(exactPreviewOrigin('gachia-game-nte', versionId), `https://${versionId.slice(0, 8)}-gachia-game-nte.aieasygames.workers.dev`);
});

test('binding normalization rejects unknown fields, unknown types, secret values and non-production self references', () => {
  for (const b of [{ name: 'x', type: 'secret_text', text: 'secret' }, { name: 'x', type: 'kv_namespace' }, { name: 'x', type: 'service', service: 'gachia', environment: 'staging' }, { name: 'x', type: 'd1', id: 'one', database_id: 'two' }]) assert.throws(() => normalizedBindings([b]));
});

test('multipart parsing binds actual executable bytes and rejects extra modules', async () => {
  const form = new FormData(); form.set('metadata', JSON.stringify({ main_module: 'worker.js' })); form.set('worker.js', new Blob(['export default {};']), 'worker.js');
  const parsed = await multipartModule(Buffer.from(await new Response(form).arrayBuffer())); assert.equal(parsed.moduleSHA256, digest('export default {};'));
  form.set('extra.js', new Blob(['bad']), 'extra.js'); await assert.rejects(multipartModule(Buffer.from(await new Response(form).arrayBuffer())), /Additional Worker/);
});

test('upload metadata must preserve secrets and cannot introduce migrations or non-versioned settings', () => {
  const { config, service, snapshot } = settings(); const metadata = { main_module: 'worker.js', compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags, keep_bindings: ['secret_text', 'secret_key'], bindings: snapshot.settings[service].bindings };
  assertUploadMetadata(metadata, config);
  assert.throws(() => assertUploadMetadata({ ...metadata, keep_bindings: ['plain_text'] }, config));
  assert.throws(() => assertUploadMetadata({ ...metadata, bindings: [] }, config), /bindings differ/);
  for (const key of ['migrations', 'containers', 'routes', 'observability', 'logpush']) assert.throws(() => assertUploadMetadata({ ...metadata, [key]: [{}] }, config));
});

test('remote version acceptance binds UUID, preview capability, runtime, assets and bindings', () => {
  const f = settings();
  const version = { id: versionId, metadata: { has_preview: true }, resources: {
    bindings: f.snapshot.settings[f.service].bindings,
    script_runtime: { compatibility_date: f.config.compatibility_date, compatibility_flags: f.config.compatibility_flags,
      usage_model: 'standard', assets: { serve_directly: true, raw_run_worker_first: false, base_path: '/' } },
  } };
  const accept = x => assertUploadedVersion(x, versionId, f.config, f.snapshot.settings[f.service].bindings);
  accept(version);
  for (const mutate of [x => x.id = 'another', x => x.metadata.has_preview = false,
    x => x.resources.script_runtime.compatibility_date = '2020-01-01', x => x.resources.script_runtime.compatibility_flags = [],
    x => x.resources.script_runtime.assets.raw_run_worker_first = true, x => x.resources.bindings.pop()]) {
    const changed = structuredClone(version); mutate(changed); assert.throws(() => accept(changed));
  }
});

test('sitemap and robots remain non-indexable; static bytes and private cache cannot drift', () => {
  const check = (path, body, headers, reference) => validatePreviewResponse({ path, bytes: Buffer.from(body), response: new Response(body, { headers }), reference });
  const sitemap = { status: 200, headers: { 'content-type': 'application/xml' }, sha256: digest('<xml/>') };
  assert.throws(() => check('/sitemap.xml', '<xml/>', sitemap.headers, sitemap), /noindex/);
  check('/sitemap.xml', '<xml/>', { ...sitemap.headers, 'x-robots-tag': 'noindex' }, sitemap);
  const robots = { status: 200, headers: { 'content-type': 'text/plain' } };
  assert.throws(() => check('/robots.txt', 'User-agent: *\nAllow: /\n', { ...robots.headers, 'x-robots-tag': 'noindex' }, robots), /disallow/);
  const privateResponse = { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }, sha256: digest('{}') };
  assert.throws(() => check('/api/auth/get-session', '{}', { 'content-type': 'application/json' }, privateResponse), /cache policy/);
  assert.throws(() => check('/_next/static/a.js', 'changed', { 'content-type': 'text/javascript' }, { status: 200, headers: { 'content-type': 'text/javascript' }, sha256: digest('sealed') }), /bytes differ/);
});

test('only exact owner version origins are accepted; aliases and unrelated services are impossible', () => {
  assert.equal(exactPreviewOrigin('gachia', versionId), 'https://00000000-gachia.aieasygames.workers.dev');
  for (const [service, version] of [['gachia-router', versionId], ['gachia-game-azur-promilia', versionId], ['gachia', 'latest']]) assert.throws(() => exactPreviewOrigin(service, version));
});

test('render fingerprints cover actual body text, title, metadata, JSON-LD and image references', () => {
  const fp = pageFingerprint(html);
  assert.deepEqual(pageFingerprint(html.replace('flight()', 'differentFlight()')), fp);
  for (const [from, to] of [['Rendered content', 'Wrong body'], ['Description', 'Wrong description'], ['"name":"Guide"', '"name":"Wrong"'], ['/image.png', '/wrong.png']]) assert.notDeepEqual(pageFingerprint(html.replace(from, to)), fp);
  assert.throws(() => pageFingerprint(html.replace('https://gachia.com/', 'http://127.0.0.1/')));
});

for (const variant of ['missing-noindex', 'body', 'mime', 'cookie', 'status', 'cache']) test(`preview rejects ${variant} mismatch`, () => {
  const headers = { 'content-type': 'text/html', 'x-robots-tag': 'noindex', 'cache-control': 's-maxage=31536000' };
  if (variant === 'missing-noindex') delete headers['x-robots-tag'];
  if (variant === 'mime') headers['content-type'] = 'application/json';
  if (variant === 'cookie') headers['set-cookie'] = 'session=not-real';
  if (variant === 'cache') headers['cache-control'] = 'public, max-age=3600';
  const body = variant === 'body' ? html.replace('Rendered content', 'wrong') : html;
  assert.throws(() => validatePreviewResponse({ path: '/zh/genshin/guides/one', response: new Response(body, { status: variant === 'status' ? 404 : 200, headers }), bytes: Buffer.from(body), reference: { status: 200, headers: { 'content-type': 'text/html', 'cache-control': 's-maxage=31536000' }, fingerprint: pageFingerprint(html) } }));
});

test('real local HTTP exercises exact-origin request binding and persisted failed evidence', async t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'cms-version-test-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  let broken = false;
  const server = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html', 'x-robots-tag': 'noindex', 'cache-control': 'public, max-age=0' }); res.end(broken ? html.replace('Rendered content', 'wrong') : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const reference = { path: '/zh/genshin/guides/one', status: 200, headers: { 'content-type': 'text/html', 'cache-control': 'max-age=0, public' }, fingerprint: pageFingerprint(html) };
  const request = async (url, options) => { assert.equal(url, exactPreviewOrigin('gachia-game-genshin', versionId) + reference.path); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); return fetch(`http://127.0.0.1:${server.address().port}${reference.path}`, options); };
  const result = await verifyVersionPreview({ service: 'gachia-game-genshin', versionId, references: [reference], directory: join(directory, 'pass'), request }); assert.equal(result.status, 'passed');
  broken = true; await assert.rejects(verifyVersionPreview({ service: 'gachia-game-genshin', versionId, references: [reference], directory: join(directory, 'failure'), request }));
  const failure = JSON.parse(readFileSync(join(directory, 'failure/result.json'))); assert.equal(failure.status, 'failed'); assert.equal(failure.observations.length, 1);
  assert.equal(digest(readFileSync(join(directory, 'failure/0.body'))), failure.observations[0].sha256);
});

test('network bodies are bounded while streaming', async () => {
  await assert.rejects(boundedBody(new Response('too long'), 3), /budget exceeded/);
});

test('CI cannot invoke the upload adapter even with a forged argument set', async () => {
  const old = process.env.CI; process.env.CI = 'true';
  try { await assert.rejects(uploadCloudPreview({}), /desktop-only/); }
  finally { if (old === undefined) delete process.env.CI; else process.env.CI = old; }
});

const editorialRecovery = () => ({ preview: false, game: 'genshin', owners: ['genshin', 'main'], changed: ['guide'], releaseKey: 'a'.repeat(64) });
test('recovery gate accepts only explicitly identified editorial changes', () => {
  const plan = editorialRecovery(); assert.doesNotThrow(() => assertEditorialRecovery(plan, plan.releaseKey));
});
for (const [label, patch] of [
  ['rehearsal', { preview: true }], ['missing preview flag', { preview: undefined }],
  ['unchanged', { changed: [] }], ['missing changes', { changed: undefined }],
  ['unreviewed NTE', { game: 'nte' }], ['reversed owners', { owners: ['main', 'genshin'] }],
  ['missing Main', { owners: ['genshin'] }], ['extra service', { owners: ['genshin', 'main', 'router'] }],
]) test(`recovery rejects ${label}`, () => {
  assert.throws(() => assertEditorialRecovery({ ...editorialRecovery(), ...patch }, 'a'.repeat(64)));
});
test('recovery rejects missing, malformed and mismatched release keys', () => {
  for (const key of [undefined, '', 'latest', 'b'.repeat(64)]) assert.throws(() => assertEditorialRecovery(editorialRecovery(), key));
});
test('CI recovery rejection happens before any network request or file access', async () => {
  const old = process.env.CI, originalFetch = globalThis.fetch; let calls = 0;
  process.env.CI = 'true'; globalThis.fetch = async () => { calls++; throw Error('Unexpected network'); };
  try { await assert.rejects(uploadRecoveryPreview({}), /desktop-only/); assert.equal(calls, 0); }
  finally { globalThis.fetch = originalFetch; if (old === undefined) delete process.env.CI; else process.env.CI = old; }
});
