import assert from 'node:assert/strict'
import test from 'node:test'
import { createUnifiedPromotionAuthorization } from '../src/unified-promotion-authorization'

function fixture(owners = ['genshin', 'main'], source = false) {
  const initial = { ownerOrder: owners, identityObservedAt: Date.now() - 1000, releaseKey: 'sealed-release',
    modules: { genshin: 'immutable-genshin', main: 'immutable-main' } }
  const sourceObservation = source ? { startedAt: Date.now() - 2000, observedAt: Date.now() - 1500 } : undefined
  let current = structuredClone(initial), reads = 0, inputs = 0
  const authorizedReads: number[] = []
  const input = { initial, sourceObservation,
    verify: async () => { reads++; return structuredClone(current) },
    verifyAuthorized: async (at: number) => { authorizedReads.push(at); return structuredClone(current) },
    assertWriteInputs: () => { inputs++ } }
  const value = createUnifiedPromotionAuthorization(input)
  return { ...value, initial, input, current, sourceObservation, authorizedReads, reads: () => reads, inputs: () => inputs,
    renew: () => { current.identityObservedAt = Date.now() } }
}

for (const owners of [['main'], ['genshin', 'main'], ['azur-promilia', 'genshin', 'lvmeng', 'nte', 'main']]) {
  test(`each owner requires its own fresh verification and confirmation: ${owners}`, async () => {
    const f = fixture(owners), authorizations = []
    await assert.rejects(f.verifyAfterPromotion(), /Fresh write authorization required/)
    for (const [index, owner] of owners.entries()) {
      f.renew(); const verified = await f.verify()
      const authorization = f.authorizePromotionSource(owner); authorizations.push(authorization)
      assert.equal(authorization.identityObservedAt, verified.identityObservedAt)
      assert.throws(() => f.authorizePromotionSource(owner), /already authorized/)
      await assert.rejects(f.verify(), /cannot authorize another operation/)
      await assert.rejects(f.verifyAfterPromotion(), /All promotion owners must be confirmed/)
      f.confirmPromotionSource(owner)
      assert.throws(() => f.confirmPromotionSource(owner), /Fresh write authorization required/)
      assert.throws(() => f.authorizePromotionSource(owners[index + 1]), index + 1 < owners.length ? /complete successful fresh verification/ : /already authorized/)
    }
    assert.equal((await f.verifyAfterPromotion()).releaseKey, f.initial.releaseKey)
    assert.deepEqual(f.authorizedReads, [authorizations.at(-1)!.authorizedAt])
    assert.equal(f.reads(), owners.length); assert.equal(f.inputs(), owners.length)
    await assert.rejects(f.verify(), /cannot authorize another operation/)
  })
}

test('Main-only callers retain the no-argument authorization interface', async () => {
  const f = fixture(['main']); f.authorizePromotionSource(); f.confirmPromotionSource('main')
  await f.verifyAfterPromotion()
})

for (const fault of ['missing-owner', 'wrong-owner', 'wrong-confirmation', 'early-confirmation', 'duplicate-confirmation']) {
  test(`ordered authorization rejects ${fault}`, async () => {
    const f = fixture()
    if (fault === 'missing-owner') assert.throws(() => f.authorizePromotionSource(), /Explicit next promotion owner/)
    if (fault === 'wrong-owner') assert.throws(() => f.authorizePromotionSource('main'), /Explicit next promotion owner/)
    if (fault === 'early-confirmation') assert.throws(() => f.confirmPromotionSource('genshin'), /Fresh write authorization required/)
    if (fault === 'wrong-confirmation' || fault === 'duplicate-confirmation') {
      f.authorizePromotionSource('genshin')
      if (fault === 'wrong-confirmation') assert.throws(() => f.confirmPromotionSource('main'), /confirmation owner differs/)
      else { f.confirmPromotionSource('genshin'); assert.throws(() => f.confirmPromotionSource('genshin'), /Fresh write authorization required/) }
    }
    await assert.rejects(f.verifyAfterPromotion())
  })
}

