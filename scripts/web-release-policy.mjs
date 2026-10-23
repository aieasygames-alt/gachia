import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB_FEATURES = Object.freeze(JSON.parse(readFileSync(new URL('../apps/web/site-features.json', import.meta.url), 'utf8')));

export function requiredWebSecrets(features = WEB_FEATURES) {
  if (typeof features?.accountFeatures !== 'boolean') throw new Error('Invalid account feature policy');
  return features.accountFeatures
    ? ['INDEXNOW_AUTH_TOKEN', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    : ['INDEXNOW_AUTH_TOKEN'];
}

export const DISABLED_ACCOUNT_ROUTES = Object.freeze([
  ['/api/auth/get-session', 'GET'], ['/api/auth/sign-in/social', 'POST'],
  ['/api/auth/callback/google?code=disabled&state=disabled', 'GET'], ['/api/auth/sign-out', 'POST'],
  ...['GET', 'POST', 'DELETE'].map(method => ['/api/favorites', method]),
  ...['GET', 'POST', 'DELETE'].map(method => ['/api/user-characters', method]),
  ...['GET', 'POST', 'PUT'].map(method => ['/api/map/progress', method]),
  ['/api/shared-builds', 'POST'],
]);

export async function verifyDisabledAccounts(origin, request = fetch) {
  assert.equal(WEB_FEATURES.accountFeatures, false, 'This acceptance requires accounts disabled');
  const results = [];
  for (const [path, method] of DISABLED_ACCOUNT_ROUTES) {
    const response = await request(new URL(path, origin), {
      method, redirect: 'manual', signal: AbortSignal.timeout(30000),
      headers: { cookie: '__Secure-better-auth.session_token=retired-session', 'content-type': 'application/json' },
      // Malformed bodies must still hit the gate before parsing or DB access.
      ...(method === 'GET' ? {} : { body: '{' }),
    });
    assert.equal(response.status, 404, `${method} ${path}: disabled status`);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.equal(response.headers.get('set-cookie'), null, 'Disabled accounts must not create/refresh cookies');
    assert.equal((await response.json()).code, 'ACCOUNT_FEATURES_DISABLED');
    results.push({ path, method, status: response.status });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, target, ...extra] = process.argv.slice(2);
    if (extra.length || !target) throw new Error('Usage: web-release-policy.mjs secrets <list.json> | account-smoke <origin>');
    if (command === 'secrets') {
      const configured = new Set(JSON.parse(readFileSync(target, 'utf8')).map(({ name }) => name));
      const missing = requiredWebSecrets().filter(name => !configured.has(name));
      if (missing.length) throw new Error(`Missing Worker secrets: ${missing.join(', ')}`);
      console.log(`Worker secret names verified (accounts ${WEB_FEATURES.accountFeatures ? 'enabled' : 'disabled'})`);
    } else if (command === 'account-smoke') {
      const url = new URL(target);
      if (url.origin !== 'https://gachia-staging.aieasygames.workers.dev' || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Account smoke only permits the isolated main staging origin');
      }
      console.log(JSON.stringify(await verifyDisabledAccounts(url.origin)));
    } else throw new Error('Unknown command');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
