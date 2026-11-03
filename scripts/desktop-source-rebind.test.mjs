import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture as publishedFixture } from './fixtures/desktop-published-source.mjs';
import { fixture as legacyFixture, historicalFixture } from './fixtures/desktop-catalog-source.mjs';
import { advanceSourceCatalog } from './desktop-source-advance.mjs';
import { rebindSourceCatalog } from './desktop-source-rebind.mjs';
import { readPinnedSourceCatalog, registerHistoricalSourceCatalog, registerSourceCatalog, selectSourceCatalog } from './desktop-source-catalog.mjs';
import { digest } from './desktop-release-assets.mjs';
import { previousAssetFiles, retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const raw = json(value); writeFileSync(path, raw, { mode: 0o600 }); return digest(raw); };
const uuid = '00000000-0000-0000-0000-000000000999';

async function fixture(t, game = 'nte', legacy = false, options = {}) {
  const other = game === 'nte' ? 'genshin' : 'nte';
  const donor = await publishedFixture(t, other, { otherContent: options.otherContent ?? '[{"id":"one","title":"A","content":"Original"}]', preserveReferences: options.preserveReferences });
  const target = await (legacy ? legacyFixture : historicalFixture)(t, game, { snapshot: donor.manifest.snapshot });
  const old = await (legacy ? registerSourceCatalog(target.input) : registerHistoricalSourceCatalog(target.historical));
  const main = await advanceSourceCatalog(donor.args);
  const input = { source: { path: old.manifestPath, pin: old.manifestPin }, mainSource: { path: main.manifestPath, pin: main.manifestPin } };
  const request = async (url, opts) => {
    let response;
    if (new URL(url).hostname.includes(`gachia-game-${game}`)) response = await target.selection().request(url, opts);
    else if (new URL(url).pathname === `/data/${game}/raw-guides.json`) response = new Response(target.published, { headers: { 'content-type': 'application/json' } });
    else response = await donor.request(url, opts);
    response.headers.set('x-robots-tag', 'noindex'); return response;
  };
  const reader = { snapshot: donor.reader.snapshot,
    module: (service, id) => service === `gachia-game-${game}` ? target.reader.module(service, id) : donor.reader.module(service, id),
    version: async (service, id) => service === `gachia-game-${game}` ? { id, metadata: { has_preview: true }, resources: { script: { etag: 'b'.repeat(64) }, bindings: donor.current.bindings[service], script_runtime: donor.current.settings[service] } } : donor.reader.version(service, id) };
  const args = { input, root: target.input.root, directory: join(target.root, 'rebind'), reader, request };
  const selection = () => ({ root: args.root, directory: join(target.root, 'select-rebound'), plan: { game, owners: [game, 'main'] }, reader, request });
  return { game, other, target, donor, input, old, main, args, reader, request, selection };
}

for (const game of ['genshin', 'nte']) for (const legacy of [false, true]) test(`${game} ${legacy ? 'retained' : 'historical'} game + other game's published Main creates source-only current pair`, async t => {
  const f = await fixture(t, game, legacy), oldBytes = readFileSync(f.old.manifestPath);
  await assert.rejects(selectSourceCatalog({ ...f.selection(), directory: join(f.target.root, 'before-rebind') }), /ENOENT/);
  const result = await rebindSourceCatalog(f.args), selected = await selectSourceCatalog(f.selection());
  assert.equal(selected.sourcePin, result.sourcePin); assert.equal(result.cloudWrites, false); assert.equal(result.sourceOnly, true);
  assert.equal(result.newPublicationAuthorized, false); assert.equal(selected.freshCandidateRecoveryStillRequired, true);
  const manifest = JSON.parse(readFileSync(result.manifestPath)), profile = JSON.parse(readFileSync(result.sourcePath));
  assert.equal(manifest.origin.plan.releaseKey, undefined); assert.equal(manifest.origin.input.run, undefined);
  assert.deepEqual(profile.owners[game], JSON.parse(readFileSync(f.old.sourcePath)).owners[game]);
  assert.deepEqual(profile.owners.main, JSON.parse(readFileSync(f.main.sourcePath)).owners.main);
  assert.equal(manifest.current.contentSHA256, digest(f.target.published)); assert.notEqual(manifest.current.contentSHA256, digest(f.target.original));
  assert(readFileSync(f.old.manifestPath).equals(oldBytes));
  const evidence = JSON.parse(readFileSync(result.evidencePath)), next = join(f.target.root, 'next-main');
  // The next Main retention uses the donor's genuine publication provenance.
  mkdirSync(join(next, 'assets/_next/static'), { recursive: true }); writeFileSync(join(next, 'worker.js'), 'next runtime');
  writeFileSync(join(next, 'assets/_next/static/B.js'), 'next static');
  retainWebAssets({ previousStatic: evidence.main.previousStatic, artifactDirectory: next, source: evidence.main.source });
  assert.equal(verifyRetainedWebAssets(next, evidence.main.source.versionId).verified, true);
  assert(previousAssetFiles(evidence.main.previousStatic).length > 0);
  await assert.rejects(rebindSourceCatalog({ ...f.args, directory: join(f.target.root, 'duplicate-rebind') }), /EEXIST/);
  assert.equal((await selectSourceCatalog({ ...f.selection(), directory: join(f.target.root, 'select-again') })).sourcePin, result.sourcePin);
});

