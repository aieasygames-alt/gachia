import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareStorage, recoveryCoverage } from '../src/storage-lifecycle.mjs';
import { assessDataQuality } from '../src/data-quality.mjs';
import { releasePlan } from '../src/release-plan.mjs';
import { startWorkbench } from '../src/server.mjs';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('quality coverage does not equate empty checks with full schema coverage', () => {
  const report = assessDataQuality([{ kind: 'unknown', rows: [{}] }, { kind: 'characters', rows: [{ id: 'c' }] }]);
  assert.equal(report.coverage.complete, false); assert.equal(report.checks.length, 0);
  assert.equal(report.coverage.datasets[0].configured, false);
  assert.deepEqual(report.coverage.expectedMissingDatasets, ['weapons', 'materials', 'guides', 'astral-ops', 'stigma-sets']);
  assert.equal(report.coverage.facts.checked, 0);
});
test('snapshot differences and recovery matrix are explicitly partial and non-actionable', () => {
  const previous = { schemaVersion: 13, scope: 'sqlite_logical_snapshot_only', observedAt: 'before', database: { allocatedBytes: 10 }, counts: { evidence: 1 }, files: { result: 'partial', totalApparentBytes: 3 } };
  const current = { ...previous, observedAt: 'after', database: { allocatedBytes: 20 }, counts: { evidence: 2 } };
  assert.equal(compareStorage(null, current).status, 'unavailable');
  const result = compareStorage(previous, current); assert.equal(result.allocatedBytesDelta, 10); assert.equal(result.countsDelta.evidence, 1); assert.equal(result.apparentBytesDelta, null);
  assert.equal(result.permissions.delete, false);
  assert.equal(recoveryCoverage.verifiedTables.length + recoveryCoverage.notVerifiedTables.length, 15);
  assert.equal(recoveryCoverage.permissions.restore, false);
});

test('storage comparison never treats missing counts as zero or invalid bytes as measured growth', () => {
  const snapshot = { schemaVersion: 13, scope: 'sqlite_logical_snapshot_only', database: { allocatedBytes: 10 }, counts: { evidence: 1 } };
  for (const patch of [{ counts: {} }, { counts: { evidence: NaN } }, { counts: { evidence: -1 } },
    { database: { allocatedBytes: Infinity } }, { database: null }]) {
    const result = compareStorage(snapshot, { ...snapshot, ...patch });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.permissions.restore, false);
  }
  assert.equal(compareStorage(snapshot, null).status, 'unavailable');
  const malformedFiles = { ...snapshot, files: { result: 'complete_metadata_scan', totalApparentBytes: NaN } };
  assert.equal(compareStorage(malformedFiles, malformedFiles).apparentBytesDelta, null);
});
test('release plan reads fixed configuration without executing and API requires auth', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-plan-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const missing = releasePlan(dir); assert.ok(missing.inputs.every((item) => item.status === 'unavailable'));
  assert.equal(missing.result, 'planning_only_not_release_ready'); assert.equal(missing.permissions.publish, false);
  const app = await startWorkbench({ dataDir: dir, port: 0 }); t.after(() => app.close());
  assert.equal((await fetch(`${app.origin}/api/release-plan`)).status, 401);
  const response = await fetch(`${app.origin}/api/release-plan`, { headers: { Authorization: `Bearer ${app.token}` } });
  const plan = await response.json(); assert.equal(response.status, 200); assert.equal(plan.deployment.worker, 'gachia');
  assert.ok(plan.inputs.some((item) => item.status === 'read')); assert.equal(plan.permissions.execute, false);
  assert.equal(plan.gateSummary.currentAcceptanceVerified, false);
  assert.equal(plan.gateSummary.counts.verified, 0);
  assert.equal(plan.gateSummary.items.length, 8);
  assert.equal((await fetch(`${app.origin}/api/release-plan`, { method: 'POST', headers: { Authorization: `Bearer ${app.token}` } })).status, 403);
});

test('gate summary never promotes configuration or historical reports to current acceptance', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-gates-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const files = ['apps/web/package.json', 'apps/router/package.json', 'packages/core/deployments.ts', 'apps/web/wrangler.jsonc', 'apps/router/wrangler.jsonc'];
  for (const path of files) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), path.endsWith('package.json') ? JSON.stringify({ scripts: { deploy: 'touch unauthorized-marker' } }) : '// synthetic config');
  }
  mkdirSync(join(dir, 'reports/workbench'), { recursive: true });
  writeFileSync(join(dir, 'reports/workbench/recovery-table-coverage.json'), '{"result":"passed","publish":true}');
  const before = files.map((path) => readFileSync(join(dir, path), 'utf8'));
  const plan = releasePlan(dir); const summary = plan.gateSummary;
  assert.equal(plan.version, 2);
  assert.equal(summary.observations.configuration.result, 'fixed_inputs_read_only');
  assert.equal(summary.counts.notVerified, 8);
  assert.ok(summary.items.every((item) => item.status === 'not_verified'));
  const seen = new Set();
  for (const gate of summary.items) {
    assert.ok(gate.dependsOn.every((id) => seen.has(id))); seen.add(gate.id);
  }
  assert.equal(summary.next.gateId, 'baseline');
  assert.equal(summary.observations.recovery.source, 'code_declared_fixture_coverage_not_current_test_run');
  assert.ok(Object.values(summary.permissions).every((value) => value === false));
  summary.observations.recovery.notCovered.length = 0;
  assert.ok(releasePlan(dir).gateSummary.observations.recovery.notCovered.length > 0);
  assert.deepEqual(files.map((path) => readFileSync(join(dir, path), 'utf8')), before);
  assert.equal(existsSync(join(dir, 'unauthorized-marker')), false);
});

test('invalid package configuration has one explicit input diagnostic and fails closed', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-invalid-plan-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'apps/web'), { recursive: true });
  for (const content of ['{', 'null', '[]', '{"scripts":[]}', '{"scripts":{"build":3}}']) {
    writeFileSync(join(dir, 'apps/web/package.json'), content);
    const plan = releasePlan(dir);
    assert.equal(plan.inputs.length, 5);
    assert.equal(plan.inputs[0].status, 'invalid');
    assert.match(plan.inputs[0].digest, /^[a-f0-9]{64}$/);
    assert.equal(plan.gateSummary.observations.configuration.invalid, 1);
    assert.equal(plan.gateSummary.observations.configuration.result, 'incomplete_fixed_inputs');
    assert.equal(plan.commands['apps/web/package.json'], undefined);
    assert.equal(plan.gateSummary.counts.verified, 0);
  }
});

test('build acceptance separates recovery, server body and navigation without granting approval', () => {
  const dir = mkdtempSync(join(tmpdir(), 'workbench-build-acceptance-'));
  try {
    const plan = releasePlan(dir);
    const checks = plan.gateSummary.items.find(item => item.id === 'build').acceptanceChecks;
    assert.deepEqual(checks.map(item => item.id), ['input_binding', 'hydration_recovery', 'server_body', 'navigation', 'artifact_budget']);
    assert.ok(checks.every(item => item.status === 'not_verified'));
    assert.equal(plan.gateSummary.counts.verified, 0);
    assert.equal(plan.permissions.publish, false);
    checks[0].status = 'verified';
    assert.equal(releasePlan(dir).gateSummary.items.find(item => item.id === 'build').acceptanceChecks[0].status, 'not_verified');
    const ui = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    assert.match(ui, /gate\.acceptanceChecks/);
    assert.match(ui, /check\.requirement/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
