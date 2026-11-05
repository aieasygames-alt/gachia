import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { digest } from './desktop-release-assets.mjs';
import { multipartModule } from './desktop-cloud-transport.mjs';
import { assertModuleVersionIdentity, scriptETag } from './desktop-version-provenance.mjs';
import { boundedBody } from './desktop-version-preview.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';

const SHA = /^[a-f0-9]{64}$/;
const ACCOUNT = 'e6472b6c6172a3ac1e1596ef100543ae';
const json = value => JSON.stringify(value, null, 2) + '\n';
const save = (file, value) => writeFileSync(file, json(value), { flag: 'wx', mode: 0o600 });
const bound = path => ({ path: resolve(path), pin: digest(readFileSync(path)) });

function pinnedBytes(proof) {
  assert(proof && SHA.test(proof.pin), 'External unified identity pin required');
  assert.equal(realpathSync(proof.path), resolve(proof.path), 'Linked identity evidence forbidden');
  const stat = statSync(proof.path); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Identity evidence budget exceeded');
  const raw = readFileSync(proof.path); assert.equal(digest(raw), proof.pin, 'Identity evidence changed'); return raw;
}

export function assertUnifiedVersionIdentity(service, versionId, version) {
  exactUnifiedPreviewOrigin(service, versionId);
  assert.equal(version.id, versionId, 'Requested UUID differs from immutable version');
  assert.equal(version.metadata?.has_preview, true, 'Exact preview must already be enabled');
  assert(SHA.test(version.resources?.script?.etag), 'Missing immutable script ETag');
}