test('a genuinely sealed donor Main containing O cannot silently reset target A', async t => {
  const f = await fixture(t, 'nte', false, { otherContent: '[{"id":"one","title":"O","content":"Original"}]' });
  await assert.rejects(rebindSourceCatalog(f.args), /New Main changed target content/);
});

for (const game of ['genshin', 'nte']) test(`${game}: Main's sealed preserved reference is verified and reused, not duplicated during rebind`, async t => {
  const f = await fixture(t, game, false, { preserveReferences: true });
  // Match the independently verified donor HTTP policy, as actual production does.
  const request = f.args.request;
  f.args.request = async (url, opts) => {
    const response = await request(url, opts);
    if (new URL(url).pathname === `/data/${game}/raw-guides.json`) response.headers.set('cache-control', 'public, max-age=0');
    return response;
  };
  const result = await rebindSourceCatalog(f.args);
  assert.equal(result.sourceOnly, true);
  const selected = await selectSourceCatalog({ ...f.selection(), request: f.args.request });
  assert.equal(selected.versions.main, f.main.versions.main);
});

test('forward-only local recovery chunks are not falsely claimed as current cloud assets', async t => {
  const f = await fixture(t), requested = [];
  f.args.request = async (url, opts) => {
    if (new URL(url).hostname.includes('gachia-game-nte') && new URL(url).pathname === '/_next/static/new.js') throw Error('Forward-only chunk is not live');
    requested.push(url); return f.request(url, opts);
  };
  const result = await rebindSourceCatalog(f.args);
  assert.equal(result.sourceOnly, true);
  assert(requested.some(url => url.includes('gachia-game-nte') && url.endsWith('/_next/static/old.js')));
  const proof = JSON.parse(readFileSync(join(f.args.directory, 'source-proof.json')));
  assert.equal(proof.targetStaticScope, 'pinned_current_game_capture_not_forward_recovery_chunks');
});

test('version bindings use the established canonical identity, not API array order', async t => {
  const f = await fixture(t), original = f.reader.version;
  f.reader.version = async (...args) => {
    const version = structuredClone(await original(...args)); version.resources.bindings.reverse(); return version;
  };
  assert.equal((await rebindSourceCatalog(f.args)).sourceOnly, true);
});

