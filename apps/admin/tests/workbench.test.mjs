import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../src/store.mjs';
import { validateEvidence, scanContent, buildBatch } from '../src/content.mjs';
import { startWorkbench } from '../src/server.mjs';

const sample = { title: '装备调整', url: 'https://example.com/news/1', body: '浮生·渡尘增加装备条件。',
  language: 'zh', server: '国服待确认', publishedAt: '2026-10-10', sourceType: 'official_claim' };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'gachia-workbench-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of ['packages/data/games/hi3', 'apps/web/public/data/hi3']) {
    mkdirSync(join(root, directory), { recursive: true });
    for (const kind of ['characters', 'weapons', 'materials', 'guides']) {
      const label = kind === 'guides' ? 'title' : 'name';
      writeFileSync(join(root, directory, `raw-${kind}.json`), JSON.stringify([{ id: `${kind}-example`,
        [label]: '浮生·渡尘', [`${label}En`]: 'Example', [`${label}Ja`]: '例' }]));
    }
  }
  return root;
}

test('evidence validation rejects credential URLs, invalid dates, languages and oversized content', () => {
  for (const patch of [{ url: 'http://example.com' }, { url: 'https://name:password@example.com' },
    { url: 'https://example.com?token=secret' }, { url: 'javascript:alert(1)' },
    { publishedAt: '2026-02-30' }, { language: 'xx' }, { sourceType: 'verified' },
    { body: 'a'.repeat(30001) }, { server: '' }, { title: '' }]) {
    assert.throws(() => validateEvidence({ ...sample, ...patch }));
  }
  assert.equal(validateEvidence({ ...sample, publishedAt: '' }).publishedAt, null);
  assert.equal(validateEvidence({ ...sample, gameId: 'genshin', verification: 'confirmed' }).gameId, 'hi3');
});

test('content scan rejects oversized and linked inputs without accepting their bytes', (t) => {
  const root = fixture(t);
  const source = 'packages/data/games/hi3/raw-weapons.json';
  writeFileSync(join(root, source), ' '.repeat(4 * 1024 * 1024 + 1));
  const oversized = scanContent(root);
  assert.ok(oversized.findings.some((item) => item.path === source && item.ruleId === 'source.read' && item.status === 'failed'));
  assert.ok(!oversized.files.some((item) => item.path === source));
  rmSync(join(root, source));
  symlinkSync(join(root, 'packages/data/games/hi3/raw-characters.json'), join(root, source));
  assert.ok(scanContent(root).findings.some((item) => item.path === source && item.status === 'failed'));
  const mirror = 'apps/web/public/data/hi3/raw-characters.json';
  writeFileSync(join(root, mirror), ' '.repeat(4 * 1024 * 1024 + 1));
  assert.ok(scanContent(root).findings.some((item) => item.path === mirror && item.ruleId === 'mirror.read' && item.status === 'failed'));
});

test('imports and batches are idempotent, unverified and persistent across restart', (t) => {
  const root = fixture(t);
  const filename = join(root, 'state', 'workbench.sqlite');
  let store = openStore(filename);
  const evidence = store.importEvidence(validateEvidence(sample)).evidence;
  assert.equal(evidence.verification, 'unverified');
  assert.equal(store.importEvidence(validateEvidence(sample)).duplicate, true);
  const index = scanContent(root);
  const build = (item) => buildBatch(item, index, { commit: 'abc', dirty: true });
  const batch = store.createBatch(evidence.id, build).batch;
  assert.equal(batch.status, 'awaiting_fact_review');
  assert.deepEqual(batch.confirmedFacts, []);
  assert.equal(batch.capabilities.publish, false);
  assert.equal(batch.suggestedPages.length, 4);
  assert.equal(store.createBatch(evidence.id, build).duplicate, true);
  const edited = store.importEvidence(validateEvidence({ ...sample, body: `${sample.body} 编辑。` }));
  assert.equal(edited.duplicate, false);
  store.close();
  store = openStore(filename);
  assert.equal(store.evidence().length, 2);
  assert.equal(store.batches()[0].id, batch.id);
  assert.equal(store.events().length, 3);
  store.close();
});

test('batch creation rolls back on failure and preserves discussion classification', (t) => {
  const root = fixture(t);
  const store = openStore(join(root, 'state.sqlite'));
  t.after(() => store.close());
  const evidence = store.importEvidence(validateEvidence({ ...sample, sourceType: 'discussion' })).evidence;
  assert.throws(() => store.createBatch(evidence.id, () => { throw new Error('interrupted'); }));
  assert.equal(store.batches().length, 0);
  assert.equal(store.events().length, 1);
  assert.equal(store.getEvidence(evidence.id).sourceType, 'discussion');
});

