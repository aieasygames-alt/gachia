import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDataQuality } from '../src/data-quality.mjs';
import { scanContent } from '../src/content.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('matrix separates observed keys, optional absent groups and presence-only rules', () => {
  const report = assessDataQuality([{ kind: 'weapons', rows: [
    { id: 'a', name: 'A', status: 'available', damage: 123, description: 'text', descriptionEn: 'text', descriptionJa: 'text', weaponId: 'b' },
    { id: 'b', unknownId: 'unconfigured' },
  ] }]);
  const matrix = report.coverage.datasets[0].fieldMatrix;
  assert.equal(report.coverage.complete, false);
  assert.equal(matrix.fields.find((field) => field.field === 'status').coverage, 'not_checked_by_quality_rules');
  assert.equal(matrix.fields.find((field) => field.field === 'name').coverage, 'not_checked_by_quality_rules');
  assert.equal(matrix.fields.find((field) => field.field === 'descriptionEn').coverage, 'text_presence_group_only');
  assert.equal(matrix.fields.find((field) => field.field === 'unknownId').coverage, 'unconfigured_reference_diagnostic_only');
  const description = matrix.textGroups.find((group) => group.field === 'description');
  assert.equal(description.eligibleRecords, 1); assert.equal(description.checkedRecords, 1);
  assert.equal(description.absentRecordsNotValidated, 1);
  assert.equal(matrix.textGroups.find((group) => group.field === 'summary').status, 'optional_group_absent_not_checked');
});

test('nested matrix counts malformed groups, invalid items and retained field checks', () => {
  const report = assessDataQuality([{ kind: 'guides', rows: [
    { id: 'g', faq: [{}, null, ...Array.from({ length: 199 }, () => ({}))], skills: 'invalid' },
    { id: 'empty' },
  ] }]);
  const groups = report.coverage.datasets[0].fieldMatrix.nestedGroups;
  const faq = groups.find((group) => group.field === 'faq');
  assert.equal(faq.arrayItems, 201); assert.equal(faq.itemsWithinPerGroupBudget, 200);
  assert.equal(faq.validItemsWithinBudget, 199); assert.equal(faq.retainedTextChecks, 398);
  assert.equal(faq.expectedTextChecksWithinBudget, 398); assert.equal(faq.absentRecordsNotValidated, 1);
  assert.equal(faq.truncated, true); assert.equal(faq.retainedStructureProblems, 1);
  assert.equal(groups.find((group) => group.field === 'skills').invalidGroupRecords, 1);
});

test('additional quality datasets do not alter legacy revision fingerprint or page entries', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'gachia-quality-scan-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const folder of ['packages/data/games/hi3', 'apps/web/public/data/hi3']) {
    mkdirSync(join(root, folder), { recursive: true });
    for (const kind of ['characters', 'weapons', 'materials', 'guides']) writeFileSync(join(root, folder, `raw-${kind}.json`), '[]');
  }
  const before = scanContent(root);
  for (const kind of ['astral-ops', 'stigma-sets']) writeFileSync(join(root, 'packages/data/games/hi3', `raw-${kind}.json`), JSON.stringify([{ id: 'extra', descriptionEn: 'text' }]));
  const after = scanContent(root);
  assert.equal(before.fingerprint, after.fingerprint); assert.deepEqual(before.entries, after.entries);
  assert.equal(after.files.length, 8); assert.equal(after.quality.coverage.datasets.length, 6);
  assert.ok(after.quality.coverage.inputs.every((input) => input.status === 'read'));
  assert.equal(after.quality.coverage.expectedMissingDatasets.length, 0);
  assert.ok(after.quality.coverage.additionalMirrors.every((mirror) => mirror.status === 'unavailable'));
  for (const kind of ['astral-ops', 'stigma-sets']) writeFileSync(join(root, 'apps/web/public/data/hi3', `raw-${kind}.json`), JSON.stringify([{ id: 'extra', descriptionEn: 'text' }]));
  const matched = scanContent(root);
  assert.ok(matched.quality.coverage.additionalMirrors.every((mirror) => mirror.status === 'passed'));
  assert.equal(matched.fingerprint, before.fingerprint);
  writeFileSync(join(root, 'apps/web/public/data/hi3/raw-stigma-sets.json'), '[]');
  assert.equal(scanContent(root).quality.coverage.additionalMirrors.find((mirror) => mirror.kind === 'stigma-sets').status, 'needs_review');
  writeFileSync(join(root, 'apps/web/public/data/hi3/raw-stigma-sets.json'), '{}');
  assert.equal(scanContent(root).quality.coverage.additionalMirrors.find((mirror) => mirror.kind === 'stigma-sets').status, 'unavailable');
  writeFileSync(join(root, 'packages/data/games/hi3/raw-astral-ops.json'), '{invalid');
  const broken = scanContent(root);
  assert.ok(broken.quality.coverage.expectedMissingDatasets.includes('astral-ops'));
  assert.equal(broken.quality.coverage.inputs.find((input) => input.path.endsWith('raw-astral-ops.json')).status, 'unavailable');
  assert.equal(broken.quality.coverage.additionalMirrors.find((mirror) => mirror.kind === 'astral-ops').status, 'not_checked');
});

