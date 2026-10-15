import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, copyFileSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { assessRevision } from '../src/revisions.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-recovery-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, file: join(dir, 'state.sqlite') };
}

test('restored review history and revision chain retain permanent invalidation and idempotency', (t) => {
  const { dir, file } = fixture(t); const store = openStore(file); t.after(() => store.close());
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: 'Synthetic review quote',
    server: 'Global', language: 'en', title: 'Synthetic recovery', url: 'https://example.com/recovery-history' }).evidence;
  const batch = store.createBatch(evidence.id, () => ({ gameId: 'hi3', title: 'Fixture', allowedPaths: ['safe'], protectedPaths: [] })).batch;
  const pending = store.createFact({ evidenceId: evidence.id, entity: 'Fixture', field: 'condition', value: 'Synthetic review quote',
    quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
  const review = (fact, decision) => store.reviewFact({ factId: fact.id, expectedRevision: fact.revision, decision,
    reviewer: 'synthetic-test-only', note: 'Temporary fixture, not a human production approval', sourceChecked: true, scopeChecked: true, valueChecked: true }).fact;
  const context = { baseline: { commit: 'fixture', dirty: false }, index: { fingerprint: 'fixture-content', deployment: { worker: 'gachia' }, findings: [] } };
  const request = (fact, expectedLatest) => ({ batchId: batch.id, expectedLatest, requestId: randomUUID(), note: 'Temporary revision fixture', selectedFacts: [{ id: fact.id, revision: fact.revision }] });
  const confirmed = review(pending, 'confirmed'); const firstRequest = request(confirmed, 0);
  const first = store.createRevision(firstRequest, context).revision;
  const revoked = review(confirmed, 'needs_review'); const reconfirmed = review(revoked, 'confirmed');
  const secondRequest = request(reconfirmed, 1); const second = store.createRevision(secondRequest, context).revision;
  const expected = { facts: store.facts(), reviews: store.reviews(), revisions: store.revisions(), events: store.events() };
  const snapshot = join(dir, 'review-snapshot.sqlite'); const db = new DatabaseSync(file);
  db.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`); db.close();
  const target = join(dir, 'restored-history.sqlite'); copyFileSync(snapshot, target);
  const restored = openStore(target); t.after(() => restored.close());
  assert.deepEqual({ facts: restored.facts(), reviews: restored.reviews(), revisions: restored.revisions(), events: restored.events() }, expected);
  assert.equal(restored.reviews().length, 3); assert.equal(restored.getRevision(second.id).parentRevisionId, first.id);
  assert.equal(assessRevision(restored.getRevision(first.id), restored.facts(), context.index, context.baseline).assessment.status, 'invalid');
  assert.equal(assessRevision(restored.getRevision(second.id), restored.facts(), context.index, context.baseline).assessment.status, 'current');
  assert.equal(restored.getRevision(first.id).snapshot.capabilities.publish, false);
  assert.equal(restored.createRevision(firstRequest, context).duplicate, true);
  assert.equal(restored.createRevision(secondRequest, context).duplicate, true);
  assert.deepEqual(restored.events(), expected.events);
});

test('non-SQLite and truncated backup copies are rejected without rewriting bytes', (t) => {
  const { dir, file } = fixture(t); const initialized = openStore(file); initialized.close();
  const original = readFileSync(file);
  const close = DatabaseSync.prototype.close; let closes = 0;
  t.mock.method(DatabaseSync.prototype, 'close', function () { closes++; return close.call(this); });
  for (const [name, bytes] of [['not-sqlite', Buffer.from('Not a SQLite backup')], ['truncated', original.subarray(0, 100)]]) {
    const target = join(dir, `${name}.sqlite`); writeFileSync(target, bytes);
    assert.throws(() => openStore(target));
    assert.deepEqual(readFileSync(target), bytes);
  }
  assert.equal(closes, 2);
  assert.deepEqual(readFileSync(file), original);
});

test('injected migration backup failure stops before schema changes and later retry preserves records', (t) => {
  const { dir, file } = fixture(t); const initialized = openStore(file);
  initialized.saveSourceRecord({ id: 'hi3-global-en', status: 'access_failed', digest: 'retained' }); initialized.close();
  const old = new DatabaseSync(file); old.exec('DROP INDEX official_source_runs_source_cursor; PRAGMA user_version=12'); old.close();
  const exec = DatabaseSync.prototype.exec; let failures = 0;
  const mock = t.mock.method(DatabaseSync.prototype, 'exec', function (sql) {
    if (sql.startsWith('VACUUM INTO')) { failures++; throw new Error('fixture backup write failure'); }
    return exec.call(this, sql);
  });
  assert.throws(() => openStore(file), /fixture backup write failure/); mock.mock.restore();
  assert.equal(failures, 1);
  const check = new DatabaseSync(file, { readOnly: true });
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 12);
  assert.equal(check.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='official_source_runs_source_cursor'").get().n, 0);
  assert.equal(check.prepare('SELECT count(*) AS n FROM official_source_runs').get().n, 1); check.close();
  assert.equal(readdirSync(dir).filter((name) => name.endsWith('.bak')).length, 0);
  const migrated = openStore(file); t.after(() => migrated.close());
  assert.equal(migrated.sourceRecord('hi3-global-en').digest, 'retained'); assert.equal(migrated.storageHealth().schemaVersion, 13);
  assert.equal(readdirSync(dir).filter((name) => name.endsWith('.bak')).length, 1);
});

test('failed migration rolls back and closes its connection before fixture repair and retry', (t) => {
  const { dir, file } = fixture(t); const initialized = openStore(file); initialized.close();
  const old = new DatabaseSync(file);
  old.exec('DROP TABLE official_source_runs; PRAGMA user_version=12'); old.close();
  const close = DatabaseSync.prototype.close; let closes = 0; let transactionAtClose;
  const mock = t.mock.method(DatabaseSync.prototype, 'close', function () {
    closes++; transactionAtClose = this.isTransaction; return close.call(this);
  });
  assert.throws(() => openStore(file), /no such table/);
  assert.equal(closes, 1); assert.equal(transactionAtClose, false); mock.mock.restore();
  const repair = new DatabaseSync(file);
  assert.equal(repair.prepare('PRAGMA user_version').get().user_version, 12);
  assert.equal(repair.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='official_source_runs_source_cursor'").get().n, 0);
  repair.exec('CREATE TABLE official_source_runs (id INTEGER PRIMARY KEY, source_id TEXT NOT NULL, payload TEXT NOT NULL)'); repair.close();
  const migrated = openStore(file); t.after(() => migrated.close());
  assert.equal(migrated.storageHealth().schemaVersion, 13);
  assert.equal(readdirSync(dir).filter((name) => name.endsWith('.bak')).length, 2);
});

test('cleanup errors do not mask the migration failure and close is still attempted', (t) => {
  const { file } = fixture(t); const initialized = openStore(file); initialized.close();
  const old = new DatabaseSync(file); old.exec('DROP TABLE official_source_runs; PRAGMA user_version=12'); old.close();
  const exec = DatabaseSync.prototype.exec; const close = DatabaseSync.prototype.close; let closes = 0;
  t.mock.method(DatabaseSync.prototype, 'exec', function (sql) {
    if (sql === 'ROLLBACK') throw new Error('fixture rollback failure');
    return exec.call(this, sql);
  });
  t.mock.method(DatabaseSync.prototype, 'close', function () {
    closes++; close.call(this); throw new Error('fixture close failure');
  });
  assert.throws(() => openStore(file), /no such table/);
  assert.equal(closes, 1);
});

test('SQLite snapshot restores evidence, pending facts, task history and source bytes into a separate database', (t) => {
  const { dir, file } = fixture(t); const store = openStore(file);
  t.after(() => store.close());
  const evidence = store.importEvidence({ gameId: 'hi3', sourceType: 'official_claim', body: 'Fixture exact quote',
    server: 'Global', language: 'en', title: 'Recovery fixture', url: 'https://example.com/recovery' }).evidence;
  store.createFact({ evidenceId: evidence.id, entity: 'Fixture', field: 'condition', value: 'Fixture exact quote',
    quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' });
  store.createBatch(evidence.id, () => ({ gameId: 'hi3', status: 'awaiting_fact_review', capabilities: { edit: false, publish: false } }));
  store.saveSourceRecord({ id: 'hi3-global-en', status: 'success_changed', digest: 'fixture-digest',
    lastSuccess: '2026-10-11T00:00:00Z', articles: [{ id: 'fixture', rawHtml: '<p>Original bytes</p>' }] });
  const expected = { evidence: store.evidence(), facts: store.facts(), batches: store.batches(), events: store.events(),
    source: store.sourceHistoryRun('hi3-global-en', 1), counts: store.storageHealth().counts };
  const snapshot = join(dir, 'snapshot.sqlite'); const connection = new DatabaseSync(file);
  connection.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`); connection.close();
  // Never copy a live database file: this copy is an independent completed SQLite snapshot.
  const restoredFile = join(dir, 'restored.sqlite'); copyFileSync(snapshot, restoredFile);
  store.saveSourceRecord({ id: 'hi3-global-en', status: 'access_failed' });
  const restored = openStore(restoredFile); t.after(() => restored.close());
  assert.deepEqual({ evidence: restored.evidence(), facts: restored.facts(), batches: restored.batches(), events: restored.events(),
    source: restored.sourceHistoryRun('hi3-global-en', 1), counts: restored.storageHealth().counts }, expected);
  assert.equal(restored.facts()[0].status, 'needs_review'); assert.equal(restored.reviews().length, 0);
  assert.equal(restored.batches()[0].capabilities.publish, false);
  assert.equal(store.sourceHistory('hi3-global-en').items.length, 2);
  assert.equal(restored.sourceHistory('hi3-global-en').items.length, 1);
  const check = new DatabaseSync(restoredFile, { readOnly: true });
  assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); check.close();
});

