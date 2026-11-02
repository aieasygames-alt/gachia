import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, linkSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const BACKUP_BUCKET = 'gachia-cms-private-backups';
const BASE = `https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/r2/buckets/${BACKUP_BUCKET}`;
const SHA = /^[a-f0-9]{64}$/;
const OBJECT = /^cms\/v1\/\d{8}T\d{6}Z-[a-f0-9]{24}\/[a-f0-9]{64}\.gcm$/;
const MAGIC = Buffer.from('GACHIA-BACKUP-v1\0');
const MAX_BYTES = 256 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function privateFile(path) {
  assert.equal(realpathSync(path), resolve(path), 'Linked backup paths forbidden');
  const stat = lstatSync(path);
  assert(stat.isFile() && (stat.mode & 0o077) === 0, 'Private regular backup required');
  assert(stat.size <= MAX_BYTES, 'Backup exceeds the bounded single-object limit');
}

function newDestination(path) {
  assert.equal(realpathSync(dirname(path)), resolve(dirname(path)), 'Linked backup destination forbidden');
  assert.equal(lstatSync(path, { throwIfNoEntry: false }), undefined, 'Backup destination must be new');
}

export function r2BackupStore({ token, request = fetch }) {
  assert(typeof token === 'string' && token.length > 0, 'Existing Cloudflare login required');
  assert(!(request === fetch && (process.env.CI || process.env.GITHUB_ACTIONS)), 'Live backup transport is local-only');
  const call = (suffix, method = 'GET', body) => request(BASE + suffix, {
    method, redirect: 'error', signal: AbortSignal.timeout(180000),
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/octet-stream',
      'if-none-match': '*', 'content-length': String(body.length) } : {}) },
    ...(body ? { body } : {}),
  });
  const json = async suffix => {
    const response = await call(suffix);
    assert(response.ok, `Backup privacy check failed: ${response.status}`);
    const value = await response.json();
    assert.equal(value.success, true, 'Backup privacy API refused the request');
    return value.result;
  };
  const object = key => { assert(OBJECT.test(key), 'Invalid backup object identity'); return '/objects/' + key; };
  return {
    async privacy() {
      const managed = await json('/domains/managed'), custom = await json('/domains/custom');
      assert.equal(managed.enabled, false, 'Public r2.dev access must remain disabled');
      assert(Array.isArray(custom.domains) && custom.domains.length === 0, 'No custom backup domains allowed');
      return { bucket: BACKUP_BUCKET, managedPublicAccess: false, customDomains: [] };
    },
    async exists(key) {
      const response = await call(object(key));
      await response.body?.cancel();
      if (response.status === 404) return false;
      assert(response.ok, `Backup existence check failed: ${response.status}`);
      return true;
    },
    async put(key, bytes) {
      const response = await call(object(key), 'PUT', bytes);
      assert(response.ok, `Backup upload failed: ${response.status}`);
      await response.body?.cancel();
    },
    async get(key) {
      const response = await call(object(key));
      assert(response.ok, `Backup download failed: ${response.status}`);
      const declared = response.headers.get('content-length');
      assert(declared === null || /^\d+$/.test(declared) && Number(declared) <= MAX_BYTES, 'Remote backup size exceeds limit');
      const chunks = []; let size = 0;
      try {
        for await (const chunk of response.body) {
          size += chunk.length;
          assert(size <= MAX_BYTES, 'Remote backup size exceeds limit');
          chunks.push(chunk);
        }
      } catch { throw Error('Remote backup body unavailable or too large'); }
      return Buffer.concat(chunks);
    },
  };
}

export async function downloadEncryptedBackup({ store, objectKey, pin, destination }) {
  assert(SHA.test(pin) && OBJECT.test(objectKey) && objectKey.endsWith('/' + pin + '.gcm'), 'Exact external backup identity required');
  newDestination(destination);
  const privacy = await store.privacy(), bytes = await store.get(objectKey);
  assert.equal(sha(bytes), pin, 'Downloaded backup digest mismatch');
  assert(bytes.length >= MAGIC.length + 28 && bytes.subarray(0, MAGIC.length).equals(MAGIC), 'Encrypted backup format required');
  await store.privacy();
  // Exclusive publication only after all bytes and the privacy boundary pass.
  const temporary = destination + '.partial-' + randomBytes(8).toString('hex');
  try {
    writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    linkSync(temporary, destination);
  } finally { try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  return { schemaVersion: 1, status: 'downloaded_ciphertext_verified', bucket: BACKUP_BUCKET,
    objectKey, encryptedSHA256: pin, bytes: bytes.length, privacy, destination: resolve(destination) };
}

export async function uploadEncryptedBackup({ store, source, pin, id, journal, downloadPath }) {
  assert(SHA.test(pin) && /^\d{8}T\d{6}Z-[a-f0-9]{24}$/.test(id), 'Exact backup pin and unique identity required');
  assert(source.endsWith('.gcm'), 'Only encrypted .gcm archives may be uploaded');
  privateFile(source);
  newDestination(downloadPath); newDestination(journal);
  const bytes = readFileSync(source);
  assert.equal(sha(bytes), pin, 'Local encrypted backup digest mismatch');
  assert(bytes.length >= MAGIC.length + 28 && bytes.subarray(0, MAGIC.length).equals(MAGIC), 'Encrypted backup format required');
  const objectKey = `cms/v1/${id}/${pin}.gcm`;
  await store.privacy();
  assert.equal(await store.exists(objectKey), false, 'Refusing to replace a remote backup');
  writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
  const record = value => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), objectKey, pin, ...value }) + '\n', { flush: true });
  record({ phase: 'upload_intent', bytes: bytes.length });
  try {
    await store.put(objectKey, bytes);
    record({ phase: 'upload_response_received' });
    const proof = await downloadEncryptedBackup({ store, objectKey, pin, destination: downloadPath });
    record({ phase: 'roundtrip_verified', bytes: proof.bytes });
    return { ...proof, status: 'offsite_ciphertext_roundtrip_verified', offsite: true,
      journal: resolve(journal), independentKeyEscrow: false, crossMachineStartup: false };
  } catch {
    record({ phase: 'stopped_reconcile_read_only', automaticRetry: false });
    throw Error('Backup write may have completed; preserve journal and reconcile with a read-only download, never retry PUT');
  } finally { bytes.fill(0); }
}
