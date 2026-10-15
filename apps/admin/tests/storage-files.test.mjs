import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { storageFiles } from '../src/storage-files.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-file-stats-'));
  t.after(() => rmSync(dir, { recursive: true, force: true })); return dir;
}
test('classifies fixed directory metadata without exposing paths, names or file bodies', async (t) => {
  const dir = fixture(t);
  for (const [name, body] of [['workbench.sqlite', '123'], ['workbench.sqlite-wal', '12345'], ['workbench.sqlite.v12-abcd.bak', '1234'], ['secret.txt', 'PRIVATE']]) writeFileSync(join(dir, name), body);
  mkdirSync(join(dir, 'workspaces')); writeFileSync(join(dir, 'workspaces', 'one.json'), '123456');
  mkdirSync(join(dir, 'execution-materials')); writeFileSync(join(dir, 'execution-materials', 'source.json'), '12');
  const report = await storageFiles(dir);
  assert.equal(report.result, 'complete_metadata_scan'); assert.equal(report.totalApparentBytes, 27);
  assert.equal(report.categories.database.apparentBytes, 3); assert.equal(report.categories.sqlite_sidecars.apparentBytes, 5);
  assert.equal(report.categories.migration_backups.apparentBytes, 4); assert.equal(report.categories.workspaces.apparentBytes, 6);
  assert.equal(report.categories.execution_materials.apparentBytes, 2); assert.equal(report.categories.other.apparentBytes, 7);
  for (const value of [dir, 'secret.txt', 'PRIVATE', 'one.json']) assert.ok(!JSON.stringify(report).includes(value));
  assert.equal(readFileSync(join(dir, 'secret.txt'), 'utf8'), 'PRIVATE'); assert.equal(report.permissions.delete, false);
});
test('links are excluded, linked root is rejected and missing roots report partial', async (t) => {
  const dir = fixture(t); const root = join(dir, 'root'); mkdirSync(root);
  writeFileSync(join(dir, 'outside'), 'external'); symlinkSync(join(dir, 'outside'), join(root, 'pointer'));
  writeFileSync(join(root, 'hard'), 'hard'); linkSync(join(root, 'hard'), join(root, 'alias'));
  const report = await storageFiles(root);
  assert.equal(report.totalApparentBytes, 0); assert.equal(report.skipped.symlinks, 1); assert.equal(report.skipped.hardlinks, 2); assert.equal(report.result, 'partial');
  symlinkSync(root, join(dir, 'linked-root'));
  assert.equal((await storageFiles(join(dir, 'linked-root'))).skipped.errors, 1);
  assert.equal((await storageFiles(join(dir, 'missing'))).result, 'partial');
});
test('entry, depth and elapsed budgets explicitly mark incomplete inventory', async (t) => {
  const dir = fixture(t); mkdirSync(join(dir, 'nested')); writeFileSync(join(dir, 'nested', 'body'), '123');
  writeFileSync(join(dir, 'one'), '1'); writeFileSync(join(dir, 'two'), '22');
  const entries = await storageFiles(dir, { maxEntries: 1 }); assert.equal(entries.entries, 1); assert.equal(entries.truncated, true);
  const depth = await storageFiles(dir, { maxDepth: 0 }); assert.equal(depth.skipped.depth, 1); assert.equal(depth.result, 'partial');
  const elapsed = await storageFiles(dir, { maxMs: 0 }); assert.equal(elapsed.truncated, true); assert.equal(elapsed.entries, 0);
});

test('invalid scan budgets reject before filesystem access instead of disabling limits', async () => {
  for (const maxEntries of [NaN, Infinity, 0, -1, 1.5, '1', 5001]) {
    await assert.rejects(storageFiles('/unused', { maxEntries }), /budget/);
  }
  for (const maxDepth of [NaN, Infinity, -1, 0.5, '1', 17]) {
    await assert.rejects(storageFiles('/unused', { maxDepth }), /budget/);
  }
  for (const maxMs of [NaN, Infinity, -1, '1', 501]) {
    await assert.rejects(storageFiles('/unused', { maxMs }), /budget/);
  }
});