test('published target sources can be rebound after the other game publishes, without changing either original entry', async t => {
  const seed = await publishedFixture(t, 'genshin');
  const target = await publishedFixture(t, 'nte', { snapshot: seed.manifest.snapshot, uuidBase: 200 });
  const old = await advanceSourceCatalog(target.args);
  const donor = await publishedFixture(t, 'genshin', { snapshot: target.current, uuidBase: 300, otherContent: target.content });
  const main = await advanceSourceCatalog(donor.args);
  const request = async (url, opts) => new URL(url).hostname.includes('gachia-game-nte') ? target.request(url, opts)
    : new URL(url).pathname === '/data/nte/raw-guides.json' ? new Response(target.content, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' } }) : donor.request(url, opts);
  const reader = { snapshot: donor.reader.snapshot, module: (service, id) => service === 'gachia-game-nte' ? target.reader.module(service, id) : donor.reader.module(service, id),
    version: (service, id) => service === 'gachia-game-nte' ? target.reader.version(service, id) : donor.reader.version(service, id) };
  const result = await rebindSourceCatalog({ input: { source: { path: old.manifestPath, pin: old.manifestPin }, mainSource: { path: main.manifestPath, pin: main.manifestPin } }, root: target.args.root, directory: join(target.root, 'rebind'), reader, request });
  assert.equal(result.sourceOnly, true); assert.equal(result.versions.nte, old.versions.nte); assert.equal(result.versions.main, main.versions.main);
  assert.equal(readPinnedSourceCatalog({ path: old.manifestPath, pin: old.manifestPin }).manifest.game, 'nte');
});

for (const failure of ['target-pin', 'donor-pin', 'same-game', 'unpublished-donor', 'rebound-parent', 'source-profile', 'source-body', 'source-link', 'public-manifest', 'target-uuid', 'main-uuid', 'other-worker', 'settings', 'split', 'partial-publication', 'journal-tamper', 'new-main-O', 'live-O', 'cookie', 'cache', 'noindex', 'guide', 'robots', 'static', 'auth', 'network', 'module', 'archive', 'version', 'binding', 'topology']) test(`rebind rejects ${failure} without a selectable new entry`, async t => {
  const f = await fixture(t);
  const repin = (which, change) => { const ref = f.input[which], value = JSON.parse(readFileSync(ref.path)); change(value); ref.pin = save(ref.path, value); };
  if (failure === 'target-pin') f.input.source.pin = digest('wrong');
  if (failure === 'donor-pin') f.input.mainSource.pin = digest('wrong');
  if (failure === 'same-game') f.input.source = f.input.mainSource;
  if (failure === 'unpublished-donor') { [f.input.source, f.input.mainSource] = [f.input.mainSource, f.input.source]; }
  if (failure === 'rebound-parent') repin('source', m => { m.origin.kind = 'cross_game_main_source'; });
  if (failure === 'source-profile') writeFileSync(f.old.sourcePath, '{}');
  if (failure === 'source-body') writeFileSync(join(f.target.proof.work, `recovery-${f.game}-http/0.body`), 'wrong');
  if (failure === 'source-link') { const bytes = readFileSync(f.old.manifestPath), linked = join(f.target.root, 'linked.json'); writeFileSync(linked, bytes); rmSync(f.old.manifestPath); symlinkSync(linked, f.old.manifestPath); }
  if (failure === 'public-manifest') chmodSync(f.old.manifestPath, 0o644);
  if (failure === 'target-uuid') f.donor.current.services[`gachia-game-${f.game}`].versions[0].version_id = uuid;
  if (failure === 'main-uuid') f.donor.current.services.gachia.versions[0].version_id = uuid;
  if (failure === 'other-worker') f.donor.current.services['gachia-router'].versions[0].version_id = uuid;
  if (failure === 'settings') f.donor.current.routes.push('unexpected');
  if (failure === 'split') f.donor.current.services.gachia.versions[0].percentage = 50;
  if (['partial-publication', 'journal-tamper'].includes(failure)) {
    if (failure === 'partial-publication') f.donor.journal.pop();
    writeFileSync(f.donor.journalPath, failure === 'journal-tamper' ? 'wrong' : f.donor.journal.map(row => JSON.stringify(row) + '\n').join(''));
  }
  if (failure === 'new-main-O') { const profile = JSON.parse(readFileSync(f.main.sourcePath)); writeFileSync(join(profile.owners.main.directory, `assets/data/${f.game}/raw-guides.json`), f.target.original); }
  if (['live-O', 'cookie', 'cache', 'noindex', 'guide', 'robots', 'static', 'auth', 'network'].includes(failure)) f.args.request = async (url, opts) => {
    if (failure === 'network') throw Error('unavailable');
    const response = await f.request(url, opts);
    if (failure === 'live-O' && url.includes(`/data/${f.game}/`)) return new Response(f.target.original, { headers: response.headers });
    if (failure === 'cookie') response.headers.set('set-cookie', 'bad=1');
    if (failure === 'cache') response.headers.set('cache-control', 'private');
    if (failure === 'noindex') response.headers.delete('x-robots-tag');
    if (failure === 'guide' && url.includes('/guides/')) return new Response((await response.text()).replace('Published A', 'Wrong'), { headers: response.headers });
    if (failure === 'robots' && url.includes('/guides/')) return new Response((await response.text()).replace('</head>', '<meta name="robots" content="noindex"/></head>'), { headers: response.headers });
    if (failure === 'static' && url.includes('/_next/static/')) return new Response('wrong', { headers: response.headers });
    if (failure === 'auth' && url.includes('/api/')) return new Response('{}', { headers: response.headers });
    return response;
  };
  if (failure === 'module') f.reader.module = async () => ({ code: Buffer.from('wrong'), moduleSHA256: digest('wrong'), archive: Buffer.from('wrong') });
  if (failure === 'archive') { const original = f.reader.module; f.reader.module = async (...args) => ({ ...await original(...args), archive: Buffer.from('wrong') }); }
  if (failure === 'version') { const original = f.reader.version; f.reader.version = async (...args) => ({ ...await original(...args), id: uuid }); }
  if (failure === 'binding') { const original = f.reader.version; f.reader.version = async (...args) => { const version = structuredClone(await original(...args)); version.resources.bindings.push({ name: 'UNKNOWN', type: 'plain_text', text: 'changed' }); return version; }; }
  if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const x = structuredClone(f.donor.current); if (++n > 3) x.domains.push('drift'); return x; }; }
  await assert.rejects(rebindSourceCatalog(f.args));
  assert.equal(JSON.parse(readFileSync(join(f.args.directory, 'diagnostic.json'))).status, 'failed');
  const pair = `${f.old.versions[f.game]}-${f.main.versions.main}`;
  assert(!existsSync(join(f.args.root, f.game, pair, 'manifest.json')));
});