test('SQLITE_FULL rolls back source current/history/event writes and permits a later retry', (t) => {
  const { file } = fixture(t); const initial = openStore(file); initial.close();
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
  const pages = db.prepare('PRAGMA page_count').get().page_count;
  db.exec(`PRAGMA max_page_count=${pages}`);
  // SQLite page limits are a reproducible logical-full fixture, not host ENOSPC.
  const payload = JSON.stringify({ id: 'hi3-global-en', status: 'collecting', body: 'x'.repeat(1024 * 1024) });
  assert.throws(() => {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO events(kind,object_id,created_at) VALUES(?,?,?)').run('fixture.before_failure', 'fixture', '2026-10-11');
      db.prepare('INSERT INTO official_sources VALUES(?,?)').run('hi3-global-en', payload);
      db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)').run('hi3-global-en', payload);
      db.exec('COMMIT');
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    }
  }, (error) => error.errcode === 13);
  for (const table of ['events', 'official_sources', 'official_source_runs']) assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  db.close();
  const recovered = openStore(file); t.after(() => recovered.close());
  recovered.saveSourceRecord({ id: 'hi3-global-en', status: 'collecting' });
  assert.equal(recovered.sourceHistory('hi3-global-en').items.length, 1);
  assert.equal(recovered.events().length, 1);
});