export async function readUnifiedVersion({ service, versionId, token, binary = false, request = fetch }) {
  exactUnifiedPreviewOrigin(service, versionId);
  assert(typeof token === 'string' && token.length > 0, 'Cloudflare credential required');
  assert.equal(typeof binary, 'boolean');
  const suffix = binary ? `/content/v2?version=${versionId}` : `/versions/${versionId}`;
  const response = await request(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${service}${suffix}`,
    { method: 'GET', redirect: 'error', credentials: 'omit', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(binary ? 180000 : 30000) });
  const bytes = await boundedBody(response); assert(response.ok, `Read-only unified version request failed: ${response.status}`);
  if (binary) return { archive: bytes, etag: response.headers.get('etag') };
  const body = JSON.parse(bytes); assert.equal(body.success, true, 'Cloudflare version read rejected');
  assertUnifiedVersionIdentity(service, versionId, body.result); return body.result;
}

function contextValid(context) {
  assert(SHA.test(context.transportPin) && SHA.test(context.configPin), 'Pinned transport/config context required');
  assert(['candidate', 'recovery'].includes(context.role), 'Unknown unified module role');
}

function uploadIdentity(log, service, versionId) {
  assert.deepEqual([...log.matchAll(/Worker Version ID:\s*([a-f0-9-]{36})/g)].map(row => row[1]), [versionId], 'Unknown upload identity; never retry');
  assert(log.includes(`Version Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}`), 'Missing exact unified preview URL');
}

// Capture before the next upload: content/v2 may ignore ?version and return
// the latest upload. Its HTTP ETag must match immutable metadata on both sides.
export async function captureUnifiedUploadedModule({ service, versionId, moduleSHA256, context, directory, uploadPath, uploadLogPath,
  readVersion, readContent, expectedVersion }) {
  contextValid(context); assert(SHA.test(moduleSHA256));
  uploadIdentity(readFileSync(uploadLogPath, 'utf8'), service, versionId);
  const outboundProof = bound(uploadPath), logProof = bound(uploadLogPath);
  const outbound = await multipartModule(pinnedBytes(outboundProof)); assert.equal(outbound.moduleSHA256, moduleSHA256);
  mkdirSync(directory, { mode: 0o700 });
  try {
    const before = await readVersion(service, versionId); assertUnifiedVersionIdentity(service, versionId, before);
    if (expectedVersion) assertModuleVersionIdentity(expectedVersion, before);
    save(join(directory, 'before.json'), before);
    const downloaded = await readContent(service, versionId);
    writeFileSync(join(directory, 'download.multipart'), downloaded.archive, { flag: 'wx', mode: 0o600 });
    save(join(directory, 'http.json'), { etag: downloaded.etag });
    assert.equal(scriptETag(downloaded.etag), before.resources.script.etag, 'Content endpoint returned another version (HTTP ETag)');
    const module = await multipartModule(downloaded.archive);
    assert.equal(module.moduleSHA256, moduleSHA256, 'Downloaded module differs from sealed upload'); assert(module.code.equals(outbound.code));
    const after = await readVersion(service, versionId); assertUnifiedVersionIdentity(service, versionId, after);
    save(join(directory, 'after.json'), after); assertModuleVersionIdentity(before, after);
    writeFileSync(join(directory, 'worker.js'), module.code, { flag: 'wx', mode: 0o600 });
    const receipt = { schemaVersion: 1, kind: 'unified_upload_time_module_receipt', service, versionId, moduleSHA256, context,
      capturedAt: new Date().toISOString(), scriptETag: before.resources.script.etag, outbound: outboundProof, uploadResponse: logProof,
      before: bound(join(directory, 'before.json')), after: bound(join(directory, 'after.json')), http: bound(join(directory, 'http.json')),
      archive: bound(join(directory, 'download.multipart')), module: bound(join(directory, 'worker.js')) };
    pinnedBytes(outboundProof); pinnedBytes(logProof);
    save(join(directory, 'receipt.json'), receipt); return bound(join(directory, 'receipt.json'));
  } catch (error) { save(join(directory, 'failure.json'), { status: 'failed', service, versionId, error: error.message, automaticRetry: false }); throw error; }
}

export async function readUnifiedUploadedModule(proof, { service, versionId, moduleSHA256, context }) {
  const receipt = JSON.parse(pinnedBytes(proof));
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_upload_time_module_receipt');
  assert.equal(receipt.service, service); assert.equal(receipt.versionId, versionId); assert.equal(receipt.moduleSHA256, moduleSHA256);
  contextValid(receipt.context); assert.deepEqual(receipt.context, context);
  assert(Number.isFinite(Date.parse(receipt.capturedAt)) && Date.parse(receipt.capturedAt) <= Date.now(), 'Invalid capture time');
  const before = JSON.parse(pinnedBytes(receipt.before)), after = JSON.parse(pinnedBytes(receipt.after));
  assertUnifiedVersionIdentity(service, versionId, before); assertModuleVersionIdentity(before, after);
  assert.equal(receipt.scriptETag, before.resources.script.etag);
  assert.equal(scriptETag(JSON.parse(pinnedBytes(receipt.http)).etag), receipt.scriptETag);
  uploadIdentity(pinnedBytes(receipt.uploadResponse).toString(), service, versionId);
  const code = pinnedBytes(receipt.module); assert.equal(digest(code), moduleSHA256);
  for (const key of ['outbound', 'archive']) {
    const module = await multipartModule(pinnedBytes(receipt[key]));
    assert.equal(module.moduleSHA256, moduleSHA256); assert(module.code.equals(code));
  }
  return { receipt, version: before, code };
}

export async function revalidateUnifiedUploadedModule({ proof, readVersion, ...expected }) {
  const result = await readUnifiedUploadedModule(proof, expected);
  const version = await readVersion(expected.service, expected.versionId);
  assertUnifiedVersionIdentity(expected.service, expected.versionId, version); assertModuleVersionIdentity(result.version, version);
  return { ...result, version };
}

export async function captureUnifiedSourceModule({ service, versionId, archiveProof, moduleSHA256, transportPin, directory, readVersion, readContent, expectedVersion }) {
  assert(SHA.test(transportPin) && SHA.test(moduleSHA256));
  const original = await multipartModule(pinnedBytes(archiveProof)); assert.equal(original.moduleSHA256, moduleSHA256, 'Archived source module changed');
  mkdirSync(directory, { mode: 0o700 });
  try {
    const before = await readVersion(service, versionId); assertUnifiedVersionIdentity(service, versionId, before);
    if (expectedVersion) assertModuleVersionIdentity(expectedVersion, before);
    save(join(directory, 'before.json'), before);
    const content = await readContent(service, versionId);
    writeFileSync(join(directory, 'download.multipart'), content.archive, { flag: 'wx', mode: 0o600 }); save(join(directory, 'http.json'), { etag: content.etag });
    assert.equal(scriptETag(content.etag), before.resources.script.etag, 'Source content endpoint returned another version (HTTP ETag)');
    const downloaded = await multipartModule(content.archive);
    assert.equal(downloaded.moduleSHA256, moduleSHA256, 'Fresh source module differs from archived recovery input'); assert(downloaded.code.equals(original.code));
    const after = await readVersion(service, versionId); assertUnifiedVersionIdentity(service, versionId, after); save(join(directory, 'after.json'), after);
    assertModuleVersionIdentity(before, after); pinnedBytes(archiveProof);
    const receipt = { schemaVersion: 1, kind: 'unified_fresh_source_module', service, versionId, transportPin, moduleSHA256,
      capturedAt: new Date().toISOString(), sourceArchive: archiveProof, scriptETag: before.resources.script.etag,
      before: bound(join(directory, 'before.json')), after: bound(join(directory, 'after.json')), archive: bound(join(directory, 'download.multipart')), http: bound(join(directory, 'http.json')) };
    save(join(directory, 'receipt.json'), receipt); return bound(join(directory, 'receipt.json'));
  } catch (error) { save(join(directory, 'failure.json'), { status: 'failed', service, versionId, error: error.message, automaticRetry: false }); throw error; }
}

export async function revalidateUnifiedSourceModule({ proof, service, versionId, transportPin, moduleSHA256, readVersion }) {
  const receipt = JSON.parse(pinnedBytes(proof));
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_fresh_source_module');
  assert.equal(receipt.service, service); assert.equal(receipt.versionId, versionId); assert.equal(receipt.transportPin, transportPin); assert.equal(receipt.moduleSHA256, moduleSHA256);
  assert(SHA.test(transportPin) && SHA.test(moduleSHA256));
  const at = Date.parse(receipt.capturedAt); assert(Number.isFinite(at) && at <= Date.now(), 'Invalid source identity capture time');
  const version = JSON.parse(pinnedBytes(receipt.before)); assertUnifiedVersionIdentity(service, versionId, version);
  assertModuleVersionIdentity(version, JSON.parse(pinnedBytes(receipt.after)));
  assert.equal(receipt.scriptETag, version.resources.script.etag); assert.equal(scriptETag(JSON.parse(pinnedBytes(receipt.http)).etag), receipt.scriptETag);
  const source = await multipartModule(pinnedBytes(receipt.sourceArchive)), fresh = await multipartModule(pinnedBytes(receipt.archive));
  assert.equal(source.moduleSHA256, moduleSHA256); assert.equal(fresh.moduleSHA256, moduleSHA256); assert(source.code.equals(fresh.code));
  if (readVersion) {
    const current = await readVersion(service, versionId); assertUnifiedVersionIdentity(service, versionId, current); assertModuleVersionIdentity(version, current);
  }
  return { receipt, version };
}
