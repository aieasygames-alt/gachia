import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';
import { captureUnifiedSourceModule, captureUnifiedUploadedModule, readUnifiedUploadedModule, readUnifiedVersion,
  revalidateUnifiedSourceModule, revalidateUnifiedUploadedModule } from './unified-version-identity.mjs';

async function fixture(t, service = 'gachia-game-lvmeng') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'unified-identity-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const versionId = '1234abcd-0000-4000-8000-000000000001', code = 'sealed worker', form = new FormData();
  form.set('worker.js', new Blob([code]), 'worker.js'); const archive = Buffer.from(await new Response(form).arrayBuffer());
  const uploadPath = join(root, 'upload.multipart'), uploadLogPath = join(root, 'upload.log'); writeFileSync(uploadPath, archive);
  writeFileSync(uploadLogPath, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactUnifiedPreviewOrigin(service, versionId)}\n`);
  const version = { id: versionId, metadata: { has_preview: true }, resources: { script: { etag: 'e'.repeat(64) }, bindings: [] } };
  const args = { service, versionId, moduleSHA256: digest(code), context: { role: 'candidate', transportPin: 'a'.repeat(64), configPin: 'b'.repeat(64) },
    directory: join(root, 'capture'), uploadPath, uploadLogPath, readVersion: async () => structuredClone(version), readContent: async () => ({ archive, etag: `"${version.resources.script.etag}"` }) };
  return { root, args, archive, version };
}

for (const service of ['gachia', 'gachia-game-azur-promilia', 'gachia-game-genshin', 'gachia-game-lvmeng', 'gachia-game-nte']) test(`immutable capture and read-only revalidation: ${service}`, async t => {
  const f = await fixture(t, service), proof = await captureUnifiedUploadedModule(f.args);
  const result = await revalidateUnifiedUploadedModule({ ...f.args, proof }); assert.equal(digest(result.code), f.args.moduleSHA256);
  assert.notEqual(f.args.moduleSHA256, f.version.resources.script.etag);
  let reads = 0;
  await readUnifiedVersion({ ...f.args, token: 'fixture-token', request: async (url, options) => {
    reads++; assert(url.endsWith(`/versions/${f.args.versionId}`)); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
    return Response.json({ success: true, result: f.version });
  } }); assert.equal(reads, 1);
});

for (const failure of ['ignored-selector', 'weak-etag', 'wrong-code', 'wrong-uuid', 'disabled-preview', 'metadata-drift', 'extra-module', 'wrong-log', 'wrong-context']) test(`capture fails closed: ${failure}`, async t => {
  const f = await fixture(t), args = f.args;
  if (failure === 'ignored-selector') args.readContent = async () => ({ archive: f.archive, etag: 'c'.repeat(64) });
  if (failure === 'weak-etag') args.readContent = async () => ({ archive: f.archive, etag: `W/"${f.version.resources.script.etag}"` });
  if (failure === 'wrong-code') args.moduleSHA256 = 'f'.repeat(64);
  if (failure === 'wrong-uuid') args.readVersion = async () => ({ ...f.version, id: '1234abcd-0000-4000-8000-000000000002' });
  if (failure === 'disabled-preview') args.readVersion = async () => ({ ...f.version, metadata: { has_preview: false } });
  if (failure === 'metadata-drift') { let n = 0; args.readVersion = async () => ({ ...f.version, number: ++n }); }
  if (failure === 'extra-module') { const form = new FormData(); form.set('worker.js', new Blob(['sealed worker']), 'worker.js'); form.set('other.js', new Blob(['other']), 'other.js'); args.readContent = async () => ({ archive: Buffer.from(await new Response(form).arrayBuffer()), etag: f.version.resources.script.etag }); }
  if (failure === 'wrong-log') writeFileSync(args.uploadLogPath, 'Unknown upload result');
  if (failure === 'wrong-context') args.context.role = 'fixture';
  await assert.rejects(captureUnifiedUploadedModule(args));
});

for (const field of ['archive', 'outbound', 'uploadResponse', 'module', 'before', 'after', 'http']) test(`independent verifier re-opens ${field}`, async t => {
  const f = await fixture(t), proof = await captureUnifiedUploadedModule(f.args), receipt = JSON.parse(readFileSync(proof.path));
  writeFileSync(receipt[field].path, 'tampered'); await assert.rejects(readUnifiedUploadedModule(proof, f.args));
});

test('fresh metadata and external context cannot be substituted', async t => {
  const f = await fixture(t), proof = await captureUnifiedUploadedModule(f.args);
  await assert.rejects(revalidateUnifiedUploadedModule({ ...f.args, proof, readVersion: async () => ({ ...f.version, number: 2 }) }), /drift/);
  await assert.rejects(readUnifiedUploadedModule(proof, { ...f.args, context: { ...f.args.context, role: 'recovery' } }));
  await assert.rejects(captureUnifiedUploadedModule(f.args), /EEXIST/);
});

test('read-only identity fails once without writes or widening protected services', async t => {
  const f = await fixture(t); let calls = 0;
  const request = async () => { calls++; return new Response('unauthorized', { status: 401 }); };
  await assert.rejects(readUnifiedVersion({ ...f.args, token: 'fixture-token', request }), /401/); assert.equal(calls, 1);
  await assert.rejects(readUnifiedVersion({ ...f.args, service: 'gachia-router', token: 'fixture-token', request }), /Unreviewed/); assert.equal(calls, 1);
});

test('fresh active-source capture binds archived bytes with ETag and immutable metadata, without inventing an upload receipt', async t => {
  const f = await fixture(t), args = { ...f.args, archiveProof: { path: f.args.uploadPath, pin: digest(f.archive) }, transportPin: 'a'.repeat(64) };
  const proof = await captureUnifiedSourceModule(args), result = await revalidateUnifiedSourceModule({ ...args, proof });
  assert.equal(result.receipt.kind, 'unified_fresh_source_module'); assert.equal(result.receipt.moduleSHA256, args.moduleSHA256);
  await assert.rejects(readUnifiedUploadedModule(proof, f.args), /kind|Expected/);
  await assert.rejects(revalidateUnifiedSourceModule({ ...args, proof, readVersion: async () => ({ ...f.version, number: 2 }) }), /drift/);
});

for (const failure of ['ignored-selector', 'wrong-module', 'metadata-drift', 'archive-drift']) test(`active-source capture rejects ${failure}`, async t => {
  const f = await fixture(t), args = { ...f.args, archiveProof: { path: f.args.uploadPath, pin: digest(f.archive) }, transportPin: 'a'.repeat(64) };
  if (failure === 'ignored-selector') args.readContent = async () => ({ archive: f.archive, etag: 'b'.repeat(64) });
  if (failure === 'wrong-module') args.moduleSHA256 = 'b'.repeat(64);
  if (failure === 'metadata-drift') { let n = 0; args.readVersion = async () => ({ ...f.version, number: ++n }); }
  if (failure === 'archive-drift') writeFileSync(args.archiveProof.path, 'tampered');
  await assert.rejects(captureUnifiedSourceModule(args));
});

for (const field of ['sourceArchive', 'archive', 'http', 'before', 'after']) test(`active-source revalidation re-opens ${field}`, async t => {
  const f = await fixture(t), args = { ...f.args, archiveProof: { path: f.args.uploadPath, pin: digest(f.archive) }, transportPin: 'a'.repeat(64) };
  const proof = await captureUnifiedSourceModule(args), receipt = JSON.parse(readFileSync(proof.path));
  writeFileSync(receipt[field].path, 'tampered'); await assert.rejects(revalidateUnifiedSourceModule({ ...args, proof }));
});
