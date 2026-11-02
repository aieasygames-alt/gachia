import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { inspectCandidate, prepareCandidate, verifyPrepared, verifyBuilt, artifactFiles, validateGuideOverlay, runOwnerStages, isolatedEnvironment, withRunLock, localAssetPath } from './desktop-publish.mjs';
import { captureGameAssets, retainCandidate, verifyRetainedCandidate } from './desktop-release-assets.mjs';
import { previousAssetFiles } from './retain-web-assets.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
function fixture(t, { game = 'genshin', changed = true, preview = true } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-release-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo'), directory = join(root, 'candidate');
  mkdirSync(repo); mkdirSync(directory);
  const original = [{ id: 'guide-one', title: 'Original', content: 'Text', titleEn: null, image: '/unchanged.webp', unknown: { keep: true } }];
  const source = JSON.stringify(original) + '\n';
  const paths = [`packages/data/games/${game}/raw-guides.json`, `apps/web/public/data/${game}/raw-guides.json`];
  const put = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
  for (const path of paths) put(join(repo, path), source);
  put(join(repo, 'packages/core/route-ownership.json'), JSON.stringify({ games: { [game]: { pages: ['guides'], details: ['guides'] } } }));
  const git = args => execFileSync('git', args, { cwd: repo, stdio: 'pipe' });
  git(['init']); git(['add', '.']); git(['-c', 'user.name=CMS test', '-c', 'user.email=fixture@localhost.invalid', 'commit', '-m', 'disposable fixture']);
  const content = changed ? JSON.stringify([{ ...original[0], title: 'Edited' }]) + '\n' : source;
  const manifest = { game, sourcePath: paths[0], sourceSHA256: sha(source), candidateSHA256: sha(content), preview, preparedOn: 'desktop', changed: changed ? ['guide-one'] : [] };
  manifest.releaseKey = sha(JSON.stringify({ game, source: manifest.sourceSHA256, candidate: manifest.candidateSHA256, preview }));
  put(join(directory, 'raw-guides.json'), content); put(join(directory, 'manifest.json'), JSON.stringify(manifest));
  return { root, repo, directory, manifest, paths, original, source, content };
}

for (const game of ['genshin', 'nte']) test(`${game}: derive Main and game ownership; never trust a single declared owner`, t => {
  const f = fixture(t, { game });
  const plan = inspectCandidate(f);
  assert.deepEqual(plan.owners, [game, 'main']);
  assert.equal(plan.productionReady, false); assert.equal(plan.cloudWrites, false);
  assert.equal(plan.status, 'preview_candidate');
});

test('unchanged import is a no-op and cannot create a build', t => {
  const f = fixture(t, { changed: false });
  assert.equal(inspectCandidate(f).status, 'no_changes');
  assert.throws(() => prepareCandidate({ ...f, runs: join(f.root, 'runs') }), /No content changes/);
});

test('frozen commit excludes dirty and untracked code; only both content files are overlaid', t => {
  const f = fixture(t);
  writeFileSync(join(f.repo, 'unreviewed.js'), 'throw new Error("must not ship")');
  writeFileSync(join(f.repo, f.paths[0]), 'dirty user edit');
  const prepared = prepareCandidate({ ...f, runs: join(f.root, 'runs') });
  const plan = verifyPrepared(prepared.directory, prepared.planSHA256);
  for (const path of f.paths) assert.equal(readFileSync(join(prepared.directory, 'source', path), 'utf8'), f.content);
  assert(!plan.sourceFiles.includes('unreviewed.js'));
  assert.equal(readFileSync(join(f.repo, f.paths[0]), 'utf8'), 'dirty user edit');
});

test('source, plan and unexpected input tampering fail closed', t => {
  const f = fixture(t), prepared = prepareCandidate({ ...f, runs: join(f.root, 'runs') });
  assert.throws(() => verifyPrepared(prepared.directory, '0'.repeat(64)), /Plan changed/);
  const source = join(prepared.directory, 'source', f.paths[0]);
  writeFileSync(source, '[]');
  assert.throws(() => verifyPrepared(prepared.directory, prepared.planSHA256), /Frozen source changed/);
  writeFileSync(source, f.content);
  writeFileSync(join(prepared.directory, 'source', '.env.local'), 'TOKEN=not-real');
  assert.throws(() => verifyPrepared(prepared.directory, prepared.planSHA256), /Unexpected build input/);
});

