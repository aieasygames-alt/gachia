// Refresh the existing Wrangler OAuth session before a long cutover. No new
// login, scope request, account change, Worker upload or deployment is allowed.
// Protocol/client ID match pinned Wrangler 4.148.0's refreshToken implementation.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, renameSync, realpathSync, openSync, fsyncSync, closeSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { digest } from '../../scripts/desktop-release-assets.mjs';
import { migrationSave } from '../../scripts/genshin-migration-http.mjs';
const root = import.meta.dirname, config = homedir() + '/.wrangler/config/default.toml';
assert.equal(realpathSync(config), config);
assert(!existsSync(root + '/production.jsonl'), 'Refresh only before the production phase');
for (const owner of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) for (const role of ['candidate', 'recovery'])
  assert(existsSync(`${root}/cloud/${owner}/${role}/module/receipt.json`), 'Game uploads/module captures must finish before refreshing');
assert(existsSync(root + '/cloud/main/recovery/module/receipt.json'), 'Refresh during Main recovery HTTP preview, after its upload/module capture');
const progress = JSON.parse(readFileSync(root + '/cloud/main/recovery/preview/progress.json'));
assert.equal(progress.stage, 'reading'); assert(progress.completed < progress.total / 2, 'Refresh before the next control-plane operation');
const sealed = JSON.parse(readFileSync(root + '/sealed.json')), cli = readFileSync(sealed.tool.cli);
assert.equal(digest(cli), sealed.tool.cliSHA256);
const clientID = '54d11594-84e4-41aa-b438-e81b8fa78ee7', endpoint = 'https://dash.cloudflare.com/oauth2/token';
assert(cli.includes(clientID) && cli.includes('async function exchangeRefreshTokenForAccessToken(') && cli.includes('/oauth2/token'));
const original = readFileSync(config, 'utf8');
const field = key => {
  const values = [...original.matchAll(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'gm'))];
  assert.equal(values.length, 1); return JSON.parse(values[0][1]);
};
const oldExpiration = field('expiration_time'), refresh = field('refresh_token');
const oldScopes = JSON.parse(original.match(/^scopes\s*=\s*(\[[\s\S]*?\])/m)[1].replace(/,\s*\]/g, ']'));
assert(typeof refresh === 'string' && refresh.length > 20);
assert(Date.parse(oldExpiration) > Date.now(), 'Use normal Wrangler refresh after actual expiration');
assert(Date.parse(oldExpiration) < Date.now() + 20 * 60000, 'No early unrelated credential rotation');
let response;
try {
  response = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { 'content-type': 'application/x-www-form-urlencoded', connection: 'close' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh, client_id: clientID }).toString() });
} catch {
  migrationSave(root, 'oauth-precutover-failure.json', { status: 'unknown_refresh_outcome', automaticRetry: false });
  throw Error('OAuth refresh outcome unknown; do not repeat automatically');
}
assert(response.ok, `Existing OAuth refresh HTTP ${response.status}`);
const body = await response.json();
assert(typeof body.access_token === 'string' && body.access_token.length > 20);
assert(Number.isSafeInteger(body.expires_in) && body.expires_in >= 1800 && body.expires_in <= 86400);
const scopes = typeof body.scope === 'string' ? body.scope.split(' ').filter(Boolean) : [];
assert(scopes.includes('workers:write'));
assert.deepEqual([...scopes].sort(), [...oldScopes].sort(), 'Refreshed scope set changed');
assert(!body.refresh_token || (typeof body.refresh_token === 'string' && body.refresh_token.length > 20));
const expiration = new Date(Date.now() + body.expires_in * 1000).toISOString();
let next = original;
for (const [key, value] of Object.entries({ oauth_token: body.access_token, refresh_token: body.refresh_token || refresh, expiration_time: expiration }))
  next = next.replace(new RegExp('^' + key + '\\s*=\\s*"[^"\\r\\n]*"\\s*$', 'm'), key + ' = ' + JSON.stringify(value));
assert(readFileSync(config, 'utf8') === original, 'Credential state changed concurrently');
const temporary = config + '.r146-refresh-' + process.pid;
writeFileSync(temporary, next, { flag: 'wx', mode: 0o600 });
const fd = openSync(temporary, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
renameSync(temporary, config);
const membership = await fetch('https://api.cloudflare.com/client/v4/memberships?per_page=50', { method: 'GET', redirect: 'error',
  headers: { authorization: 'Bearer ' + body.access_token, connection: 'close' }, signal: AbortSignal.timeout(30000) });
assert.equal(membership.status, 200);
const memberships = await membership.json(); assert.equal(memberships.success, true);
const target = memberships.result.filter(row => row.account?.id === 'e6472b6c6172a3ac1e1596ef100543ae');
assert.equal(target.length, 1); assert.equal(target[0].status, 'accepted');
migrationSave(root, 'oauth-precutover-refresh.json', { at: new Date().toISOString(), protocol: 'pinned Wrangler OAuth refresh_token grant',
  endpoint, cliSHA256: digest(cli), oldExpiration, expiration, workersWriteScope: true, scopeChanged: false,
  membershipStatus: membership.status, accountId: target[0].account.id, roles: target[0].roles.map(row => row.name),
  credentialsEmitted: false, workerWrites: 0 });
console.log(JSON.stringify({ existingOAuthRefreshed: true, expiration, workersWriteScope: true, accountVerified: true }));
