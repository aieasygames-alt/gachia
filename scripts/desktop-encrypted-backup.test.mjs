import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { encryptArchive, decryptArchive } from './desktop-encrypted-backup.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-crypto-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'keys')); const source = join(root, 'archive'), destination = join(root, 'encrypted'), keyPath = join(root, 'keys/key');
  writeFileSync(source, Buffer.alloc(1024 * 1024, 42));
  return { root, source, destination, keyPath };
}
test('encrypted archive authenticates and restores exact bytes without replacing files', async t => {
  const f = fixture(t), sealed = await encryptArchive(f);
  const output = join(f.root, 'restored');
  const result = await decryptArchive({ source: f.destination, destination: output, keyPath: f.keyPath });
  assert.equal(result.plaintextSHA256, sealed.plaintextSHA256); assert(readFileSync(output).equals(readFileSync(f.source)));
  await assert.rejects(decryptArchive({ source: f.destination, destination: output, keyPath: f.keyPath }), /EEXIST/);
  assert(!readdirSync(f.root).some(name => name.includes('partial')));
});
for (const failure of ['ciphertext', 'tag', 'key', 'permissions', 'header', 'truncated']) test(`backup rejects ${failure} without leaving unauthenticated output`, async t => {
  const f = fixture(t); await encryptArchive(f);
  const bytes = readFileSync(f.destination);
  if (failure === 'ciphertext') bytes[40] ^= 1;
  if (failure === 'tag') bytes[bytes.length - 1] ^= 1;
  if (failure === 'header') bytes[0] ^= 1;
  if (failure === 'key') writeFileSync(f.keyPath, Buffer.alloc(32));
  if (failure === 'permissions') chmodSync(f.keyPath, 0o644);
  writeFileSync(f.destination, failure === 'truncated' ? bytes.subarray(0, 20) : bytes);
  const output = join(f.root, 'output');
  await assert.rejects(decryptArchive({ source: f.destination, destination: output, keyPath: f.keyPath }));
  assert(!existsSync(output)); assert(!readdirSync(f.root).some(name => name.includes('partial')));
});
test('key cannot be placed in backup directory', async t => {
  const f = fixture(t); await assert.rejects(encryptArchive({ ...f, keyPath: join(f.root, 'key') }), /outside/);
});
test('empty archive authenticates without an invalid stream range', async t => {
  const f = fixture(t); writeFileSync(f.source, ''); await encryptArchive(f);
  const output = join(f.root, 'empty');
  await decryptArchive({ source: f.destination, destination: output, keyPath: f.keyPath });
  assert.equal(readFileSync(output).length, 0);
});
