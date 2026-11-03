import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { advanceSourceCatalog, readPublishedCandidate } from './desktop-source-advance.mjs';
import { selectSourceCatalog } from './desktop-source-catalog.mjs';
import { digest } from './desktop-release-assets.mjs';
import { retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, bytes, { mode: 0o600 }); return digest(bytes); };
const save = (path, value) => put(path, json(value));
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

import { fixture } from './fixtures/desktop-published-source.mjs';

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
