import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, linkSync, lstatSync, openSync, closeSync, readSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const MAGIC = Buffer.from('GACHIA-BACKUP-v1\0');
function regular(path) {
  assert.equal(realpathSync(path), resolve(path), 'Linked backup paths forbidden');
  const stat = lstatSync(path); assert(stat.isFile()); return stat;
}
async function hash(path) {
  const sha = createHash('sha256');
  for await (const bytes of createReadStream(path)) sha.update(bytes);
  return sha.digest('hex');
}
function publish(temp, destination) {
  // Atomic no-replace publication; unlike rename, this never overwrites a backup.
  linkSync(temp, destination); unlinkSync(temp);
}
function key(path) {
  const stat = regular(path); assert.equal(stat.mode & 0o077, 0, 'Backup key must be private');
  const value = readFileSync(path); assert.equal(value.length, 32, 'Invalid AES key'); return value;
}

export async function encryptArchive({ source, destination, keyPath }) {
  regular(source); assert.notEqual(resolve(source), resolve(destination));
  assert.notEqual(realpathSync(dirname(keyPath)), realpathSync(dirname(destination)), 'Keep the key outside the backup directory');
  const secret = randomBytes(32), iv = randomBytes(12), temp = `${destination}.partial-${randomBytes(8).toString('hex')}`;
  writeFileSync(keyPath, secret, { flag: 'wx', mode: 0o600 });
  const header = Buffer.concat([MAGIC, iv]);
  const cipher = createCipheriv('aes-256-gcm', secret, iv); cipher.setAAD(header);
  let committed = false;
  try {
    writeFileSync(temp, header, { flag: 'wx', mode: 0o600 });
    await pipeline(createReadStream(source), cipher, createWriteStream(temp, { flags: 'a', mode: 0o600 }));
    writeFileSync(temp, cipher.getAuthTag(), { flag: 'a' });
    publish(temp, destination); committed = true;
    return { schemaVersion: 1, algorithm: 'AES-256-GCM', encryptedSHA256: await hash(destination), plaintextSHA256: await hash(source),
      bytes: lstatSync(destination).size, encrypted: true, offsite: false };
  } finally {
    secret.fill(0);
    if (!committed) { try { unlinkSync(temp); } catch (e) { if (e.code !== 'ENOENT') throw e; } unlinkSync(keyPath); }
  }
}

export async function decryptArchive({ source, destination, keyPath }) {
  const stat = regular(source), headerLength = MAGIC.length + 12;
  assert(stat.size >= headerLength + 16, 'Truncated encrypted backup');
  assert.notEqual(resolve(source), resolve(destination));
  const fd = openSync(source, 'r'), header = Buffer.alloc(headerLength), tag = Buffer.alloc(16);
  try { readSync(fd, header, 0, header.length, 0); readSync(fd, tag, 0, 16, stat.size - 16); } finally { closeSync(fd); }
  assert(header.subarray(0, MAGIC.length).equals(MAGIC), 'Unknown encrypted backup format');
  const secret = key(keyPath), decipher = createDecipheriv('aes-256-gcm', secret, header.subarray(MAGIC.length));
  decipher.setAAD(header); decipher.setAuthTag(tag);
  const temp = `${destination}.partial-${randomBytes(8).toString('hex')}`;
  let committed = false;
  try {
    const ciphertext = stat.size === headerLength + 16 ? Readable.from([])
      : createReadStream(source, { start: headerLength, end: stat.size - 17 });
    await pipeline(ciphertext, decipher,
      createWriteStream(temp, { flags: 'wx', mode: 0o600 }));
    publish(temp, destination); committed = true;
    return { plaintextSHA256: await hash(destination), authenticated: true };
  } finally { secret.fill(0); if (!committed) { try { unlinkSync(temp); } catch (e) { if (e.code !== 'ENOENT') throw e; } } }
}
