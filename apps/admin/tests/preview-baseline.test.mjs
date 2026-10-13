import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { previewBaselinePaths, previewBaselinePlan } from '../src/preview-baseline.mjs';

test('baseline mismatch includes missing code and does not grant copy/install/execute permission', (t) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-baseline-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const roots = [join(dir, 'current'), join(dir, 'workspace')];
  for (const root of roots) for (const path of previewBaselinePaths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), path.endsWith('package.json') ? '{}' : 'fixture');
  }
  const same = previewBaselinePlan(...roots);
  assert.equal(same.status, 'fixed_scope_matches_not_execution_ready');
  assert.equal(same.dependencies.status, 'needs_attention');
  assert.equal(same.readiness.status, 'blocked');
  const changed = 'apps/web/lib/hi3-weapon-scope.ts';
  writeFileSync(join(roots[0], changed), 'new scope');
  const missing = 'apps/web/components/search/search-loader.tsx';
  rmSync(join(roots[1], missing));
  const report = previewBaselinePlan(...roots);
  assert.equal(report.status, 'baseline_mismatch');
  assert.equal(report.differences, 2);
  assert.notEqual(report.comparisonDigest, same.comparisonDigest);
  assert.equal(report.files.find((file) => file.path === missing).status, 'missing_in_workspace');
  assert.ok(Object.values(report.capabilities).every((value) => value === false));
  assert.ok(report.files.every((file) => !file.contentReviewCoversPath));
  symlinkSync(join(roots[0], changed), join(roots[1], missing));
  assert.equal(previewBaselinePlan(...roots).files.find((file) => file.path === missing).workspace.status, 'unavailable_or_unsafe');
  writeFileSync(join(roots[0], changed), 'x'.repeat(4 * 1024 * 1024 + 1));
  assert.equal(previewBaselinePlan(...roots).files.find((file) => file.path === changed).current.status, 'unavailable_or_unsafe');
});
