import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessDataQuality } from '../src/data-quality.mjs';
import { buildBatch } from '../src/content.mjs';

test('evaluation requires a valid date and inherited object keys are not reference fields', () => {
  for (const now of [new Date('invalid'), '2026-10-12', null]) {
    assert.throws(() => assessDataQuality([], [], { now }), /evaluation date/);
  }
  const row = JSON.parse('{"id":"example","constructor":"text","toString":"text","__proto__":"text"}');
  const report = assessDataQuality([{ kind: 'characters', rows: [row] }]);
  assert.equal(report.summary.needsReview, 0);
  assert.equal(report.coverage.referenceTraversal.datasets[0].configuredReferenceChecks, 0);
});

test('translation diagnostics check optional field groups without asserting semantics or mutating data', () => {
  const datasets = [{ kind: 'characters', rows: [null, { id: 'bare' }, { id: 'missing', description: '<img src=x>', descriptionEn: ' ' },
    { id: 'complete', summary: '中文', summaryEn: 'English', summaryJa: '日本語' }] }];
  const before = JSON.stringify(datasets);
  const report = assessDataQuality(datasets, [], { now: new Date('2026-10-11T00:00:00Z') });
  assert.equal(report.checks.length, 2); assert.equal(report.summary.needsReview, 1); assert.equal(report.summary.passed, 1);
  assert.match(report.checks[0].message, /descriptionEn, descriptionJa/);
  assert.equal(report.result, 'diagnostics_only'); assert.ok(report.notCovered.includes('翻译语义准确性与数值一致性'));
  assert.deepEqual(report.permissions, { autoConfirm: false, edit: false, execute: false, publish: false });
  assert.equal(JSON.stringify(datasets), before);
});

test('confirmed fact date diagnostics are inclusive UTC, deterministic and never revoke review state', () => {
  const windows = [ ['2026-10-11', '2026-10-11'], [null, '2026-10-10'], ['2026-10-12', null], [null, null],
    ['2026-02-30', null], ['2026-10-12', '2026-10-10'], ['2026-10-10', null] ];
  const facts = windows.map(([validFrom, validUntil], i) => ({ id: String(i), revision: 2, status: 'confirmed', validFrom, validUntil }));
  facts.push({ id: 'pending', status: 'needs_review', validUntil: '2026-01-01' }, { id: 'rejected', status: 'rejected' });
  const before = JSON.stringify(facts);
  const report = assessDataQuality([], facts, { now: new Date('2026-10-11T23:59:59Z') });
  assert.deepEqual(report.checks.map((item) => item.reason), ['within_recorded_window', 'past_end', 'future_start', 'unknown_window', 'invalid_date', 'reversed_dates', 'within_recorded_window']);
  assert.equal(report.summary.needsReview, 5); assert.equal(report.summary.passed, 2);
  assert.equal(JSON.stringify(facts), before);
});

test('literal entity suggestions include English and Japanese labels but do not infer aliases', () => {
  const index = { entries: [{ id: 'first', title: '中文名', labels: ['中文名', 'English name', '日本語名'] },
    { id: 'second', title: '第二', labels: ['第二', 'Different'] }], findings: [] };
  for (const body of ['ENGLISH NAME', '日本語名', 'first']) {
    const batch = buildBatch({ id: 'e', body }, index, {});
    assert.deepEqual(batch.suggestedPages.map((item) => item.id), ['first']);
    assert.equal(batch.capabilities.edit, false); assert.equal(batch.capabilities.publish, false);
  }
  assert.equal(buildBatch({ id: 'e', body: 'unregistered nickname' }, index, {}).suggestedPages.length, 0);
});

test('nested skills and FAQ use distinct locale conventions and report malformed or empty records', () => {
  const rows = [{ id: 'guide', content: 'zh', contentEn: 'en', contentJa: 'ja',
    faq: [{ question: 'en', questionZh: 'zh', questionJa: 'ja', answer: 'en', answerZh: 'zh', answerJa: 'ja' }, {}, null],
    skills: 'invalid' }];
  const before = JSON.stringify(rows); const report = assessDataQuality([{ kind: 'guides', rows }]);
  assert.equal(report.version, 3); assert.equal(report.summary.passed, 3);
  assert.equal(report.summary.needsReview, 4); assert.equal(report.truncated, false);
  assert.ok(report.checks.some((item) => item.path === '$.faq[1]' && item.message.includes('answerZh')));
  assert.equal(JSON.stringify(rows), before);
  const skills = assessDataQuality([{ kind: 'characters', rows: [{ id: 'c', skills: [{ name: 'zh', nameEn: 'en', nameJa: 'ja', description: 'zh' }] }] }]);
  assert.equal(skills.summary.passed, 1); assert.equal(skills.summary.needsReview, 1);
});

test('explicit references distinguish invalid IDs, missing targets and unavailable datasets', () => {
  const report = assessDataQuality([{ kind: 'characters', rows: [{ id: 'c' }] }, { kind: 'guides', rows: [{ id: 'g',
    nested: { characterId: 'c', characterIds: ['missing'], weaponId: 'w', materialIds: 'not-array', mysteryId: 'x' } }] }]);
  assert.deepEqual(report.checks.map((item) => item.reason), ['resolved', 'missing_target', 'target_dataset_unavailable', 'invalid_type_or_id', 'unconfigured_reference']);
  assert.equal(report.summary.passed, 1); assert.equal(report.summary.needsReview, 4);
  assert.equal(report.permissions.autoConfirm, false);
});

test('diagnostic output and nested traversal explicitly flag truncation', () => {
  const report = assessDataQuality([{ kind: 'guides', rows: [{ id: 'g', faq: Array.from({ length: 201 }, () => ({})) }] }]);
  assert.equal(report.truncated, true); assert.equal(report.checks.length, 400);
  const deep = {}; let node = deep; for (let i = 0; i < 20; i++) { node.child = {}; node = node.child; }
  assert.equal(assessDataQuality([{ kind: 'guides', rows: [{ id: 'g', deep }] }]).truncated, true);
  const large = assessDataQuality([{ kind: 'characters', rows: Array.from({ length: 2100 }, (_, i) => ({ id: `c-${i}`, description: 'x' })) }]);
  assert.equal(large.checks.length, 2000); assert.equal(large.truncated, true);
});
