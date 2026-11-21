// Operational OAuth refresh, matching installed Wrangler's refresh-token grant.
// No Worker writes, credential logging, expiry spoofing or request retries.
import assert from 'node:assert/strict';
import { chmodSync, closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const field = (text, key) => {
  const matches = [...text.matchAll(new RegExp(`^${key}\\s*=\\s*("[^"\\r\\n]*")\\s*$`, 'gm'))];
  assert.equal(matches.length, 1, 'Expected one auth field');
  return JSON.parse(matches[0][1]);
};
const replace = (text, key, value) => {
  field(text, key);
  return text.replace(new RegExp(`^${key}\\s*=\\s*"[^"\\r\\n]*"\\s*$`, 'm'), `${key} = ${JSON.stringify(value)}`);
};
assert.equal(field('oauth_token = "fixture"\n', 'oauth_token'), 'fixture');
assert.equal(field(replace('oauth_token = "fixture"\n', 'oauth_token', 'changed'), 'oauth_token'), 'changed');
assert.throws(() => field('oauth_token="a"\noauth_token="b"', 'oauth_token'));
assert.deepEqual(process.argv.slice(2), ['--execute-once'], 'Explicit operation required');
process.umask(0o077);

const prepared = JSON.parse(readFileSync(join(import.meta.dirname, 'nte-material-r130-2026-11-18/prepared.json'), 'utf8'));
const sourcePath = prepared.value.tool.cli;
const source = readFileSync(sourcePath);
for (const expected of ['grant_type: "refresh_token"', '54d11594-84e4-41aa-b438-e81b8fa78ee7', 'dash.cloudflare.com', '/oauth2/token']) {
  assert(source.includes(Buffer.from(expected)), 'Installed Wrangler OAuth contract changed');
}
const config = join(homedir(), '.wrangler/config/default.toml');
const before = readFileSync(config, 'utf8');
const previousExpiry = field(before, 'expiration_time');
const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: field(before, 'refresh_token'), client_id: '54d11594-84e4-41aa-b438-e81b8fa78ee7' });
const receiptPath = join(import.meta.dirname, 'genshin-collection-production-2026-11-21-r143/oauth-refresh-02.json');
const intentPath = receiptPath + '.intent.json';
assert(!existsSync(receiptPath) && !existsSync(intentPath), 'Auth operation already attempted; do not retry');
writeFileSync(intentPath, JSON.stringify({ at: new Date().toISOString(), authPOSTs: 1, workerWrites: 0 }) + '\n', {flag:'wx',mode:0o600});
const response = await fetch('https://dash.cloudflare.com/oauth2/token', {
  method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
  headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
});
assert.equal(response.status, 200, 'OAuth refresh failed; no automatic retry');
const result = await response.json();
assert(!result.error, 'OAuth refresh rejected; do not print credential response');
assert(typeof result.access_token === 'string' && result.access_token.length > 20);
assert(Number.isSafeInteger(result.expires_in) && result.expires_in >= 1800 && result.expires_in <= 7200);
if (result.refresh_token) assert(typeof result.refresh_token === 'string' && result.refresh_token.length > 20);
const expiry = new Date(Date.now() + result.expires_in * 1000).toISOString();
let after = replace(replace(before, 'oauth_token', result.access_token), 'expiration_time', expiry);
if (result.refresh_token) after = replace(after, 'refresh_token', result.refresh_token);
// Preserve a rotated credential before validating the reported scope set.
assert.equal(readFileSync(config, 'utf8'), before, 'Concurrent auth change; stop');
const temporary = config + '.refresh-' + randomBytes(6).toString('hex');
const fd = openSync(temporary, 'wx', 0o600);
try { writeFileSync(fd, after); fsyncSync(fd); } finally { closeSync(fd); }
renameSync(temporary, config);
chmodSync(config, 0o600);
const oldScopes = [...before.matchAll(/^scopes\s*=\s*\[([^\]]*)\]/gm)];
assert.equal(oldScopes.length, 1);
const scopes = [...oldScopes[0][1].matchAll(/"([^"]+)"/g)].map(row => row[1]).sort();
if (result.scope) assert.deepEqual(result.scope.split(' ').filter(Boolean).sort(), scopes, 'Scope changed; do not begin publication');
const receipt = { at: new Date().toISOString(), previousExpiry, expiry, grant: 'refresh_token',
  endpoint: 'https://dash.cloudflare.com/oauth2/token', installedWranglerSHA256: createHash('sha256').update(source).digest('hex'),
  scopeSetUnchanged: true, credentialResponseArchived: false, credentialConfigOnly: true,
  authPOSTs: 1, workerWrites: 0, retried: false, expirySpoofed: false };
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ refreshed: true, expiry, scopeSetUnchanged: true, workerWrites: 0 }));
