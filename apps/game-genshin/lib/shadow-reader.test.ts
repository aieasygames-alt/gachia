import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shadowLocalEnabled } from '../../../packages/core/shadow-local-gate';
test('genshin shadow requires both local isolation and owner opt-in', () => {
  const env = { CONTENT_SHADOW_LOCAL_ONLY: '1', GENSHIN_SHADOW_READER: '1' };
  assert.equal(shadowLocalEnabled('genshin', '127.0.0.1:3317', env), true);
  assert.equal(shadowLocalEnabled('genshin', 'gachia.com', env), false);
  assert.equal(shadowLocalEnabled('genshin', '127.0.0.1:3317', { ...env, CONTENT_SHADOW_LOCAL_ONLY: undefined }), false);
});
