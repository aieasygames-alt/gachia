import assert from 'node:assert/strict';
import test from 'node:test';
import { request as playwright } from '@playwright/test';
import { assertGenshinMigrationPreviewRead, assertGenshinPublicRead, assertUnifiedPreviewRead, createGenshinPublicNetwork, createUnifiedPreviewNetwork, unifiedPreviewProxy } from './unified-preview-network.mjs';

const origin = 'https://1234abcd-gachia.aieasygames.workers.dev';
const options = { method: 'GET', redirect: 'error', credentials: 'omit', headers: { 'accept-language': 'zh' } };
test('public proxy is separate from previews and never carries credentials or writes to an API', async t => {
  assert.equal(assertGenshinPublicRead('https://gachia.com/en/genshin/items', options).url, 'https://gachia.com/en/genshin/items');
  for (const url of ['https://api.cloudflare.com/', origin, 'https://gachia.com.evil.invalid/', 'http://gachia.com/', 'https://gachia.com/?x=1', 'https://gachia.com/#x'])
    assert.throws(() => assertGenshinPublicRead(url, options));
  for (const patch of [{ method: 'POST' }, { method: 'PATCH' }, { redirect: 'follow' }, { credentials: 'include' },
    { headers: { authorization: 'private' } }, { headers: { cookie: 'private' } }, { headers: { host: 'other' } }])
    assert.throws(() => assertGenshinPublicRead('https://gachia.com/', { ...options, ...patch }));
  let reads = 0;
  t.mock.method(playwright, 'newContext', async config => {
    assert.equal(config.ignoreHTTPSErrors, false); assert.deepEqual(config.storageState, { cookies: [], origins: [] });
    return { dispose: async () => {}, get: async (url, args) => {
      reads++; assert.equal(url, 'https://gachia.com/en'); assert.equal(args.headers.cookie, ''); assert.equal(args.maxRetries, 0); assert.equal(args.maxRedirects, 0);
      return { body: async () => Buffer.from('public'), status: () => 200, headersArray: () => [], dispose: async () => {} };
    } };
  });
  const network = await createGenshinPublicNetwork('http://127.0.0.1:1087');
  try {
    assert.equal(network.route.kind, 'explicit_loopback_public_proxy');
    assert.equal(await (await network.request('https://gachia.com/en', options)).text(), 'public');
    await assert.rejects(network.request('https://api.cloudflare.com/', options)); assert.equal(reads, 1);
  } finally { await network.close(); }
});
test('migration proxy scope adds only its exact Router and never broadens the ordinary editorial reader', () => {
  const router = 'https://1234abcd-gachia-router.aieasygames.workers.dev';
  for (const service of ['gachia', 'gachia-router', 'gachia-game-genshin']) assertGenshinMigrationPreviewRead(`https://1234abcd-${service}.aieasygames.workers.dev/robots.txt`, options);
  assert.throws(() => assertUnifiedPreviewRead(router + '/robots.txt', options));
  for (const url of ['https://api.cloudflare.com/', 'https://gachia.com/', router.replace('1234abcd', 'latest'), router + '?query=1',
    'https://1234abcd-gachia-game-nte.aieasygames.workers.dev', router.replace('https:', 'http:')]) assert.throws(() => assertGenshinMigrationPreviewRead(url, options));
  for (const patch of [{ method: 'POST' }, { redirect: 'follow' }, { credentials: 'include' }, { headers: { authorization: 'secret' } }, { headers: { cookie: 'secret' } }])
    assert.throws(() => assertGenshinMigrationPreviewRead(router, { ...options, ...patch }));
});

test('preview routing accepts only explicit credential-free loopback proxies', () => {
  assert.equal(unifiedPreviewProxy('socks5://127.0.0.1:1080'), 'socks5://127.0.0.1:1080');
  assert.equal(unifiedPreviewProxy('http://127.0.0.1:7890/'), 'http://127.0.0.1:7890');
  for (const value of [undefined, '', 'https://127.0.0.1:7890', 'socks5://example.com:1080', 'socks5://localhost:1080',
    'socks5://user:pass@127.0.0.1:1080', 'socks5://127.0.0.1:1080/path', 'socks5://127.0.0.1:1080?x=1', 'http://127.0.0.1']) assert.throws(() => unifiedPreviewProxy(value));
});
test('the proxy reader rejects writes, arbitrary origins, queries, redirects and credentials before networking', () => {
  assert.equal(assertUnifiedPreviewRead(origin + '/robots.txt', options).url, origin + '/robots.txt');
  for (const url of ['https://api.cloudflare.com/', 'http://127.0.0.1/', origin + '?x=1', origin + '#x', origin.replace('1234abcd', 'latest'), origin.replace('gachia.', 'router.'), origin.replace('https://', 'https://user:pass@')]) {
    assert.throws(() => assertUnifiedPreviewRead(url, options));
  }
  for (const patch of [{ method: 'POST' }, { redirect: 'follow' }, { credentials: 'include' }, { headers: { authorization: 'private' } }, { headers: { cookie: 'private' } }, { headers: { host: 'other' } }]) {
    assert.throws(() => assertUnifiedPreviewRead(origin, { ...options, ...patch }));
  }
});
test('the pinned client uses verified TLS, remote SOCKS DNS, no retry or redirect, and disposes each buffered response', async t => {
  let disposed = 0, closed = 0, calls = 0;
  t.mock.method(playwright, 'newContext', async config => {
    assert.deepEqual(config, { proxy: { server: 'socks5://127.0.0.1:1080' }, ignoreHTTPSErrors: false, timeout: 30000, userAgent: 'node', storageState: { cookies: [], origins: [] } });
    return { dispose: async () => { closed++; }, get: async (url, args) => {
      calls++; assert.equal(url, origin + '/robots.txt'); assert.equal(args.maxRetries, 0); assert.equal(args.maxRedirects, 0); assert.equal(args.timeout, 30000);
      assert.equal(args.headers.cookie, ''); assert.equal(args.headers['accept-language'], 'zh');
      assert.equal(args.headers.connection, 'close');
      return { body: async () => Buffer.from('User-agent: *\nDisallow: /\n'), status: () => 200,
        headersArray: () => [{ name: 'Content-Type', value: 'text/plain' }, { name: 'X-Robots-Tag', value: 'noindex' }], dispose: async () => { disposed++; } };
    } };
  });
  const network = await createUnifiedPreviewNetwork('socks5://127.0.0.1:1080');
  try {
    const response = await network.request(origin + '/robots.txt', options); assert.equal(response.status, 200); assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.equal(await response.text(), 'User-agent: *\nDisallow: /\n');
    await assert.rejects(network.request('https://example.com/', options)); assert.equal(calls, 1); assert.equal(disposed, 1);
  } finally { await network.close(); }
  assert.equal(closed, 1);
});
