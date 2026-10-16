import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { batchContext, assessBatchClosure } from '../src/batch-lifecycle.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'batch-closure-'));
  const file = join(dir, 'synthetic.sqlite'); const store = openStore(file);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const evidence = store.importEvidence({ title: 'Synthetic', body: 'Synthetic quote', url: 'https://example.com', sourceType: 'official_claim', language: 'en', server: 'Global' }).evidence;
  const batch = store.createBatch(evidence.id, () => ({ status: 'awaiting_fact_review', capabilities: { edit: false, publish: false } })).batch;
  const fact = store.createFact({ evidenceId: evidence.id, entity: 'Synthetic', field: 'name', value: 'Synthetic quote', quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
  store.reviewFact({ factId: fact.id, expectedRevision: fact.revision, decision: 'confirmed', reviewer: 'fixture', note: 'Synthetic', sourceChecked: true, scopeChecked: true, valueChecked: true });
  const context = { index: { fingerprint: 'synthetic-content' }, baseline: { commit: 'synthetic-commit', dirty: false } };
  const input = { batchId: batch.id, requestId: randomUUID(), contextDigest: batchContext(batch, store.facts(), context.index, context.baseline),
    reason: 'Already covered', contentCheck: 'Synthetic file/entity verified', reviewer: 'fixture-agent', reviewerType: 'agent', authorizationBasis: 'Synthetic test only', confirmNoUpdate: true };
  return { store, file, batch, fact, context, input };
}

test('closure persists without schema migration, preserves snapshot, audits once and fences revision', (t) => {
  const { store, file, batch, context, input } = fixture(t);
  const result = store.closeBatch(input, context); const closed = result.batch;
  assert.equal(result.duplicate, false);
  assert.deepEqual({ ...closed, lifecycle: undefined }, { ...batch, lifecycle: undefined });
  assert.equal(closed.lifecycle.closure.identityAssurance, 'self_reported');
  assert.deepEqual(closed.lifecycle.closure.permissions, { edit: false, publish: false });
  assert.equal(store.closeBatch(input, context).duplicate, true);
  assert.equal(store.events().filter((event) => event.kind === 'batch.closed_no_update').length, 1);
  assert.throws(() => store.closeBatch({ ...input, reason: 'Different' }, context), /冲突/);
  assert.throws(() => store.closeBatch({ ...input, requestId: randomUUID() }, context), /冲突/);
  assert.throws(() => store.createRevision({ batchId: batch.id, requestId: randomUUID(), expectedLatest: 0, note: 'Synthetic', selectedFacts: [{ id: 'fixture', revision: 1 }] }, context), /任务已结束/);
  const reopened = openStore(file);
  try {
    assert.equal(reopened.storageHealth().schemaVersion, 13);
    assert.deepEqual(reopened.batches()[0], closed);
    assert.equal(reopened.closeBatch(input, context).duplicate, true);
  } finally { reopened.close(); }
  assert.equal(assessBatchClosure(closed, store.facts(), context.index, context.baseline).contextCurrent, true);
  assert.equal(assessBatchClosure(closed, store.facts(), { fingerprint: 'changed' }, context.baseline).contextCurrent, false);
});

test('missing confirmations, identity, stale content/code/facts and unknown task cannot close', (t) => {
  const { store, batch, fact, context, input } = fixture(t);
  for (const patch of [{ reason: '' }, { contentCheck: '' }, { confirmNoUpdate: false }, { authorizationBasis: '' }, { contextDigest: 'invalid' }]) {
    assert.throws(() => store.closeBatch({ ...input, ...patch }, context));
  }
  assert.throws(() => store.closeBatch({ ...input, batchId: 'missing' }, context), /not found/);
  assert.throws(() => store.closeBatch(input, { ...context, index: { fingerprint: 'changed' } }), /上下文/);
  assert.throws(() => store.closeBatch(input, { ...context, baseline: { commit: 'changed' } }), /上下文/);
  const confirmed = store.facts()[0];
  store.reviewFact({ factId: fact.id, expectedRevision: confirmed.revision, decision: 'needs_review', reviewer: 'fixture', note: 'Changed', sourceChecked: false, scopeChecked: false, valueChecked: false });
  assert.throws(() => store.closeBatch(input, context), /全部已记录事实/);
  const pending = store.facts()[0];
  store.reviewFact({ factId: pending.id, expectedRevision: pending.revision, decision: 'confirmed', reviewer: 'fixture', note: 'Reconfirmed', sourceChecked: true, scopeChecked: true, valueChecked: true });
  assert.throws(() => store.closeBatch(input, context), /上下文/);
  assert.equal(store.batches()[0].lifecycle, undefined);
  assert.equal(assessBatchClosure(batch, store.facts(), context.index, context.baseline).status, 'open');
});

test('audit insert failure rolls back closure and permits the same request after repair', (t) => {
  const { store, file, input, context } = fixture(t);
  const db = new DatabaseSync(file);
  try {
    db.exec("CREATE TRIGGER reject_closure BEFORE INSERT ON events WHEN NEW.kind='batch.closed_no_update' BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
    assert.throws(() => store.closeBatch(input, context), /synthetic audit failure/);
    assert.equal(store.batches()[0].lifecycle, undefined);
    db.exec('DROP TRIGGER reject_closure');
    assert.equal(store.closeBatch(input, context).duplicate, false);
  } finally { db.close(); }
});

test('isolated snapshot recovery retains closure and audit without changing source or backup bytes', (t) => {
  const { store, file, input, context } = fixture(t);
  const closed = store.closeBatch(input, context).batch;
  const backup = `${file}.backup`; const restored = `${file}.restored`;
  const source = new DatabaseSync(file);
  try { source.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`); } finally { source.close(); }
  const before = readFileSync(file); const backupBefore = readFileSync(backup);
  copyFileSync(backup, restored);
  const recovered = openStore(restored);
  try {
    assert.deepEqual(recovered.batches()[0], closed);
    assert.equal(recovered.events().filter((event) => event.kind === 'batch.closed_no_update').length, 1);
    assert.equal(recovered.closeBatch(input, context).duplicate, true);
    assert.equal(recovered.storageHealth().schemaVersion, 13);
  } finally { recovered.close(); }
  assert.deepEqual(readFileSync(file), before);
  assert.deepEqual(readFileSync(backup), backupBefore);
});

test('existing revisions prevent closure rather than leaving previously approved drafts active', (t) => {
  const { store, batch, context, input } = fixture(t);
  const fact = store.facts()[0];
  store.createRevision({ batchId: batch.id, requestId: randomUUID(), expectedLatest: 0, note: 'Synthetic', selectedFacts: [{ id: fact.id, revision: fact.revision }] }, context);
  assert.throws(() => store.closeBatch(input, context), /已有修订/);
  assert.equal(store.batches()[0].lifecycle, undefined);
});
