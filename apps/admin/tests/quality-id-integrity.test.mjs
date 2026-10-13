import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDataQuality } from '../src/data-quality.mjs';

test('duplicate target IDs are ambiguous, invalid records are reported and input remains unchanged', () => {
  const datasets = [{ kind: 'astral-ops', rows: [{ id: 'op' }, { id: 'op' }, { id: 'BAD ID' }, null, []] },
    { kind: 'guides', rows: [{ id: 'g', astralOpId: 'op', astralOpIds: ['op'], stigmaSetId: 'missing' }] }];
  const before = JSON.stringify(datasets); const report = assessDataQuality(datasets);
  assert.equal(report.idIntegrity.issueCount, 4);
  assert.equal(report.summary.idIssues, 4);
  assert.deepEqual(report.checks.map((check) => check.reason), ['ambiguous_duplicate_target', 'ambiguous_duplicate_target', 'target_dataset_unavailable']);
  assert.equal(report.summary.byRule['entity.reference'].needsReview, 3);
  assert.equal(report.coverage.datasets[0].fieldMatrix.fields.find((field) => field.field === 'id').coverage, 'format_and_uniqueness_only');
  assert.equal(JSON.stringify(datasets), before);
});

test('ID diagnostic truncation preserves issue totals independently from text output', () => {
  const report = assessDataQuality([{ kind: 'weapons', rows: Array.from({ length: 2101 }, () => ({ id: 'same' })) }]);
  assert.equal(report.idIntegrity.issueCount, 2100); assert.equal(report.idIntegrity.checks.length, 2000);
  assert.equal(report.idIntegrity.truncated, true); assert.equal(report.checks.length, 0);
  assert.equal(report.summary.byRuleScope, 'retained_diagnostics_only_not_all_checks');
  assert.equal(report.permissions.autoConfirm, false);
});

test('unique IDs resolve; invalid IDs never satisfy a reference', () => {
  const report = assessDataQuality([{ kind: 'stigma-sets', rows: [{ id: 'valid' }, { id: 'Invalid' }] },
    { kind: 'weapons', rows: [{ id: 'w', stigmaSetId: 'valid', stigmaSetIds: ['Invalid'] }] }]);
  assert.deepEqual(report.checks.map((check) => check.reason), ['resolved', 'invalid_type_or_id']);
  assert.equal(report.idIntegrity.issueCount, 1);
});
