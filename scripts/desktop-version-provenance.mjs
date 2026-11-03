import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { multipartModule, normalizedBindings } from './desktop-cloud-transport.mjs';
import { digest, pinnedJson } from './desktop-release-assets.mjs';
import { exactPreviewOrigin } from './desktop-version-preview.mjs';

const sha = /^[a-f0-9]{64}$/;
const json = value => JSON.stringify(value, null, 2) + '\n';
const mode = 'archived_upload_bytes_fresh_version_identity';
function bytes(path, pin) {
  assert(sha.test(pin), 'Externally pinned module evidence required');
  assert.equal(realpathSync(path), resolve(path), 'Linked module evidence forbidden');
  assert(statSync(path).isFile() && statSync(path).size <= 16 * 1024 * 1024, 'Module evidence budget exceeded');
  const data = readFileSync(path); assert.equal(digest(data), pin, 'Module evidence changed'); return data;
}
const bound = path => ({ path: resolve(path), pin: digest(readFileSync(path)) });
const save = (path, value) => writeFileSync(path, json(value), { flag: 'wx', mode: 0o600 });

export function scriptETag(value) {
  assert(typeof value === 'string', 'Missing content HTTP ETag');
  const match = /^(?:"([a-f0-9]{64})"|([a-f0-9]{64}))$/.exec(value);
  assert(match, 'Invalid/weak content HTTP ETag'); return match[1] ?? match[2];
}

function identity(service, versionId, version) {
  exactPreviewOrigin(service, versionId);
  assert.equal(version.id, versionId, 'Version UUID differs from requested identity');
  assert.equal(version.metadata.has_preview, true, 'Exact-version preview required');
  assert(sha.test(version.resources.script.etag), 'Missing immutable script ETag');
}

export function assertModuleVersionIdentity(expected, actual) {
  const canonical = value => ({ ...value, resources: { ...value.resources,
    ...(value.resources.bindings ? { bindings: normalizedBindings(value.resources.bindings) } : {}) } });
  assert.deepEqual(canonical(actual), canonical(expected), 'Immutable version metadata/configuration drift');
}

// Called immediately after a single upload, before any later upload can replace
// the unversioned content endpoint. The returned pin belongs in the journal.
export async function captureUploadedModule({ service, versionId, moduleSHA256, context, directory, uploadPath, uploadLogPath, readVersion, readContent, expectedVersion }) {
  assert(sha.test(moduleSHA256)); assert(sha.test(context.releaseKey) && sha.test(context.configSHA256));
  assert(['candidate', 'recovery'].includes(context.role));
  const uploadLog = readFileSync(uploadLogPath, 'utf8');
  assert.deepEqual([...uploadLog.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)].map(match => match[1]), [versionId], 'Upload response identity changed');
  assert(uploadLog.includes(`Version Preview URL: ${exactPreviewOrigin(service, versionId)}`), 'Upload response lacks exact preview URL');
  mkdirSync(directory, { mode: 0o700 });
  const outbound = readFileSync(uploadPath), form = await multipartModule(outbound);
  assert.equal(form.moduleSHA256, moduleSHA256, 'Outbound module differs from sealed bytes');
  const before = await readVersion(service, versionId); identity(service, versionId, before);
  if (expectedVersion) assertModuleVersionIdentity(expectedVersion, before);
  save(join(directory, 'before.json'), before);
  const content = await readContent(service, versionId);
  writeFileSync(join(directory, 'download.multipart'), content.archive, { flag: 'wx', mode: 0o600 });
  save(join(directory, 'content-http.json'), { etag: content.etag });
  assert.equal(scriptETag(content.etag), before.resources.script.etag, 'Content endpoint returned another version (HTTP ETag)');
  const downloaded = await multipartModule(content.archive);
  assert.equal(downloaded.moduleSHA256, moduleSHA256, 'Downloaded module differs from outbound bytes');
  assert(downloaded.code.equals(form.code));
  const after = await readVersion(service, versionId); identity(service, versionId, after);
  save(join(directory, 'after.json'), after);
  assertModuleVersionIdentity(before, after);
  writeFileSync(join(directory, 'worker.js'), downloaded.code, { flag: 'wx', mode: 0o600 });
  const receipt = { schemaVersion: 1, kind: 'upload_time_module_receipt', service, versionId, context,
    moduleSHA256, scriptETag: before.resources.script.etag, capturedAt: new Date().toISOString(),
    outbound: bound(uploadPath), uploadResponse: bound(uploadLogPath), archive: bound(join(directory, 'download.multipart')), module: bound(join(directory, 'worker.js')),
    before: bound(join(directory, 'before.json')), after: bound(join(directory, 'after.json')), http: bound(join(directory, 'content-http.json')) };
  const path = join(directory, 'receipt.json'); save(path, receipt);
  return bound(path);
}