for (const failure of ['target-parent', 'donor-parent', 'baseline', 'preview-body', 'version-proof', 'live-noindex', 'live-cache']) test(`selection revalidates rebound ${failure}`, async t => {
  const f = await fixture(t), result = await rebindSourceCatalog(f.args), selected = f.selection();
  if (failure === 'target-parent') writeFileSync(f.old.manifestPath, '{}');
  if (failure === 'donor-parent') writeFileSync(f.main.manifestPath, '{}');
  if (failure === 'baseline') writeFileSync(join(f.args.directory, 'baseline/published.body'), f.target.original);
  if (failure === 'preview-body') writeFileSync(join(f.args.directory, `${f.game}-http/0.body`), 'wrong');
  if (failure === 'version-proof') writeFileSync(join(f.args.directory, 'main-version.json'), '{}');
  if (failure.startsWith('live-')) selected.request = async (...args) => { const response = await f.request(...args); if (failure === 'live-noindex') response.headers.delete('x-robots-tag'); else response.headers.set('cache-control', 'private'); return response; };
  await assert.rejects(selectSourceCatalog(selected)); assert(!existsSync(join(selected.directory, 'selection.json')));
  assert.equal(result.sourceOnly, true);
});

test('actual loopback HTTP and saved bodies do not imply a real cloud publication', async t => {
  const f = await fixture(t), rows = [];
  const server = createServer(async (req, res) => { const response = await f.request(decodeURIComponent(req.url.slice(1)), { method: 'GET', credentials: 'omit', redirect: 'error' }); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  f.args.request = async (url, opts) => { rows.push(url); return fetch(`http://127.0.0.1:${server.address().port}/${encodeURIComponent(url)}`, opts); };
  const result = await rebindSourceCatalog(f.args); assert.equal(result.sourceOnly, true); assert(rows.length > 15);
  assert.equal(readPinnedSourceCatalog(f.input.source).manifest.game, f.game);
});
