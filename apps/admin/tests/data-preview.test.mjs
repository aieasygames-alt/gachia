import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDataPreview } from '../src/data-preview.mjs';

function review(rows, kind = 'characters') {
  return { id: 'review', packetDigest: 'digest', snapshot: { contents: [{
    path: `packages/data/games/hi3/raw-${kind}.json`, content: JSON.stringify(rows),
  }] } };
}
const row = { id: 'example', name: '角色', nameEn: 'Character', nameJa: 'キャラ',
  description: '<script>steal()</script>', descriptionEn: 'Body', descriptionJa: '本文' };

test('data preview renders three languages as escaped text with no application execution', () => {
  const input = review([row]); const before = structuredClone(input);
  const preview = buildDataPreview(input);
  assert.deepEqual(input, before);
  assert.equal(preview.pages.length, 3);
  assert.equal(preview.summary.browserExecuted, false);
  assert.equal(preview.summary.publish, false);
  assert.ok(preview.pages[0].html.includes('&lt;script&gt;steal()&lt;/script&gt;'));
  assert.ok(!preview.pages[0].html.includes('<script>'));
  assert.ok(preview.pages[0].html.includes("default-src 'none'"));
  assert.equal(preview.checks.find((item) => item.ruleId === 'site.routes').status, 'not_covered');
});

test('empty, unknown and deleted data never count as preview passed; missing body fails', () => {
  assert.equal(buildDataPreview(review([])).summary.status, 'not_covered');
  assert.equal(buildDataPreview(review([row], 'unknown')).exclusions.length, 1);
  const deleted = review([]); deleted.snapshot.contents[0].deleted = true;
  assert.equal(buildDataPreview(deleted).exclusions.length, 1);
  assert.equal(buildDataPreview(review([{ ...row, descriptionJa: '' }])).summary.status, 'failed');
});

test('preview page budget rejects rather than silently truncating', () => {
  assert.throws(() => buildDataPreview(review(Array.from({ length: 41 }, (_, id) => ({ ...row, id: `entity-${id}` })))), (error) => error.status === 409);
});

test('malformed containers and entity IDs never render ambiguous or duplicate preview pages', () => {
  for (const rows of [null, {}, 'text', [null], [[]], [{ ...row, id: 12 }], [{ ...row, id: ['example'] }],
    [{ ...row, id: '../unsafe' }], [row, row]]) {
    const input = review(rows); const before = structuredClone(input);
    assert.throws(() => buildDataPreview(input), (error) => error.status === 409);
    assert.deepEqual(input, before);
  }
});