// The caller supplies a pin from its original accepted journal/source handoff,
// never one recomputed from a discovered cache file.
export function readUploadedModuleReceipt(proof, { service, versionId, moduleSHA256, context } = {}) {
  assert(proof && sha.test(proof.pin), 'Upload-time module receipt required');
  bytes(proof.path, proof.pin);
  const receipt = pinnedJson(proof.path, proof.pin);
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'upload_time_module_receipt');
  identity(receipt.service, receipt.versionId, pinnedJson(receipt.before.path, receipt.before.pin));
  assert.equal(receipt.service, service); assert.equal(receipt.versionId, versionId);
  if (moduleSHA256 !== undefined) assert.equal(receipt.moduleSHA256, moduleSHA256);
  if (context !== undefined) for (const [key, value] of Object.entries(context)) assert.equal(receipt.context[key], value, `Module receipt context differs: ${key}`);
  assert(sha.test(receipt.context.releaseKey) && sha.test(receipt.context.configSHA256));
  assert(['candidate', 'recovery'].includes(receipt.context.role));
  assert(Number.isFinite(Date.parse(receipt.capturedAt)) && Date.parse(receipt.capturedAt) <= Date.now(), 'Invalid module capture time');
  for (const key of ['outbound', 'uploadResponse', 'archive', 'module', 'before', 'after', 'http']) bytes(receipt[key].path, receipt[key].pin);
  const uploadLog = bytes(receipt.uploadResponse.path, receipt.uploadResponse.pin).toString();
  assert.deepEqual([...uploadLog.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)].map(match => match[1]), [versionId]);
  assert(uploadLog.includes(`Version Preview URL: ${exactPreviewOrigin(service, versionId)}`));
  const version = pinnedJson(receipt.before.path, receipt.before.pin);
  assertModuleVersionIdentity(version, pinnedJson(receipt.after.path, receipt.after.pin));
  assert.equal(receipt.scriptETag, version.resources.script.etag);
  assert.equal(scriptETag(pinnedJson(receipt.http.path, receipt.http.pin).etag), receipt.scriptETag);
  const code = bytes(receipt.module.path, receipt.module.pin);
  assert.equal(digest(code), receipt.moduleSHA256);
  return { receipt, version, code, archive: bytes(receipt.archive.path, receipt.archive.pin) };
}

export async function revalidateUploadedModule({ proof, service, versionId, moduleSHA256, context, readVersion }) {
  const saved = readUploadedModuleReceipt(proof, { service, versionId, moduleSHA256, context });
  for (const data of [saved.archive, bytes(saved.receipt.outbound.path, saved.receipt.outbound.pin)]) {
    const module = await multipartModule(data);
    assert.equal(module.moduleSHA256, saved.receipt.moduleSHA256, 'Archived multipart differs from sealed module');
    assert(module.code.equals(saved.code));
  }
  const version = await readVersion(service, versionId); identity(service, versionId, version);
  assertModuleVersionIdentity(saved.version, version);
  return { ...saved, version, moduleSHA256: saved.receipt.moduleSHA256, moduleProof: proof, provenanceMode: mode };
}

