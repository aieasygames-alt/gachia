import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shadowLocalEnabled } from '../../../packages/core/shadow-local-gate';
test('nte shadow requires both local isolation and owner opt-in', () => {
  const env = { CONTENT_SHADOW_LOCAL_ONLY: '1', NTE_SHADOW_READER: '1' };
  assert.equal(shadowLocalEnabled('nte', '127.0.0.1:3317', env), true);
  assert.equal(shadowLocalEnabled('nte', 'gachia.com', env), false);
  assert.equal(shadowLocalEnabled('nte', '127.0.0.1:3317', { ...env, CONTENT_SHADOW_LOCAL_ONLY: undefined }), false);
});
