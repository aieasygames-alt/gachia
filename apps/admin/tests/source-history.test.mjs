import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openStore } from '../src/store.mjs';
import { startWorkbench } from '../src/server.mjs';
import { officialSource } from '../src/official-source.mjs';
import { sourceHistoryQuery } from '../src/source-history-query.mjs';
import { reviewPreparation } from '../src/review-preparation.mjs';

test('historical context lookup reports record and byte budgets without changing saved history', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-budget-')); const filename = join(dir, 'state.sqlite');
  const store = openStore(filename); const db = new DatabaseSync(filename);
  t.after(() => { db.close(); store.close(); rmSync(dir, { recursive: true, force: true }); });
  const insert = db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)');
  const original = JSON.stringify({ digest: 'old', lastSuccess: 'fixture', articles: [] });
  db.exec('BEGIN'); insert.run('records', original);
  for (let i = 0; i < 2000; i++) insert.run('records', '{"digest":"new"}');
  insert.run('bytes', JSON.stringify({ digest: 'huge', lastSuccess: 'fixture', body: 'x'.repeat(4 * 1024 * 1024) }));
  db.exec('COMMIT');
  const records = store.sourceSnapshotLookup('records', 'old');
  assert.equal(records.status, 'budget_exceeded'); assert.equal(records.observed, 2000);
  assert.equal(store.sourceSnapshot('records', 'old'), undefined);
  const bytes = store.sourceSnapshotLookup('bytes', 'huge');
  assert.equal(bytes.status, 'budget_exceeded'); assert.equal(bytes.observed, 0); assert.equal(bytes.bytes, 0);
  const preparation = reviewPreparation({ id: 'e', sourceSnapshot: { sourceId: 'records', digest: 'old' } }, [], store);
  assert.equal(preparation.status, 'context_unavailable'); assert.equal(preparation.contextDiagnostic.status, 'budget_exceeded');
  assert.equal(preparation.permissions.autoConfirm, false);
  assert.equal(db.prepare('SELECT count(*) AS n FROM official_source_runs').get().n, 2002);
  assert.equal(db.prepare('SELECT payload FROM official_source_runs ORDER BY id LIMIT 1').get().payload, original);
  insert.run('small', original);
  assert.equal(store.sourceSnapshotLookup('small', 'old').status, 'found');
  assert.equal(store.sourceSnapshotLookup('small', 'missing').status, 'not_found');
});

test('v12 migration preserves history and large keyset traversal uses source cursor index', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-scale-')); const filename = join(dir, 'state.sqlite');
  let store = openStore(filename); store.close();
  const seed = new DatabaseSync(filename);
  seed.exec('DROP INDEX official_source_runs_source_cursor; PRAGMA user_version=12; BEGIN');
  const insert = seed.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)');
  for (let i = 0; i < 5000; i++) insert.run(i % 2 ? officialSource.id : 'other-source', JSON.stringify({
    status: i % 3 ? 'success_changed' : 'parse_failed', lastAttempt: '2026-10-11T00:00:00.000Z',
    articles: [{ id: String(i), title: `Scale fixture ${i}`, rawHtml: 'BODY_NOT_IN_LIST' }],
  }));
  seed.exec('COMMIT'); seed.close();
  store = openStore(filename);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const backups = readdirSync(dir).filter((name) => name.includes('.v12-') && name.endsWith('.bak'));
  assert.equal(backups.length, 1);
  const backup = new DatabaseSync(join(dir, backups[0]), { readOnly: true });
  assert.equal(backup.prepare('PRAGMA user_version').get().user_version, 12);
  assert.equal(backup.prepare('SELECT count(*) AS n FROM official_source_runs').get().n, 5000); backup.close();
  const inspect = new DatabaseSync(filename, { readOnly: true });
  assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 13);
  const plan = inspect.prepare(`EXPLAIN QUERY PLAN ${sourceHistoryQuery}`)
    .all(officialSource.id, 4000, 'failed', 'failed', 'failed', '2026-10-11', '2026-10-11', '2026-10-11', '2026-10-11', 'Scale fixture', 'Scale fixture', 'Scale fixture', 21).map((row) => row.detail).join('\n');
  assert.match(plan, /SEARCH.*official_source_runs_source_cursor/); assert.doesNotMatch(plan, /TEMP B-TREE/);
  inspect.close();
  const seen = new Set(); let before;
  do {
    const page = store.sourceHistory(officialSource.id, { before, limit: 20, status: 'failed', from: '2026-10-11', until: '2026-10-11', query: 'Scale fixture' });
    assert.ok(page.items.length <= 20); assert.ok(!JSON.stringify(page).includes('BODY_NOT_IN_LIST'));
    for (const item of page.items) { assert.ok(!seen.has(item.runId)); seen.add(item.runId); assert.equal(item.status, 'parse_failed'); }
    before = page.nextCursor;
  } while (before !== null);
  assert.equal(seen.size, 833);
  store.close(); store = openStore(filename);
  assert.equal(readdirSync(dir).filter((name) => name.endsWith('.bak')).length, 1);
});

