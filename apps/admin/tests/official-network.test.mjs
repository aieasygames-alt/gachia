import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.mjs';
import { officialFetcher, officialSource, sourceService } from '../src/official-source.mjs';

function networkFixture(action, resolveAddress = async () => ({ address: '8.8.8.8', family: 4 })) {
  const timers = new Map(); let calls = 0; let options;
  const fetcher = officialFetcher({ resolveAddress,
    schedule(fn, ms) { timers.set(ms, fn); return ms; }, cancel(id) { timers.delete(id); },
    get(url, config, receive) {
      calls++; options = config; assert.equal(url, officialSource.endpoint);
      const request = new EventEmitter();
      request.destroy = (error) => { request.emit('error', error); request.emit('close'); };
      queueMicrotask(() => action({ request, receive, timers }));
      return request;
    },
  });
  return { fetcher, timers, calls: () => calls, options: () => options };
}

test('DNS timeout and unsafe DNS answers never start an HTTPS request', async () => {
  const hung = networkFixture(() => {}, () => new Promise(() => {}));
  const result = hung.fetcher(); hung.timers.get(5000)();
  await assert.rejects(result, /DNS timeout/); assert.equal(hung.calls(), 0); assert.equal(hung.timers.size, 0);
  for (const address of ['127.0.0.1', '169.254.169.254', '::ffff:127.0.0.1']) {
    const fixture = networkFixture(() => {}, async () => ({ address }));
    await assert.rejects(fixture.fetcher(), /Unsafe/); assert.equal(fixture.calls(), 0);
  }
});

test('fixed endpoint pins validated DNS for single and all-address lookups, without credentials or TLS bypass', async () => {
  const fixture = networkFixture(({ request, receive }) => {
    const response = new EventEmitter(); response.statusCode = 200; response.headers = {};
    receive(response); response.emit('data', Buffer.from('{}')); response.emit('end'); request.emit('close');
  });
  assert.equal((await fixture.fetcher()).body, '{}');
  const options = fixture.options();
  options.lookup('ignored', {}, (error, address, family) => { assert.equal(error, null); assert.equal(address, '8.8.8.8'); assert.equal(family, 4); });
  options.lookup('ignored', { all: true }, (error, addresses) => { assert.equal(error, null); assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]); });
  assert.equal(options.rejectUnauthorized, undefined); assert.equal(options.headers.Cookie, undefined);
  assert.equal(options.headers.Authorization, undefined); assert.equal(fixture.timers.size, 0);
});

test('request deadline, oversized body and stream errors reject rather than returning partial data', async () => {
  for (const mode of ['timeout', 'oversize', 'stream', 'aborted', 'closed']) {
    const fixture = networkFixture(({ request, receive, timers }) => {
      if (mode === 'timeout') { timers.get(15000)(); return; }
      const response = new EventEmitter(); response.statusCode = 200; response.headers = {}; receive(response);
      if (mode === 'oversize') response.emit('data', Buffer.alloc(2 * 1024 * 1024 + 1));
      else if (mode === 'aborted') response.emit('aborted');
      else if (mode === 'closed') response.emit('close');
      else { response.emit('error', new Error('truncated stream')); request.emit('close'); }
    });
    await assert.rejects(fixture.fetcher(), /timeout|too large|truncated|aborted|closed/);
    assert.equal(fixture.timers.size, 0);
  }
});

test('redirect is not followed and service records access failure, retaining old snapshots', async (t) => {
  const fixture = networkFixture(({ request, receive }) => {
    const response = new EventEmitter(); response.statusCode = 302;
    response.headers = { location: 'http://169.254.169.254/latest/meta-data/' };
    receive(response); response.emit('end'); request.emit('close');
  });
  const dir = mkdtempSync(join(tmpdir(), 'gachia-network-lock-')); const store = openStore(join(dir, 'state.sqlite'));
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  store.saveSourceRecord({ id: officialSource.id, status: 'success_changed', articles: [{ id: 'old' }], digest: 'old' });
  const service = sourceService(store, { fetcher: fixture.fetcher });
  const result = await service.collect({ confirmPublicFetch: true });
  assert.equal(result.status, 'access_failed'); assert.equal(result.digest, 'old');
  assert.equal(result.articles[0].id, 'old'); assert.equal(fixture.calls(), 1);
});
