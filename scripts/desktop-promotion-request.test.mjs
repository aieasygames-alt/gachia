import assert from 'node:assert/strict';
import test from 'node:test';
import { promotionWriter } from './desktop-promotion-request.mjs';

const versionId = '11111111-1111-4111-8111-111111111111';
const deploymentId = '22222222-2222-4222-8222-222222222222';
const releaseKey = 'a'.repeat(64);
const versions = { gachia: versionId, 'gachia-game-genshin': versionId };
const args = { owner: 'genshin', service: 'gachia-game-genshin', versionId, releaseKey };
const response = (patch = {}) => Response.json({ success: true, result: { id: deploymentId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }], ...patch } });
const writer = request => promotionWriter({ game: 'genshin', releaseKey, versions, token: 'test-not-a-credential', request });

test('promotion request is fixed-account, exact UUID, 100%, without settings mutations', async () => {
  let calls = 0;
  const promote = writer(async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia-game-genshin/deployments');
    assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] });
    return response();
  });
  assert.equal((await promote(args)).deploymentId, deploymentId);
  await assert.rejects(promote(args), /No automatic retry/); assert.equal(calls, 1);
});
for (const patch of [{ owner: 'nte' }, { service: 'gachia-router' }, { versionId: deploymentId }, { releaseKey: 'b'.repeat(64) }]) {
  test(`promotion rejects unauthorized target ${JSON.stringify(patch)}`, async () => {
    let calls = 0; const promote = writer(async () => { calls++; return response(); });
    await assert.rejects(promote({ ...args, ...patch })); assert.equal(calls, 0);
  });
}
test('lost response is unknown, secret-safe, and never retried', async () => {
  let calls = 0; const promote = writer(async () => { calls++; throw Error('test-not-a-credential'); });
  await assert.rejects(promote(args), error => /outcome unknown/.test(error.message) && !error.message.includes('test-not-a-credential'));
  await assert.rejects(promote(args), /No automatic retry/); assert.equal(calls, 1);
});
for (const [label, result] of [
  ['HTTP failure', () => new Response('', { status: 403 })],
  ['API failure', () => Response.json({ success: false })],
  ['split deployment', () => response({ versions: [{ version_id: versionId, percentage: 50 }] })],
  ['wrong UUID', () => response({ versions: [{ version_id: deploymentId, percentage: 100 }] })],
  ['missing identity', () => response({ id: null })],
  ['malformed JSON', () => new Response('{')],
]) test(`promotion ${label} fails closed and consumes attempt`, async () => {
  let calls = 0; const promote = writer(async () => { calls++; return result(); });
  await assert.rejects(promote(args)); await assert.rejects(promote(args), /No automatic retry/); assert.equal(calls, 1);
});
test('production fetch is never selected implicitly', () => {
  assert.throws(() => promotionWriter({ game: 'genshin', releaseKey, versions, token: 'test' }), /Explicit request/);
});
