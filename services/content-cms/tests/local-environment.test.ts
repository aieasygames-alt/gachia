import assert from 'node:assert/strict'
import test from 'node:test'
import { localEnvironment } from '../src/local-environment'

test('local configuration fails closed without explicit opt-in or secret', () => {
  assert.throws(() => localEnvironment({}), /CMS_LOCAL_ONLY/)
  assert.throws(() => localEnvironment({ CMS_LOCAL_ONLY: '1' }), /PAYLOAD_SECRET/)
})
test('local configuration rejects remote bindings and path escapes', () => {
  const env = { CMS_LOCAL_ONLY: '1', PAYLOAD_SECRET: 'x'.repeat(32) }
  for (const name of ['DATABASE_URL', 'D1_DATABASE_ID', 'R2_BUCKET', 'PAYLOAD_PUBLIC_SERVER_URL']) {
    assert.throws(() => localEnvironment({ ...env, [name]: 'remote' }), /forbidden/)
  }
  assert.throws(() => localEnvironment({ ...env, CMS_LOCAL_NAMESPACE: '../../escape' }), /namespace/)
  assert.match(localEnvironment(env).databaseURL, /^file:.*\/\.local\/development\/cms\.db$/)
})
