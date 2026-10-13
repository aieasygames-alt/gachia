import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { assessRevision, fingerprint } from '../src/revisions.mjs';
import { startWorkbench } from '../src/server.mjs';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-revision-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'state.sqlite');
  const store = openStore(filename); t.after(() => store.close());
  const evidence = store.importEvidence({ gameId: 'hi3', title: '公告', server: '国服', language: 'zh',
    sourceType: 'official_claim', body: '角色A装备武器B。', url: 'https://example.com/notice' }).evidence;
  const batch = store.createBatch(evidence.id, () => ({ gameId: 'hi3', title: '公告', allowedPaths: ['safe'], protectedPaths: ['protected'] })).batch;
  const fact = store.createFact({ evidenceId: evidence.id, entity: '角色A', field: '装备', value: '武器B',
    quote: evidence.body, server: evidence.server, lifecycle: 'live', validFrom: '', validUntil: '' }).fact;
  const review = (current, decision = 'confirmed') => store.reviewFact({ factId: current.id, expectedRevision: current.revision,
    reviewer: 'test', note: '核验记录', decision, sourceChecked: true, scopeChecked: true, valueChecked: true }).fact;
  const context = { baseline: { commit: 'abc', dirty: true }, index: { fingerprint: 'content', deployment: { worker: 'gachia' }, findings: [] } };
  const input = (current, patch = {}) => ({ batchId: batch.id, expectedLatest: 0, requestId: randomUUID(), note: '选择已核验字段',
    selectedFacts: [{ id: current.id, revision: current.revision }], ...patch });
  return { store, filename, directory, batch, fact, review, context, input };
}

test('revision selection requires confirmed in-batch facts and current review version', (t) => {
  const { store, fact, review, context, input } = fixture(t);
  assert.throws(() => store.createRevision(input(fact), context));
  const confirmed = review(fact);
  for (const patch of [{ selectedFacts: [] }, { selectedFacts: [{ id: 'absent', revision: 1 }] },
    { selectedFacts: [{ id: confirmed.id, revision: 0 }] }, { note: '' }, { batchId: 'missing' },
    { selectedFacts: [{ id: confirmed.id, revision: 1 }, { id: confirmed.id, revision: 1 }] }]) {
    assert.throws(() => store.createRevision(input(confirmed, patch), context));
  }
  assert.equal(store.revisions().length, 0);
  const { revision } = store.createRevision(input(confirmed), context);
  assert.equal(revision.number, 1);
  assert.equal(revision.snapshot.confirmedFacts.length, 1);
  assert.equal(revision.snapshotDigest, fingerprint(revision.snapshot));
  assert.equal(revision.snapshot.capabilities.publish, false);
});

test('request idempotency, version conflicts and chained revisions persist', (t) => {
  const { store, fact, review, context, input, filename } = fixture(t);
  const confirmed = review(fact); const request = input(confirmed);
  const first = store.createRevision(request, context).revision;
  assert.equal(store.createRevision(request, context).duplicate, true);
  assert.throws(() => store.createRevision({ ...request, note: 'changed' }, context), (error) => error.status === 409);
  assert.throws(() => store.createRevision(input(confirmed), context), (error) => error.status === 409);
  const second = store.createRevision(input(confirmed, { expectedLatest: 1 }), context).revision;
  assert.equal(second.number, 2);
  assert.equal(second.parentRevisionId, first.id);
  const reopened = openStore(filename);
  assert.equal(reopened.revisions().length, 2);
  assert.equal(reopened.getRevision(first.id).snapshotDigest, first.snapshotDigest);
  reopened.close();
});

