import assert from 'node:assert/strict';
import test from 'node:test';
import { planGuideWithdrawal, planPublishedGuideMerge } from './desktop-guide-intent.mjs';
import { validatePublishedGuideUpdate } from './desktop-published-baseline.mjs';
import { digest } from './desktop-release-assets.mjs';
import { newGuideSource } from './desktop-guide-contract.mjs';

const encode = JSON.stringify;
const source = [{ id: 'one', title: 'O', content: 'Import body', titleJa: null }, { id: 'two', title: 'Other O' }];
const publicA = [{ ...source[0], title: 'Public A', titleJa: '公開本文' }, source[1]];
function input(editorial = source, published = publicA) {
  const importText = encode(source), publishedText = encode(published), editorialText = encode(editorial);
  return { game: 'genshin', importText, publishedText, editorialText,
    expected: { importSHA256: digest(importText), publishedSHA256: digest(publishedText), editorialSHA256: digest(editorialText) } };
}

test('untouched O fields retain A while approved B changes another field or record', () => {
  const result = planPublishedGuideMerge(input([{ ...source[0], content: 'New body B' }, { ...source[1], title: 'New other B' }]));
  const rows = JSON.parse(result.content);
  assert.equal(rows[0].title, 'Public A'); assert.equal(rows[0].titleJa, '公開本文'); assert.equal(rows[0].content, 'New body B');
  assert.deepEqual(result.changed, ['one', 'two']); assert.equal(result.activationSupported, false);
  assert.doesNotThrow(() => validatePublishedGuideUpdate(encode(source), encode(publicA), result.content));
});

test('public CMS-born records absent from the approved overlay are preserved with stable suffix ordering', () => {
  const added = newGuideSource('genshin', { id: 'cms-existing', title: 'Existing', summary: 'Summary', body: 'Existing source body. '.repeat(8) }).guide;
  const next = { ...added, id: 'cms-another' };
  const result = planPublishedGuideMerge(input([...source, next], [...publicA, added]));
  const rows = JSON.parse(result.content);
  assert.deepEqual(rows.map(row => row.id), ['one', 'two', 'cms-another', 'cms-existing']);
  assert.deepEqual(rows.at(-1), added);
});

test('three-way source drift, ambiguous concurrent replacement and stray intents fail closed', () => {
  const args = input([{ ...source[0], title: 'Different B' }, source[1]]);
  assert.throws(() => planPublishedGuideMerge(args), /Concurrent field conflict/);
  const intents = [{ id: 'one', field: 'title', action: 'replace-public' }];
  assert.equal(JSON.parse(planPublishedGuideMerge({ ...args, intents }).content)[0].title, 'Different B');
  assert.throws(() => planPublishedGuideMerge({ ...args, publishedText: encode(source), intents }), /source drift/);
  assert.throws(() => planPublishedGuideMerge({ ...input(), intents: [{ id: 'unknown', field: 'title', action: 'reset-to-import' }] }), /missing/);
  assert.throws(() => planPublishedGuideMerge({ ...args, intents: [...intents, ...intents] }), /Duplicate/);
  assert.throws(() => planPublishedGuideMerge({ ...args, intents: [{ ...intents[0], role: 'admin' }] }), /Unreviewed intent fields/);
});

test('reset to exact O (including null/absent) requires intent; review plans cannot bypass production reset rejection', () => {
  for (const original of [{}, { titleJa: null }, { titleJa: '' }]) {
    const originalRows = [{ id: 'one', title: 'O', ...original }], publishedRows = [{ ...originalRows[0], titleJa: 'Public A' }];
    const args = input();
    args.importText = encode(originalRows); args.publishedText = encode(publishedRows); args.editorialText = encode(originalRows);
    args.expected = { importSHA256: digest(args.importText), publishedSHA256: digest(args.publishedText), editorialSHA256: digest(args.editorialText) };
    const preserved = planPublishedGuideMerge(args); assert.equal(JSON.parse(preserved.content)[0].titleJa, 'Public A');
    const resetInput = { ...args, intents: [{ id: 'one', field: 'titleJa', action: 'reset-to-import' }] };
    if (original.titleJa !== '') {
      assert.throws(() => planPublishedGuideMerge(resetInput), /Edited text must be a string/);
      continue;
    }
    const reset = planPublishedGuideMerge(resetInput);
    assert.equal(reset.productionReady, false);
    assert.throws(() => validatePublishedGuideUpdate(args.importText, args.publishedText, reset.content));
  }
});

test('CMS hold/delete are not withdrawal; website withdrawal needs a pinned cross-surface plan and exact recovery', () => {
  for (const action of ['not-found', 'gone', 'redirect']) {
    const args = { game: 'genshin', publishedText: encode(publicA), publishedSHA256: digest(encode(publicA)), id: 'one', policy: { action, ...(action === 'redirect' ? { targetId: 'two' } : {}) } };
    const plan = planGuideWithdrawal(args);
    assert.equal(plan.routes.length, 3); assert.equal(plan.cloudWrites, false); assert.equal(plan.activationSupported, false);
    assert.equal(plan.recoverySHA256, args.publishedSHA256); assert.equal(plan.requiredSurfaces.length, 7);
  }
  assert.throws(() => planGuideWithdrawal({ game: 'genshin', publishedText: '[]', publishedSHA256: digest('[]'), id: 'missing', policy: { action: 'gone' } }));
  const base = { game: 'genshin', publishedText: encode(publicA), publishedSHA256: digest(encode(publicA)), id: 'one' };
  for (const policy of [{ action: 'hold' }, { action: 'delete' }, { action: 'redirect', targetId: 'one' }, { action: 'redirect', targetId: 'https://external.invalid' }]) {
    assert.throws(() => planGuideWithdrawal({ ...base, policy }));
  }
});