test('new explicit reference families validate IDs without inferring relationship semantics', () => {
  const report = assessDataQuality([{ kind: 'astral-ops', rows: [{ id: 'op' }] }, { kind: 'stigma-sets', rows: [{ id: 'set' }] },
    { kind: 'guides', rows: [{ id: 'g', nested: { astralOpId: 'op', astralOpIds: ['missing'], stigmaSetId: 'set', stigmaSetIds: 'not-array' } }] }]);
  assert.deepEqual(report.checks.map((check) => check.reason), ['resolved', 'missing_target', 'resolved', 'invalid_type_or_id']);
  assert.equal(report.coverage.referenceFields.astralOpIds, 'astral-ops');
  assert.equal(report.coverage.referenceFields.stigmaSetIds, 'stigma-sets');
  assert.equal(report.permissions.autoConfirm, false);
  const absent = assessDataQuality([{ kind: 'weapons', rows: [{ id: 'w', astralOpId: 'op' }] }]);
  assert.equal(absent.checks[0].reason, 'target_dataset_unavailable');
});

test('matrix observation budgets and invalid rows stay explicit', () => {
  const keys = Object.fromEntries(Array.from({ length: 220 }, (_, i) => [`custom${i}`, i]));
  const report = assessDataQuality([{ kind: 'unknown', rows: [null, [], keys, ...Array.from({ length: 2000 }, () => ({}))] }]);
  const dataset = report.coverage.datasets[0]; const matrix = dataset.fieldMatrix;
  assert.equal(dataset.configured, false); assert.equal(matrix.rowsObserved, 2000);
  assert.equal(matrix.observationTruncated, true); assert.equal(matrix.invalidRowsObserved, 2);
  assert.equal(matrix.fields.length, 200);
  assert.ok(matrix.fields.every((field) => field.coverage === 'not_checked_by_quality_rules'));
});

test('configured guide content and FAQ differ from material source rules', () => {
  const report = assessDataQuality([{ kind: 'guides', rows: [{ id: 'g', contentEn: 'only English', faq: [] }] },
    { kind: 'materials', rows: [{ id: 'm', source: 'text' }] }]);
  const [guide, material] = report.coverage.datasets.map((dataset) => dataset.fieldMatrix);
  assert.equal(guide.textGroups.find((group) => group.field === 'content').checkedRecords, 1);
  assert.ok(guide.nestedGroups.some((group) => group.field === 'faq'));
  assert.ok(material.textGroups.some((group) => group.field === 'source'));
  assert.ok(!material.textGroups.some((group) => group.field === 'content'));
});
