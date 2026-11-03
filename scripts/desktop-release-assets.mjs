import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, assertRunLock, localAssetPath, verifyBuilt, withRunLock } from './desktop-publish.mjs';
import { readPreviousGameAssets, retainPreviousGameAssets } from './retain-game-assets.mjs';
import { previousAssetFiles, retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const save = (path, value) => writeFileSync(path, json(value), { flag: 'wx', mode: 0o600 });

export function pinnedJson(path, pin) {
  assert(SHA.test(pin), 'External evidence SHA-256 required');
  assert.equal(realpathSync(path), resolve(path), 'Linked evidence forbidden');
  const raw = readFileSync(path);
  assert(raw.length <= 16 * 1024 * 1024, 'Evidence budget exceeded');
  assert.equal(digest(raw), pin, 'Evidence digest changed');
  return JSON.parse(raw);
}

export function stableVersion(deployment, version) {
  assert(UUID.test(deployment?.id) && deployment.versions?.length === 1 && deployment.versions[0].percentage === 100, 'Split/missing deployment');
  const versionId = deployment.versions[0].version_id;
  assert(UUID.test(versionId) && version.id === versionId && SHA.test(version.resources?.script?.etag), 'Cloud version mismatch');
  return { versionId, deploymentId: deployment.id, scriptEtag: version.resources.script.etag, percentage: 100 };
}

// Check every historically recorded file. A local archive is an explicit,
// separately labelled fallback, never a claim of fresh HTTP verification.
export async function captureGameAssets({ game, historicalPath, historicalPin, directory, observe, archive, previousStatic, request = fetch }) {
  assert(['genshin', 'nte'].includes(game), 'Unsupported desktop owner');
  const history = pinnedJson(historicalPath, historicalPin);
  const origin = `https://gachia-game-${game}.aieasygames.workers.dev`;
  assert.equal(history.origin, origin);
  assert.equal(history.status, 'stable_direct_origin_verified');
  const before = await observe();
  assert.equal(before.versionId, history.versionId, 'Historical inventory is stale');
  const files = history.observations.filter(row => row.path.startsWith('/_next/static/')).map(row => ({ ...row,
    path: localAssetPath('/inventory', row.path).slice('/inventory'.length),
  }));
  assert(files.length > 0 && files.length <= 2000 && new Set(files.map(row => row.path)).size === files.length, 'Invalid historical inventory');
  mkdirSync(directory, { mode: 0o700 });
  const worker = await archive();
  assert(worker.length > 0 && worker.length <= 16 * 1024 * 1024, 'Worker archive budget');
  writeFileSync(join(directory, 'worker.multipart'), worker, { flag: 'wx', mode: 0o600 });
  const observations = [], entries = []; let total = 0;
  for (const file of files) {
    const path = file.path.slice('/_next/static/'.length);
    assert(/^[A-Za-z0-9_\-[\]./]+\.(?:js|css|woff2?|ttf|otf)$/.test(path) && path.split('/').every(p => p && p !== '.' && p !== '..'), 'Unsafe historical asset path');
    assert(SHA.test(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 8 * 1024 * 1024, 'Invalid historical asset bounds');
    total += file.bytes; assert(total <= 64 * 1024 * 1024, 'Static byte budget exceeded');
    let body, observation;
    if (previousStatic) {
      const source = resolve(previousStatic, path);
      assert.equal(realpathSync(source), source, 'Historical static links forbidden');
      body = readFileSync(source);
      observation = { path: file.path, source: 'local_historical_artifact_verified_against_pinned_network_inventory', liveHttpChecked: false };
    } else {
      const response = await request(origin + '/_next/static/' + path.split('/').map(encodeURIComponent).join('/'), { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, `Previous asset unavailable: ${path}`);
      body = Buffer.from(await response.arrayBuffer());
      observation = { path: file.path, source: 'live_http', status: response.status, headers: Object.fromEntries(response.headers), liveHttpChecked: true };
    }
    assert.equal(body.length, file.bytes, 'Previous asset length mismatch');
    assert.equal(digest(body), file.sha256, 'Previous asset digest mismatch');
    const target = join(directory, 'static', path); mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, body, { flag: 'wx', mode: 0o600 });
    entries.push({ path, bytes: body.length, sha256: digest(body) });
    observations.push({ ...observation, sha256: digest(body) });
  }
  const after = await observe(); assert.deepEqual(after, before, 'Deployment changed during asset capture');
  const service = `gachia-game-${game}`;
  const inventory = json({ service, versionId: before.versionId, logSha256: historicalPin, nextStaticPaths: files.map(f => f.path) });
  writeFileSync(join(directory, 'inventory.json'), inventory, { flag: 'wx', mode: 0o600 });
  save(join(directory, 'asset-observations.json'), observations);
  const receipt = { schemaVersion: 1, game, service, ...before, before, after, capturedAt: new Date().toISOString(),
    sourceCommit: 'not_attested', cloudAssetManifestCompleteness: 'not_asserted',
    workerArchive: { path: 'worker.multipart', bytes: worker.length, sha256: digest(worker) },
    inventory: { path: 'inventory.json', bytes: Buffer.byteLength(inventory), sha256: digest(inventory) }, staticDirectory: 'static', files: entries };
  const receiptPath = join(directory, 'receipt.json'); save(receiptPath, receipt);
  return readPreviousGameAssets(receiptPath, { game, rollbackVersion: before.versionId }).summary;
}

export function verifyAssetEvidence(path, pin, game) {
  const evidence = pinnedJson(path, pin);
  assert.equal(evidence.schemaVersion, 1); assert.equal(evidence.game, game);
  const main = evidence.main;
  assert(UUID.test(main?.source?.versionId), 'Main rollback version required');
  assert.deepEqual(previousAssetFiles(main.previousStatic), main.files, 'Main old asset bytes changed');
  const capture = readPreviousGameAssets(evidence.gameAssets.receiptPath, { game, rollbackVersion: evidence.gameAssets.versionId });
  assert.deepEqual(capture.summary, evidence.gameAssets, 'Game old asset evidence changed');
  return { evidence, capture };
}

export async function retainCandidate(run, pin, evidencePath, evidencePin) {
  return withRunLock(run, lease => retainCandidateWithLock(run, pin, evidencePath, evidencePin, lease));
}

// Only a live capability from withRunLock can compose retention into a longer operation.
export async function retainCandidateWithLock(run, pin, evidencePath, evidencePin, lease) {
  assertRunLock(run, lease);
  const plan = verifyBuilt(run, pin);
  const { evidence, capture } = verifyAssetEvidence(evidencePath, evidencePin, plan.game);
  if (plan.preservedGuides) {
    const preservation = pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin);
    assert.equal(evidence.main.source.versionId, preservation.mainVersionId, 'Main changed since non-target guides were frozen');
  }
  const id = randomBytes(8).toString('hex'), directory = join(run, 'retained', id);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const owners = {};
  for (const owner of plan.owners) {
    const target = join(directory, owner, '.open-next'); mkdirSync(dirname(target), { mode: 0o700 });
    cpSync(join(run, 'artifacts', owner), target, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
    const retention = owner === 'main' ? retainWebAssets({ previousStatic: evidence.main.previousStatic, artifactDirectory: target, source: evidence.main.source })
      : retainPreviousGameAssets({ game: plan.game, app: owner, previousAssets: capture.summary, rollbackVersion: { value: capture.summary.versionId } }, directory);
    if (owner === 'main') verifyRetainedWebAssets(target, evidence.main.source.versionId);
    const inventory = artifactFiles(target); save(join(directory, `${owner}-inventory.json`), inventory);
    owners[owner] = { artifactSHA256: digest(json(inventory)), previousVersion: owner === 'main' ? evidence.main.source.versionId : capture.summary.versionId, retention };
  }
  verifyBuilt(run, pin); verifyAssetEvidence(evidencePath, evidencePin, plan.game);
  const receipt = { schemaVersion: 1, id, planSHA256: pin, releaseKey: plan.releaseKey, evidencePath: resolve(evidencePath), evidencePin, owners,
    status: 'retained_local_only', cloudWrites: false, rawVersionRollbackSafe: false,
    rollbackNote: 'Old runtime also needs candidate chunks; raw UUID rollback is not authorized by forward retention.' };
  save(join(directory, 'receipt.json'), receipt);
  return { directory, id, retentionPin: digest(json(receipt)), ...receipt };
}

export function verifyRetainedCandidate(run, pin, id, retentionPin) {
  assert(/^[a-f0-9]{16}$/.test(id), 'Invalid retained artifact ID');
  const plan = verifyBuilt(run, pin), directory = join(run, 'retained', id);
  const receipt = pinnedJson(join(directory, 'receipt.json'), retentionPin);
  assert.equal(receipt.id, id); assert.equal(receipt.planSHA256, pin); assert.equal(receipt.releaseKey, plan.releaseKey);
  const { evidence, capture } = verifyAssetEvidence(receipt.evidencePath, receipt.evidencePin, plan.game);
  if (plan.preservedGuides) assert.equal(evidence.main.source.versionId,
    pinnedJson(plan.preservedGuides.path, plan.preservedGuides.pin).mainVersionId, 'Main changed since non-target guides were frozen');
  assert.deepEqual(Object.keys(receipt.owners).sort(), [...plan.owners].sort(), 'Missing retained owner');
  for (const owner of plan.owners) {
    const inventory = pinnedJson(join(directory, `${owner}-inventory.json`), receipt.owners[owner].artifactSHA256);
    assert.deepEqual(artifactFiles(join(directory, owner, '.open-next')), inventory, 'Retained artifact changed');
    assert.equal(receipt.owners[owner].previousVersion, owner === 'main' ? evidence.main.source.versionId : capture.summary.versionId);
  }
  return { plan, receipt, directory };
}
