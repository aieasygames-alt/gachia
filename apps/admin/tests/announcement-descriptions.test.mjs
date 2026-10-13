import { test } from 'node:test';
import assert from 'node:assert/strict';
import { announcementDescriptions, applyAnnouncementDescriptions, assertAnnouncementDescriptionDelta } from '../src/announcement-descriptions.mjs';

const fixture = () => [
  { id: 'vermillion-liuli', name: 'unchanged name', status: 'available', description: 'old', descriptionEn: 'old', descriptionJa: 'old', nested: { value: 5 } },
  { id: 'vermillion-liuli-full-burn', description: 'old', descriptionEn: 'old', descriptionJa: 'old' },
  { id: 'other', descriptionEn: 'not reviewed' },
];

test('curated translations change only two description groups, without mutating input', () => {
  const before = fixture(); const saved = structuredClone(before);
  const after = applyAnnouncementDescriptions(before);
  assert.deepEqual(before, saved);
  assertAnnouncementDescriptionDelta(before, after);
  assert.deepEqual(after[2], before[2]);
  assert.equal(after[0].status, before[0].status);
  assert.deepEqual(after[0].nested, before[0].nested);
  assert.equal(Object.values(announcementDescriptions).flatMap((fields) => Object.keys(fields)).length, 6);
});

test('exact delta guard rejects unrelated edits, missing/duplicate targets and false live claims', () => {
  const before = fixture();
  for (const edit of [
    (rows) => { rows[0].name = 'invented localization'; },
    (rows) => { rows[0].status = 'live'; },
    (rows) => { rows[0].descriptionEn += ' Both forms activate the effect.'; },
    (rows) => { rows[2].descriptionEn = 'changed'; },
    (rows) => { rows.reverse(); },
  ]) {
    const after = applyAnnouncementDescriptions(before); edit(after);
    assert.throws(() => assertAnnouncementDescriptionDelta(before, after));
  }
  assert.throws(() => applyAnnouncementDescriptions(before.slice(1)));
  assert.throws(() => applyAnnouncementDescriptions([...before, before[0]]));
  assert.throws(() => applyAnnouncementDescriptions({}));
});

test('fixed text contract preserves English names and explicitly bounds client/localization claims', () => {
  for (const fields of Object.values(announcementDescriptions)) {
    for (const text of Object.values(fields)) {
      for (const name of ['Global', 'v9.0', 'Divine Key Vermillion Liuli', 'Vermillion Liuli: Full Burn', 'Fenghuang of Vicissitude', 'PRI-ARM']) assert.ok(text.includes(name));
      assert.ok(!text.includes('Wheel of Destiny'));
    }
    assert.ok(fields.description.includes('不代表已核实当前客户端的效果或可用状态'));
    assert.ok(fields.description.includes('不作为官方中文本地化名称'));
    assert.ok(fields.descriptionEn.includes('not verification of current client effects or availability'));
    assert.ok(fields.descriptionJa.includes('確認したものではありません'));
    assert.ok(fields.descriptionJa.includes('公式の日本語名称を示すものではありません'));
  }
});