test('keyset pages retain history and filter status/title/ID without exposing body in list', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-')); const store = openStore(join(dir, 'state.sqlite'));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  for (let i = 0; i < 25; i++) store.saveSourceRecord({ id: officialSource.id, status: i % 2 ? 'access_failed' : 'success_changed', digest: `digest-${i}`,
    articles: [{ id: String(i), title: `Announcement ${i}`, rawHtml: 'PRIVATE_BODY' }] });
  const first = store.sourceHistory(officialSource.id); assert.equal(first.items.length, 10);
  assert.ok(!JSON.stringify(first).includes('PRIVATE_BODY'));
  store.saveSourceRecord({ id: officialSource.id, status: 'collecting' });
  const second = store.sourceHistory(officialSource.id, { before: first.nextCursor });
  assert.ok(second.items.every((item) => item.runId < first.nextCursor));
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.runId)).size, 20);
  const third = store.sourceHistory(officialSource.id, { before: second.nextCursor }); assert.equal(third.items.length, 5); assert.equal(third.nextCursor, null);
  assert.equal(store.sourceHistory(officialSource.id, { query: 'announcement 24', status: 'success_changed' }).items.length, 1);
  assert.equal(store.sourceHistory(officialSource.id, { query: '24', status: 'access_failed' }).items.length, 0);
  assert.equal(store.sourceHistoryRun(officialSource.id, first.items[0].runId).record.articles[0].rawHtml, 'PRIVATE_BODY');
  for (const options of [{ before: -1 }, { limit: 21 }, { query: 'x'.repeat(101) }, { status: 'unknown' }]) assert.throws(() => store.sourceHistory(officialSource.id, options));
  assert.throws(() => store.sourceHistoryRun('different-source', 1), /不存在/);
});
test('actual SQLite list projection stays small for large bodies while detail retains exact bytes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-body-')); const filename = join(dir, 'state.sqlite');
  const store = openStore(filename); t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  const rawHtml = '<p>BODY_ONLY_UNSEARCHABLE</p>'.repeat(20000);
  store.saveSourceRecord({ id: officialSource.id, status: 'success_changed', articles: [{ id: '42', title: 'Metadata title', rawHtml }] });
  const db = new DatabaseSync(filename, { readOnly: true });
  const rows = db.prepare(sourceHistoryQuery).all(officialSource.id, Number.MAX_SAFE_INTEGER, '', '', '', '', '', '', '', '', '', '', 11);
  assert.equal(rows.length, 1); assert.ok(!Object.hasOwn(rows[0], 'payload'));
  assert.ok(Buffer.byteLength(JSON.stringify(rows)) < 1000); assert.ok(!JSON.stringify(rows).includes('BODY_ONLY_UNSEARCHABLE'));
  db.close();
  assert.equal(store.sourceHistory(officialSource.id, { query: 'BODY_ONLY_UNSEARCHABLE' }).items.length, 0);
  assert.equal(store.sourceHistory(officialSource.id, { query: 'Metadata title' }).items.length, 1);
  assert.equal(store.sourceHistoryRun(officialSource.id, 1).record.articles[0].rawHtml, rawHtml);
  store.saveSourceRecord({ id: officialSource.id, status: 'collecting' });
  assert.deepEqual(store.sourceHistory(officialSource.id).items[0].articles, []);
});
test('history routes require auth, reject invalid filters and read without collecting', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-api-'));
  const app = await startWorkbench({ dataDir: dir, port: 0 });
  t.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const url = `${app.origin}/api/official-source/history`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { Authorization: `Bearer ${app.token}` };
  const response = await fetch(url, { headers }); assert.equal(response.status, 200); assert.deepEqual((await response.json()).items, []);
  assert.equal((await fetch(`${url}?limit=999`, { headers })).status, 400);
  assert.equal((await fetch(`${url}?from=2026-02-30`, { headers })).status, 400);
  assert.equal((await fetch(`${url}?from=2026-10-12&until=2026-10-11`, { headers })).status, 400);
  assert.equal((await fetch(`${url}/1`, { headers })).status, 404);
});
test('inclusive UTC attempt dates and combined failure filter do not substitute article/success dates', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-history-dates-')); const store = openStore(join(dir, 'state.sqlite'));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  for (const [status, lastAttempt] of [['access_failed', '2026-10-10T23:59:59.000Z'], ['parse_failed', '2026-10-11T00:00:00.000Z'],
    ['success_changed', '2026-10-11T23:59:59.000Z'], ['access_failed', '2026-10-12T00:00:00.000Z'], ['access_failed', undefined]]) {
    store.saveSourceRecord({ id: officialSource.id, status, lastAttempt, lastSuccess: '2026-10-11T12:00:00.000Z',
      articles: [{ id: '42', title: 'UTC date fixture', publishedAt: '2026-10-11', rawHtml: 'untrusted' }] });
  }
  const page = store.sourceHistory(officialSource.id, { from: '2026-10-11', until: '2026-10-11', status: 'failed' });
  assert.equal(page.items.length, 1); assert.equal(page.items[0].status, 'parse_failed');
  assert.equal(store.sourceHistory(officialSource.id, { status: 'failed' }).items.length, 4);
  assert.equal(store.sourceHistory(officialSource.id, { from: '2026-10-10', until: '2026-10-11' }).items.length, 3);
  for (const options of [{ from: '2026-02-30' }, { until: 'not-date' }, { from: '2026-10-12', until: '2026-10-11' }, { from: null }]) assert.throws(() => store.sourceHistory(officialSource.id, options));
});