for (const fault of ['source-expiry', 'handoff-expiry', 'handoff-future', 'write-inputs', 'review', 'module', 'order', 'backwards', 'future']) {
  test(`a previous owner's authorization cannot excuse the next owner's ${fault}`, async t => {
    const f = fixture(['genshin', 'main'], fault.startsWith('handoff'))
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() })
    f.authorizePromotionSource('genshin'); f.confirmPromotionSource('genshin')
    if (fault === 'source-expiry') t.mock.timers.tick(900001)
    if (fault === 'handoff-expiry') { t.mock.timers.tick(900000); f.renew() }
    if (fault === 'handoff-future') { t.mock.timers.setTime(f.sourceObservation!.observedAt - 1); f.current.identityObservedAt = Date.now() }
    if (fault === 'write-inputs') f.input.assertWriteInputs = () => { throw Error('Executor or source proof changed') }
    if (fault === 'review') f.input.verify = async () => { throw Error('Current CMS review changed') }
    if (fault === 'module') f.current.modules.genshin = 'changed'
    if (fault === 'order') f.current.ownerOrder.reverse()
    if (fault === 'backwards') f.current.identityObservedAt--
    if (fault === 'future') f.current.identityObservedAt = Date.now() + 1
    if (['source-expiry', 'handoff-expiry', 'write-inputs'].includes(fault)) {
      await f.verify(); assert.throws(() => f.authorizePromotionSource('main'), /expired|changed/)
    } else {
      await assert.rejects(f.verify()); assert.throws(() => f.authorizePromotionSource('main'), /complete successful fresh verification/)
    }
    await assert.rejects(f.verifyAfterPromotion(), /All promotion owners must be confirmed/)
    assert.deepEqual(f.authorizedReads, [])
  })
}

test('post-write expiry uses the captured final authorization without authorizing another write', async t => {
  const f = fixture(['genshin', 'main'], true)
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() })
  f.authorizePromotionSource('genshin'); f.confirmPromotionSource('genshin')
  t.mock.timers.tick(1); f.renew(); await f.verify()
  const authorization = f.authorizePromotionSource('main'); f.confirmPromotionSource('main')
  t.mock.timers.tick(900001)
  await f.verifyAfterPromotion(); await f.verifyAfterPromotion()
  assert.deepEqual(f.authorizedReads, [authorization.authorizedAt, authorization.authorizedAt])
  assert.throws(() => f.authorizePromotionSource('main'), /already authorized/)
})

for (const fault of ['review', 'module', 'backwards']) test(`post-write checks remain live: ${fault}`, async () => {
  const f = fixture(['main']); f.authorizePromotionSource(); f.confirmPromotionSource('main')
  if (fault === 'review') f.input.verifyAuthorized = async () => { throw Error('Current CMS review changed') }
  if (fault === 'module') f.current.modules.main = 'changed'
  if (fault === 'backwards') f.current.identityObservedAt--
  await assert.rejects(f.verifyAfterPromotion())
  assert.throws(() => f.authorizePromotionSource(), /already authorized/)
})

test('verification cannot overlap another verification, authorization or confirmation', async () => {
  const f = fixture(); let finish!: (value: typeof f.current) => void
  f.input.verify = () => new Promise(resolve => { finish = resolve })
  const reading = f.verify()
  await assert.rejects(f.verify(), /already in progress/)
  assert.throws(() => f.authorizePromotionSource('genshin'), /complete successful fresh verification/)
  assert.throws(() => f.confirmPromotionSource('genshin'), /already in progress/)
  finish(structuredClone(f.current)); await reading
  f.authorizePromotionSource('genshin'); f.confirmPromotionSource('genshin')
  const next = f.verify(); finish(structuredClone(f.current)); await next
})

test('caller mutations cannot replace frozen owner order, source clocks or captured authorization', async () => {
  const f = fixture(['genshin', 'main'], true)
  f.initial.ownerOrder.reverse(); f.initial.modules.genshin = 'changed'; f.sourceObservation!.startedAt = 0
  f.authorizePromotionSource('genshin'); f.confirmPromotionSource('genshin')
  const current = await f.verify(); current.ownerOrder.reverse(); current.modules.main = 'changed'
  const authorization = f.authorizePromotionSource('main'), at = authorization.authorizedAt
  authorization.authorizedAt = 0; authorization.identityObservedAt = 0
  f.confirmPromotionSource('main'); await f.verifyAfterPromotion()
  assert.deepEqual(f.authorizedReads, [at])
})

for (const owners of [[], ['genshin'], ['main', 'main'], ['router', 'main']]) test(`invalid owner order is rejected: ${owners}`, () => {
  assert.throws(() => fixture(owners), /Invalid promotion authorization owner order/)
})
