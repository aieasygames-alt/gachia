import assert from 'node:assert/strict';
import { cpSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { artifactFiles, localAssetPath } from './desktop-publish.mjs';
import { digest, withVerificationPass } from './desktop-release-assets.mjs';

export const UNIFIED_OWNERS = Object.freeze(['azur-promilia', 'genshin', 'lvmeng', 'nte', 'main']);
export const unifiedService = owner => {
  assert(UNIFIED_OWNERS.includes(owner), 'Unknown unified publication owner');
  return owner === 'main' ? 'gachia' : `gachia-game-${owner}`;
};

export function unifiedStaticFiles(directory, owner) {
  unifiedService(owner);
  const root = resolve(directory);
  assert.equal(realpathSync(root), root, 'Linked artifact root forbidden');
  const prefixes = owner === 'main' ? ['assets/_next/static/']
    : ['assets/_next/static/', `assets/_games/${owner}/_next/static/`];
  const files = artifactFiles(root).filter(file => prefixes.some(prefix => file.path.startsWith(prefix)) && file.type !== 'directory');
  assert(files.length > 0 && files.length <= 5000, 'Invalid unified static coverage');
  let total = 0;
  for (const file of files) {
    assert.equal(file.type, 'file', 'Linked static assets forbidden');
    const name = file.path.slice(prefixes.find(prefix => file.path.startsWith(prefix)).length);
    assert(/^[A-Za-z0-9_\-[\]./]+\.(?:js|css|woff2?|ttf|otf|json|png|jpe?g|gif|webp|avif|svg|ico)$/.test(name), 'Unreviewed static asset path');
    const target = localAssetPath(root, '/' + file.path);
    assert.equal(realpathSync(target), target, 'Linked static ancestor forbidden');
    const size = lstatSync(target).size;
    assert(size > 0 && size <= 8 * 1024 * 1024, 'Static file budget exceeded');
    total += size;
    assert(total <= 128 * 1024 * 1024, 'Static inventory budget exceeded');
  }
  if (owner !== 'main') {
    const hashes = new Map(files.map(file => [file.path, file.sha256]));
    for (const file of files) {
      const prefix = prefixes.find(prefix => file.path.startsWith(prefix));
      const other = prefixes.find(value => value !== prefix) + file.path.slice(prefix.length);
      assert.equal(hashes.get(other), file.sha256, 'Dedicated static raw/namespaced alias missing or changed');
    }
  }
  return files;
}

function additions(destination, directory, files) {
  const writes = [];
  for (const file of files) {
    const target = localAssetPath(destination, '/' + file.path);
    for (let parent = dirname(target); parent !== destination; parent = dirname(parent)) {
      const stat = lstatSync(parent, { throwIfNoEntry: false });
      if (stat) assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Unsafe asset destination');
    }
    const stat = lstatSync(target, { throwIfNoEntry: false });
    if (stat) {
      assert(stat.isFile() && !stat.isSymbolicLink(), 'Unsafe static collision');
      assert.equal(digest(readFileSync(target)), file.sha256, `Immutable static collision: ${file.path}`);
    } else writes.push({ source: join(directory, file.path), target });
  }
  return writes;
}

// The union changes only static assets. Neither direction copies HTML, public
// JSON or server caches from the other version.
export function prepareUnifiedAssetPair({ owner, previous, candidate, forward, recovery, runtime }) {
  const oldFiles = unifiedStaticFiles(previous, owner), newFiles = unifiedStaticFiles(candidate, owner);
  const toForward = additions(resolve(candidate), previous, oldFiles);
  const toRecovery = additions(resolve(previous), candidate, newFiles);
  for (const [source, target] of [[candidate, forward], [previous, recovery]]) {
    assert.equal(realpathSync(dirname(target)), resolve(dirname(target)), 'Linked pair parent forbidden');
    cpSync(source, target, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  }
  for (const [writes, from, to] of [[toForward, resolve(candidate), forward], [toRecovery, resolve(previous), recovery]]) {
    for (const file of writes) {
      const target = join(to, file.target.slice(from.length + 1));
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, readFileSync(file.source), { flag: 'wx', mode: 0o600 });
    }
  }
  assert(Buffer.isBuffer(runtime) && runtime.length > 0 && runtime.length <= 16 * 1024 * 1024, 'Invalid previous runtime');
  const worker = join(recovery, 'worker.js');
  assert.equal(realpathSync(worker), resolve(worker), 'Linked recovery runtime forbidden');
  writeFileSync(worker, runtime, { mode: 0o600 });
  verifyUnifiedAssetPair({ owner, previous, candidate, forward, recovery, runtimeSHA256: digest(runtime) });
  return { oldStaticPaths: oldFiles.length, newStaticPaths: newFiles.length, forwardAdded: toForward.length, recoveryAdded: toRecovery.length };
}

function assertProjection(source, output, additions, runtimeSHA256) {
  const base = artifactFiles(source), actual = artifactFiles(output);
  const allowed = new Map(base.map(row => [row.path, row]));
  for (const file of additions) {
    if (allowed.has(file.path)) assert.deepEqual(allowed.get(file.path), file, 'Immutable static collision');
    else allowed.set(file.path, file);
    for (let parent = dirname(file.path); parent !== '.'; parent = dirname(parent)) {
      if (allowed.has(parent)) assert.equal(allowed.get(parent).type, 'directory', 'Static parent collision');
      else allowed.set(parent, { path: parent, type: 'directory' });
    }
  }
  if (runtimeSHA256) allowed.set('worker.js', { path: 'worker.js', type: 'file', sha256: runtimeSHA256 });
  const sorted = rows => rows.toSorted((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sorted(actual), sorted([...allowed.values()]), 'Artifact contains an unauthorized non-static change');
}

export function verifyUnifiedAssetPair({ owner, previous, candidate, forward, recovery, runtimeSHA256 }) {
  // All projections share one synchronous read pass; nothing survives a later
  // verification call or an asynchronous/write boundary.
  return withVerificationPass(() => {
    const oldFiles = unifiedStaticFiles(previous, owner), newFiles = unifiedStaticFiles(candidate, owner);
    assertProjection(candidate, forward, oldFiles);
    assertProjection(previous, recovery, newFiles, runtimeSHA256);
    const forwardFiles = unifiedStaticFiles(forward, owner);
    assert.deepEqual(forwardFiles, unifiedStaticFiles(recovery, owner), 'Both runtimes need the identical static union');
    return { staticPaths: forwardFiles.length };
  });
}
