import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retainWebAssets, verifyRetainedWebAssets, verifyStagedRetainedAssets } from './retain-web-assets.mjs';
import { previousArtifactInput, verifyPreviousArtifact, verifyPreviousDeploymentLog } from './prepare-previous-web-assets.mjs';

const source = { artifactId: '123', archiveSha256: 'a'.repeat(64), versionId: '12345678-1234-1234-1234-123456789abc' };
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'retained-web-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const artifactDirectory = join(root, 'artifact'), previousStatic = join(root, 'previous');
  const target = join(artifactDirectory, 'assets/_next/static');
  mkdirSync(target, { recursive: true }); mkdirSync(previousStatic);
  writeFileSync(join(artifactDirectory, 'worker.js'), 'candidate-worker');
  writeFileSync(join(previousStatic, 'old.js'), 'previous-js');
  writeFileSync(join(target, 'new.js'), 'candidate-js');
  return { artifactDirectory, previousStatic, source, target, root };
}

test('retention adds only previous static files without replacing candidate code or resources', t => {
  const f = fixture(t);
  const result = retainWebAssets(f);
  assert.equal(result.copied, 1);
  assert.equal(readFileSync(join(f.artifactDirectory, 'worker.js'), 'utf8'), 'candidate-worker');
  assert.equal(readFileSync(join(f.target, 'new.js'), 'utf8'), 'candidate-js');
  assert.equal(readFileSync(join(f.target, 'old.js'), 'utf8'), 'previous-js');
  assert.equal(retainWebAssets(f).copied, 0);
  assert.equal(verifyRetainedWebAssets(f.artifactDirectory, source.versionId).files, 1);
  assert(!existsSync(join(f.artifactDirectory, 'assets/retained-web-assets.json')));
});

test('all immutable collisions are rejected before any file is copied', t => {
  const f = fixture(t);
  writeFileSync(join(f.previousStatic, 'new.js'), 'different-js');
  assert.throws(() => retainWebAssets(f), /Immutable asset collision/);
  assert(!existsSync(join(f.target, 'old.js')));
});

test('retention rejects source links, linked ancestors and dangling target links', t => {
  const f = fixture(t);
  symlinkSync('missing', join(f.previousStatic, 'link'));
  assert.throws(() => retainWebAssets(f), /symlinks/);
  rmSync(join(f.previousStatic, 'link'));
  symlinkSync('missing', join(f.target, 'old.js'));
  assert.throws(() => retainWebAssets(f), /Unsafe asset destination/);
  rmSync(join(f.target, 'old.js'));
  symlinkSync(f.root, join(f.root, 'alias'));
  assert.throws(() => retainWebAssets({ ...f, previousStatic: join(f.root, 'alias/previous') }), /symlink ancestor/);
  assert.throws(() => retainWebAssets({ ...f, previousStatic: f.target }), /cannot be the candidate/);
});

test('retention verification detects Worker, file, version, manifest and path tampering', t => {
  const f = fixture(t);
  retainWebAssets(f);
  assert.throws(() => verifyRetainedWebAssets(f.artifactDirectory, '87654321-1234-1234-1234-123456789abc'), /rollback version/);
  writeFileSync(join(f.artifactDirectory, 'worker.js'), 'modified');
  assert.throws(() => verifyRetainedWebAssets(f.artifactDirectory, source.versionId), /Worker changed/);
  writeFileSync(join(f.artifactDirectory, 'worker.js'), 'candidate-worker');
  const manifest = join(f.artifactDirectory, 'retained-web-assets.json');
  const original = JSON.parse(readFileSync(manifest));
  for (const mutate of [r => { r.files[0].path = '../escape'; }, r => { r.files.push(r.files[0]); },
    r => { r.bytes++; }, r => { r.files[0].bytes = -1; }, r => { r.source.archiveSha256 = 'invalid'; }]) {
    const record = structuredClone(original); mutate(record); writeFileSync(manifest, JSON.stringify(record));
    assert.throws(() => verifyRetainedWebAssets(f.artifactDirectory, source.versionId));
  }
  writeFileSync(manifest, JSON.stringify(original));
  writeFileSync(join(f.target, 'old.js'), 'corrupt-js!');
  assert.throws(() => verifyRetainedWebAssets(f.artifactDirectory, source.versionId));
});

test('staging probes are fixed-origin read-only byte checks and bounded to 12 assets', async t => {
  const f = fixture(t);
  for (let i = 0; i < 20; i++) writeFileSync(join(f.previousStatic, `chunk-${i}.js`), 'previous-js');
  retainWebAssets(f);
  let requests = 0;
  const result = await verifyStagedRetainedAssets(f.artifactDirectory, source.versionId, async (url, options) => {
    requests++;
    assert.equal(new URL(url).origin, 'https://gachia-staging.aieasygames.workers.dev');
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    return new Response('previous-js');
  });
  assert.equal(requests, 12); assert.equal(result.totalFiles, 21);
  for (const response of [() => new Response('previous-js', { status: 404 }), () => new Response('different-js')]) {
    await assert.rejects(verifyStagedRetainedAssets(f.artifactDirectory, source.versionId, async () => response()));
  }
});

const metadata = { id: 123, expired: false, digest: `sha256:${source.archiveSha256}`, size_in_bytes: 100,
  name: `web-worker-${'b'.repeat(40)}-2`, workflow_run: { id: 456, repository_id: 1229333607, head_repository_id: 1229333607,
    head_branch: 'main', head_sha: 'b'.repeat(40) } };
test('previous artifact inputs and metadata require trusted immutable provenance', () => {
  assert.deepEqual(previousArtifactInput({ PREVIOUS_WEB_ARTIFACT_ID: '123', PREVIOUS_WEB_ARTIFACT_SHA256: source.archiveSha256, ROLLBACK_VERSION: source.versionId }), source);
  assert.equal(verifyPreviousArtifact(metadata, source), 456);
  for (const env of [{}, { PREVIOUS_WEB_ARTIFACT_ID: '1;echo' }]) assert.throws(() => previousArtifactInput(env));
  for (const mutate of [r => { r.id++; }, r => { r.expired = true; }, r => { r.digest = 'bad'; },
    r => { r.workflow_run.head_branch = 'feature'; }, r => { r.workflow_run.head_repository_id++; },
    r => { delete r.workflow_run.repository_id; delete r.workflow_run.head_repository_id; },
    r => { r.name += '-other'; }, r => { r.workflow_run.head_sha = 'x'; }, r => { r.size_in_bytes = 129 * 1024 * 1024; }]) {
    const record = structuredClone(metadata); mutate(record); assert.throws(() => verifyPreviousArtifact(record, source));
  }
});

test('deployment log must bind the exact artifact to the current version, not just a matching SHA', () => {
  const log = `timestamp artifact-ids: 123\ntimestamp Current Version ID: ${source.versionId}\n`;
  verifyPreviousDeploymentLog(log, source);
  for (const text of ['', log.replace('ids: 123', 'ids: 1234'), log.replace(source.versionId, source.versionId + 'bad'),
    log.replace('Current Version ID:', 'Previous Version ID:')]) assert.throws(() => verifyPreviousDeploymentLog(text, source));
});
