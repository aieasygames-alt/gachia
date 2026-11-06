import assert from 'node:assert/strict';
import test from 'node:test';
import { unifiedMainDeploymentWriter } from './unified-main-deployment.mjs';
import { digest } from './desktop-release-assets.mjs';

const versionId = '1234abcd-0000-4000-8000-000000000001', deploymentId = '1234abcd-0000-4000-8000-000000000002', releaseKey = 'a'.repeat(64);
const args = { owner: 'main', service: 'gachia', versionId, releaseKey };
function fixture(fault) {
  const calls = [], responses = [];
  const write = unifiedMainDeploymentWriter({ releaseKey, versionId, token: 'private-fixture-token', recordResponse: row => responses.push(row),
    request: async (url, options) => {
      calls.push({ url, options }); assert.equal(options.redirect, 'error'); assert.equal(options.headers.authorization, 'Bearer private-fixture-token');
      assert.equal(options.headers.connection, 'close');
      const post = options.method === 'POST';
      assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia/deployments' + (post ? '' : `/${deploymentId}`));
      if (post) assert.deepEqual(JSON.parse(options.body), { strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] });
      if (fault === 'lost-response' && post || fault === 'verification-unavailable' && !post) throw new TypeError('network failed');
      if (fault === 'http' && post) return Response.json({ success: false }, { status: 503 });
      if (fault === 'malformed' && post) return new Response('invalid');
      const result = { id: deploymentId, ...(!post ? { strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] } : {}) };
      if (fault === 'missing-id' && post) delete result.id;
      if (fault === 'wrong-id' && !post) result.id = versionId;
      if (fault === 'split' && !post) result.versions[0].percentage = 50;
      if (fault === 'wrong-version' && !post) result.versions[0].version_id = deploymentId;
      return Response.json({ success: fault !== 'api-error', result });
    } });
  return { calls, responses, write };
}

test('Main writer verifies the exact created deployment ID and saves both responses', async () => {
  const f = fixture(), result = await f.write(args);
  assert.deepEqual(result, { deploymentId, service: 'gachia', versionId, releaseKey,
    responses: Object.fromEntries(f.responses.map(row => [row.kind, { status: row.status, sha256: digest(row.bytes), bytes: row.bytes.length }])) });
  assert.equal(f.calls.length, 2); assert.deepEqual(f.responses.map(row => row.kind), ['creation', 'verification']);
  await assert.rejects(f.write(args), /No retry/); assert.equal(f.calls.length, 2);
});
for (const field of ['owner', 'service', 'versionId', 'releaseKey']) test(`rejects unapproved ${field} before requesting`, async () => {
  const f = fixture(); await assert.rejects(f.write({ ...args, [field]: 'unapproved' })); assert.equal(f.calls.length, 0);
});
for (const fault of ['lost-response', 'verification-unavailable', 'http', 'malformed', 'missing-id', 'wrong-id', 'split', 'wrong-version', 'api-error']) test(`never retries after ${fault}`, async () => {
  const f = fixture(fault); await assert.rejects(f.write(args)); const count = f.calls.length;
  await assert.rejects(f.write(args), /No retry/); assert.equal(f.calls.length, count);
  assert.equal(f.calls.filter(call => call.options.method === 'POST').length, 1);
});
