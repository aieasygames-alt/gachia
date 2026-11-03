import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fixture } from './fixtures/desktop-recovered-source.mjs';
import * as advancement from './desktop-source-advance.mjs';
import { selectSourceCatalog } from './desktop-source-catalog.mjs';
import { retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';
import { digest } from './desktop-release-assets.mjs';
import { verifyRenewedEvidence } from './desktop-evidence-renewal.mjs';
import { readRecoveredCandidate } from './desktop-recovered-source.mjs';
import { historicalFixture } from './fixtures/desktop-catalog-source.mjs';
import { fixture as candidateFixture } from './fixtures/desktop-published-source.mjs';
import { registerHistoricalSourceCatalog } from './desktop-source-catalog.mjs';
import { rebindSourceCatalog } from './desktop-source-rebind.mjs';
import { prepareEvidence, verifyEvidencePreparation } from './desktop-evidence-preparation.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (path, value) => { const bytes = json(value); writeFileSync(path, bytes, { mode: 0o600 }); return digest(bytes); };
const uuid = '99999999-0000-0000-0000-000000000999';

for (const game of ['genshin', 'nte']) test(`${game}: completed compatible recovery becomes current A sources for the next publication`, async t => {
  const f = await fixture(t, game), writes = f.calls.filter(row => row.method === 'POST').length;
  const result = await advancement.recoverSourceCatalog(f.args);
  assert.equal(result.cloudWrites, false); assert.equal(result.newPublicationAuthorized, false);
  const selected = await selectSourceCatalog({ root: f.args.root, directory: join(f.root, 'select-recovered'), plan: { game: f.game, owners: [f.game, 'main'] }, reader: f.reader, request: f.request });
  assert.equal(selected.sourcePin, result.sourcePin);
  const profile = JSON.parse(readFileSync(result.sourcePath));
  assert.equal(readFileSync(join(profile.owners.main.directory, `assets/data/${f.game}/raw-guides.json`), 'utf8'), f.published);
  assert.notEqual(f.published, f.original); assert.notEqual(f.published, f.content);
  const assets = JSON.parse(readFileSync(result.evidencePath)), next = join(f.root, 'next-main');
  assert.equal(assets.main.source.kind, 'recovered_desktop_candidate');
  mkdirSync(join(next, 'assets/_next/static'), { recursive: true }); writeFileSync(join(next, 'worker.js'), 'next runtime');
  writeFileSync(join(next, 'assets/_next/static/C.js'), 'next static');
  retainWebAssets({ previousStatic: assets.main.previousStatic, artifactDirectory: next, source: assets.main.source });
  assert.equal(verifyRetainedWebAssets(next, result.versions.main).verified, true);
  assert.equal(f.calls.filter(row => row.method === 'POST').length, writes, 'Source handoff must be read-only');
  await assert.rejects(advancement.recoverSourceCatalog({ ...f.args, directory: join(f.root, 'duplicate-source') }), /EEXIST/);
});

test('old completed recovery is historical provenance, not a renewal of live deployment authorization', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() - 3600000 });
  let f; try { f = await fixture(t); } finally { t.mock.timers.reset(); }
  const bytes = readFileSync(join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`));
  await assert.rejects(verifyRenewedEvidence(f.input, 'recover'), /expired/);
  const result = await advancement.recoverSourceCatalog(f.args);
  assert.equal(result.cloudWrites, false); assert.equal(result.newPublicationAuthorized, false);
  assert(bytes.equals(readFileSync(join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`))));
  await assert.rejects(verifyRenewedEvidence(f.input, 'recover'), /expired/);
});

