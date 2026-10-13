import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { validateDraftReview } from '../src/draft-reviews.mjs';
import { validateReviewIdentity } from '../src/review-identity.mjs';
import { validateReview, FactError } from '../src/facts.mjs';

test('agent identity persists without bypassing fact gates; omitted identity is not human', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-identity-'));
  const filename = join(directory, 'state.sqlite');
  const store = openStore(filename);
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: 'Example claim.',
    server: 'Global', language: 'en', url: 'https://example.com', title: 'Synthetic fixture' }).evidence;
  const fact = store.createFact({ evidenceId: evidence.id, entity: 'Example', field: 'claim', value: evidence.body,
    quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
  const input = { factId: fact.id, expectedRevision: 0, decision: 'confirmed', reviewer: 'Fixture agent, not real review',
    note: 'Synthetic test only', sourceChecked: true, scopeChecked: true, valueChecked: true,
    reviewerType: 'agent', authorizationBasis: 'Synthetic fixture authorization' };
  for (const patch of [{ authorizationBasis: '' }, { reviewerType: 'robot' }, { sourceChecked: false }]) {
    assert.throws(() => store.reviewFact({ ...input, ...patch }));
  }
  store.reviewFact({ ...input, identityAssurance: 'authenticated', publish: true });
  const reopened = openStore(filename);
  try {
    const record = reopened.reviews()[0];
    assert.equal(record.reviewerType, 'agent');
    assert.equal(record.authorizationBasis, input.authorizationBasis);
    assert.equal(record.identityAssurance, 'self_reported');
    assert.equal(record.publish, undefined);
  } finally { reopened.close(); }
  const { reviewerType, authorizationBasis, ...legacy } = input;
  store.reviewFact({ ...legacy, expectedRevision: 1, decision: 'needs_review' });
  assert.equal(store.reviews().find((item) => item.revision === 2).reviewerType, 'unspecified');
});

test('review metadata budgets apply before trimming and malformed input is a client error', () => {
  for (const input of [null, undefined, [], 'agent']) {
    assert.throws(() => validateReviewIdentity(input), (error) => error instanceof FactError && error.status === 400);
    assert.throws(() => validateReview(input, { revision: 0 }), (error) => error instanceof FactError && error.status === 400);
  }
  for (const reviewerType of ['agent', 'human', 'unspecified']) {
    assert.throws(() => validateReviewIdentity({ reviewerType, authorizationBasis: ' '.repeat(2000) + 'x' }), FactError);
    const identity = validateReviewIdentity({ reviewerType, authorizationBasis: ' ' + 'x'.repeat(1998) + ' ' });
    assert.equal(identity.authorizationBasis.length, 1998);
    assert.equal(identity.identityAssurance, 'self_reported');
  }
});

test('rejected review identity or stale revision leaves fact, history and events unchanged', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-review-fence-')); const store = openStore(join(directory, 'state.sqlite'));
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: 'Synthetic claim.',
    server: 'Global', language: 'en', url: 'https://example.com', title: 'Fixture' }).evidence;
  const fact = store.createFact({ evidenceId: evidence.id, entity: 'Fixture', field: 'claim', value: evidence.body,
    quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
  const input = { factId: fact.id, expectedRevision: 0, decision: 'confirmed', reviewer: 'Fixture agent', note: 'Synthetic only',
    sourceChecked: true, scopeChecked: true, valueChecked: true, reviewerType: 'agent', authorizationBasis: 'Fixture authorization' };
  store.reviewFact(input);
  const before = JSON.stringify({ facts: store.facts(), reviews: store.reviews(), events: store.events() });
  for (const patch of [{}, { expectedRevision: 1, authorizationBasis: ' '.repeat(2000) + 'x' }, { expectedRevision: 1, reviewerType: 'robot' }]) {
    assert.throws(() => store.reviewFact({ ...input, ...patch }), FactError);
    assert.equal(JSON.stringify({ facts: store.facts(), reviews: store.reviews(), events: store.events() }), before);
  }
});

test('draft review identity does not grant publication or bypass exact packet checks', () => {
  const packet = { digest: 'digest', workspaceId: 'workspace', validation: { id: 'validation', checks: [],
    summary: { failed: 0 } }, manifest: { changes: [{}] } };
  const input = { requestId: '1234567890123456', expectedLatest: 0, decision: 'accepted', reviewer: 'Fixture agent',
    note: 'Synthetic only', packetDigest: packet.digest, workspaceId: packet.workspaceId, validationId: packet.validation.id,
    acknowledgedRules: [], diffChecked: true, factsChecked: true, noPublishUnderstood: true,
    reviewerType: 'agent', authorizationBasis: 'Fixture authorization' };
  assert.equal(validateDraftReview(input, packet).reviewerType, 'agent');
  for (const patch of [{ authorizationBasis: '' }, { packetDigest: 'stale' }, { noPublishUnderstood: false }]) {
    assert.throws(() => validateDraftReview({ ...input, ...patch }, packet));
  }
  const { reviewerType, authorizationBasis, ...legacy } = input;
  assert.equal(validateDraftReview(legacy, packet).reviewerType, 'unspecified');
});
