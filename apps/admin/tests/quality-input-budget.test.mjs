import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDataQuality } from '../src/data-quality.mjs';

test('duplicate dataset owners cannot resolve references by silent merging', () => {
  const report = assessDataQuality([{ kind: 'weapons', rows: [{ id: 'a' }] }, { kind: 'weapons', rows: [{ id: 'b' }] },
    { kind: 'guides', rows: [{ id: 'g', weaponId: 'a' }] }]);
  assert.equal(report.checks[0].reason, 'target_dataset_unreliable');
  assert.equal(report.coverage.datasets.filter((item) => item.kind === 'weapons').length, 1);
  assert.ok(report.inputCoverage.issues.some((issue) => issue.reason === 'duplicate_dataset_kind'));
  assert.equal(report.truncated, true);
});

test('row budget preserves observed counts and does not approve omitted targets', () => {
  const rows = Array.from({ length: 10001 }, (_, index) => ({ id: `w-${index}` }));
  const before = structuredClone(rows);
  const report = assessDataQuality([{ kind: 'guides', rows: [{ id: 'g', weaponId: 'w-0' }] }, { kind: 'weapons', rows }]);
  assert.equal(report.inputCoverage.datasets[1].suppliedRecords, 10001);
  assert.equal(report.inputCoverage.datasets[1].observedRecords, 10000);
  assert.equal(report.idIntegrity.datasets[1].observedRecords, 10000);
  assert.ok(report.checks.some((check) => check.reason === 'target_dataset_unreliable'));
  assert.deepEqual(rows, before);
});

test('invalid containers, invalid rows declarations and dataset/fact budgets remain explicit', () => {
  assert.equal(assessDataQuality(null, null).inputCoverage.assessment, 'partial_or_invalid_input');
  const malformed = assessDataQuality([{ kind: 'weapons', rows: {} }, null]);
  assert.equal(malformed.inputCoverage.issues.length, 2);
  assert.ok(assessDataQuality([], [null, []]).inputCoverage.issues.some((issue) => issue.reason === 'invalid_fact_records' && issue.count === 2));
  const many = assessDataQuality(Array.from({ length: 33 }, (_, i) => ({ kind: `k-${i}`, rows: [] })),
    Array.from({ length: 10001 }, () => ({ status: 'needs_review' })));
  assert.equal(many.inputCoverage.datasets.length, 32);
  assert.equal(many.inputCoverage.observedFacts, 10000);
  assert.equal(many.limits.hardTimeLimit, false);
  assert.equal(many.permissions.autoConfirm, false);
});
