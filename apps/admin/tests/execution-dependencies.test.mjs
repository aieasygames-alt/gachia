import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stringify } from 'yaml';
import { inspectExecutionDependencies } from '../src/execution-dependencies.mjs';

function fixture(change = () => {}) {
  const entries = { 'package.json': '{}', 'apps/web/package.json': JSON.stringify({ dependencies: { lib: '^1', '@gachia/core': 'workspace:*' } }),
    'packages/core/package.json': '{"name":"@gachia/core"}', 'pnpm-workspace.yaml': 'packages: ["apps/*", "packages/*"]' };
  const lock = { lockfileVersion: '9.0', importers: { '.': {}, 'apps/web': { dependencies: {
    lib: { specifier: '^1', version: '1.0.0(peer@2.0.0)' }, '@gachia/core': { specifier: 'workspace:*', version: 'link:../../packages/core' },
  } }, 'packages/core': {}, 'apps/other': {} }, packages: { 'lib@1.0.0': { resolution: { integrity: 'sha512-YWJj' } }, 'nested@2.0.0': { resolution: { integrity: 'sha512-ZGVm' } } },
  snapshots: { 'lib@1.0.0(peer@2.0.0)': { dependencies: { nested: '2.0.0' } }, 'nested@2.0.0': { dependencies: { lib: '1.0.0(peer@2.0.0)' } } } };
  change(lock, entries); entries['pnpm-lock.yaml'] ??= stringify(lock);
  const manifest = { digest: 'material', files: Object.keys(entries).map((path) => ({ path })) };
  const contents = new Map(Object.entries(entries));
  const beforeManifest = structuredClone(manifest); const beforeContents = [...contents];
  const report = inspectExecutionDependencies(manifest, contents);
  assert.deepEqual(manifest, beforeManifest); assert.deepEqual([...contents], beforeContents);
  return report;
}
test('walks importer metadata and peer-qualified cyclic snapshots without executing install', () => {
  const report = fixture();
  assert.equal(report.status, 'partial_pass'); assert.equal(report.graphNodes, 2);
  assert.deepEqual(report.omittedImporters, ['apps/other']); assert.equal(report.materialDigest, 'material');
  assert.equal(report.executable, false); assert.ok(report.notCovered.length);
});
test('detects stale specifiers, absent snapshots, local escapes and missing included importers', () => {
  const report = fixture((lock) => {
    lock.importers['apps/web'].dependencies.lib.specifier = '^9';
    lock.importers['apps/web'].dependencies['@gachia/core'].version = 'link:../../../outside';
    delete lock.importers['packages/core']; delete lock.snapshots['nested@2.0.0'];
  });
  for (const kind of ['specifier_mismatch', 'missing_snapshot', 'missing_local_dependency', 'missing_importer']) assert.ok(report.issues.some((issue) => issue.kind === kind), kind);
  assert.equal(report.status, 'needs_attention');
});
test('rejects duplicate YAML keys, alias expansion, unsupported patterns and lock versions', () => {
  const duplicate = fixture((lock, entries) => { entries['pnpm-lock.yaml'] = 'lockfileVersion: 9.0\nlockfileVersion: 9.0'; });
  assert.ok(duplicate.issues.some((issue) => issue.kind === 'invalid_yaml'));
  const alias = fixture((lock, entries) => { entries['pnpm-lock.yaml'] = 'a: &a [1]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]'; });
  assert.ok(alias.issues.some((issue) => issue.kind === 'invalid_yaml'));
  const unsupported = fixture((lock, entries) => { lock.lockfileVersion = '6.0'; entries['pnpm-workspace.yaml'] = 'packages: ["**", "!apps/admin"]'; });
  assert.ok(unsupported.issues.some((issue) => issue.kind === 'unsupported_workspace_patterns'));
  assert.ok(unsupported.issues.some((issue) => issue.kind === 'unsupported_lock_version'));
});
test('unverifiable artifact identity and transitive local references never pass', () => {
  const report = fixture((lock) => { lock.packages['lib@1.0.0'].resolution = { tarball: 'https://example.com/lib' }; lock.snapshots['nested@2.0.0'].dependencies = { local: 'link:packages/core' }; });
  assert.equal(report.status, 'needs_attention');
  assert.ok(report.issues.some((issue) => issue.kind === 'unverified_artifact_identity'));
  assert.ok(report.issues.some((issue) => issue.kind === 'unsupported_dependency_protocol'));
});
test('workspace dependency cannot silently link a different included package', () => {
  const report = fixture((lock) => { lock.importers['apps/web'].dependencies['@gachia/core'].version = 'link:../web'; });
  assert.ok(report.issues.some((issue) => issue.kind === 'workspace_target_mismatch'));
  assert.equal(report.status, 'needs_attention');
});
