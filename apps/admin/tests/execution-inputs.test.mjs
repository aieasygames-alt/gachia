import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectExecutionInputs } from '../src/execution-inputs.mjs';

function inspect(entries) {
  return inspectExecutionInputs({ digest: 'bound-digest', files: Object.keys(entries).map((path) => ({ path })) }, new Map(Object.entries(entries)));
}
test('resolves relative source, JSONC inherited aliases and local workspace package through manifest-only host', () => {
  const report = inspect({
    'tsconfig.base.json': '{"compilerOptions":{"moduleResolution":"bundler","module":"esnext"}}',
    'apps/web/tsconfig.json': '{ // JSONC\n "extends":"../../tsconfig.base.json", "compilerOptions":{"paths":{"@/*":["./*"]}}}',
    'apps/web/index.ts': 'import "./local"; export * from "@/local"; import "@gachia/core";',
    'apps/web/local.ts': 'export const x = 1;',
    'apps/web/package.json': '{"dependencies":{"@gachia/core":"workspace:*"}}',
    'packages/core/package.json': '{"name":"@gachia/core","main":"./index.ts"}',
    'packages/core/index.ts': 'export {}',
  });
  // Workspace imports without a TS alias are deliberately unresolved (no node_modules).
  assert.equal(report.references, 3);
  assert.equal(report.issues.filter((issue) => issue.kind === 'unresolved_local_import').length, 0);
  assert.equal(report.issues.filter((issue) => issue.kind === 'config_resolution').length, 0);
  assert.equal(report.issues.filter((issue) => issue.kind === 'unresolved_workspace_or_alias').length, 1);
  assert.equal(report.materialDigest, 'bound-digest'); assert.equal(report.executable, false);
});
test('reports missing/outside local inputs, workspace dependencies, bad config and dynamic loading without executing code', () => {
  const report = inspect({
    'package.json': '{"dependencies":{"outside":"file:../outside","abs":"link:/tmp/private","missing":"workspace:*"}}',
    'apps/web/tsconfig.json': '{"extends":"../../outside.json"}',
    'apps/web/index.ts': 'import "../../../private"; import "./missing"; import("./" + name); require(name); import "node:fs";',
  });
  assert.equal(report.status, 'needs_attention');
  for (const kind of ['outside_material', 'missing_workspace_package', 'config_resolution', 'unresolved_local_import', 'not_covered']) assert.ok(report.issues.some((issue) => issue.kind === kind), kind);
  assert.deepEqual(report.externalModules, ['node:fs']); assert.equal(report.executable, false);
});
test('clean static slice stays partial and diagnostic cap never produces a pass', () => {
  const partial = inspect({ 'apps/web/index.ts': 'import("next"); import(`./${name}`);' });
  assert.equal(partial.status, 'partial_pass'); assert.ok(partial.notCovered.length);
  const capped = inspect({ 'apps/web/index.ts': `${'require(name);'.repeat(205)} import "./missing";` });
  assert.equal(capped.status, 'needs_attention'); assert.equal(capped.issues.length, 200); assert.equal(capped.issuesTruncated, true);
});

test('invalid package containers and excessive AST depth remain blocking diagnostics', () => {
  for (const value of [null, [], 'text', 12]) {
    const report = inspect({ 'package.json': JSON.stringify(value) });
    assert.equal(report.status, 'needs_attention');
    assert.ok(report.issues.some((issue) => issue.kind === 'invalid_package_json'));
  }
  const sections = inspect({ 'package.json': '{"dependencies":[],"devDependencies":"text","peerDependencies":null}' });
  assert.equal(sections.issues.filter((issue) => issue.kind === 'invalid_dependency_section').length, 3);
  const deep = inspect({ 'apps/web/index.ts': `const x = ${'('.repeat(150)}1${')'.repeat(150)};` });
  assert.equal(deep.status, 'needs_attention');
  assert.ok(deep.issues.some((issue) => issue.kind === 'syntax_budget'));
});
