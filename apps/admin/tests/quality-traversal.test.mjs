import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDataQuality } from '../src/data-quality.mjs';

test('per-dataset traversal reveals global object budget omissions in later datasets', () => {
  const report = assessDataQuality([{ kind: 'characters', rows: Array.from({ length: 5000 }, (_, i) => ({ id: `c-${i}` })) },
    { kind: 'guides', rows: [{ id: 'g', characterId: 'c-0' }, null] }]);
  const [first, later] = report.coverage.referenceTraversal.datasets;
  assert.equal(first.fullyTraversedRecords, 5000);
  assert.equal(later.unstartedRecords, 1); assert.equal(later.invalidRecordsSkipped, 1);
  assert.equal(later.configuredReferenceChecks, 0);
  assert.equal(later.stopReasons.object_budget, 1);
  assert.equal(report.coverage.referenceTraversal.visitedObjects, 5000);
  assert.equal(report.truncated, true);
});

test('depth and diagnostic budgets distinguish partial rows from rows never started', () => {
  const deep = {}; let node = deep;
  for (let i = 0; i < 20; i++) { node.child = {}; node = node.child; }
  const depth = assessDataQuality([{ kind: 'guides', rows: [{ id: 'g', deep }] }]);
  const traversal = depth.coverage.referenceTraversal.datasets[0];
  assert.equal(traversal.partiallyTraversedRecords, 1); assert.equal(traversal.stopReasons.depth_budget, 1);
  const diagnostic = assessDataQuality([{ kind: 'weapons', rows: Array.from({ length: 2001 }, (_, i) => ({ id: `w-${i}`, description: 'text' })) }]);
  const matrix = diagnostic.coverage.referenceTraversal.datasets[0];
  assert.equal(matrix.fullyTraversedRecords, 1999); assert.equal(matrix.unstartedRecords, 2);
  assert.equal(matrix.stopReasons.diagnostic_budget, 2);
});

test('complete key traversal reports reference counts without approving unknown fields', () => {
  const report = assessDataQuality([{ kind: 'weapons', rows: [{ id: 'w' }] },
    { kind: 'guides', rows: [{ id: 'g', nested: { weaponId: 'w', mysteryId: 'x' } }] }]);
  const traversal = report.coverage.referenceTraversal.datasets[1];
  assert.equal(traversal.fullyTraversedRecords, 1);
  assert.equal(traversal.configuredReferenceChecks, 1); assert.equal(traversal.unconfiguredReferenceChecks, 1);
  assert.equal(traversal.status, 'configured_key_traversal_complete_not_semantics');
  assert.equal(report.summary.needsReview, 1); assert.equal(report.coverage.complete, false);
});