test('store preserves the original failure after SQLite auto-rollback and can retry atomically', (t) => {
  const { file } = fixture(t); const store = openStore(file); const db = new DatabaseSync(file);
  t.after(() => { db.close(); store.close(); });
  store.saveSourceRecord({ id: 'hi3-global-en', status: 'success_changed', digest: 'original' });
  const events = store.events();
  db.exec(`CREATE TRIGGER fixture_abort_history BEFORE INSERT ON official_source_runs
    BEGIN SELECT RAISE(ROLLBACK,'fixture automatic rollback'); END;`);
  assert.throws(() => store.saveSourceRecord({ id: 'hi3-global-en', status: 'collecting', digest: 'failed' }), /fixture automatic rollback/);
  assert.equal(store.sourceRecord('hi3-global-en').digest, 'original');
  assert.equal(store.sourceHistory('hi3-global-en').items.length, 1); assert.deepEqual(store.events(), events);
  db.exec('DROP TRIGGER fixture_abort_history');
  store.saveSourceRecord({ id: 'hi3-global-en', status: 'collecting', digest: 'retry' });
  assert.equal(store.sourceRecord('hi3-global-en').digest, 'retry');
  assert.equal(store.sourceHistory('hi3-global-en').items.length, 2);
});

test('rollback failure preserves the operation error and fences captured read/write and nested APIs until close', (t) => {
  const { file } = fixture(t); const store = openStore(file); const db = new DatabaseSync(file);
  let closed = false;
  t.after(() => { db.close(); if (!closed) store.close(); });
  store.saveSourceRecord({ id: 'hi3-global-en', digest: 'original' });
  const read = store.sourceRecord;
  const write = store.saveExecutionMaterial;
  const listIntents = store.executionIntents.list;
  db.exec(`CREATE TRIGGER fixture_abort_history BEFORE INSERT ON official_source_runs
    BEGIN SELECT RAISE(ABORT,'fixture operation failure'); END;`);
  const exec = DatabaseSync.prototype.exec;
  let rollbackAttempts = 0;
  const mock = t.mock.method(DatabaseSync.prototype, 'exec', function (sql) {
    if (sql === 'ROLLBACK') { rollbackAttempts++; throw new Error('fixture cleanup failure'); }
    return exec.call(this, sql);
  });
  assert.throws(() => store.saveSourceRecord({ id: 'hi3-global-en', digest: 'partial' }), /fixture operation failure/);
  assert.equal(rollbackAttempts, 1);
  for (const operation of [() => read('hi3-global-en'), () => store.facts(),
    () => write({ id: 'blocked' }), () => store.saveSourceRecord({ id: 'hi3-global-en', digest: 'retry' }),
    () => listIntents()]) {
    assert.throws(operation, (error) => error.status === 503 && /当前连接已禁止操作/.test(error.message));
  }
  assert.equal(rollbackAttempts, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM execution_materials').get().count, 0);
  assert.equal(JSON.parse(db.prepare('SELECT payload FROM official_sources WHERE id=?').get('hi3-global-en').payload).digest, 'original');
  mock.mock.restore();
  assert.throws(() => store.evidence(), (error) => error.status === 503);
  store.close(); closed = true;
  const reopened = openStore(file);
  try { assert.equal(reopened.sourceRecord('hi3-global-en').digest, 'original'); }
  finally { reopened.close(); }
});

test('forced writer termination retains committed WAL records and rolls back an unfinished transaction', { timeout: 15000 }, async (t) => {
  const { file } = fixture(t); const initialized = openStore(file); initialized.close();
  const code = `import {DatabaseSync} from 'node:sqlite';
    const db=new DatabaseSync(process.argv[1]);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
    const insert=db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)');
    insert.run('hi3-global-en',JSON.stringify({status:'collecting',digest:'committed'}));
    db.exec('BEGIN IMMEDIATE');
    insert.run('hi3-global-en',JSON.stringify({status:'success_changed',digest:'uncommitted'}));
    process.stdout.write('transaction-open\\n'); setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code, file], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const exited = once(child, 'exit'); let errors = ''; child.stderr.on('data', (bytes) => { errors += bytes; });
  await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (bytes) => { output += bytes; if (output.includes('transaction-open\n')) resolve(); });
    child.once('error', reject);
    child.once('exit', () => reject(new Error(`Writer exited before fixture readiness: ${errors}`)));
  });
  child.kill('SIGKILL'); const [, signal] = await exited; assert.equal(signal, 'SIGKILL');
  const recovered = openStore(file); t.after(() => recovered.close());
  const history = recovered.sourceHistory('hi3-global-en');
  assert.equal(history.items.length, 1); assert.equal(history.items[0].digest, 'committed');
  assert.equal(history.items[0].status, 'collecting');
  recovered.saveSourceRecord({ id: 'hi3-global-en', status: 'needs_reconciliation' });
  assert.equal(recovered.sourceHistory('hi3-global-en').items.length, 2);
  const check = new DatabaseSync(file, { readOnly: true });
  assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check, 'ok'); check.close();
});
