import test from 'node:test'
import assert from 'node:assert/strict'
import { createOwnerShadowContext, assertOwnerShadowContext } from '../src/owner-shadow-context'

test('owner shadow context pins release and rejects drift', () => {
  const release = { releaseKey: 'a'.repeat(64), scopes: ['genshin', 'nte'], shadowOnly: true, publishable: false } as any
  const context = createOwnerShadowContext(release, 'nte')
  assert.equal(context.releaseKey, release.releaseKey)
  assert.doesNotThrow(() => assertOwnerShadowContext(context, 'nte', release.releaseKey))
  assert.throws(() => assertOwnerShadowContext(context, 'genshin', release.releaseKey), /mismatch/)
  assert.throws(() => createOwnerShadowContext(release, 'main'), /not covered/)
})
