import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createBodyContentPool, createLocalBodyByteCache } from './local-body-byte-cache.mjs';
import { createArtifactVerificationSession } from './artifact-verification-session.mjs';
import { recheckNteReferences, saveNteReferenceProof } from './nte-release-http.mjs';

function fixture(t) {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'gachia-body-cache-test-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, '0.body');
  writeFileSync(file, 'original');
  return { directory, file };
}

test('unchanged original bytes are read once and returned in independent buffers', t => {
  const { file } = fixture(t), cache = createLocalBodyByteCache();
  const first = cache.read(file); first.fill(0);
  assert.equal(cache.read(file).toString(), 'original');
  assert.equal(cache.statistics().reads, 1);
  assert.equal(cache.statistics().hits, 1);
  assert.equal(readFileSync(file, 'utf8'), 'original');
});

test('same-size mutation with restored mtime cannot return cached bytes', t => {
  const { file } = fixture(t), cache = createLocalBodyByteCache();
  utimesSync(file, 1700000000, 1700000000);
  cache.read(file); const before = statSync(file, { bigint: true });
  writeFileSync(file, 'modified'); utimesSync(file, 1700000000, 1700000000);
  const after = statSync(file, { bigint: true });
  assert.equal(after.size, before.size);
  assert.equal(after.mtimeNs, before.mtimeNs);
  assert.notEqual(after.ctimeNs, before.ctimeNs);
  assert.equal(cache.read(file).toString(), 'modified');
  assert.equal(cache.statistics().reads, 2);
  assert.equal(cache.statistics().hits, 0);
});

test('replacement inode at the original path invalidates the entry', t => {
  const { directory, file } = fixture(t), cache = createLocalBodyByteCache();
  cache.read(file);
  const replacement = path.join(directory, 'replacement'); writeFileSync(replacement, 'replaced');
  renameSync(replacement, file);
  assert.equal(cache.read(file).toString(), 'replaced');
  assert.equal(cache.statistics().reads, 2);
});

test('mode changes invalidate the complete file identity', t => {
  const { file } = fixture(t), cache = createLocalBodyByteCache();
  chmodSync(file, 0o644); cache.read(file); chmodSync(file, 0o640);
  assert.equal(cache.read(file).toString(), 'original');
  assert.equal(cache.statistics().reads, 2);
});

test('identical files and independent verification contexts share only immutable bytes', t => {
  const { directory, file } = fixture(t), pool = createBodyContentPool({ maxBytes: 32 });
  const other = path.join(directory, '1.body'); writeFileSync(other, 'original');
  const a = createLocalBodyByteCache({ pool }), b = createLocalBodyByteCache({ pool });
  a.read(file).fill(0); b.read(other).fill(1);
  assert.equal(a.read(file).toString(), 'original');
  assert.equal(b.read(other).toString(), 'original');
  assert.equal(pool.statistics().bytes, 8);
  assert.equal(pool.statistics().entries, 1);
});

test('the content pool and path inventory have independent finite budgets', t => {
  const { directory } = fixture(t), pool = createBodyContentPool({ maxBytes: 12 });
  const cache = createLocalBodyByteCache({ pool, maxEntries: 2 });
  for (let i = 0; i < 5; i++) {
    const file = path.join(directory, i + '.body'); writeFileSync(file, String(i).repeat(8));
    assert.equal(cache.read(file).toString(), String(i).repeat(8));
    assert(pool.statistics().bytes <= 12); assert(cache.statistics().entries <= 2);
  }
  assert.equal(cache.read(path.join(directory, '0.body')).toString(), '00000000');
  assert.equal(cache.statistics().reads, 6);
});

test('linked paths use the original read instead of cached eligibility', t => {
  const { directory, file } = fixture(t), cache = createLocalBodyByteCache();
  const link = path.join(directory, 'linked.body'); symlinkSync(file, link);
  assert.equal(cache.read(link).toString(), 'original');
  writeFileSync(file, 'modified');
  assert.equal(cache.read(link).toString(), 'modified');
  assert.equal(cache.statistics().entries, 0);
  assert.equal(cache.statistics().fallbackReads, 2);
});

