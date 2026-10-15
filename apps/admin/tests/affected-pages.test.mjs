import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affectedPages } from '../src/affected-pages.mjs';
const packet = (before, after) => ({ snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-characters.json',
  baselineContent: JSON.stringify(before), content: JSON.stringify(after) }] } });
test('entity changes include all added, modified, deleted records, but not unchanged ones', () => {
  const plan = affectedPages(packet([{ id: 'same' }, { id: 'edit', name: 'old' }, { id: 'remove' }],
    [{ id: 'same' }, { id: 'edit', name: 'new' }, { id: 'add' }]));
  assert.deepEqual(plan.changes.map((item) => item.type).sort(), ['added', 'deleted', 'modified']);
  assert.equal(plan.pages.length, 15);
  assert.ok(!plan.pages.some((item) => item.entityId === 'same'));
  const directory = plan.pages.find((item) => item.path === '/zh/hi3/characters');
  assert.equal(directory.expectedLinks.length, 2);
  assert.equal(directory.removedLinks.length, 1);
});
test('budget refuses truncation; missing baseline is uncovered; reordering is not a content update', () => {
  assert.throws(() => affectedPages(packet([], Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}` })))), /预算/);
  const old = packet([], []); delete old.snapshot.contents[0].baselineContent;
  assert.equal(affectedPages(old).notCovered.length, 1);
  assert.equal(affectedPages(packet([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).changes.length, 0);
});

test('entity ID types and page budgets cannot use coercion to bypass validation', () => {
  for (const id of [12, true, ['valid'], null, '', '../unsafe']) {
    assert.throws(() => affectedPages(packet([], [{ id }])), /实体 ID/);
    assert.throws(() => affectedPages(packet([{ id }], [])), /实体 ID/);
  }
  for (const row of [null, [], 'text']) assert.throws(() => affectedPages(packet([], [row])), /实体 ID/);
  assert.throws(() => affectedPages(packet([], [{ id: 'same' }, { id: 'same' }])), /重复/);
  for (const budget of [NaN, Infinity, 0, -1, 3.5, '60', 61]) {
    assert.throws(() => affectedPages(packet([], []), budget), /预算/);
  }
  assert.equal(affectedPages(packet([], []), 3).pages.length, 3);
  assert.throws(() => affectedPages(packet([], []), 2), (error) => error.status === 409);
});
