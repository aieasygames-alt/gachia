import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { registerHistoricalSourceCatalog, registerSourceCatalog, selectSourceCatalog, preparePublishedCandidate, verifyPreservedGuides } from './desktop-source-catalog.mjs';
import { artifactFiles, verifyPrepared } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { guideDataHashes } from './desktop-cloud-transport.mjs';
import { advanceSourceCatalog } from './desktop-source-advance.mjs';
import { fixture as publishedFixture } from './fixtures/desktop-published-source.mjs';

const json = x => JSON.stringify(x, null, 2) + '\n';
const save = (path, x) => { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, json(x), { mode: 0o600 }); return digest(json(x)); };
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const runtime = Buffer.from('downloaded current cloud runtime');
const html = game => `<html><head><title>A</title><link rel="canonical" href="https://gachia.com/zh/${game}/guides/one"/><meta name="description" content="A"/><script type="application/ld+json">{"name":"A"}</script></head><body><h1>A</h1>Published A</body></html>`;

import { fixture, historicalFixture } from './fixtures/desktop-catalog-source.mjs';

async function preservedFixture(t, game = 'genshin', publishedParent = false) {
  const other = game === 'genshin' ? 'nte' : 'genshin';
  const otherContent = '[{"id":"one","title":"Other published A","content":"Original"}]';
  let f;
  if (publishedParent) {
    const parent = await publishedFixture(t, game, { otherContent });
    await advanceSourceCatalog(parent.args);
    f = { ...parent, input: { root: parent.args.root, request: parent.request } };
  } else {
    f = await fixture(t, game, { otherContent });
    await registerSourceCatalog(f.input);
  }
  const repo = join(f.root, 'next-repo'), candidate = join(f.root, 'next-candidate'); mkdirSync(repo); mkdirSync(candidate);
  for (const g of [game, other]) for (const path of [`packages/data/games/${g}/raw-guides.json`, `apps/web/public/data/${g}/raw-guides.json`]) {
    mkdirSync(dirname(join(repo, path)), { recursive: true }); writeFileSync(join(repo, path), f.original);
  }
  save(join(repo, 'packages/core/route-ownership.json'), { games: { [game]: { pages: ['guides'], details: ['guides'] } } });
  const git = args => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
  git(['init']); git(['add', '.']); git(['-c', 'user.name=CMS test', '-c', 'user.email=fixture@localhost.invalid', 'commit', '-m', 'frozen imports']);
  const bytes = '[{"id":"one","title":"Next B","content":"Original"}]';
  writeFileSync(join(candidate, 'raw-guides.json'), bytes);
  const sourceSHA256 = digest(f.original), candidateSHA256 = digest(bytes);
  const releaseKey = digest(JSON.stringify({ game, source: sourceSHA256, candidate: candidateSHA256, preview: false }));
  save(join(candidate, 'manifest.json'), { game, sourcePath: `packages/data/games/${game}/raw-guides.json`, sourceSHA256, candidateSHA256, releaseKey, preview: false, preparedOn: 'desktop', changed: ['one'] });
  const input = { repo, directory: candidate, runs: join(f.root, 'runs'), root: f.input.root, evidenceDirectory: join(f.root, 'preserved'), reader: f.reader,
    request: async (url, opts) => url === `https://gachia.com/data/${other}/raw-guides.json` ? new Response(otherContent, { headers: { 'content-type': 'application/json' } }) : f.input.request(url, opts) };
  return { ...f, other, otherContent, input };
}

test('a synchronous prepared-source traversal deduplicates parent plans but rereads after await', async t => {
  const f = await preservedFixture(t, 'genshin', true), prepared = await preparePublishedCandidate(f.input);
  const reads = new Map(), artifacts = new Map(), original = fs.readFileSync;
  fs.readFileSync = function (path, ...args) {
    if (String(path).endsWith('/plan.json')) reads.set(String(path), (reads.get(String(path)) ?? 0) + 1);
    if (String(path).includes('/artifacts/') && String(path).endsWith('/new.js')) artifacts.set(String(path), (artifacts.get(String(path)) ?? 0) + 1);
    return original.call(this, path, ...args);
  };
  syncBuiltinESMExports();
  try {
    verifyPrepared(prepared.directory, prepared.planSHA256);
    assert(reads.size >= 2, 'Fixture must traverse a parent plan');
    assert([...reads.values()].every(count => count === 1), JSON.stringify([...reads]));
    assert(artifacts.size > 0); assert([...artifacts.values()].every(count => count === 1), JSON.stringify([...artifacts]));
    const firstPlans = [...reads.keys()].sort();
    await Promise.resolve();
    reads.clear();
    verifyPrepared(prepared.directory, prepared.planSHA256);
    assert.deepEqual([...reads.keys()].sort(), firstPlans);
    assert([...reads.values()].every(count => count === 1));
    const proof = JSON.parse(original(prepared.plan.preservedGuides.path));
    writeFileSync(proof.selection.manifestPath, '{}');
    await Promise.resolve();
    assert.throws(() => verifyPrepared(prepared.directory, prepared.planSHA256));
  } finally {
    fs.readFileSync = original; syncBuiltinESMExports();
  }
});

