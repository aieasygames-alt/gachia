import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { openStore } from '../src/store.mjs';
import { sourceService, officialSource } from '../src/official-source.mjs';

const response = { status: 200, body: JSON.stringify({ retcode: 0, data: { iTotal: 0, list: [] } }) };
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-source-lock-')); const file = join(dir, 'state.sqlite');
  const store = openStore(file); const other = openStore(file);
  const children = [];
  t.after(async () => {
    try {
      for (const child of children) {
        if (child.exitCode !== null || child.signalCode !== null) continue;
        const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
      }
    } finally {
      try { other.close(); } finally {
        try { store.close(); } finally { rmSync(dir, { recursive: true, force: true }); }
      }
    }
  });
  return { store, other, file, children };
}

test('second service startup preserves active attempt and rejects collection without fetching', async (t) => {
  const { store, other } = fixture(t); let now = 10000; let release; let requests = 0;
  const first = sourceService(store, { clock: () => now, fetcher: () => new Promise((resolve) => { release = resolve; }) });
  const pending = first.collect({ confirmPublicFetch: true });
  const second = sourceService(other, { clock: () => now, fetcher: async () => { requests++; return response; } });
  assert.equal(second.state().status, 'collecting');
  await assert.rejects(second.collect({ confirmPublicFetch: true }), (error) => error.status === 409);
  assert.equal(requests, 0); assert.equal(other.sourceHistory(officialSource.id).items.length, 1);
  release(response); assert.equal((await pending).status, 'success_changed');
  now += 60001; assert.equal((await second.collect({ confirmPublicFetch: true })).status, 'success_unchanged');
  assert.equal(requests, 1);
});

test('expiry reconciles once, waits for explicit cooldown retry and rejects old completion', async (t) => {
  const { store, other } = fixture(t); let now = 10000; let release; let requests = 0;
  const first = sourceService(store, { clock: () => now, fetcher: () => new Promise((resolve) => { release = resolve; }) });
  const pending = first.collect({ confirmPublicFetch: true });
  // Attach rejection observation before releasing the simulated late response.
  const rejected = assert.rejects(pending, (error) => error.status === 409);
  now += 60000;
  const second = sourceService(other, { clock: () => now, fetcher: async () => { requests++; return response; } });
  assert.equal(second.state().status, 'needs_reconciliation');
  sourceService(store, { clock: () => now });
  assert.equal(other.sourceHistory(officialSource.id).items.length, 2);
  await assert.rejects(second.collect({ confirmPublicFetch: true }), /冷却/); assert.equal(requests, 0);
  now += 60001; const current = await second.collect({ confirmPublicFetch: true });
  release(response); await rejected;
  assert.equal(other.sourceRecord(officialSource.id).collectionAttempt.id, current.collectionAttempt.id);
  assert.equal(other.sourceRecord(officialSource.id).status, 'success_changed');
  assert.equal(other.sourceHistory(officialSource.id).items.length, 4);
});

test('late response alone marks expired intent unknown instead of reporting success', async (t) => {
  const { store } = fixture(t); let now = 10000;
  const service = sourceService(store, { clock: () => now, fetcher: async () => { now += 60000; return response; } });
  await assert.rejects(service.collect({ confirmPublicFetch: true }), (error) => error.status === 409);
  assert.equal(service.state().status, 'needs_reconciliation'); assert.equal(service.state().busy, false);
  assert.equal(service.state().lastSuccess, undefined);
  assert.equal(store.sourceHistory(officialSource.id).items.length, 2);
});

test('two processes racing for one source permit exactly one persisted attempt', { timeout: 15000 }, async (t) => {
  const { store, file, children } = fixture(t);
  const moduleUrl = new URL('../src/store.mjs', import.meta.url).href;
  const code = `import {openStore} from ${JSON.stringify(moduleUrl)};
    const store=openStore(process.argv[1]); console.log('ready');
    process.stdin.once('data',()=>{try{store.beginSourceCollection('hi3-global-en',10000);console.log('won');}
      catch(error){console.log(error.status===409?'blocked':'error:'+error.message);}finally{store.close();}});`;
  function writer() {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code, file], { stdio: ['pipe', 'pipe', 'pipe'] });
    children.push(child);
    let output = ''; let errors = ''; let readyResolve; let readyReject;
    const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
    child.stdout.on('data', (bytes) => { output += bytes; if (output.includes('ready')) readyResolve(); });
    child.stderr.on('data', (bytes) => { errors += bytes; }); child.on('error', readyReject);
    const done = new Promise((resolve, reject) => {
      child.on('error', reject); child.on('exit', (code) => {
        if (!output.includes('ready')) readyReject(new Error(errors));
        if (code === 0) resolve(output); else reject(new Error(errors));
      });
    });
    // Readiness may fail before the test reaches done; still observe that rejection.
    done.catch(() => {});
    return { child, ready, done };
  }
  const a = writer(); const b = writer(); await Promise.all([a.ready, b.ready]);
  a.child.stdin.end('go'); b.child.stdin.end('go');
  const output = await Promise.all([a.done, b.done]);
  assert.equal(output.filter((text) => text.includes('won')).length, 1);
  assert.equal(output.filter((text) => text.includes('blocked')).length, 1);
  assert.equal(store.sourceHistory(officialSource.id).items.length, 1);
});
