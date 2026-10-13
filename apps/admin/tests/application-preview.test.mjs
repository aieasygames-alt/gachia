import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { applicationPreviewService, previewPaths } from '../src/application-preview.mjs';

function fixture(t, options = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-app-preview-')));
  let service;
  t.after(async () => {
    try { await service?.close(); }
    finally { rmSync(root, { recursive: true, force: true }); }
  });
  const cli = join(root, 'apps/web/node_modules/next/dist/bin'); mkdirSync(cli, { recursive: true });
  writeFileSync(join(cli, 'next'), 'fixture');
  const records = [];
  const store = { applicationPreviews: () => structuredClone(records), workspaces: () => [{ id: 'workspace', path: root }],
    updateOwnedApplicationPreview(record, owner) {
      const existing = records.find((item) => item.id === record.id);
      if (!existing || existing.ownerInstanceId !== owner || record.ownerInstanceId !== owner) throw new Error('Owner mismatch');
      return this.saveApplicationPreview(record);
    },
    reserveApplicationPreview(record) {
      if (records.some((item) => ['starting', 'running', 'checking', 'stopping', 'needs_reconciliation'].includes(item.status))) throw new Error('Occupied');
      return this.saveApplicationPreview(record);
    },
    saveApplicationPreview(record) { const i = records.findIndex((item) => item.id === record.id); if (i < 0) records.push(structuredClone(record)); else records[i] = structuredClone(record); return record; } };
  let current = true; const launches = [];
  service = applicationPreviewService(store, { acceptedReview() {
    if (!current) throw new Error('stale'); return { id: 'review', workspaceId: 'workspace', packetDigest: 'digest', ...options.review };
  } }, { maxDurationMs: 5000, watchMs: 50, launch(executable, args, config) {
    launches.push({ executable, args, config });
    return spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], config);
  }, ...options });
  return { service, store, root, launches, invalidate: () => { current = false; } };
}
const confirmed = { reviewId: 'review', executionMode: 'legacy_trusted_local', confirmExecuteCode: true, confirmNotSandboxed: true };
test('invalid lifetime and watcher budgets reject before starting a service', () => {
  for (const key of ['maxDurationMs', 'watchMs']) for (const value of [NaN, Infinity, 0, -1, 1.5, '1', 600001]) {
    assert.throws(() => applicationPreviewService({}, {}, { [key]: value }), /lifecycle policy/);
  }
});

