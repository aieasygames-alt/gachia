import assert from 'node:assert/strict';
import test from 'node:test';
import { auditProductionSite, auditProductionOwners, PRODUCTION_AUDIT_PATHS } from './production-site-audit.mjs';

function fixture(override = {}) {
  return async (url, options) => {
    assert.equal(url.origin, 'https://gachia.com');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'omit');
    assert(options.signal instanceof AbortSignal);
    const path = url.pathname + url.search;
    if (override[path]) return override[path]();
    if (path === '/') return new Response('', { status: 307, headers: { location: '/zh' } });
    if (path === '/api/auth/get-session') return Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, {
      status: 404, headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
    });
    return new Response('<link rel="canonical" href="https://gachia.com/zh"><meta property="og:title" content="test">', {
      headers: { 'content-type': path.includes('.xml') ? 'application/xml' : 'text/html' },
    });
  };
}

test('production audit defaults to disabled account policy and remains bounded read-only', async () => {
  const result = await auditProductionSite({}, fixture());
  assert.equal(result.accountFeatures, false);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.observations.map(item => item.path), PRODUCTION_AUDIT_PATHS);
  const enabled = await auditProductionSite({ accountFeatures: true }, fixture({ '/api/auth/get-session': () => Response.json(null) }));
  assert.deepEqual(enabled.failures, []);
});

test('production audit rejects other origins and ambiguous account policy before making requests', async () => {
  for (const config of [{ origin: 'https://gachia.com/' }, { origin: 'https://example.com' }, { accountFeatures: 'false' }]) {
    await assert.rejects(auditProductionSite(config, () => assert.fail('No request permitted')));
  }
});

test('production audit detects enabled auth, missing retirement headers, bad JSON and cookie refresh', async () => {
  for (const response of [() => Response.json(null), () => new Response('not-json', { status: 404 }),
    () => Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404 }),
    () => Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'set-cookie': 'session=new' } })]) {
    const result = await auditProductionSite({}, fixture({ '/api/auth/get-session': response }));
    assert(result.failures.some(item => item.startsWith('/api/auth/get-session:')));
  }
});

test('production audit preserves redirect, XML and SEO assertions', async () => {
  const result = await auditProductionSite({}, fixture({
    '/': () => new Response('', { status: 302, headers: { location: '/en' } }),
    '/sitemaps/nte/index.xml': () => new Response('', { headers: { 'content-type': 'text/html' } }),
    '/zh/games': () => new Response('<h1>Missing metadata</h1>'),
  }));
  for (const message of ['unexpected status 302', 'returned HTML', 'missing canonical', 'missing og:title']) {
    assert(result.failures.some(item => item.includes(message)), message);
  }
});

function ownerFixture(override = () => null) {
  return async (url, options) => {
    assert.equal(url.origin, 'https://gachia.com'); assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    const owner = url.pathname.match(/\/(?:zh|_games|sitemaps)\/(genshin|nte|azur-promilia|lvmeng)(?:\/|$)/)?.[1];
    const changed = override(url, owner); if (changed) return changed;
    const prefix = owner ? `/_games/${owner}/_next/static/` : '/_next/static/';
    const headers = owner ? { 'x-gachia-route-target': owner } : {};
    const kind = url.pathname.endsWith('.xml') ? 'xml' : url.pathname.endsWith('.js') ? 'javascript' : url.pathname.endsWith('.css') ? 'css' : 'html';
    headers['content-type'] = `text/${kind}`;
    return new Response(kind === 'html' ? `<link rel="canonical" href="https://gachia.com${url.pathname}"><script src="${prefix}webpack.js"></script><link href="${prefix}style.css">`
      : kind === 'xml' ? `<loc>https://gachia.com/zh/${owner}</loc>` : 'fixture', { headers });
  };
}

test('production owner audit checks all five page/JS/CSS owners and four sitemaps with 19 GETs', async () => {
  const result = await auditProductionOwners(ownerFixture());
  assert.equal(result.length, 19);
  assert.equal(result.filter(item => item.kind === 'xml').length, 4);
});

test('production owner audit rejects wrong owners, MIME types, asset namespaces and public SEO', async () => {
  for (const response of [() => new Response('', { status: 404 }), () => new Response('', { headers: { 'x-gachia-route-target': 'nte' } }),
    () => new Response('<link rel="canonical" href="https://gachia.com/zh">'),
    () => new Response('', { headers: { 'x-robots-tag': 'noindex' } })]) {
    await assert.rejects(auditProductionOwners(ownerFixture(url => url.pathname === '/zh' ? response() : null)));
  }
  await assert.rejects(auditProductionOwners(ownerFixture(url => url.pathname.endsWith('.js') ? new Response('HTML', { headers: { 'content-type': 'text/html' } }) : null)), /content type/);
});