for (const game of ['genshin', 'nte']) test(`${game} preparation freezes the other game's published A in both Main build inputs and exact HTTP references`, async t => {
  const f = await preservedFixture(t, game), prepared = await preparePublishedCandidate(f.input);
  const plan = verifyPrepared(prepared.directory, prepared.planSHA256), { proof } = verifyPreservedGuides(plan.preservedGuides, plan);
  for (const path of proof.paths) assert.equal(readFileSync(join(prepared.directory, 'source', path), 'utf8'), f.otherContent);
  assert.equal(proof.mainVersionId, f.version('main'));
  assert.notEqual(proof.sha256, plan.sourceSHA256); assert.notEqual(proof.sha256, plan.candidateSHA256);
  assert.deepEqual([...guideDataHashes(plan)], [[`/data/${game}/raw-guides.json`, plan.candidateSHA256], [`/data/${f.other}/raw-guides.json`, digest(f.otherContent)]]);
  writeFileSync(join(prepared.directory, 'source', proof.paths[0]), f.original);
  assert.throws(() => verifyPrepared(prepared.directory, prepared.planSHA256), /Frozen source changed|not preserved/);
});

for (const reason of ['old-O', 'status', 'cookie', 'mime', 'network', 'topology', 'unpublished-field']) test(`cross-game preparation rejects ${reason} before creating a run`, async t => {
  const f = await preservedFixture(t), request = f.input.request;
  f.input.request = async (url, opts) => {
    if (!url.includes(`/data/${f.other}/`)) return request(url, opts);
    if (reason === 'network') throw Error('network unavailable');
    if (reason === 'topology') f.snapshot.routes.push('drift');
    return new Response(reason === 'old-O' ? f.original : f.otherContent, { status: reason === 'status' ? 503 : 200,
      headers: { 'content-type': reason === 'mime' ? 'text/html' : 'application/json', ...(reason === 'cookie' ? { 'set-cookie': 'bad=1' } : {}) } });
  };
  if (reason === 'unpublished-field') {
    const file = join(f.input.repo, `packages/data/games/${f.other}/raw-guides.json`);
    writeFileSync(file, '[{"id":"one","title":"O","content":"Original","image":"unreviewed.png"}]');
    const git = args => execFileSync('git', args, { cwd: f.input.repo, stdio: 'pipe' });
    writeFileSync(join(f.input.repo, `apps/web/public/data/${f.other}/raw-guides.json`), readFileSync(file));
    git(['add', '.']); git(['-c', 'user.name=CMS test', '-c', 'user.email=fixture@localhost.invalid', 'commit', '-m', 'different contract']);
  }
  await assert.rejects(preparePublishedCandidate(f.input)); assert(!existsSync(f.input.runs));
});

for (const reason of ['proof', 'public-body', 'catalog', 'source-tree']) test(`frozen cross-game evidence rejects later ${reason} tampering`, async t => {
  const f = await preservedFixture(t), prepared = await preparePublishedCandidate(f.input);
  const { proof } = verifyPreservedGuides(prepared.plan.preservedGuides, prepared.plan);
  const target = reason === 'proof' ? prepared.plan.preservedGuides.path : reason === 'public-body' ? proof.bodyPath : reason === 'catalog' ? proof.selection.manifestPath
    : join(JSON.parse(readFileSync(proof.selection.sourcePath)).owners.main.directory, `assets/data/${f.other}/raw-guides.json`);
  writeFileSync(target, '{}');
  assert.throws(() => verifyPrepared(prepared.directory, prepared.planSHA256));
});

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