for (const failure of ['partial', 'torn', 'reordered', 'wrong-release', 'wrong-owner', 'wrong-service', 'candidate-uuid', 'raw-old-uuid', 'future-journal', 'journal-pin',
  'promotion-pin', 'renewal-pin', 'renewal-mode', 'renewal-expired', 'renewal-future', 'bundle-pin', 'local-body', 'local-tree', 'sealed-module', 'remote-pin', 'remote-binding', 'repinned-archive', 'public-body', 'public-pin',
  'unknown-uuid', 'split', 'other-worker', 'module', 'archive', 'version', 'current-O', 'current-B', 'cookie', 'cache', 'noindex', 'guide', 'robots', 'static', 'auth', 'network', 'topology']) {
  test(`recovery source rejects ${failure} without registering current sources`, async t => {
    const f = await fixture(t), writes = f.calls.filter(row => row.method === 'POST').length;
    const journalPath = join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`), journal = JSON.parse('[' + readFileSync(journalPath, 'utf8').trim().split('\n').join(',') + ']');
    const repinJournal = () => { const text = journal.map(row => JSON.stringify(row) + '\n').join(''); writeFileSync(journalPath, text); f.input.recoveryJournalPin = digest(text); };
    if (failure === 'partial') { journal.pop(); repinJournal(); }
    if (failure === 'torn') { const raw = readFileSync(journalPath).subarray(0, -1); writeFileSync(journalPath, raw); f.input.recoveryJournalPin = digest(raw); }
    if (failure === 'reordered') { [journal[2], journal[4]] = [journal[4], journal[2]]; repinJournal(); }
    if (failure === 'wrong-release') { journal.at(-1).releaseKey = digest('wrong'); repinJournal(); }
    if (failure === 'wrong-owner') { journal[2].owner = 'nte'; repinJournal(); }
    if (failure === 'wrong-service') { journal[2].service = 'gachia-router'; repinJournal(); }
    if (failure === 'candidate-uuid') { journal[2].versionId = [...f.cloud].find(([key]) => key.startsWith(`gachia-game-${f.game}/00000000`))[1].version.id; repinJournal(); }
    if (failure === 'raw-old-uuid') { journal[2].versionId = f.sealed.owners[f.game].sourceVersionId; repinJournal(); }
    if (failure === 'future-journal') { journal.at(-1).at = new Date(Date.now() + 60000).toISOString(); repinJournal(); }
    if (failure === 'journal-pin') f.input.recoveryJournalPin = digest('wrong');
    if (failure === 'promotion-pin') f.input.promotionJournalPin = digest('wrong');
    if (failure === 'renewal-pin') f.input.renewalPin = digest('wrong');
    if (failure.startsWith('renewal-') && failure !== 'renewal-pin') {
      const path = join(f.renewal.directory, 'renewal.json'), renewal = JSON.parse(readFileSync(path));
      if (failure === 'renewal-mode') renewal.mode = 'promote';
      else renewal.owners['main-recovery'].acceptedAt = failure === 'renewal-expired' ? Date.parse(journal.at(-1).at) - 900001 : Date.now() + 60000;
      f.input.renewalPin = save(path, renewal);
    }
    if (failure === 'bundle-pin') f.input.recoveryBundlePin = digest('wrong');
    if (failure === 'local-body') writeFileSync(join(f.local.directory, f.local.owners.main.observations[0].bodyFile), 'wrong');
    if (failure === 'local-tree') writeFileSync(join(f.local.directory, 'main/.open-next/assets/_next/static/new.js'), 'wrong');
    if (failure === 'sealed-module') writeFileSync(join(f.run, 'recovery-bundles', f.input.recoveryId, 'main/worker.js'), 'wrong');
    if (failure === 'remote-pin') { journal[1].proof.evidenceSHA256 = digest('wrong'); repinJournal(); }
    if (failure === 'remote-binding') {
      const dir = join(f.run, `manual-recovery-evidence-${f.input.renewalId}`), path = join(dir, 'remote-versions.json'), remote = JSON.parse(readFileSync(path));
      const row = remote.observations.find(row => row.owner === 'main' && row.kind === 'candidate'), version = JSON.parse(readFileSync(join(dir, 'main-candidate-version.json')));
      version.resources.bindings.push({ type: 'plain_text', name: 'WRONG', text: 'wrong' }); row.versionSHA256 = save(join(dir, 'main-candidate-version.json'), version);
      journal[1].proof = { ...remote, evidenceSHA256: save(path, remote) }; repinJournal();
    }
    if (failure === 'repinned-archive') {
      const dir = f.renewal.directory, path = join(dir, 'remote-versions.json'), remote = JSON.parse(readFileSync(path)), renewal = JSON.parse(readFileSync(join(dir, 'renewal.json')));
      const form = new FormData(); form.set('worker.js', new Blob(['wrong module']), 'worker.js'); const bytes = Buffer.from(await new Response(form).arrayBuffer());
      writeFileSync(join(dir, 'main-recovery.multipart'), bytes); remote.observations.find(row => row.owner === 'main' && row.kind === 'recovery').multipartSHA256 = digest(bytes);
      renewal.remote = { ...remote, evidenceSHA256: save(path, remote) }; f.input.renewalPin = save(join(dir, 'renewal.json'), renewal);
    }
    if (failure === 'public-body') writeFileSync(join(f.run, `manual-recovery-evidence-${f.input.renewalId}/main-public/0.body`), 'wrong');
    if (failure === 'public-pin') { journal.at(-1).proof.evidenceSHA256 = digest('wrong'); repinJournal(); }
    if (failure === 'unknown-uuid') f.current.services.gachia.versions[0].version_id = uuid;
    if (failure === 'split') f.current.services.gachia.versions[0].percentage = 50;
    if (failure === 'other-worker') f.current.services['gachia-router'].versions[0].version_id = uuid;
    if (failure === 'module') f.reader.module = async () => ({ code: Buffer.from('wrong'), moduleSHA256: digest('wrong'), archive: Buffer.from('wrong') });
    if (failure === 'archive') { const original = f.reader.module; f.reader.module = async (...args) => ({ ...await original(...args), archive: Buffer.from('wrong') }); }
    if (failure === 'version') { const original = f.reader.version; f.reader.version = async (...args) => ({ ...await original(...args), id: uuid }); }
    if (['current-O', 'current-B', 'cookie', 'cache', 'noindex', 'guide', 'robots', 'static', 'auth', 'network'].includes(failure)) f.args.request = async (url, options) => {
      if (failure === 'network') throw Error('unavailable');
      const response = await f.request(url, options);
      if (['current-O', 'current-B'].includes(failure) && url.includes('/data/')) return new Response(failure === 'current-O' ? f.original : f.content, { headers: response.headers });
      if (failure === 'cookie') response.headers.set('set-cookie', 'bad=1');
      if (failure === 'cache') response.headers.set('cache-control', 'private');
      if (failure === 'noindex') response.headers.delete('x-robots-tag');
      if (failure === 'guide' && url.includes('/guides/')) return new Response((await response.text()).replace('Published A', 'Wrong'), { headers: response.headers });
      if (failure === 'robots' && url.includes('/guides/')) return new Response((await response.text()).replace('</head>', '<meta name="robots" content="noindex"/></head>'), { headers: response.headers });
      if (failure === 'static' && url.includes('/_next/static/')) return new Response('wrong', { headers: response.headers });
      if (failure === 'auth' && url.includes('/api/')) return new Response('{}', { headers: response.headers });
      return response;
    };
    if (failure === 'topology') { let n = 0; f.reader.snapshot = async () => { const value = structuredClone(f.current); if (++n > 2) value.routes.push('wrong'); return value; }; }
    await assert.rejects(advancement.recoverSourceCatalog(f.args));
    assert(!existsSync(join(f.args.root, f.game)), 'Failure must not create a selectable entry');
    assert.equal(JSON.parse(readFileSync(join(f.args.directory, 'diagnostic.json'))).status, 'failed');
    assert.equal(f.calls.filter(row => row.method === 'POST').length, writes);
  });
}

for (const file of ['renewal', 'promotion', 'recovery-journal', 'saved-public', 'derived-runtime', 'derived-preview', 'baseline', 'archive-link']) test(`selection revalidates recovered ${file} provenance`, async t => {
  const f = await fixture(t), result = await advancement.recoverSourceCatalog(f.args);
  const path = file === 'renewal' ? join(f.renewal.directory, 'renewal.json') : file === 'promotion' ? f.journalPath : file === 'recovery-journal' ? join(f.run, `manual-recovery-${f.input.renewalId}.jsonl`)
    : file === 'saved-public' ? join(f.run, `manual-recovery-evidence-${f.input.renewalId}/main-public/0.body`) : file === 'derived-runtime' ? join(f.args.directory, 'main/.open-next/worker.js')
      : file === 'derived-preview' ? join(f.args.directory, 'main-http/0.body') : file === 'baseline' ? join(f.args.directory, 'baseline/published.body') : join(f.renewal.directory, 'main-recovery.multipart');
  if (file === 'archive-link') { const bytes = readFileSync(path); writeFileSync(path + '.other', bytes); rmSync(path); symlinkSync(path + '.other', path); }
  else writeFileSync(path, 'tampered');
  await assert.rejects(selectSourceCatalog({ root: f.args.root, directory: join(f.root, 'select-tampered'), plan: { game: f.game, owners: [f.game, 'main'] }, reader: f.reader, request: f.request }));
  assert.equal(result.cloudWrites, false);
});

for (const game of ['genshin', 'nte']) test(`${game}: other game's recovered Main can be rebound without changing target A or UUID`, async t => {
  const other = game === 'genshin' ? 'nte' : 'genshin', donor = await fixture(t, other, { otherContent: '[{"id":"one","title":"A","content":"Original"}]' });
  const target = await historicalFixture(t, game, { snapshot: donor.sealed.snapshot });
  const old = await registerHistoricalSourceCatalog(target.historical), main = await advancement.recoverSourceCatalog(donor.args);
  const request = async (url, options) => {
    if (new URL(url).hostname.includes(`gachia-game-${game}`)) { const response = await target.selection().request(url, options); response.headers.set('x-robots-tag', 'noindex'); return response; }
    if (new URL(url).pathname === `/data/${game}/raw-guides.json`) return new Response(target.published, { headers: { 'content-type': 'application/json' } });
    return donor.request(url, options);
  };
  const reader = { snapshot: donor.reader.snapshot, module: (s, v) => s === `gachia-game-${game}` ? target.reader.module(s, v) : donor.reader.module(s, v),
    version: async (s, v) => s === `gachia-game-${game}` ? { id: v, metadata: { has_preview: true }, resources: { script: { etag: digest('downloaded current cloud runtime') }, bindings: donor.current.bindings[s], script_runtime: donor.current.settings[s] } } : donor.reader.version(s, v) };
  const result = await rebindSourceCatalog({ input: { source: { path: old.manifestPath, pin: old.manifestPin }, mainSource: { path: main.manifestPath, pin: main.manifestPin } }, root: target.input.root, directory: join(target.root, 'rebind-recovery'), reader, request });
  const selected = await selectSourceCatalog({ root: target.input.root, directory: join(target.root, 'select-rebound-recovery'), plan: { game, owners: [game, 'main'] }, reader, request });
  assert.equal(selected.sourcePin, result.sourcePin); assert.equal(selected.versions[game], old.versions[game]); assert.equal(selected.versions.main, main.versions.main);
  writeFileSync(join(donor.run, `manual-recovery-${donor.input.renewalId}.jsonl`), 'tampered donor');
  await assert.rejects(selectSourceCatalog({ root: target.input.root, directory: join(target.root, 'select-tampered-donor'), plan: { game, owners: [game, 'main'] }, reader, request }));
});

for (const game of ['genshin', 'nte']) test(`${game}: recovered sources support next-candidate preparation, not just registration`, async t => {
  const f = await fixture(t, game), source = await advancement.recoverSourceCatalog(f.args);
  const next = await candidateFixture(t, f.game, { builtOnly: true, original: f.original, content: json([{ id: 'one', title: 'C', content: 'Next actual fixture candidate' }]) });
  let config;
  const request = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.hostname !== '127.0.0.1') return f.request(url, options);
    if (parsed.pathname.includes('/_next/static/')) return new Response(readFileSync(join(config.assets.directory, parsed.pathname)), { headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=0' } });
    const service = config.name.endsWith('-main') ? 'gachia' : `gachia-game-${game}`;
    return f.request(url.replace(parsed.origin, `https://22222222-${service}.aieasygames.workers.dev`), options);
  };
  const result = await prepareEvidence({ run: next.run, pin: next.pin, repo: next.repo, root: f.args.root, reader: f.reader, request,
    serve: async (_cwd, path, _home, _log, accept) => { config = JSON.parse(readFileSync(path)); return accept('http://127.0.0.1:12345'); } });
  await verifyEvidencePreparation(result.manifestPath, result.manifestPin);
  assert.equal(result.sources.sourcePin, source.sourcePin); assert.equal(result.productionReady, false);
  assert.equal(readFileSync(join(result.directory, 'published-baseline/published.body'), 'utf8'), f.published);
});

test('actual loopback HTTP persists recovered source responses; real cloud acceptance remains unclaimed', async t => {
  const f = await fixture(t), server = createServer(async (req, res) => {
    const response = await f.request(decodeURIComponent(req.url.slice(1)), { method: 'GET', redirect: 'error', credentials: 'omit' });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const result = await advancement.recoverSourceCatalog({ ...f.args, request: (url, options) => fetch(`http://127.0.0.1:${server.address().port}/${encodeURIComponent(url)}`, options) });
  assert.equal(result.cloudWrites, false); assert.equal(readRecoveredCandidate(f.input).contentSHA256, digest(f.published));
});