test('revocation permanently invalidates affected revisions, even after reconfirmation and retry', (t) => {
  const { store, fact, review, context, input, filename } = fixture(t);
  const confirmed = review(fact); const request = input(confirmed);
  const first = store.createRevision(request, context).revision;
  assert.equal(assessRevision(first, store.facts(), context.index, context.baseline).assessment.status, 'current');
  const revoked = review(confirmed, 'needs_review');
  assert.ok(store.getRevision(first.id).invalidatedAt);
  const reconfirmed = review(revoked);
  const replay = store.createRevision(request, context).revision;
  assert.equal(assessRevision(replay, store.facts(), context.index, context.baseline).assessment.status, 'invalid');
  const second = store.createRevision(input(reconfirmed, { expectedLatest: 1 }), context).revision;
  assert.equal(assessRevision(second, store.facts(), context.index, context.baseline).assessment.status, 'current');
  assert.equal(assessRevision(second, store.facts(), { ...context.index, fingerprint: 'drift' }, context.baseline).assessment.status, 'invalid');
  assert.equal(assessRevision(second, store.facts(), context.index, { commit: 'new' }).assessment.status, 'invalid');
  const reopened = openStore(filename);
  assert.ok(reopened.getRevision(first.id).invalidatedAt);
  assert.equal(reopened.getRevision(first.id).snapshotDigest, first.snapshotDigest);
  reopened.close();
});

test('v2 migration backs up data once before adding revisions', (t) => {
  const { store, directory, filename } = fixture(t);
  // Use a separate v2 database to simulate an existing installation without downgrading an open DB.
  const source = new DatabaseSync(filename);
  const target = join(directory, 'v2.sqlite');
  source.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`); source.close();
  const v2 = new DatabaseSync(target); v2.exec('DROP TABLE execution_intents; DROP TABLE execution_materials; DROP TABLE official_source_runs; DROP TABLE official_sources; DROP TABLE application_previews; DROP TABLE data_previews; DROP TABLE draft_reviews; DROP TABLE draft_validations; DROP TABLE draft_workspaces; DROP TABLE batch_revisions; PRAGMA user_version=2'); v2.close();
  const upgraded = openStore(target);
  assert.equal(upgraded.evidence().length, store.evidence().length);
  assert.deepEqual(upgraded.revisions(), []); upgraded.close();
  const backups = readdirSync(directory).filter((name) => name.startsWith('v2.sqlite.v2-'));
  assert.equal(backups.length, 1);
  const backup = new DatabaseSync(join(directory, backups[0]));
  assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 2); backup.close();
  const again = openStore(target); again.close();
  assert.equal(readdirSync(directory).filter((name) => name.endsWith('.bak')).length, 1);
});

test('HTTP revision creation and export recheck facts after invalidation', async (t) => {
  const { directory } = fixture(t);
  const app = await startWorkbench({ dataDir: join(directory, 'http'), port: 0 }); t.after(() => app.close());
  const headers = { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' };
  const post = (path, payload) => fetch(`${app.origin}/api/${path}`, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal((await post('revisions', null)).status, 400);
  assert.equal((await fetch(`${app.origin}/api/revisions/missing`)).status, 401);
  const evidence = (await (await post('evidence', { title: '公告', url: 'https://example.com/notice', body: '角色A装备武器B',
    server: '国服', sourceType: 'official_claim', language: 'zh', publishedAt: '' })).json()).evidence;
  const batch = (await (await post('batches', { evidenceId: evidence.id })).json()).batch;
  const fact = (await (await post('facts', { evidenceId: evidence.id, entity: '角色A', field: '装备', value: '武器B', quote: '角色A',
    server: '国服', lifecycle: 'live', validFrom: '', validUntil: '' })).json()).fact;
  const reviewInput = { factId: fact.id, expectedRevision: 0, decision: 'confirmed', reviewer: 'test', note: 'checked',
    sourceChecked: true, scopeChecked: true, valueChecked: true };
  await post('fact-reviews', reviewInput);
  const response = await post('revisions', { batchId: batch.id, requestId: randomUUID(), expectedLatest: 0, note: '修订',
    selectedFacts: [{ id: fact.id, revision: 1 }] });
  assert.equal(response.status, 201); const { revision } = await response.json();
  await post('fact-reviews', { ...reviewInput, expectedRevision: 1, decision: 'rejected' });
  const exported = await (await fetch(`${app.origin}/api/revisions/${revision.id}`, { headers })).json();
  assert.equal(exported.revision.assessment.status, 'invalid');
  assert.ok(exported.exportedAt);
});
