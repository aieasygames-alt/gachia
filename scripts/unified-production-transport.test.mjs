import assert from 'node:assert/strict';
import test from 'node:test';
import { unifiedUploadArguments, unifiedUploadResponse } from './unified-production-transport.mjs';
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