test('check intent save failure restores retryable in-memory state without releasing process ownership', async (t) => {
  const { service, store } = fixture(t);
  const preview = await service.start(confirmed);
  const save = store.updateOwnedApplicationPreview;
  store.updateOwnedApplicationPreview = function (record, owner) {
    if (record.status === 'checking') throw new Error('Synthetic check save failure');
    return save.call(this, record, owner);
  };
  await assert.rejects(service.check(preview.id), /check save failure/);
  const current = service.list()[0];
  assert.equal(current.occupancy.blocksStart, true);
  assert.equal(current.occupancy.actions.check, true);
  assert.equal(current.occupancy.actions.stop, true);
  assert.notEqual(current.status, 'checking');
});
const waitStopped = async (service) => {
  for (let i = 0; i < 80; i++) {
    if (!['starting', 'running', 'stopping'].includes(service.list()[0].status)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Process did not stop');
};

test('explicit execution confirmation, independent deps and no dotenv are required', async (t) => {
  const { service, root, launches, store } = fixture(t);
  for (const executionMode of [undefined, 'disabled', 'isolated_linux', 'arbitrary']) {
    await assert.rejects(service.start({ ...confirmed, executionMode }), /禁止|拒绝/);
  }
  assert.equal(launches.length, 0); assert.equal(store.applicationPreviews().length, 0);
  await assert.rejects(service.start({ reviewId: 'review' }));
  writeFileSync(join(root, 'apps/web/.env.local'), 'SECRET=private');
  await assert.rejects(service.start(confirmed), /\.env/);
  rmSync(join(root, 'apps/web/.env.local'));
  rmSync(join(root, 'apps/web/node_modules'), { recursive: true });
  await assert.rejects(service.start(confirmed), /Next.js/);
});

test('linked build output or home blocks launch without writing outside the workspace', async (t) => {
  for (const target of ['.next', '.next/workbench-home']) {
    const { service, launches, root } = fixture(t);
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-preview-outside-')));
    t.after(() => rmSync(outside, { recursive: true, force: true }));
    if (target.includes('/')) mkdirSync(join(root, 'apps/web/.next'));
    symlinkSync(outside, join(root, 'apps/web', target));
    const record = await service.start(confirmed);
    assert.equal(record.status, 'failed'); assert.equal(launches.length, 0);
    assert.equal(existsSync(join(outside, 'workbench-home')), false);
    assert.equal(record.capabilities.publish, false);
  }
});

test('real browser check detects missing directory links and removed pages returning 200', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async (t) => {
  const { service } = fixture(t, { maxDurationMs: 20000, review: { snapshot: { contents: [{
    path: 'packages/data/games/hi3/raw-characters.json', baselineContent: '[{"id":"removed"}]', content: '[{"id":"added"}]',
  }] } }, launch(executable, args, config) {
    return spawn(process.execPath, ['-e', `require('http').createServer((req,res)=>{const lang=req.url.split('/')[1];res.end('<html lang="'+lang+'"><head><title>Fixture</title><link rel="canonical" href="https://gachia.com'+req.url+'"></head><body><h1>Fixture</h1><p>${'body '.repeat(40)}</p></body></html>')}).listen(${args.at(-1)},'127.0.0.1')`], config);
  } });
  const preview = await service.start(confirmed);
  const checked = await service.check(preview.id);
  assert.equal(checked.result, 'failed');
  assert.ok(checked.checks.some((item) => item.kind === 'directory' && item.missingLinks.length > 0));
  assert.ok(checked.checks.some((item) => item.kind === 'deleted' && item.httpStatus === 200 && item.status === 'failed'));
  service.stop(preview.id); await waitStopped(service);
});

test('real browser check records actual HTTP/H1/body and does not grant publish permission', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async (t) => {
  const { service } = fixture(t, { maxDurationMs: 15000, launch(executable, args, config) {
    const port = args.at(-1);
    return spawn(process.execPath, ['-e', `require('http').createServer((req,res)=>{if(req.url==='/sitemap.xml'){res.end('<urlset>'+['zh','en','ja'].map(l=>'<url><loc>https://gachia.com/'+l+'/hi3</loc></url>').join('')+'</urlset>');return;}const lang=req.url.split('/')[1];res.end('<!doctype html><html lang="'+lang+'"><head><title>Fixture</title><link rel="canonical" href="https://gachia.com'+req.url+'"></head><body><h1>Preview fixture</h1><p>${'body '.repeat(40)}</p></body></html>')}).listen(${port},'127.0.0.1')`], config);
  } });
  const record = await service.start(confirmed);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const checked = await service.check(record.id);
  assert.equal(checked.result, 'partial_pass');
  assert.equal(checked.checks.filter((item) => item.httpStatus).length, 3);
  assert.ok(checked.checks.filter((item) => item.httpStatus).every((item) => item.h1Count === 1 && item.httpStatus === 200));
  assert.equal(checked.capabilities.publish, false);
  service.stop(record.id); await waitStopped(service);
});

test('entity diff routes are three-language and reject unsafe IDs', () => {
  assert.throws(() => previewPaths({ snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-characters.json', baselineContent: '[]',
    content: JSON.stringify([{ id: '../../secret' }]) }] } }));
  const paths = previewPaths({ snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-characters.json',
    baselineContent: '[]', content: JSON.stringify([{ id: 'safe-character' }]) }] } });
  assert.equal(paths.length, 9);
  assert.ok(paths.includes('/ja/hi3/characters/safe-character'));
  assert.ok(!paths.some((path) => path.includes('..')));
});