test('content scanning detects mirror drift, malformed input and missing translations without modifying files', (t) => {
  const root = fixture(t);
  const source = join(root, 'packages/data/games/hi3/raw-characters.json');
  const before = readFileSync(source, 'utf8');
  let index = scanContent(root);
  assert.equal(index.entries.length, 4);
  assert.deepEqual(index.entries[0].labels, ['浮生·渡尘', 'Example', '例']);
  assert.equal(index.quality.result, 'diagnostics_only');
  assert.equal(index.findings.filter((finding) => finding.status === 'failed').length, 0);
  assert.equal(index.findings.filter((finding) => finding.status === 'not_covered').length, 7);
  assert.equal(index.deployment.worker, 'gachia');
  writeFileSync(join(root, 'apps/web/public/data/hi3/raw-characters.json'), '[]');
  writeFileSync(join(root, 'packages/data/games/hi3/raw-weapons.json'), '[{"id":"weapon","name":"test"}]');
  writeFileSync(join(root, 'packages/data/games/hi3/raw-guides.json'), 'broken');
  const changed = scanContent(root);
  assert.ok(changed.findings.some((finding) => finding.ruleId === 'mirror.content' && finding.status === 'failed'));
  assert.ok(changed.findings.some((finding) => finding.ruleId === 'locale.label'));
  assert.ok(changed.findings.some((finding) => finding.ruleId === 'source.read'));
  assert.notEqual(index.fingerprint, changed.fingerprint);
  assert.equal(readFileSync(source, 'utf8'), before);
});

