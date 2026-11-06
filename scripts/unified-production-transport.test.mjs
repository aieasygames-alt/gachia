import assert from 'node:assert/strict';
import test from 'node:test';
import { unifiedProductionRead, unifiedUploadArguments, unifiedUploadResponse } from './unified-production-transport.mjs';

test('fixed reads disable idle connection reuse, never retry, and cannot issue writes', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/test'); assert.equal(options.method, 'GET');
    assert.equal(new Headers(options.headers).get('connection'), 'close');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer private-test-token');
    return Response.json({ success: true });
  });
  const options = { method: 'GET', headers: { authorization: 'Bearer private-test-token' } };
  assert.equal((await unifiedProductionRead('https://api.cloudflare.com/client/v4/test', options)).status, 200);
  await assert.rejects(unifiedProductionRead('https://api.cloudflare.com/client/v4/test', { ...options, method: 'POST' }), /cannot write/);
  mock.mock.mockImplementation(async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(unifiedProductionRead('https://api.cloudflare.com/client/v4/test', options), /Production read failed: https:\/\/api.cloudflare.com\/client\/v4\/test/);
  assert.equal(mock.mock.callCount(), 2);
});
import { UNIFIED_OWNERS, unifiedService } from './unified-release-assets.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';

test('fixed upload invocation can only upload an exact no-bundle preview, including explicit environments', () => {
  for (const env of ['', 'production']) assert.deepEqual(unifiedUploadArguments('/tmp/upload.json', env, '/tmp/out.multipart'),
    ['versions', 'upload', '--no-bundle', '--config', '/tmp/upload.json', '--env', env, '--outfile', '/tmp/out.multipart']);
});

for (const owner of UNIFIED_OWNERS) test(`accepts only the exact single upload response for ${owner}`, () => {
  const service = unifiedService(owner), uuid = '1234abcd-0000-4000-8000-000000000001';
  const output = `Worker Version ID: ${uuid}\nVersion Preview URL: ${exactUnifiedPreviewOrigin(service, uuid)}\n`;
  assert.deepEqual(unifiedUploadResponse(output, service), { versionId: uuid });
  for (const invalid of ['', output + output, output.replace('Version Preview URL:', 'Preview:'), output.replace(service, 'wrong-service'), output.replaceAll(uuid, 'not-an-uuid')]) {
    assert.throws(() => unifiedUploadResponse(invalid, service));
  }
});
