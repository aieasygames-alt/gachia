import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, symlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readConfigInput, parseConfigObject, configInputLimit } from '../src/config-input.mjs';
import { releasePlan } from '../src/release-plan.mjs';
import { deploymentDiagnostics } from '../src/deployment-diagnostics.mjs';

test('bounded config inputs reject links, directories and oversize without emitting text', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'gachia-config-input-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'valid.json'), '{"url":"https://example.com"}');
  symlinkSync('valid.json', join(root, 'link.json')); mkdirSync(join(root, 'directory'));
  writeFileSync(join(root, 'large.json'), Buffer.alloc(configInputLimit + 1));
  for (const path of ['link.json', 'directory', 'large.json', '../outside.json']) {
    const result = readConfigInput(root, path); assert.equal(result.status, 'unavailable'); assert.equal(result.text, undefined); assert.equal(result.digest, undefined);
  }
  const result = readConfigInput(root, 'valid.json');
  assert.equal(result.digest, createHash('sha256').update(result.text).digest('hex'));
  assert.equal(parseConfigObject(result.text).status, 'parsed');
  mkdirSync(join(root, 'apps/web'), { recursive: true }); symlinkSync('../../valid.json', join(root, 'apps/web/package.json'));
  const plan = releasePlan(root); assert.equal(plan.inputs[0].status, 'unavailable'); assert.deepEqual(plan.commands, {});
  assert.equal(plan.gateSummary.counts.verified, 0);
});

test('ambiguous duplicate keys and deep structures fail closed without exposing values', () => {
  for (const text of ['{"name":"bad","name":"gachia"}', '{"name":"bad","na\\u006de":"gachia"}', '{"env":{"staging":{"name":"a","name":"b"}}}']) {
    assert.equal(parseConfigObject(text, { jsonc: true }).reason, 'duplicate_json_key');
    const report = deploymentDiagnostics({ web: text }, { deployment: 'main', worker: 'gachia' });
    assert.equal(report.counts.not_checked, 10); assert.equal(report.inputs[0].reason, 'duplicate_json_key');
    assert.equal(report.inputs[0].value, undefined);
  }
  assert.equal(parseConfigObject('{/*comment*/"url":"https://example.com",}', { jsonc: true }).status, 'parsed');
  assert.equal(parseConfigObject('{/*comment*/"url":"https://example.com",}').status, 'invalid');
  assert.equal(parseConfigObject('{"x":' + '['.repeat(70) + '0' + ']'.repeat(70) + '}').reason, 'structure_budget_exceeded');
});
