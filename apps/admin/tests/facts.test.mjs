import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { buildBatch } from '../src/content.mjs';
import { startWorkbench } from '../src/server.mjs';

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-facts-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'state.sqlite');
  const store = openStore(filename);
  t.after(() => store.close());
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: '角色A装备武器B后开启效果C。',
    server: '国服', language: 'zh', url: 'https://example.com/notice', title: '公告' }).evidence;
  const input = { evidenceId: evidence.id, entity: '角色A', field: '装备条件', value: '装备武器B后开启效果C',
    quote: evidence.body, server: '国服', lifecycle: 'live', validFrom: '', validUntil: '' };
  return { directory, filename, store, evidence, input };
}
const review = (fact, patch = {}) => ({ factId: fact.id, expectedRevision: fact.revision, decision: 'confirmed',
  reviewer: '本机审核人', note: '已核对原文及客户端适用条件', sourceChecked: true, scopeChecked: true, valueChecked: true, ...patch });

test('field validation binds exact evidence, server and lifecycle; ignores caller verification claims', (t) => {
  const { store, input } = setup(t);
  const before = { facts: store.facts(), reviews: store.reviews(), events: store.events() };
  for (const patch of [{ evidenceId: 'missing' }, { quote: '原文没有的内容' }, { server: '国际服' },
    { lifecycle: 'approved' }, { validFrom: '2026-02-30' }, { validFrom: '2026-10-10', validUntil: '2026-10-09' },
    { entity: '' }, { value: 'x'.repeat(4001) }]) {
    assert.throws(() => store.createFact({ ...input, ...patch }));
    assert.deepEqual({ facts: store.facts(), reviews: store.reviews(), events: store.events() }, before);
  }
  const { fact } = store.createFact({ ...input, status: 'confirmed', sourceType: 'discussion' });
  assert.equal(fact.status, 'needs_review');
  assert.equal(fact.sourceType, 'official_claim');
  assert.equal(store.createFact(input).duplicate, true);
});

test('confirmation requires explicit checks; revisions prevent stale approval and history persists', (t) => {
  const { store, input, filename } = setup(t);
  const { fact } = store.createFact(input);
  const before = { facts: store.facts(), reviews: store.reviews(), events: store.events() };
  assert.throws(() => store.reviewFact(review(fact, { valueChecked: false })));
  assert.throws(() => store.reviewFact(review(fact, { note: '' })));
  assert.deepEqual({ facts: store.facts(), reviews: store.reviews(), events: store.events() }, before);
  const confirmed = store.reviewFact(review(fact)).fact;
  assert.equal(confirmed.status, 'confirmed');
  const confirmedState = { facts: store.facts(), reviews: store.reviews(), events: store.events() };
  assert.throws(() => store.reviewFact(review(fact)), (error) => error.status === 409);
  assert.deepEqual({ facts: store.facts(), reviews: store.reviews(), events: store.events() }, confirmedState);
  const revoked = store.reviewFact(review(confirmed, { decision: 'needs_review', note: '发现条件尚未核实' })).fact;
  assert.equal(revoked.revision, 2);
  assert.equal(store.reviews().length, 2);
  const second = openStore(filename);
  assert.equal(second.facts()[0].status, 'needs_review');
  assert.equal(second.reviews().length, 2);
  second.close();
});

test('discussion and unknown-scope facts cannot be confirmed, but may be rejected', (t) => {
  const { store, evidence, input } = setup(t);
  for (const patch of [{ sourceType: 'discussion' }, { server: '待确认' }]) {
    const other = store.importEvidence({ ...evidence, ...patch, id: undefined, fingerprint: undefined }).evidence;
    const { fact } = store.createFact({ ...input, evidenceId: other.id, server: other.server });
    assert.throws(() => store.reviewFact(review(fact)));
    assert.equal(store.reviewFact(review(fact, { decision: 'rejected' })).fact.status, 'rejected');
  }
  const { fact } = store.createFact({ ...input, lifecycle: 'unknown' });
  assert.throws(() => store.reviewFact(review(fact)));
});

test('task snapshots bind reviewed fact revisions and never change after revocation', (t) => {
  const { store, evidence, input } = setup(t);
  const confirmed = store.reviewFact(review(store.createFact(input).fact)).fact;
  const index = { entries: [], fingerprint: 'snapshot', deployment: { worker: 'gachia' }, findings: [] };
  const make = (item, facts) => buildBatch(item, index, { commit: 'abc', dirty: true }, facts);
  const batch = store.createBatch(evidence.id, make).batch;
  assert.equal(batch.confirmedFacts[0].revision, 1);
  store.reviewFact(review(confirmed, { decision: 'rejected' }));
  const old = store.createBatch(evidence.id, make).batch;
  assert.equal(old.confirmedFacts[0].status, 'confirmed');
  assert.equal(old.status, 'awaiting_fact_review');
  assert.equal(old.capabilities.publish, false);
});

test('v1 migration backs up committed WAL data and preserves old records', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-migration-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'old.sqlite');
  const old = new DatabaseSync(filename);
  old.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE evidence(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE, payload TEXT, created_at TEXT);
    CREATE TABLE batches(id TEXT PRIMARY KEY, evidence_id TEXT UNIQUE, payload TEXT, created_at TEXT);
    CREATE TABLE events(id INTEGER PRIMARY KEY, kind TEXT, object_id TEXT, created_at TEXT);
    PRAGMA user_version=1;
    INSERT INTO evidence VALUES('old','hash','{"id":"old"}','2026-10-10');`);
  const migrated = openStore(filename);
  assert.equal(migrated.evidence()[0].id, 'old');
  assert.deepEqual(migrated.facts(), []);
  const backup = readdirSync(directory).find((name) => name.endsWith('.bak'));
  assert.ok(backup);
  const snapshot = new DatabaseSync(join(directory, backup));
  assert.equal(snapshot.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(snapshot.prepare('SELECT id FROM evidence').get().id, 'old');
  snapshot.close(); migrated.close(); old.close();
});

test('HTTP field review endpoints enforce validation and revision conflict', async (t) => {
  const { directory } = setup(t);
  const app = await startWorkbench({ dataDir: join(directory, 'http'), port: 0 });
  t.after(() => app.close());
  const post = (path, body) => fetch(`${app.origin}/api/${path}`, { method: 'POST',
    headers: { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('facts', null)).status, 400);
  const evidence = (await (await post('evidence', { title: '公告', url: 'https://example.com/notice',
    body: '角色A装备武器B后开启效果C。', server: '国服', language: 'zh', publishedAt: '', sourceType: 'official_claim' })).json()).evidence;
  const response = await post('facts', { evidenceId: evidence.id, entity: '角色A', field: '装备', value: '武器B',
    quote: evidence.body, server: '国服', lifecycle: 'live', validFrom: '', validUntil: '' });
  assert.equal(response.status, 201);
  const { fact } = await response.json();
  assert.equal((await post('fact-reviews', review(fact, { sourceChecked: false }))).status, 400);
  assert.equal((await post('fact-reviews', review(fact, { reviewerType: 'agent', authorizationBasis: '' }))).status, 400);
  const accepted = await post('fact-reviews', review(fact, { reviewerType: 'agent', authorizationBasis: 'HTTP synthetic test only' }));
  assert.equal(accepted.status, 201);
  assert.equal((await accepted.json()).review.reviewerType, 'agent');
  assert.equal((await post('fact-reviews', review(fact))).status, 409);
});