// Reviewed, single-Mac bootstrap only. These are original pre-R29 captures, not
// a registry that can learn UUID/ETag mappings from today's latest download.
const home = homedir(), reports = join(home, '.codex/worktrees/payload-unified-maintenance/gachia/reports');
const legacy = {
  'gachia-game-genshin': {
    versionId: 'c0dba6f4-878a-467e-91e9-f32508e59e82', moduleSHA256: '62a8007ea8e25353fc0016767ff6741cd343186522651b70842b829a82f2f0c7',
    version: { path: join(reports, 'payload-cloud-transport-2026-11-01/gachia-game-genshin-active-version.json'), pin: '61d45466cbd5292602a24ecf94f20ba5a12090e2b428c777fafbac59a4661f94' },
    capture: { path: join(home, '.gachia-cms-releases/provenance-20261101/genshin-local-history-decoded/receipt.json'), pin: 'e25c7f726e74ab3952c3f78f325d4aab195dc4b5e4b0a1d2f1671f5fc91616c5' },
  },
  'gachia-game-nte': {
    versionId: 'cb854ebe-544d-40b6-9217-5df329a8a1cb', moduleSHA256: '49c71c73771ede2f16c1fe9ebd3baab21b86f88371a3f34eb863248226d08fc3',
    version: { path: join(reports, 'payload-nte-baseline-2026-11-02/nte-active-version.json'), pin: '727b7381901fc10d36c537ac0e69d60c7187e0a22ec217cad0c2815b374e91d2' },
    capture: { path: join(home, '.gachia-cms-audits/nte-retention-44q23z/previous-nte/receipt.json'), pin: '8a6c8c40927e0fa25991ae64ed61153c9c3448a7d6427afb4647005904a72bee' },
  },
  gachia: {
    versionId: '3efd4103-7156-484b-86d8-a28853a668c8', moduleSHA256: '4448b3ccc07aa87781dacbd6e5e7c585356f994f787d9fbcfbeeed4d07d97cb4',
    version: { path: join(home, '.gachia-cms-audits/nte-retention-44q23z/main-version.json'), pin: '8f385c85626b02fdfaf2141332e5eadd703e12d7f0b381e31e39b41b19e7b482' },
    capture: { path: join(reports, 'payload-nte-cloud-protocol-2026-11-02/assets.json'), pin: 'eb0e928923ae3a856e1c41e50ee5f4ec98d47d88c765aec2b0deaa5cd6ef1cfc' },
  },
};

export async function revalidateVersionModule({ proof, service, versionId, readVersion }) {
  if (proof) return revalidateUploadedModule({ proof, service, versionId, readVersion });
  const original = legacy[service];
  assert(original && original.versionId === versionId, 'Unknown external UUID requires an independent source handoff');
  bytes(original.version.path, original.version.pin); bytes(original.capture.path, original.capture.pin);
  const version = pinnedJson(original.version.path, original.version.pin), capture = pinnedJson(original.capture.path, original.capture.pin);
  identity(service, versionId, version);
  let archivePath, archivePin;
  if (service === 'gachia') {
    assert.equal(capture.status, 'passed'); assert.equal(capture.cloudWrites, false); assert.equal(capture.topologyUnchanged, true);
    assert.equal(capture.main.versionId, versionId);
    archivePath = join(capture.work, 'main-worker.multipart'); archivePin = capture.main.workerArchiveSHA256;
  } else {
    assert.equal(capture.service, service); assert.equal(capture.versionId, versionId); assert.equal(capture.percentage, 100);
    assert.deepEqual(capture.before, capture.after); assert.equal(capture.before.versionId, versionId);
    assert.equal(capture.scriptEtag, version.resources.script.etag); assert.equal(capture.before.scriptEtag, capture.scriptEtag);
    assert.equal(capture.workerArchive.path, 'worker.multipart');
    archivePath = join(original.capture.path, '..', capture.workerArchive.path); archivePin = capture.workerArchive.sha256;
  }
  const archive = bytes(archivePath, archivePin), module = await multipartModule(archive);
  assert.equal(module.moduleSHA256, original.moduleSHA256, 'Reviewed legacy module differs from original capture');
  const fresh = await readVersion(service, versionId); identity(service, versionId, fresh);
  assertModuleVersionIdentity(version, fresh);
  return { ...module, archive, version: fresh, provenanceMode: 'reviewed_legacy_capture_fresh_version_identity' };
}
