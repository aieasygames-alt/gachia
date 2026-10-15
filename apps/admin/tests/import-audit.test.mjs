import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditImports } from '../src/import-audit.mjs';

test('static audit follows literal cycles, reports missing and dynamic inputs without executing', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'gachia-import-audit-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'entry.mjs'), `import './local'; import 'external-package'; import('./missing.mjs'); import(variable); throw new Error('Never execute');`);
  writeFileSync(join(root, 'local.ts'), `export * from './entry.mjs';`);
  const report = auditImports(root, ['entry.mjs']);
  assert.equal(report.files.length, 2);
  assert.deepEqual(report.externalSpecifiers, ['external-package']);
  assert.ok(report.issues.some((item) => item.reason === 'local_import_missing'));
  assert.ok(report.issues.some((item) => item.reason === 'dynamic_import_not_resolved'));
  assert.ok(Object.values(report.permissions).every((value) => value === false));
  symlinkSync('local.ts', join(root, 'link.ts'));
  assert.equal(auditImports(root, ['link.ts']).issues[0].reason, 'file_unavailable_unsafe_or_over_budget');
});

test('audit validates entry containers and bounds unique queued files including unavailable inputs', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'gachia-import-budget-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const entries of [null, 'entry.mjs', [1], Array(501).fill('entry.mjs')]) assert.throws(() => auditImports(root, entries));
  writeFileSync(join(root, 'large.mjs'), 'x'.repeat(1024 * 1024 + 1));
  assert.equal(auditImports(root, ['large.mjs']).files.length, 0);
  const imports = [];
  for (let i = 0; i < 501; i++) {
    writeFileSync(join(root, `file-${i}.mjs`), '');
    imports.push(`import './file-${i}.mjs';`);
  }
  writeFileSync(join(root, 'entry.mjs'), imports.join('\n'));
  const report = auditImports(root, ['entry.mjs']);
  assert.equal(report.attemptedFiles, 500);
  assert.equal(report.files.length, 500);
  assert.ok(report.issues.some((item) => item.reason === 'file_budget_exceeded'));
  writeFileSync(join(root, 'outside.mjs'), `import '../outside.mjs';`);
  assert.equal(auditImports(root, ['outside.mjs']).issues[0].reason, 'local_import_outside_root');
});