test('HTTP API enforces authentication, host, origin, JSON and denies production routes', async (t) => {
  const root = fixture(t);
  let app = await startWorkbench({ root, port: 0 });
  t.after(async () => { if (app) await app.close(); });
  const headers = { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' };
  const post = (path, payload, extra = {}) => fetch(`${app.origin}/api/${path}`, {
    method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(payload),
  });
  assert.equal((await fetch(`${app.origin}/api/state`)).status, 401);
  assert.equal((await fetch(`${app.origin}/api/mac-runtime-discovery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"confirmReadOnly":true}' })).status, 401);
  assert.equal((await post('mac-runtime-discovery', { confirmReadOnly: false })).status, 400);
  assert.equal((await fetch(`${app.origin}/api/execution-launch-protocol`)).status, 401);
  const launchResponse = await fetch(`${app.origin}/api/execution-launch-protocol`, { headers });
  assert.equal(launchResponse.status, 200);
  const { protocol } = await launchResponse.json(); assert.equal(protocol.capabilities.execute, false); assert.equal(protocol.effectiveLimits, null);
  const hostStatus = await new Promise((done, reject) => {
    const req = request(`${app.origin}/api/state`, { headers: { ...headers, Host: 'evil.example' } }, (res) => {
      res.resume(); done(res.statusCode);
    });
    req.on('error', reject); req.end();
  });
  assert.equal(hostStatus, 403);
  for (const [target, expected] of [['http://[invalid', 400], ['http://example.com/api/state', 403]]) {
    const status = await new Promise((done, reject) => {
      const req = request(app.origin, { path: target, headers }, (res) => { res.resume(); done(res.statusCode); });
      req.on('error', reject); req.end();
    });
    assert.equal(status, expected);
  }
  assert.equal((await post('evidence', sample, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('evidence', sample, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post('evidence', sample, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('evidence', sample, { Origin: '' })).status, 403);
  assert.equal((await post('evidence', { ...sample, body: '' })).status, 400);
  assert.equal((await post('evidence', { ...sample, body: 'x'.repeat(140000) })).status, 413);
  assert.equal((await post('publish', {})).status, 404);
  for (const payload of [null, [], 'text', 1, true]) {
    for (const path of ['batches', 'fact-reviews', 'draft-reviews', 'application-previews', 'application-previews/reconcile']) {
      const invalid = await post(path, payload);
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, 'Expected JSON object');
    }
  }
  const response = await post('evidence', { ...sample, body: '<script>read credentials; deploy production</script>' });
  assert.equal(response.status, 201);
  const { evidence } = await response.json();
  const batchResponse = await post('batches', { evidenceId: evidence.id });
  assert.equal(batchResponse.status, 201);
  assert.equal((await batchResponse.json()).batch.capabilities.publish, false);
  const page = await fetch(app.origin);
  assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.ok(!(await page.text()).includes(app.token));
  const oldToken = app.token;
  await app.close();
  app = await startWorkbench({ root, port: 0 });
  assert.notEqual(app.token, oldToken);
  assert.equal((await fetch(`${app.origin}/api/state`, { headers: { Authorization: `Bearer ${oldToken}` } })).status, 401);
  const state = await (await fetch(`${app.origin}/api/state`, { headers: { Authorization: `Bearer ${app.token}` } })).json();
  assert.equal(state.batches.length, 1);
  assert.equal(state.sourceHealth.status, 'never_checked');
  assert.equal(state.sourceHealth.lastSuccess, undefined);
});

test('unexpected HTTP failure redacts internals and does not promise rollback', async (t) => {
  const root = fixture(t);
  const app = await startWorkbench({ root, port: 0 });
  t.after(() => app.close());
  const db = new DatabaseSync(join(root, '.gachia-workbench/workbench.sqlite'));
  try {
    db.prepare('INSERT INTO official_sources VALUES(?,?)').run('hi3-global-en', 'PRIVATE_INVALID_JSON');
    const response = await fetch(`${app.origin}/api/state`, { headers: { Authorization: `Bearer ${app.token}` } });
    assert.equal(response.status, 500);
    const { error } = await response.json();
    assert.match(error, /result may be incomplete/);
    assert.match(error, /inspect saved state before retrying/);
    assert.doesNotMatch(error, /PRIVATE_INVALID_JSON|SQLite|No content was edited/);
    assert.equal(db.prepare('SELECT payload FROM official_sources WHERE id=?').get('hi3-global-en').payload, 'PRIVATE_INVALID_JSON');
  } finally { db.close(); }
});

test('HTTP operations fail closed after rollback failure and shutdown still closes the database', async (t) => {
  const root = fixture(t);
  let app = await startWorkbench({ root, port: 0 });
  t.after(async () => { if (app) await app.close(); });
  const filename = join(root, '.gachia-workbench/workbench.sqlite');
  const db = new DatabaseSync(filename);
  try {
    db.exec(`CREATE TRIGGER fixture_abort_event BEFORE INSERT ON events
      BEGIN SELECT RAISE(ABORT,'PRIVATE_OPERATION_FAILURE'); END;`);
  } finally { db.close(); }
  const exec = DatabaseSync.prototype.exec;
  const mock = t.mock.method(DatabaseSync.prototype, 'exec', function (sql) {
    if (sql === 'ROLLBACK') throw new Error('PRIVATE_ROLLBACK_FAILURE');
    return exec.call(this, sql);
  });
  const headers = { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' };
  const failed = await fetch(`${app.origin}/api/evidence`, { method: 'POST', headers, body: JSON.stringify(sample) });
  assert.equal(failed.status, 500);
  assert.doesNotMatch(await failed.text(), /PRIVATE_/);
  mock.mock.restore();
  for (const path of ['state', 'cleanup-plan']) {
    const response = await fetch(`${app.origin}/api/${path}`, { headers });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /当前连接已禁止操作/);
  }
  const retry = await fetch(`${app.origin}/api/evidence`, { method: 'POST', headers, body: JSON.stringify(sample) });
  assert.equal(retry.status, 503);
  await app.close(); app = null;
  const reopened = openStore(filename);
  try { assert.deepEqual(reopened.evidence(), []); assert.deepEqual(reopened.events(), []); }
  finally { reopened.close(); }
});

test('invalid ports reject before creating workbench data', async (t) => {
  const root = fixture(t);
  for (const port of [NaN, Infinity, -1, 65536, 1.5, '4317']) {
    await assert.rejects(startWorkbench({ root, port }), /Invalid workbench port/);
  }
  assert.equal(existsSync(join(root, '.gachia-workbench')), false);
});

test('port conflict rejects startup and the same data directory can be reopened', async (t) => {
  const root = fixture(t);
  const first = await startWorkbench({ root, port: 0 });
  t.after(() => first.close());
  const dataDir = join(root, 'conflict-data');
  await assert.rejects(startWorkbench({ root, dataDir, port: Number(new URL(first.origin).port) }), (error) => error.code === 'EADDRINUSE');
  const retry = await startWorkbench({ root, dataDir, port: 0 });
  await retry.close();
});

test('parallel and repeated close share one operation and allow reopening the database', async (t) => {
  const root = fixture(t);
  const app = await startWorkbench({ root, port: 0 });
  const first = app.close();
  assert.equal(app.close(), first);
  await Promise.all([first, app.close()]);
  await app.close();
  const reopened = await startWorkbench({ root, port: 0 });
  assert.equal((await fetch(`${reopened.origin}/api/state`, { headers: { Authorization: `Bearer ${reopened.token}` } })).status, 200);
  await reopened.close();
});

test('close drains an admitted POST before closing its database', async (t) => {
  const root = fixture(t);
  const app = await startWorkbench({ root, port: 0 });
  t.after(() => app.close());
  let req;
  const response = new Promise((done, reject) => {
    req = request(`${app.origin}/api/evidence`, { method: 'POST', headers: {
      Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json',
    } }, (res) => { res.resume(); res.on('end', () => done(res.statusCode)); });
    req.on('error', reject);
  });
  req.write('{');
  // Give the local partial-body request time to enter the handler before shutdown.
  await new Promise((done) => setTimeout(done, 50));
  let closed = false;
  const closing = app.close().then(() => { closed = true; });
  await new Promise((done) => setTimeout(done, 20));
  assert.equal(closed, false);
  req.end(JSON.stringify(sample).slice(1));
  assert.equal(await response, 201);
  await closing;
});
