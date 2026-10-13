import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { startWorkbench } from '../src/server.mjs';

test('storage snapshot counts records without database writes or disclosing bodies', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-storage-')); const file = join(dir, 'state.sqlite');
  const store = openStore(file); const observer = new DatabaseSync(file);
  t.after(() => { observer.close(); store.close(); rmSync(dir, { recursive: true, force: true }); });
  for (let i = 0; i < 3; i++) store.saveSourceRecord({ id: 'hi3-global-en', status: 'collecting', articles: [{ rawHtml: 'PRIVATE_SOURCE' }] });
  const version = observer.prepare('PRAGMA data_version').get().data_version;
  const events = store.events();
  const report = store.storageHealth();
  assert.equal(report.schemaVersion, 13); assert.equal(report.counts.official_source_runs, 3); assert.equal(report.counts.official_sources, 1);
  assert.equal(report.counts.evidence, 0); assert.equal(Object.keys(report.counts).length, 15);
  assert.equal(report.database.allocatedBytes, report.database.pageSize * report.database.pages);
  assert.ok(report.database.reusableBytes <= report.database.allocatedBytes);
  assert.ok(!JSON.stringify(report).includes('PRIVATE_SOURCE')); assert.ok(!JSON.stringify(report).includes(dir));
  assert.deepEqual(report.permissions, { delete: false, vacuum: false, restore: false, publish: false });
  assert.deepEqual(store.events(), events); assert.equal(observer.prepare('PRAGMA data_version').get().data_version, version);
  assert.deepEqual(store.storageHealth().counts, report.counts);
});

test('storage endpoint requires authentication and exposes no cleanup action', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-storage-api-')); const app = await startWorkbench({ dataDir: dir, port: 0 });
  t.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const url = `${app.origin}/api/storage-health`;
  assert.equal((await fetch(url)).status, 401);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${app.token}` } });
  assert.equal(response.status, 200); const report = await response.json(); assert.equal(report.scope, 'sqlite_logical_snapshot_only');
  assert.equal(report.files.scope, 'workbench_directory_metadata_only'); assert.ok(report.files.categories.database.files === 1);
  const post = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(post.status, 404);
});
