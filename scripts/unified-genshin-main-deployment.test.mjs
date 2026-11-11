import assert from 'node:assert/strict';
import test from 'node:test';
import { unifiedGenshinMainDeploymentWriter } from './unified-genshin-main-deployment.mjs';
import { unifiedMainDeploymentWriter } from './unified-main-deployment.mjs';
import { unifiedOwnerDeploymentWriter } from './unified-owner-deployment.mjs';
import { unifiedService } from './unified-release-assets.mjs';
import { pairUUID } from './fixtures/unified-genshin-main-fixture.mjs';

const owners = ['genshin', 'main'], releaseKey = 'a'.repeat(64), versions = { genshin: pairUUID(1), main: pairUUID(2) };
const args = owner => ({ owner, service: unifiedService(owner), versionId: versions[owner], releaseKey });
function fixture({ fault, target = 'genshin', hold } = {}) {
  const calls = [], responses = [], input = { releaseKey, versions: structuredClone(versions), token: 'pair-fixture-token',
    recordResponse: row => { responses.push(row); if (fault === `record-${row.kind}` && row.owner === target) throw Error('Evidence unavailable'); },
    request: async (url, options) => {
      const owner = url.includes('/gachia-game-genshin/') ? 'genshin' : 'main', post = options.method === 'POST', id = pairUUID(10 + owners.indexOf(owner));
      calls.push({ owner, url, options });
      assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${unifiedService(owner)}/deployments${post ? '' : '/' + id}`);
      assert.equal(options.redirect, 'error'); assert.equal(options.headers.authorization, 'Bearer pair-fixture-token'); assert.equal(options.headers.connection, 'close');
      if (post) assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: [{ version_id: versions[owner], percentage: 100 }] });
      if (hold && post) await hold;
      const bad = owner === target;
      if (bad && (fault === 'lost-response' && post || fault === 'get-unavailable' && !post)) throw Error('Network unavailable');
      if (bad && (fault === 'post-http' && post || fault === 'get-http' && !post)) return Response.json({ success: false }, { status: 503 });
      if (bad && fault === 'malformed') return new Response('invalid');
      const result = { id, strategy: 'percentage', versions: [{ version_id: versions[owner], percentage: 100 }] };
      if (bad && fault === 'missing-id') delete result.id;
      if (bad && fault === 'wrong-id' && !post) result.id = pairUUID(99);
      if (bad && fault === 'split') result.versions[0].percentage = 50;
      if (bad && fault === 'wrong-version') result.versions[0].version_id = pairUUID(99);
      return Response.json({ success: !(bad && fault === 'api-error'), result });
    } };
  return { calls, responses, input, write: unifiedGenshinMainDeploymentWriter(input) };
}

test('fixed pair performs only ordered exact POST and created-ID GET, snapshots approved versions and never repeats', async () => {
  const f = fixture(); f.input.versions.genshin = pairUUID(99); f.input.releaseKey = 'b'.repeat(64);
  for (const owner of owners) {
    const result = await f.write(args(owner)); assert.equal(result.service, unifiedService(owner)); assert.equal(result.versionId, versions[owner]);
  }
  assert.deepEqual(f.calls.map(row => [row.owner, row.options.method]), [['genshin', 'POST'], ['genshin', 'GET'], ['main', 'POST'], ['main', 'GET']]);
  assert.deepEqual(f.responses.map(row => [row.owner, row.kind]), [['genshin', 'creation'], ['genshin', 'verification'], ['main', 'creation'], ['main', 'verification']]);
  for (const owner of owners) await assert.rejects(f.write(args(owner)), /never retry/);
  assert.equal(f.calls.length, 4);
});

for (const field of ['owner', 'service', 'versionId', 'releaseKey']) test(`pair rejects unapproved ${field} before the first request`, async () => {
  const f = fixture(); await assert.rejects(f.write({ ...args('genshin'), [field]: 'unapproved' })); assert.equal(f.calls.length, 0);
});
test('pair rejects Main first, duplicate Genshin and concurrent calls without extra writes', async () => {
  let release; const hold = new Promise(resolve => { release = resolve; }), f = fixture({ hold });
  await assert.rejects(f.write(args('main')), /Genshin must complete/); assert.equal(f.calls.length, 0);
  const first = f.write(args('genshin'));
  await assert.rejects(f.write(args('genshin')), /busy/); await assert.rejects(f.write(args('main')), /busy/);
  assert.equal(f.calls.length, 1); release(); await first;
  await assert.rejects(f.write(args('genshin')), /Genshin must complete/); await f.write(args('main')); assert.equal(f.calls.length, 4);
});

for (const target of owners) for (const fault of ['lost-response', 'get-unavailable', 'post-http', 'get-http', 'malformed', 'missing-id', 'wrong-id',
  'split', 'wrong-version', 'api-error', 'record-creation', 'record-verification']) {
  test(`${target} ${fault} stops the pair permanently without retry or rollback`, async () => {
    const f = fixture({ fault, target }); if (target === 'main') await f.write(args('genshin'));
    await assert.rejects(f.write(args(target))); const count = f.calls.length;
    for (const owner of owners) await assert.rejects(f.write(args(owner)), /stopped/);
    assert.equal(f.calls.length, count); assert.equal(f.calls.filter(row => row.owner === target && row.options.method === 'POST').length, 1);
    if (target === 'genshin') assert(f.calls.every(row => row.owner === 'genshin'));
  });
}

test('pair rejects missing, extra or invalid versions and unsupported owner adapters before requesting', () => {
  const f = fixture();
  for (const value of [{ main: versions.main }, { ...versions, hi3: pairUUID(3) }, { ...versions, genshin: 'bad' }]) {
    assert.throws(() => unifiedGenshinMainDeploymentWriter({ ...f.input, versions: value }));
  }
  assert.throws(() => unifiedOwnerDeploymentWriter({ ...f.input, versionId: versions.main, owner: 'hi3' }));
  assert.equal(f.calls.length, 0);
});
test('historical Main wrapper cannot be redirected by an injected owner', async () => {
  const f = fixture(), write = unifiedMainDeploymentWriter({ ...f.input, versionId: versions.main, owner: 'genshin' });
  await assert.rejects(write(args('genshin'))); assert.equal(f.calls.length, 0);
  await write(args('main')); assert(f.calls.every(row => row.owner === 'main'));
});
