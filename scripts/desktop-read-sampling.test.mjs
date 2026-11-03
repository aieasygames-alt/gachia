import assert from 'node:assert/strict';
import test from 'node:test';
import { readRetryFetch, sampleReadOnly } from './desktop-version-preview.mjs';

for (const host of ['api.cloudflare.com', 'gachia.com', '12345678-gachia-game-genshin.aieasygames.workers.dev']) {
  test(`transient GET retries retain the exact request on ${host}`, async () => {
    const url = `https://${host}/fixed`, options = { method: 'GET', redirect: 'error' };
    let calls = 0; const pauses = [];
    const request = readRetryFetch(async (input, init) => {
      assert.equal(input, url); assert.equal(init, options);
      if (++calls < 3) throw new TypeError('fetch failed');
      return new Response('ok');
    }, { pause: async ms => pauses.push(ms) });
    assert.equal(await (await request(url, options)).text(), 'ok');
    assert.equal(calls, 3); assert.deepEqual(pauses, [250, 500]);
  });
}
for (const method of ['POST', 'PUT', 'DELETE']) test(`${method} outcome is never retried`, async () => {
  let calls = 0; const request = readRetryFetch(async () => { calls++; throw new TypeError('unknown write outcome'); });
  await assert.rejects(request('https://api.cloudflare.com/fixed', { method })); assert.equal(calls, 1);
});
test('read retry budget is bounded and does not retry arbitrary origins, aborts or HTTP failures', async () => {
  let calls = 0; const request = readRetryFetch(async () => { calls++; throw new TypeError('fetch failed'); }, { pause: async () => {} });
  await assert.rejects(request('https://api.cloudflare.com/fixed')); assert.equal(calls, 3);
  calls = 0; await assert.rejects(request('https://example.invalid/fixed')); assert.equal(calls, 1);
  calls = 0; await assert.rejects(request('https://api.cloudflare.com/fixed', { signal: AbortSignal.abort() })); assert.equal(calls, 1);
  calls = 0; const http = readRetryFetch(async () => { calls++; return new Response('', { status: 503 }); });
  assert.equal((await http('https://api.cloudflare.com/fixed')).status, 503); assert.equal(calls, 1);
});
test('sample concurrency is bounded at four with stable original indices', async () => {
  let active = 0, peak = 0; const result = [];
  await sampleReadOnly(Array.from({ length: 11 }, (_, i) => i), async (item, index) => {
    peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 11 - item));
    result[index] = item; active--;
  });
  assert.equal(peak, 4); assert.equal(active, 0); assert.deepEqual(result, Array.from({ length: 11 }, (_, i) => i));
});
test('sample failure stops scheduling and waits for active siblings', async () => {
  let started = 0, completed = 0;
  await assert.rejects(sampleReadOnly(Array.from({ length: 11 }), async (_, index) => {
    started++; await new Promise(resolve => setTimeout(resolve, index === 0 ? 1 : 20));
    completed++; if (index === 0) throw Error('failed');
  }), /failed/);
  assert.equal(started, 4); assert.equal(completed, 4);
});