test('stale baseline, tampered candidate bytes and invented changed IDs are rejected', t => {
  const f = fixture(t);
  writeFileSync(join(f.directory, 'raw-guides.json'), '[]');
  assert.throws(() => inspectCandidate(f), /Candidate digest/);
  writeFileSync(join(f.directory, 'raw-guides.json'), f.content);
  writeFileSync(join(f.directory, 'manifest.json'), JSON.stringify({ ...f.manifest, sourceSHA256: '0'.repeat(64) }));
  assert.throws(() => inspectCandidate(f), /stale/);
  writeFileSync(join(f.directory, 'manifest.json'), JSON.stringify({ ...f.manifest, changed: ['wrong'] }));
  assert.throws(() => inspectCandidate(f), /inventory/);
});

test('links cannot substitute candidate inputs', t => {
  const f = fixture(t);
  rmSync(join(f.directory, 'raw-guides.json'));
  symlinkSync(join(f.repo, f.paths[0]), join(f.directory, 'raw-guides.json'));
  assert.throws(() => inspectCandidate(f), /Symlink/);
});

test('overlay forbids new IDs, order changes, media, hidden fields and non-text edits', () => {
  const original = [{ id: 'one', title: 'One', image: 'keep' }, { id: 'two', title: 'Two', image: 'keep' }];
  for (const edited of [[], [...original].reverse(), [{ ...original[0], id: 'other' }, original[1]],
    [{ ...original[0], image: 'new' }, original[1]], [{ ...original[0], secret: 'x' }, original[1]],
    [{ ...original[0], title: null }, original[1]], [{ ...original[0], content: {} }, original[1]]]) {
    assert.throws(() => validateGuideOverlay(JSON.stringify(original), JSON.stringify(edited)));
  }
  assert.deepEqual(validateGuideOverlay(JSON.stringify(original), JSON.stringify([{ ...original[0], titleEn: 'New translation' }, original[1]])).changed, ['one']);
});

test('partial owner failure stops the batch and retains exact completed/failed states', async () => {
  const calls = [], states = [];
  await assert.rejects(runOwnerStages(['genshin', 'main', 'nte'], async owner => {
    calls.push(owner); if (owner === 'main') throw Error('synthetic build failure'); return { hash: 'test' };
  }, async (owner, status) => states.push([owner, status])), /synthetic/);
  assert.deepEqual(calls, ['genshin', 'main']);
  assert.deepEqual(states, [['genshin', 'running'], ['genshin', 'built'], ['main', 'running'], ['main', 'failed']]);
});

test('build environment does not forward credentials, CMS settings or arbitrary Node options', () => {
  const env = isolatedEnvironment('/isolated/home');
  for (const name of ['CLOUDFLARE_API_TOKEN', 'DATABASE_URL', 'PAYLOAD_SECRET', 'NODE_OPTIONS', 'GITHUB_TOKEN', 'NPM_TOKEN']) assert(!Object.hasOwn(env, name));
  assert.equal(env.HOME, '/isolated/home');
});

test('a run cannot build or preview concurrently; failure releases only its own lock', async t => {
  const f = fixture(t);
  await assert.rejects(withRunLock(f.root, async () => {
    await assert.rejects(withRunLock(f.root, async () => assert.fail('second operation executed')), { code: 'EEXIST' });
    throw Error('first operation failure');
  }), /first operation failure/);
  assert.equal(await withRunLock(f.root, async () => 'available'), 'available');
});

test('rendered asset URL decoding supports bracket routes but never traversal or separators', () => {
  assert.equal(localAssetPath('/assets', '/_next/static/%5Blang%5D/page.js'), '/assets/_next/static/[lang]/page.js');
  for (const path of ['/../secret', '/%2e%2e/secret', '/a%2fb', '/a%5cb', '//example.invalid/file', '/%00', '/bad%']) {
    assert.throws(() => localAssetPath('/assets', path));
  }
});

test('preview rejects a partial batch, modified artifacts and mismatched release identities', t => {
  const f = fixture(t), prepared = prepareCandidate({ ...f, runs: join(f.root, 'runs') });
  const state = { status: 'built_local_only', owners: {} };
  for (const owner of prepared.plan.owners) {
    const root = join(prepared.directory, 'artifacts', owner);
    for (const relative of ['worker.js', '.build/open-next.config.edge.mjs', 'assets/BUILD_ID']) {
      const target = join(root, relative); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, 'integrity-test-fixture');
    }
    const text = JSON.stringify(artifactFiles(root), null, 2) + '\n';
    writeFileSync(join(prepared.directory, `${owner}-artifact.json`), text);
    state.owners[owner] = { status: 'built', artifactSHA256: sha(text), releaseKey: prepared.plan.releaseKey };
  }
  const save = () => writeFileSync(join(prepared.directory, 'state.json'), JSON.stringify(state));
  save(); assert.equal(verifyBuilt(prepared.directory, prepared.planSHA256).releaseKey, prepared.plan.releaseKey);
  state.owners.main.status = 'failed'; save();
  assert.throws(() => verifyBuilt(prepared.directory, prepared.planSHA256), /Missing owner/);
  state.owners.main.status = 'built'; state.owners.main.releaseKey = 'wrong'; save();
  assert.throws(() => verifyBuilt(prepared.directory, prepared.planSHA256), /identity/);
  state.owners.main.releaseKey = prepared.plan.releaseKey; save();
  writeFileSync(join(prepared.directory, 'artifacts/main/worker.js'), 'changed fixture');
  assert.throws(() => verifyBuilt(prepared.directory, prepared.planSHA256), /Artifact tree changed/);
});

