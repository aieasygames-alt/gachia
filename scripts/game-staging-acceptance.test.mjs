import assert from 'node:assert/strict';
import test from 'node:test';
import { localBrowserProxy, parseStagingArguments, stagingOrigin, verifyStagingHttp } from './game-staging-acceptance.mjs';

const options = { game: 'azur-promilia', subdomain: 'fixture-account' };
const base = '/zh/azur-promilia';
const prefix = '/_games/azur-promilia/_next/';

function fixture(overrides = {}) {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url: String(url), init });
    const path = url.pathname;
    let body, status = 200, type = 'text/html';
    if (path === '/robots.txt') { body = 'User-agent: *\nDisallow: /\n'; type = 'text/plain'; }
    else if (path === '/sitemap.xml') { body = '<urlset>' + ['zh', 'en', 'ja'].map(locale => `<url><loc>https://gachia.com/${locale}/azur-promilia/characters/example</loc></url>`).join('') + '</urlset>'; type = 'application/xml'; }
    else if (path.endsWith('.js') || path.endsWith('.css')) { body = 'same asset bytes'; type = path.endsWith('.js') ? 'application/javascript' : 'text/css'; }
    else if (path.endsWith('__staging_acceptance_missing__')) { body = '<h1>Not found</h1>'; status = 404; }
    else body = `<h1>Fixture</h1><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://gachia.com${path}"><script src="${prefix}test.js"></script><link href="${prefix}test.css">`;
    const extra = overrides[path] ?? {};
    return new Response(extra.body ?? body, { status: extra.status ?? status, headers: { 'content-type': type, 'x-robots-tag': 'noindex, nofollow', ...extra.headers } });
  };
  return { calls, request };
}

test('staging origin is constructed from reviewed game and a single account label', () => {
  assert.equal(stagingOrigin(options), 'https://gachia-game-azur-promilia-staging.fixture-account.workers.dev');
  assert.equal(stagingOrigin({ ...options, game: 'nte' }), 'https://gachia-game-nte-staging.fixture-account.workers.dev');
  for (const subdomain of ['', undefined, 'https://gachia.com', 'a.workers.dev', 'a/b', 'a:443', 'a@b', '-a', 'a-', 'a'.repeat(64)]) {
    assert.throws(() => stagingOrigin({ ...options, subdomain }));
  }
  for (const game of ['web', 'genshin', 'azur-promilia-staging', '../nte']) assert.throws(() => stagingOrigin({ ...options, game }));
});

test('CLI rejects origin overrides, missing fields and duplicate flags', () => {
  assert.deepEqual(parseStagingArguments(['--game', 'azur-promilia', '--subdomain', 'fixture-account']), options);
  for (const args of [[], ['--game', 'nte'], ['--origin', 'https://gachia.com'], ['--game', 'nte', '--game', 'nte'], ['--game', '--subdomain'], ['--subdomain', 'fixture-account', '--game', 'nte', '--deploy', 'true']]) assert.throws(() => parseStagingArguments(args));
});

test('optional browser proxy cannot use remote hosts, credentials or URL payloads', () => {
  assert.equal(localBrowserProxy(undefined), undefined);
  assert.deepEqual(localBrowserProxy('http://127.0.0.1:7890'), { server: 'http://127.0.0.1:7890' });
  for (const value of ['', 'http://remote.invalid:7890', 'https://localhost:7890', 'http://user:pass@127.0.0.1:7890', 'http://127.0.0.1:7890/path', 'http://localhost', 'http://localhost:7890/?x=1']) assert.throws(() => localBrowserProxy(value));
});

test('remote HTTP uses bounded GET requests with no credentials or redirects', async () => {
  const { request, calls } = fixture();
  const result = await verifyStagingHttp(options, request);
  assert.equal(result.observations.length, 16);
  assert.equal(result.status, 'staging_http_verified');
  for (const { url, init } of calls) {
    assert.equal(new URL(url).origin, stagingOrigin(options));
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit');
    assert(init.signal instanceof AbortSignal);
  }
});

test('redirects to production fail without following them', async () => {
  const { request, calls } = fixture({ '/robots.txt': { status: 302, headers: { location: 'https://gachia.com' } } });
  await assert.rejects(verifyStagingHttp(options, request), /unexpected status/);
  assert.equal(calls.length, 1);
});

test('staging rejects missing noindex, bad canonical and preview sitemap URLs', async () => {
  for (const override of [
    { [base]: { body: '<h1>Not protected</h1>' } },
    { [base]: { headers: { 'x-robots-tag': 'index' } } },
    { [base]: { body: '<h1>Fixture</h1><meta name="robots" content="noindex"><link rel="canonical" href="https://wrong.invalid">' } },
    { '/sitemap.xml': { body: '<urlset><url><loc>https://preview.invalid/zh/azur-promilia/characters/a</loc></url></urlset>' } },
    { '/robots.txt': { body: 'User-agent: *\nAllow: /\n' } },
  ]) await assert.rejects(verifyStagingHttp(options, fixture(override).request));
});

test('staging rejects divergent assets and a soft 404', async () => {
  await assert.rejects(verifyStagingHttp(options, fixture({ '/_next/test.js': { body: 'different bytes' } }).request));
  await assert.rejects(verifyStagingHttp(options, fixture({ [`${base}/__staging_acceptance_missing__`]: { status: 200 } }).request));
});
