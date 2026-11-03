import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { captureUploadedModule, readUploadedModuleReceipt, revalidateUploadedModule, revalidateVersionModule } from './desktop-version-provenance.mjs';
import { digest } from './desktop-release-assets.mjs';
import { exactPreviewOrigin } from './desktop-version-preview.mjs';

async function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-module-proof-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const service = 'gachia-game-genshin', versionId = '00000000-0000-0000-0000-000000000001', code = 'sealed candidate code';
  const form = new FormData(); form.set('worker.js', new Blob([code]), 'worker.js');
  const archive = Buffer.from(await new Response(form).arrayBuffer()), uploadPath = join(root, 'outbound.multipart'); writeFileSync(uploadPath, archive);
  const uploadLogPath = join(root, 'upload.log'); writeFileSync(uploadLogPath, `Worker Version ID: ${versionId}\nVersion Preview URL: ${exactPreviewOrigin(service, versionId)}\n`);
  const version = { id: versionId, number: 7, metadata: { has_preview: true }, resources: { script: { etag: 'b'.repeat(64) }, script_runtime: { compatibility_date: '2026-01-01' }, bindings: [] } };
  const context = { role: 'candidate', releaseKey: 'a'.repeat(64), configSHA256: 'c'.repeat(64) };
  const args = { service, versionId, moduleSHA256: digest(code), context, directory: join(root, 'capture'), uploadPath, uploadLogPath,
    readVersion: async () => structuredClone(version), readContent: async () => ({ archive, etag: `"${version.resources.script.etag}"` }) };
  return { root, version, archive, code, args };
}

test('upload captures ETag-bound bytes; later verification never downloads latest/historical content', async t => {
  const f = await fixture(t), proof = await captureUploadedModule(f.args);
  assert.notEqual(f.version.resources.script.etag, digest(f.code), 'Vendor ETag is not single-module SHA');
  const saved = await revalidateUploadedModule({ ...f.args, proof });
  assert.equal(saved.provenanceMode, 'archived_upload_bytes_fresh_version_identity'); assert(saved.archive.equals(f.archive));
  assert(saved.code.equals(Buffer.from(f.code)));
  const selected = await revalidateVersionModule({ proof, ...f.args }); assert.equal(selected.moduleSHA256, digest(f.code));
});

for (const failure of ['ignored-selector', 'missing-etag', 'weak-etag', 'wrong-etag', 'etag-as-module-sha', 'metadata-drift', 'wrong-version', 'extra-module', 'outbound-drift']) test(`upload receipt refuses ${failure}`, async t => {
  const f = await fixture(t), args = f.args;
  if (failure === 'missing-etag') args.readContent = async () => ({ archive: f.archive });
  if (failure === 'weak-etag') args.readContent = async () => ({ archive: f.archive, etag: `W/"${f.version.resources.script.etag}"` });
  if (failure === 'wrong-etag' || failure === 'ignored-selector' || failure === 'etag-as-module-sha') args.readContent = async () => ({ archive: f.archive, etag: failure === 'etag-as-module-sha' ? digest(f.code) : 'd'.repeat(64) });
  if (failure === 'metadata-drift') { let n = 0; args.readVersion = async () => ({ ...structuredClone(f.version), number: ++n }); }
  if (failure === 'wrong-version') args.readVersion = async () => ({ ...f.version, id: '00000000-0000-0000-0000-000000000002' });
  if (failure === 'outbound-drift') writeFileSync(args.uploadPath, 'wrong');
  if (failure === 'extra-module') {
    const form = new FormData(); form.set('worker.js', new Blob([f.code]), 'worker.js'); form.set('other.js', new Blob(['wrong']), 'other.js');
    args.readContent = async () => ({ archive: Buffer.from(await new Response(form).arrayBuffer()), etag: f.version.resources.script.etag });
  }
  await assert.rejects(captureUploadedModule(args));
  assert.throws(() => readUploadedModuleReceipt({ path: join(args.directory, 'receipt.json'), pin: 'a'.repeat(64) }, args));
});

for (const failure of ['archive', 'outbound', 'uploadResponse', 'module', 'before', 'after', 'http', 'receipt-repin', 'role', 'release', 'config', 'owner', 'uuid', 'fresh-metadata', 'missing-proof']) test(`later verification refuses ${failure}`, async t => {
  const f = await fixture(t), proof = await captureUploadedModule(f.args), saved = JSON.parse(readFileSync(proof.path));
  const args = { ...f.args, proof };
  if (['archive', 'outbound', 'uploadResponse', 'module', 'before', 'after', 'http'].includes(failure)) writeFileSync(saved[failure].path, 'tampered');
  if (failure === 'receipt-repin') { saved.moduleSHA256 = 'd'.repeat(64); writeFileSync(proof.path, JSON.stringify(saved)); proof.pin = digest(readFileSync(proof.path)); }
  if (failure === 'role') args.context = { ...args.context, role: 'recovery' };
  if (failure === 'release') args.context = { ...args.context, releaseKey: 'd'.repeat(64) };
  if (failure === 'config') args.context = { ...args.context, configSHA256: 'd'.repeat(64) };
  if (failure === 'owner') args.service = 'gachia';
  if (failure === 'uuid') args.versionId = '00000000-0000-0000-0000-000000000002';
  if (failure === 'fresh-metadata') args.readVersion = async () => ({ ...f.version, resources: { ...f.version.resources, bindings: ['drift'] } });
  if (failure === 'missing-proof') delete args.proof;
  await assert.rejects(revalidateUploadedModule(args));
});

test('unknown external UUID cannot be bootstrapped from local bytes or current metadata', async t => {
  const f = await fixture(t); let calls = 0;
  await assert.rejects(revalidateVersionModule({ ...f.args, readVersion: async () => { calls++; return f.version; } }), /independent source handoff/);
  assert.equal(calls, 0);
});