test('deleted originals throw and explicit clearing cannot leave a stale path entry', t => {
  const { file } = fixture(t), cache = createLocalBodyByteCache();
  cache.read(file); cache.clear();
  assert.equal(cache.statistics().entries, 0);
  cache.read(file); unlinkSync(file);
  assert.throws(() => cache.read(file), { code: 'ENOENT' });
  assert.equal(cache.statistics().entries, 0);
});

test('repeated cache hits close every original file descriptor', t => {
  const { file } = fixture(t), cache = createLocalBodyByteCache();
  const fdDirectory = process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd';
  const before = readdirSync(fdDirectory).length;
  for (let i = 0; i < 1000; i++) assert.equal(cache.read(file).toString(), 'original');
  assert.equal(readdirSync(fdDirectory).length, before);
});

test('Node permission mode keeps both hits and misses on the original read', t => {
  const { directory, file } = fixture(t);
  const denied = fixture(t).file;
  const module = new URL('./local-body-byte-cache.mjs', import.meta.url).href;
  const source = `import {createLocalBodyByteCache} from ${JSON.stringify(module)};
const cache=createLocalBodyByteCache();cache.read(${JSON.stringify(file)});cache.read(${JSON.stringify(file)});
let deniedCode;try{cache.read(${JSON.stringify(denied)})}catch(error){deniedCode=error.code}
console.log(JSON.stringify({statistics:cache.statistics(),deniedCode}));`;
  const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + directory,
    '--allow-fs-read=' + path.dirname(new URL(import.meta.url).pathname), '--input-type=module', '--eval', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const { statistics, deniedCode } = JSON.parse(result.stdout);
  assert.equal(statistics.hits, 0); assert.equal(statistics.entries, 0); assert.equal(statistics.fallbackReads, 3);
  assert.equal(deniedCode, 'ERR_ACCESS_DENIED');
});

function referenceFixture(t) {
  const value = fixture(t);
  const row = { path: '/_games/nte/_next/static/cache.js', status: 200,
    headers: { 'content-type': 'application/javascript' }, bytes: 8,
    sha256: createHash('sha256').update('original').digest('hex'), bodyFile: '0.body' };
  const proof = saveNteReferenceProof(value.directory, [row]);
  assert.doesNotThrow(() => recheckNteReferences(proof));
  return { ...value, row, proof };
}

test('the complete pinned reader rejects a body mutation across an await and fails the session', async t => {
  const { file, proof } = referenceFixture(t), session = createArtifactVerificationSession();
  utimesSync(file, 1700000000, 1700000000);
  await assert.rejects(session.run(async () => {
    recheckNteReferences(proof);
    await Promise.resolve();
    writeFileSync(file, 'modified'); utimesSync(file, 1700000000, 1700000000);
    recheckNteReferences(proof);
  }), { code: 'ERR_ASSERTION' });
  await assert.rejects(session.run(() => recheckNteReferences(proof)), /busy or failed/);
});

test('an unchanged body never caches approval of changed response headers', async t => {
  const { row, proof } = referenceFixture(t), session = createArtifactVerificationSession();
  await assert.rejects(session.run(async () => {
    recheckNteReferences(proof);
    await Promise.resolve();
    row.headers['set-cookie'] = 'unexpected=1';
    const bytes = Buffer.from(JSON.stringify([row]) + '\n');
    writeFileSync(proof.path, bytes);
    recheckNteReferences({ path: proof.path, pin: createHash('sha256').update(bytes).digest('hex') });
  }), { code: 'ERR_ASSERTION' });
});

test('pinned reference metadata is reread even when body bytes are available', async t => {
  const { row, proof } = referenceFixture(t), session = createArtifactVerificationSession();
  await assert.rejects(session.run(async () => {
    recheckNteReferences(proof);
    row.status = 404;
    writeFileSync(proof.path, JSON.stringify([row]) + '\n');
    recheckNteReferences(proof);
  }), /Migration evidence changed/);
});
