import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDiscovery, fetchDiscovery } from '../src/discovery-checks.mjs';
const plan = { pages: [{ path: '/zh/hi3', kind: 'home' }, { path: '/zh/hi3/weapons/old', kind: 'deleted' }],
  changes: [{ dataset: 'weapons', id: 'new', type: 'added' }, { dataset: 'weapons', id: 'old', type: 'deleted' }, { dataset: 'guides', id: 'guide', type: 'modified' }] };
const review = { snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-weapons.json', content: '[{"id":"new","name":"新","nameEn":"New","nameJa":"新しい"}]' }] } };
const indexes = () => Object.fromEntries(['zh', 'en', 'ja'].map((locale) => [locale, { hi3: { weapons: [{ id: 'new',
  name: { zh: '新', en: 'New', ja: '新しい' }[locale], nameAlt: locale === 'zh' ? 'New' : '新' }] } }]));
test('discovery checks live sitemap entries, removed URLs and localized search names', () => {
  const data = indexes();
  const before = structuredClone({ plan, review, data });
  const checks = checkDiscovery(plan, review, '<urlset><url><loc>https://gachia.com/zh/hi3</loc></url></urlset>', data);
  assert.equal(checks.filter((item) => item.status === 'failed').length, 0);
  assert.equal(checks.filter((item) => item.ruleId === 'search.entity').length, 6);
  assert.ok(checks.some((item) => item.ruleId === 'search.unsupported' && item.status === 'not_covered'));
  assert.deepEqual({ plan, review, data }, before);
});
test('stale deleted entries, duplicates, wrong names and absent categories fail', () => {
  const data = indexes(); data.zh.hi3.weapons.push({ id: 'old', name: 'old', nameAlt: '' });
  data.en.hi3.weapons[0].name = 'wrong'; data.ja.hi3.weapons.push(data.ja.hi3.weapons[0]);
  const checks = checkDiscovery(plan, review, '<loc>https://gachia.com/zh/hi3/weapons/old</loc>', data);
  assert.ok(checks.filter((item) => item.status === 'failed').length >= 5);
});
test('fetch is bounded to four local requests, and errors never masquerade as empty indexes', async () => {
  const paths = [];
  const checks = await fetchDiscovery('http://127.0.0.1:4318', plan, review, async (url) => {
    paths.push(url.pathname);
    if (url.pathname === '/sitemap.xml') return new Response('<html>not sitemap</html>');
    return new Response('broken', { status: 500 });
  });
  assert.equal(paths.length, 4);
  assert.equal(checks.filter((item) => item.ruleId === 'search.fetch').length, 3);
  assert.ok(checks.some((item) => item.ruleId === 'sitemap.fetch' && item.status === 'failed'));
});
test('fetch rejects oversized responses and configures no redirects and a timeout', async () => {
  const checks = await fetchDiscovery('http://127.0.0.1:4318', { pages: [], changes: [] }, review, async (_url, options) => {
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('x'.repeat(8 * 1024 * 1024 + 1));
  });
  assert.ok(checks.some((item) => item.ruleId === 'sitemap.fetch' && item.status === 'failed'));
});
test('missing source translations cannot pass through search generator fallback names', () => {
  const untranslated = { snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-weapons.json', content: '[{"id":"new","name":"新"}]' }] } };
  const checks = checkDiscovery(plan, untranslated, '', indexes());
  for (const locale of ['en', 'ja']) assert.ok(checks.some((item) => item.ruleId === 'search.entity' && item.entityId === 'new' && item.locale === locale && item.status === 'failed'));
});

test('malformed search entries fail deletion and addition checks without throwing', () => {
  for (const entry of [null, [], 'text', { id: 12 }]) {
    const data = indexes(); data.zh.hi3.weapons.push(entry);
    const checks = checkDiscovery(plan, review, '', data);
    assert.equal(checks.filter((item) => item.ruleId === 'search.entity' && item.locale === 'zh' && item.status === 'failed').length, 2);
  }
});

test('discovery rejects non-loopback origins before calling fetch', async () => {
  let calls = 0;
  for (const origin of ['https://example.com', 'http://localhost:3000', 'http://127.0.0.1:3000/path', 'http://user@127.0.0.1:3000', 'http://127.0.0.1:0']) {
    await assert.rejects(fetchDiscovery(origin, plan, review, async () => { calls++; }), /origin/);
  }
  assert.equal(calls, 0);
});

test('discovery distinguishes bounded failure categories without leaking response or error text', async () => {
  const secret = 'SYNTHETIC_PRIVATE_DO_NOT_RECORD';
  const cases = [
    ['http_status', async () => new Response(secret, { status: 503 })],
    ['expected_urlset', async () => new Response(`<sitemapindex>${secret}</sitemapindex>`) ],
    ['response_too_large', async () => new Response('x'.repeat(8 * 1024 * 1024 + 1))],
    ['timeout', async () => { throw new DOMException(secret, 'TimeoutError'); }],
    ['aborted', async () => { throw new DOMException(secret, 'AbortError'); }],
    ['request_failed', async () => { throw new Error(secret); }],
    ['body_read_failed', async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error(secret)); } }))],
  ];
  for (const [kind, fetcher] of cases) {
    const checks = await fetchDiscovery('http://127.0.0.1:4318', plan, review, fetcher);
    const failure = checks.find(c => c.ruleId === 'sitemap.fetch');
    assert.equal(failure.diagnostic.failureKind, kind);
    assert.equal(failure.diagnostic.path, '/sitemap.xml');
    assert.equal(failure.diagnostic.timeoutMs, 30000);
    assert.ok(failure.diagnostic.elapsedMs >= 0);
    assert.equal(JSON.stringify(checks).includes(secret), false);
    assert.equal(checks.some(c => c.ruleId === 'sitemap.membership'), false, 'invalid input must not produce misleading membership checks');
    if (kind === 'http_status') assert.equal(failure.diagnostic.httpStatus, 503);
    if (kind === 'response_too_large') assert.ok(failure.diagnostic.bytesRead > failure.diagnostic.byteLimit);
  }
});

test('search JSON failures retain safe status and byte observations, valid discovery remains unchanged', async () => {
  const xml = '<urlset><url><loc>https://gachia.com/zh/hi3</loc></url></urlset>';
  const checks = await fetchDiscovery('http://127.0.0.1:4318', plan, review, async url =>
    new Response(url.pathname === '/sitemap.xml' ? xml : 'private invalid json'));
  const failures = checks.filter(c => c.ruleId === 'search.fetch');
  assert.equal(failures.length, 3);
  assert.ok(failures.every(c => c.diagnostic.failureKind === 'invalid_json' && c.diagnostic.httpStatus === 200 && c.diagnostic.bytesRead === 20));
  assert.equal(JSON.stringify(checks).includes('private invalid json'), false);
  const data = indexes();
  const valid = await fetchDiscovery('http://127.0.0.1:4318', plan, review, async url =>
    new Response(url.pathname === '/sitemap.xml' ? xml : JSON.stringify(data[url.pathname.match(/search-(\w+)\.json/)[1]])));
  assert.equal(valid.filter(c => c.status === 'failed').length, 0);
});