test('public mutation commands and CI fail before any build or cloud request', () => {
  const cli = resolve(import.meta.dirname, 'desktop-publish.mjs');
  for (const action of ['upload', 'promote', 'deploy', 'rollback']) {
    const result = spawnSync(process.execPath, [cli, action], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /production promotion remains blocked/);
  }
  const result = spawnSync(process.execPath, [cli, 'inspect', '--repo', '/unused', '--release-key', 'a'.repeat(64)], { env: { ...process.env, CI: 'true' }, encoding: 'utf8' });
  assert.equal(result.status, 1); assert.match(result.stderr, /Only the installed Mac/);
});

for (const collision of [false, true]) test(`retained artifact fork: ${collision ? 'collision refuses overwrite' : 'external pins bind both owners without mutating original artifacts'}`, async t => {
  const f = fixture(t), prepared = prepareCandidate({ ...f, runs: join(f.root, 'runs') });
  const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); };
  const state = { status: 'built_local_only', owners: {} };
  for (const owner of prepared.plan.owners) {
    const root = join(prepared.directory, 'artifacts', owner);
    for (const path of ['worker.js', '.build/open-next.config.edge.mjs', 'assets/BUILD_ID', 'assets/_next/static/current.js']) put(join(root, path), 'current-fixture');
    if (collision && owner === 'main') put(join(root, 'assets/_next/static/old.js'), 'collision');
    const inventory = JSON.stringify(artifactFiles(root), null, 2) + '\n';
    writeFileSync(join(prepared.directory, `${owner}-artifact.json`), inventory);
    state.owners[owner] = { status: 'built', releaseKey: prepared.plan.releaseKey, artifactSHA256: sha(inventory) };
  }
  writeFileSync(join(prepared.directory, 'state.json'), JSON.stringify(state));
  const versionId = '00000000-0000-0000-0000-000000000001', previousStatic = join(f.root, 'old-main');
  put(join(previousStatic, 'old.js'), 'old-main-fixture');
  const history = { status: 'stable_direct_origin_verified', versionId, origin: 'https://gachia-game-genshin.aieasygames.workers.dev',
    observations: [{ path: '/_next/static/old.js', bytes: 8, sha256: sha('old-game') }] };
  const historicalPath = join(f.root, 'history.json'); put(historicalPath, JSON.stringify(history));
  const gameAssets = await captureGameAssets({ game: 'genshin', historicalPath, historicalPin: sha(readFileSync(historicalPath)), directory: join(f.root, 'old-game'),
    observe: async () => ({ versionId, deploymentId: '00000000-0000-0000-0000-000000000002', scriptEtag: 'a'.repeat(64), percentage: 100 }),
    archive: async () => Buffer.from('archive-fixture'), request: async () => new Response('old-game') });
  const evidence = { schemaVersion: 1, game: 'genshin', gameAssets, main: { previousStatic, source: { versionId, artifactId: '123', archiveSha256: 'a'.repeat(64) }, files: previousAssetFiles(previousStatic) } };
  const evidencePath = join(f.root, 'evidence.json'); put(evidencePath, JSON.stringify(evidence)); const evidencePin = sha(readFileSync(evidencePath));
  const original = artifactFiles(join(prepared.directory, 'artifacts/main'));
  if (collision) await assert.rejects(retainCandidate(prepared.directory, prepared.planSHA256, evidencePath, evidencePin), /collision/);
  else {
    const result = await retainCandidate(prepared.directory, prepared.planSHA256, evidencePath, evidencePin);
    verifyRetainedCandidate(prepared.directory, prepared.planSHA256, result.id, result.retentionPin);
    assert.equal(result.rawVersionRollbackSafe, false);
    assert.throws(() => verifyRetainedCandidate(prepared.directory, prepared.planSHA256, result.id, '0'.repeat(64)), /digest changed/);
    put(join(result.directory, 'genshin/.open-next/assets/_games/genshin/_next/static/old.js'), 'tampered');
    assert.throws(() => verifyRetainedCandidate(prepared.directory, prepared.planSHA256, result.id, result.retentionPin), /artifact changed/);
  }
  assert.deepEqual(artifactFiles(join(prepared.directory, 'artifacts/main')), original);
  verifyBuilt(prepared.directory, prepared.planSHA256);
});
