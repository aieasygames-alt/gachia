import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { BACKUP_BUCKET, downloadEncryptedBackup, r2BackupStore, uploadEncryptedBackup } from './desktop-offsite-backup.mjs';

function fixture(t, failure) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-offsite-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bytes = Buffer.concat([Buffer.from('GACHIA-BACKUP-v1\0'), Buffer.alloc(100, 42)]);
  const pin = createHash('sha256').update(bytes).digest('hex');
  const id = '20261102T050000Z-' + 'a'.repeat(24), source = join(root, 'backup.gcm');
  writeFileSync(source, bytes, { mode: 0o600 });
  const requests = []; let remote, privacyCalls = 0;
  const request = async (url, options) => {
    requests.push({ url, method: options.method });
    assert(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/r2/buckets/${BACKUP_BUCKET}/`));
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.authorization, 'Bearer test-only');
    if (url.endsWith('/domains/managed')) {
      privacyCalls++;
      if (failure === 'privacy-api') return Response.json({ success: false }, { status: 403 });
      return Response.json({ success: true, result: { enabled: failure === 'public' || failure === 'became-public' && privacyCalls > 1 } });
    }
    if (url.endsWith('/domains/custom')) return Response.json({ success: true, result: { domains: failure === 'domain' ? [{ domain: 'backup.invalid' }] : [] } });
    if (options.method === 'PUT') {
      assert.equal(options.headers['if-none-match'], '*');
      assert(Buffer.from(options.body).equals(bytes));
      remote = Buffer.from(options.body);
      if (failure === 'lost-response') throw Error('Lost response');
      if (failure === 'upload') return new Response(null, { status: 500 });
      return new Response(null);
    }
    if (!remote) return new Response(null, { status: failure === 'exists' ? 200 : failure === 'existence-api' ? 403 : 404 });
    if (failure === 'download') return new Response(null, { status: 503 });
    if (failure === 'wrong-bytes') return new Response('changed');
    return new Response(remote);
  };
  const store = r2BackupStore({ token: 'test-only', request });
  return { root, bytes, pin, id, source, store, requests, journal: join(root, 'upload.jsonl'), downloadPath: join(root, 'download.gcm') };
}

test('private R2 ciphertext roundtrip is pinned, exclusive and separate from key custody', async t => {
  const f = fixture(t), result = await uploadEncryptedBackup(f);
  assert.equal(result.offsite, true); assert.equal(result.independentKeyEscrow, false);
  assert.equal(result.crossMachineStartup, false); assert.equal(result.bucket, BACKUP_BUCKET);
  assert(readFileSync(f.downloadPath).equals(f.bytes));
  assert.equal(f.requests.filter(r => r.method === 'PUT').length, 1);
  assert.deepEqual(readFileSync(f.journal, 'utf8').trim().split('\n').map(row => JSON.parse(row).phase),
    ['upload_intent', 'upload_response_received', 'roundtrip_verified']);
  assert.equal(readFileSync(f.journal, 'utf8').includes('test-only'), false);
});
for (const failure of ['public', 'domain', 'privacy-api', 'exists', 'existence-api']) test(`offsite ${failure} refuses before any write`, async t => {
  const f = fixture(t, failure);
  await assert.rejects(uploadEncryptedBackup(f));
  assert(!f.requests.some(r => r.method === 'PUT')); assert(!existsSync(f.journal));
});
for (const failure of ['upload', 'lost-response', 'download', 'wrong-bytes', 'became-public']) test(`offsite ${failure} preserves intent and never retries`, async t => {
  const f = fixture(t, failure);
  await assert.rejects(uploadEncryptedBackup(f), /reconcile/);
  assert.equal(f.requests.filter(r => r.method === 'PUT').length, 1);
  assert(!existsSync(f.downloadPath));
  assert.match(readFileSync(f.journal, 'utf8'), /stopped_reconcile_read_only/);
  await assert.rejects(uploadEncryptedBackup(f));
  assert.equal(f.requests.filter(r => r.method === 'PUT').length, 1);
});
for (const failure of ['pin', 'plaintext', 'permissions', 'link', 'id']) test(`local ${failure} is rejected without network requests`, async t => {
  const f = fixture(t);
  if (failure === 'pin') f.pin = 'b'.repeat(64);
  if (failure === 'plaintext') { writeFileSync(f.source, 'private plaintext'); f.pin = createHash('sha256').update('private plaintext').digest('hex'); }
  if (failure === 'permissions') chmodSync(f.source, 0o644);
  if (failure === 'link') { symlinkSync(f.source, join(f.root, 'link.gcm')); f.source = join(f.root, 'link.gcm'); }
  if (failure === 'id') f.id = '../unsafe';
  await assert.rejects(uploadEncryptedBackup(f)); assert.equal(f.requests.length, 0);
});
test('existing local journal refuses another upload even when remote object is absent', async t => {
  const f = fixture(t); writeFileSync(f.journal, 'prior intent');
  await assert.rejects(uploadEncryptedBackup(f), /must be new/);
  assert(!f.requests.some(r => r.method === 'PUT'));
  assert.equal(readFileSync(f.journal, 'utf8'), 'prior intent');
});
test('existing download destination is refused before any remote mutation', async t => {
  const f = fixture(t); writeFileSync(f.downloadPath, 'keep');
  await assert.rejects(uploadEncryptedBackup(f), /must be new/);
  assert.equal(f.requests.length, 0); assert(!existsSync(f.journal));
  assert.equal(readFileSync(f.downloadPath, 'utf8'), 'keep');
});
test('read-only download rejects arbitrary paths and inconsistent external identity', async t => {
  const f = fixture(t);
  for (const objectKey of ['../key', `cms/v1/${f.id}/${'b'.repeat(64)}.gcm`]) {
    await assert.rejects(downloadEncryptedBackup({ ...f, objectKey, destination: f.downloadPath }));
  }
  assert.equal(f.requests.length, 0);
});
