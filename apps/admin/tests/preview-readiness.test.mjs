import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectPreviewReadiness } from '../src/preview-readiness.mjs';

test('read-only readiness blocks missing dependencies and dotenv; never grants execution', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-readiness-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = join(root, 'apps/web'); mkdirSync(cwd, { recursive: true });
  assert.equal(inspectPreviewReadiness(root).status, 'blocked');
  const directory = join(cwd, 'node_modules/next/dist/bin'); mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'next'), 'fixture, not executed');
  writeFileSync(join(cwd, '.env.example'), 'example');
  const before = readdirSync(cwd, { recursive: true }).sort();
  const ready = inspectPreviewReadiness(root);
  assert.equal(ready.status, 'filesystem_preflight_only');
  assert.equal(ready.capabilities.execute, false);
  assert.deepEqual(readdirSync(cwd, { recursive: true }).sort(), before);
  assert.equal(readFileSync(join(directory, 'next'), 'utf8'), 'fixture, not executed');
  assert.equal(readFileSync(join(cwd, '.env.example'), 'utf8'), 'example');
  writeFileSync(join(cwd, '.env.local'), 'synthetic');
  assert.equal(inspectPreviewReadiness(root).status, 'blocked');
  assert.equal(readFileSync(join(cwd, '.env.local'), 'utf8'), 'synthetic');
});

test('readiness rejects shared external Next dependency and absent application', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-readiness-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(inspectPreviewReadiness(root).status, 'blocked');
  const workspace = join(root, 'workspace');
  const directory = join(workspace, 'apps/web/node_modules/next/dist/bin'); mkdirSync(directory, { recursive: true });
  writeFileSync(join(root, 'external-next'), 'fixture');
  symlinkSync(join(root, 'external-next'), join(directory, 'next'));
  const report = inspectPreviewReadiness(workspace);
  assert.equal(report.checks.find((check) => check.ruleId === 'preview.independent_dependencies').status, 'blocked');
});

test('a directory at the Next executable path is blocked, not a dependency pass', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-readiness-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'apps/web/node_modules/next/dist/bin/next'), { recursive: true });
  const report = inspectPreviewReadiness(root);
  assert.equal(report.status, 'blocked');
  assert.equal(report.checks.find((check) => check.ruleId === 'preview.independent_dependencies').status, 'blocked');
  assert.equal(report.capabilities.execute, false);
});
