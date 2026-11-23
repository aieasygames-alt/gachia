// Verify the concurrent reader against the original full Node identity walk.
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, lstatSync, readdirSync, readlinkSync,
  symlinkSync, linkSync, chmodSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative as relativePath, isAbsolute } from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { parallelArtifactIdentity as parallelIdentity } from './parallel-artifact-identity.mjs';

// Exact original ten-field walk, used as an independent reference on disk.
function originalIdentity(root) {
  assert.equal(realpathSync(root), root, 'Linked artifact ancestor changed');
  const rows = [];
  const walk = (relative = '') => {
    const file = relative ? join(root, relative) : root, stat = lstatSync(file, { bigint: true });
    assert(stat.isFile() || stat.isDirectory() || stat.isSymbolicLink(), 'Unsupported artifact session entry');
    assert(stat.ctimeNs > 0n && stat.mtimeNs > 0n, 'Artifact change timestamps unavailable');
    rows.push([relative, stat.dev, stat.ino, stat.mode, stat.nlink, stat.uid, stat.gid, stat.size, stat.mtimeNs, stat.ctimeNs]);
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(file), resolved = realpathSync(file), inside = relativePath(root, resolved);
      assert(!isAbsolute(target) && inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside), 'Non-portable artifact link');
      rows.at(-1).push(target, resolved);
    }
    if (stat.isDirectory()) for (const name of readdirSync(file).sort()) walk(relative ? `${relative}/${name}` : name);
  };
  walk(); return rows;
}

test('parallel stat returns every exact original field, link value and DFS ordering', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-parallel-identity-')));
  try {
    for (const name of ['a', 'a.b', '\ue000', '\u{1f680}', '中文']) {
      mkdirSync(join(root, name));
      for (let i = 0; i < 20; i++) writeFileSync(join(root, name, `${i}.txt`), `fixture ${name} ${i}`);
    }
    linkSync(join(root, 'a/0.txt'), join(root, 'hardlink'));
    symlinkSync('a/0.txt', join(root, 'portable-link'));
    symlinkSync('a', join(root, 'directory-link'));
    chmodSync(join(root, 'a/0.txt'), 0o640);
    utimesSync(join(root, 'a/0.txt'), 1700000000, 1700000000);
    const expected = originalIdentity(root);
    for (const workers of [1, 4, 8, 16]) assert.deepEqual(await parallelIdentity(root, workers), expected);
    const file = join(root, 'a/0.txt'), before = lstatSync(file);
    writeFileSync(file, 'x'.repeat(before.size));
    utimesSync(file, 1700000000, 1700000000);
    assert.equal(lstatSync(file).size, before.size);
    assert.equal(lstatSync(file).mtimeMs, before.mtimeMs);
    const changed = await parallelIdentity(root);
    assert.notDeepEqual(changed, expected);
    assert.deepEqual(changed, originalIdentity(root));
    chmodSync(file, 0o600);
    assert.notDeepEqual(await parallelIdentity(root), changed);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('absolute, escaping, dangling links and linked roots remain rejected', async () => {
  const outer = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-parallel-links-')));
  const root = join(outer, 'tree'); mkdirSync(root); writeFileSync(join(outer, 'outside'), 'outside');
  try {
    for (const target of [join(outer, 'outside'), '../outside', 'missing']) {
      symlinkSync(target, join(root, 'bad'));
      assert.throws(() => originalIdentity(root));
      assert.throws(() => parallelIdentity(root));
      rmSync(join(root, 'bad'));
    }
    symlinkSync('tree', join(outer, 'linked-root'));
    assert.throws(() => parallelIdentity(join(outer, 'linked-root')), /Linked artifact ancestor changed/);
  } finally { rmSync(outer, { recursive: true, force: true }); }
});

test('special filesystem entries are rejected instead of omitted', { skip: process.platform === 'win32' }, async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-identity-socket-')));
  const server = createServer();
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(join(root, 'socket'), resolve); });
    assert.throws(() => originalIdentity(root), /Unsupported artifact session entry/);
    assert.throws(() => parallelIdentity(root), /Unsupported artifact session entry/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

test('permission-limited callers retain the serial identity and inventory reuse without subprocess permission', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-identity-permission-')));
  try {
    writeFileSync(join(root, 'data'), 'fixture');
    const code = `
      import assert from 'node:assert/strict';
      const { createArtifactVerificationSession, guardedArtifactInventory } = await import(process.argv[1]);
      let reads = 0;
      await createArtifactVerificationSession().run(() => {
        const read = () => guardedArtifactInventory(process.argv[2], () => { reads++; return ['verified']; });
        assert.deepEqual(read(), ['verified']);
        assert.deepEqual(read(), ['verified']);
        assert.equal(reads, 1);
      });
    `;
    execFileSync(process.execPath, ['--permission', '--allow-fs-read=*', '--input-type=module', '--eval', code,
      new URL('./artifact-verification-session.mjs', import.meta.url).href, root], { stdio: ['ignore', 'pipe', 'pipe'] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
