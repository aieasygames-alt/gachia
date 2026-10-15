import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewPreparation } from '../src/review-preparation.mjs';

test('malformed historical article containers or bodies remain unavailable, never approved', () => {
  const evidence = { id: 'evidence', sourceSnapshot: { sourceId: 'source', digest: 'digest', articleId: 'article', articleDigest: 'hash' } };
  for (const articles of [null, {}, 'text', [null], [{ id: 'article', rawHtml: null }], [{ id: 'article', rawHtml: {} }]]) {
    const result = reviewPreparation(evidence, [], { sourceSnapshot: () => ({ articles }) });
    assert.equal(result.status, 'context_unavailable');
    assert.equal(result.context, null);
    assert.equal(result.permissions.autoConfirm, false);
  }
});
