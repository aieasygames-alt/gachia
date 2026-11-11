import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { artifactFiles } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { prepareUnifiedAssetPair, unifiedStaticFiles } from './unified-release-assets.mjs';

function projection(base, extra, runtime) {
  const allowed = new Map(base.map(row => [row.path, row]));
  for (const row of extra) {
    if (allowed.has(row.path)) assert.deepEqual(allowed.get(row.path), row, 'Immutable recovery collision');
    else allowed.set(row.path, row);
    for (let parent = dirname(row.path); parent !== '.'; parent = dirname(parent)) {
      if (allowed.has(parent)) assert.equal(allowed.get(parent).type, 'directory');
      else allowed.set(parent, { path: parent, type: 'directory' });
    }
  }
  if (runtime) allowed.set('worker.js', { path: 'worker.js', type: 'file', sha256: digest(runtime) });
  return [...allowed.values()].toSorted((a, b) => a.path.localeCompare(b.path));
}

// The first migration's old runtime predates the content service. Recovery adds
// only the exact exports of the same published A; it never copies candidate HTML
// or changes the generic static-only compatibility contract.
export function prepareGenshinMigrationRecovery(input) {
  const expected = genshinContentAssets(input.source);
  for (const [file, bytes] of expected.files) {
    assert(readFileSync(join(input.candidate, 'assets', expected.contract.prefix, file)).equals(bytes), 'Candidate is not complete published A');
  }
  prepareUnifiedAssetPair({ ...input, owner: 'genshin' });
  for (const [file, bytes] of expected.files) {
    const target = join(input.recovery, 'assets', expected.contract.prefix, file);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
  }
  return verifyGenshinMigrationRecovery(input);
}

export function verifyGenshinMigrationRecovery(input) {
  const expected = genshinContentAssets(input.source), prefix = 'assets' + expected.contract.prefix + '/';
  const additions = [...expected.files].map(([file, bytes]) => ({ path: prefix + file, type: 'file', sha256: digest(bytes) }));
  const original = artifactFiles(input.previous);
  assert(original.every(row => !row.path.startsWith(prefix)), 'Recovery content already exists; this is not an initial migration');
  const oldStatic = unifiedStaticFiles(input.previous, 'genshin'), newStatic = unifiedStaticFiles(input.candidate, 'genshin');
  const sorted = rows => rows.toSorted((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(sorted(artifactFiles(input.forward)), projection(artifactFiles(input.candidate), oldStatic), 'Forward changed candidate content');
  assert.deepEqual(sorted(artifactFiles(input.recovery)), projection(original, [...newStatic, ...additions], input.runtime), 'Recovery changed old runtime, HTML, cache or content');
  const recoveryTree = artifactFiles(input.recovery);
  assert.equal(recoveryTree.find(row => row.path === 'worker.js')?.sha256, digest(input.runtime));
  return { policy: 'genshin-initial-migration-compatible-A-recovery-v1', version: expected.manifest.version, exports: additions.length,
    runtimeSHA256: digest(input.runtime), recoveryTreePin: digest(JSON.stringify(recoveryTree, null, 2) + '\n'), cloudWrites: false };
}
