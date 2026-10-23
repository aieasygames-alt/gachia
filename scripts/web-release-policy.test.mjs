import assert from 'node:assert/strict';
import test from 'node:test';
import { requiredWebSecrets, WEB_FEATURES, DISABLED_ACCOUNT_ROUTES, verifyDisabledAccounts } from './web-release-policy.mjs';
import { webStagingOrigin } from './web-staging-acceptance.mjs';

test('main staging acceptance cannot select production, another service or an arbitrary origin', () => {
  assert.equal(webStagingOrigin(), 'https://gachia-staging.aieasygames.workers.dev');
  for (const args of [['https://gachia.com'], ['--origin', 'https://example.test'], ['nte']]) assert.throws(() => webStagingOrigin(args), /only the isolated/);
});

test('only retired account secrets are optional; IndexNow remains mandatory', () => {
  assert.equal(WEB_FEATURES.accountFeatures, false);
  assert.deepEqual(requiredWebSecrets(), ['INDEXNOW_AUTH_TOKEN']);
  assert.deepEqual(requiredWebSecrets({ accountFeatures: true }), ['INDEXNOW_AUTH_TOKEN', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
  for (const value of [null, {}, { accountFeatures: 'false' }]) assert.throws(() => requiredWebSecrets(value), /Invalid/);
});

test('disabled acceptance checks every account method with retired cookies and malformed bodies', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push([url, options]);
    assert.equal(options.redirect, 'manual');
    assert.match(options.headers.cookie, /retired-session/);
    assert.equal(options.body, options.method === 'GET' ? undefined : '{');
    return Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
  };
  const results = await verifyDisabledAccounts('http://localhost:8080', request);
  assert.equal(results.length, DISABLED_ACCOUNT_ROUTES.length);
  assert.equal(calls.length, 14);
  assert(!results.some(r => r.path === '/api/shared-builds' && r.method === 'GET'));
});

test('acceptance fails on an enabled endpoint, cookie refresh, or missing privacy headers', async () => {
  for (const response of [Response.json(null), Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404 }),
    Response.json({ code: 'ACCOUNT_FEATURES_DISABLED' }, { status: 404,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'set-cookie': 'new=session' } })]) {
    await assert.rejects(verifyDisabledAccounts('http://localhost:8080', async () => response));
  }
});
