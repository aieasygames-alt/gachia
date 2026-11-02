import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { captureGameAssets, digest, pinnedJson, stableVersion, verifyAssetEvidence } from './desktop-release-assets.mjs';
import { previousAssetFiles } from './retain-web-assets.mjs';

const versionId = '00000000-0000-0000-0000-000000000001';
const deploymentId = '00000000-0000-0000-0000-000000000002';
const observation = { versionId, deploymentId, scriptEtag: 'a'.repeat(64), percentage: 100 };
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-assets-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const historicalPath = join(root, 'historical.json'), body = Buffer.from('old-js-fixture');
  const history = { status: 'stable_direct_origin_verified', origin: 'https://gachia-game-genshin.aieasygames.workers.dev', versionId,
    observations: [{ path: '/_next/static/chunk.js', bytes: body.length, sha256: digest(body) }] };
  writeFileSync(historicalPath, JSON.stringify(history));
  const input = { game: 'genshin', historicalPath, historicalPin: digest(readFileSync(historicalPath)), directory: join(root, 'capture'),
    observe: async () => ({ ...observation }), archive: async () => Buffer.from('bounded archive fixture'),
    request: async (url, options) => { assert.equal(url, history.origin + '/_next/static/chunk.js'); assert.equal(options.redirect, 'error'); return new Response(body); } };
  return { root, input, history, body };
}

test('historical inventory, stable version and actual downloaded bytes bind a receipt', async t => {
  const f = fixture(t), result = await captureGameAssets(f.input);
  assert.equal(result.files, 1); assert.equal(result.bytes, f.body.length);
  assert.equal(result.cloudAssetManifestCompleteness, 'not_asserted');
  const obs = JSON.parse(readFileSync(join(f.input.directory, 'asset-observations.json')));
  assert.equal(obs[0].liveHttpChecked, true); assert.equal(obs[0].status, 200);
});

test('verified historical archive fallback is explicitly NOT fresh HTTP evidence', async t => {
  const f = fixture(t); f.input.previousStatic = join(f.root, 'historical-static'); mkdirSync(f.input.previousStatic);
  writeFileSync(join(f.input.previousStatic, 'chunk.js'), f.body);
  f.input.request = () => assert.fail('No network response may be invented');
  await captureGameAssets(f.input);
  const obs = JSON.parse(readFileSync(join(f.input.directory, 'asset-observations.json')));
  assert.equal(obs[0].liveHttpChecked, false); assert(!Object.hasOwn(obs[0], 'status'));
});

test('encoded route brackets decode exactly once without encoded traversal', async t => {
  const f = fixture(t); f.history.observations[0].path = '/_next/static/%5Blang%5D/page.js';
  writeFileSync(f.input.historicalPath, JSON.stringify(f.history)); f.input.historicalPin = digest(readFileSync(f.input.historicalPath));
  f.input.request = async url => { assert(url.endsWith('/%5Blang%5D/page.js')); return new Response(f.body); };
  await captureGameAssets(f.input);
  const receipt = JSON.parse(readFileSync(join(f.input.directory, 'receipt.json')));
  assert.equal(receipt.files[0].path, '[lang]/page.js');
  f.history.observations[0].path = '/_next/static/%2e%2e/secret.js';
  writeFileSync(f.input.historicalPath, JSON.stringify(f.history)); f.input.historicalPin = digest(readFileSync(f.input.historicalPath));
  f.input.directory = join(f.root, 'unsafe');
  await assert.rejects(captureGameAssets(f.input), /Unsafe decoded/);
});

for (const kind of ['hash', 'status', 'redirect', 'version', 'churn', 'duplicate', 'traversal', 'source-link']) test(`capture rejects ${kind}`, async t => {
  const f = fixture(t);
  if (kind === 'hash') f.input.request = async () => new Response('wrong');
  if (kind === 'status') f.input.request = async () => new Response('no', { status: 404 });
  if (kind === 'redirect') f.input.request = async () => new Response('', { status: 302 });
  if (kind === 'version') f.input.observe = async () => ({ ...observation, versionId: deploymentId });
  if (kind === 'churn') { let count = 0; f.input.observe = async () => ({ ...observation, deploymentId: count++ ? versionId : deploymentId }); }
  if (kind === 'duplicate' || kind === 'traversal') {
    if (kind === 'duplicate') f.history.observations.push(f.history.observations[0]);
    else f.history.observations[0].path = '/_next/static/../secret.js';
    writeFileSync(f.input.historicalPath, JSON.stringify(f.history)); f.input.historicalPin = digest(readFileSync(f.input.historicalPath));
  }
  if (kind === 'source-link') {
    f.input.previousStatic = join(f.root, 'historical-static'); mkdirSync(f.input.previousStatic);
    writeFileSync(join(f.root, 'other.js'), f.body); symlinkSync(join(f.root, 'other.js'), join(f.input.previousStatic, 'chunk.js'));
  }
  await assert.rejects(captureGameAssets(f.input));
});

test('pinned evidence rejects a bad pin or symlink', t => {
  const f = fixture(t);
  assert.throws(() => pinnedJson(f.input.historicalPath, 'b'.repeat(64)), /digest changed/);
  symlinkSync(f.input.historicalPath, join(f.root, 'link.json'));
  assert.throws(() => pinnedJson(join(f.root, 'link.json'), f.input.historicalPin), /Linked evidence/);
});

test('cloud version selection rejects splits and etag mismatch', () => {
  const deployment = { id: deploymentId, versions: [{ version_id: versionId, percentage: 100 }] };
  const version = { id: versionId, resources: { script: { etag: observation.scriptEtag } } };
  assert.deepEqual(stableVersion(deployment, version), observation);
  assert.throws(() => stableVersion({ ...deployment, versions: [...deployment.versions, ...deployment.versions] }, version));
  assert.throws(() => stableVersion(deployment, { ...version, id: deploymentId }));
  assert.throws(() => stableVersion(deployment, { ...version, resources: { script: { etag: '' } } }));
});

test('both owner evidence sets remain bound to actual static bytes', async t => {
  const f = fixture(t), gameAssets = await captureGameAssets(f.input);
  const previousStatic = join(f.root, 'main-static'); mkdirSync(previousStatic); writeFileSync(join(previousStatic, 'main.js'), 'main fixture');
  const evidence = { schemaVersion: 1, game: 'genshin', gameAssets, main: { previousStatic, source: { versionId }, files: previousAssetFiles(previousStatic) } };
  const path = join(f.root, 'evidence.json'); writeFileSync(path, JSON.stringify(evidence)); const pin = digest(readFileSync(path));
  verifyAssetEvidence(path, pin, 'genshin');
  assert.throws(() => verifyAssetEvidence(path, pin, 'nte'));
  writeFileSync(join(previousStatic, 'main.js'), 'tampered');
  assert.throws(() => verifyAssetEvidence(path, pin, 'genshin'), /bytes changed/);
});