test('fixed command, sanitized environment, concurrency and owned-process stop', async (t) => {
  const { service, launches } = fixture(t);
  const record = await service.start(confirmed);
  assert.equal(record.status, 'starting');
  assert.ok(launches[0].args.includes('127.0.0.1'));
  assert.equal(launches[0].config.shell, false);
  assert.equal(launches[0].config.env.NODE_OPTIONS, undefined);
  assert.equal(launches[0].config.env.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(launches[0].config.stdio[1], 'ignore');
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
  service.stop(record.id); await waitStopped(service);
  assert.equal(service.list()[0].status, 'stopped');
  assert.throws(() => service.stop(record.id), (error) => error.status === 409);
});

test('a post-launch persistence failure stops the owned child before releasing its slot', async (t) => {
  const { service, store, launches } = fixture(t);
  const originalSave = store.saveApplicationPreview;
  let failed = false;
  store.saveApplicationPreview = (record) => {
    if (record.pid && record.status === 'starting' && !failed) { failed = true; throw new Error('Synthetic post-launch save failure'); }
    return originalSave(record);
  };
  const record = await service.start(confirmed);
  assert.equal(failed, true); assert.equal(launches.length, 1);
  assert.equal(record.status, 'stopping');
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
  await waitStopped(service);
  assert.equal(service.list()[0].status, 'stopped');
  assert.equal(service.list()[0].capabilities.publish, false);
});

test('closing while port allocation is pending cancels launch without changing stopped state', async (t) => {
  const { service, launches } = fixture(t);
  const pending = service.start(confirmed);
  await service.close();
  const record = await pending;
  assert.equal(launches.length, 0);
  assert.equal(record.status, 'stopped');
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
});

test('persistent terminal save failure stays fenced and retries without relaunch or manual overwrite', async (t) => {
  const { service, store, launches } = fixture(t);
  const record = await service.start(confirmed);
  const originalSave = store.saveApplicationPreview; let failing = true;
  store.saveApplicationPreview = (value) => {
    if (failing) throw new Error('Synthetic storage unavailable');
    return originalSave(value);
  };
  assert.throws(() => service.stop(record.id), /Synthetic/);
  await waitStopped(service);
  const pending = service.list()[0];
  assert.equal(pending.status, 'needs_reconciliation');
  assert.equal(pending.persistenceStatus, 'terminal_state_pending_save');
  assert.equal(pending.occupancy.reason, 'terminal_save_pending');
  assert.equal(pending.occupancy.actions.reconcile, false);
  assert.equal(pending.observedTerminalStatus, 'stopped');
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
  assert.throws(() => service.reconcile({ id: record.id, confirmProcessStopped: true }), (error) => error.status === 409);
  failing = false;
  for (let i = 0; i < 40 && service.list()[0].persistenceStatus; i++) await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(service.list()[0].status, 'stopped');
  assert.equal(service.list()[0].persistenceStatus, undefined);
  assert.equal(launches.length, 1);
});

test('failed TERM and KILL signals retain ownership until an actual exit event', async (t) => {
  const child = new EventEmitter();
  Object.assign(child, { pid: 123456789, exitCode: null, signalCode: null, kill() { throw new Error('Synthetic child signal failure'); } });
  const signals = [];
  const { service } = fixture(t, { launch: () => child, killGraceMs: 10,
    signalGroup(pid, signal) { signals.push(signal); throw new Error('Synthetic group signal failure'); } });
  const record = await service.start(confirmed);
  assert.equal(service.stop(record.id).stopSignalStatus, 'term_failed_exit_unknown');
  for (let i = 0; i < 40 && service.list()[0].status !== 'needs_reconciliation'; i++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(service.list()[0].stopSignalStatus, 'kill_failed_exit_unknown');
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
  assert.throws(() => service.reconcile({ id: record.id, confirmProcessStopped: true }), (error) => error.status === 409);
  child.exitCode = 0; child.emit('exit', 0);
  assert.equal(service.list()[0].status, 'stopped');
});

test('successful signals without an exit become reconciliation and remain fenced until late exit', async (t) => {
  const child = new EventEmitter();
  Object.assign(child, { pid: 123456789, exitCode: null, signalCode: null, kill() { throw new Error('Fallback must not run'); } });
  const signals = [];
  const { service } = fixture(t, { launch: () => child, killGraceMs: 10, exitWaitMs: 10,
    signalGroup(pid, signal) { signals.push(signal); return true; } });
  const record = await service.start(confirmed); service.stop(record.id);
  for (let i = 0; i < 40 && service.list()[0].status !== 'needs_reconciliation'; i++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(service.list()[0].stopSignalStatus, 'signals_sent_exit_unconfirmed');
  assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
  await assert.rejects(service.start(confirmed), (error) => error.status === 409);
  assert.throws(() => service.reconcile({ id: record.id, confirmProcessStopped: true }), (error) => error.status === 409);
  child.signalCode = 'SIGKILL'; child.emit('exit', null);
  assert.equal(service.list()[0].status, 'stopped');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(service.list()[0].status, 'stopped');
});

test('expiry and fact drift automatically stop the owned process', async (t) => {
  const { service } = fixture(t, { maxDurationMs: 100 });
  await service.start(confirmed); await new Promise((resolve) => setTimeout(resolve, 150)); await waitStopped(service);
  const other = fixture(t); await other.service.start(confirmed); other.invalidate();
  await new Promise((resolve) => setTimeout(resolve, 100)); await waitStopped(other.service);
  assert.equal(other.service.list()[0].assessment.status, 'stale');
});

test('restart refuses replay or killing persisted PID until human reconciliation', async (t) => {
  const { store } = fixture(t);
  store.saveApplicationPreview({ id: 'old', reviewId: 'review', packetDigest: 'digest', status: 'running', pid: 1 });
  const restarted = applicationPreviewService(store, { acceptedReview: () => ({ packetDigest: 'digest' }) });
  t.after(() => restarted.close());
  assert.equal(restarted.list()[0].status, 'needs_reconciliation');
  await assert.rejects(restarted.start(confirmed));
  assert.throws(() => restarted.stop('old'));
  assert.throws(() => restarted.reconcile({ id: 'old' }));
  assert.equal(restarted.reconcile({ id: 'old', confirmProcessStopped: true }).status, 'interrupted');
});

test('another service does not relabel or reconcile an owned active preview', async (t) => {
  const { service, store } = fixture(t);
  const record = await service.start(confirmed);
  const other = applicationPreviewService(store, { acceptedReview: () => ({ packetDigest: 'digest' }) });
  t.after(() => other.close());
  assert.equal(other.list()[0].status, 'starting');
  assert.equal(other.list()[0].ownership, 'other_or_previous_instance_not_inspected');
  assert.equal(other.list()[0].occupancy.reason, 'other_or_previous_instance_unknown');
  assert.equal(other.list()[0].occupancy.blocksStart, true);
  assert.deepEqual(other.list()[0].occupancy.actions, { check: false, stop: false, reconcile: false, unlock: false, takeover: false });
  assert.equal(service.list()[0].occupancy.actions.stop, true);
  assert.throws(() => other.reconcile({ id: record.id, confirmProcessStopped: true }), (error) => error.status === 409);
  assert.equal(service.list()[0].status, 'starting');
  service.stop(record.id); await waitStopped(service);
  assert.equal(service.list()[0].occupancy.reason, 'saved_terminal_only');
  assert.equal(service.list()[0].occupancy.blocksStart, false);
});
