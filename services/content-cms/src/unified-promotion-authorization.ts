import assert from 'node:assert/strict'
import { UNIFIED_OWNERS } from '../../../scripts/unified-release-assets.mjs'

type PromotionValue = { ownerOrder: string[]; identityObservedAt: number }
type Authorization = { authorizedAt: number; identityObservedAt: number }
type SourceObservation = { startedAt: number; observedAt: number }

// Only the fixed verifier creates this state. Confirmation is supplied by the
// locked protocol after its exact deployment/topology checks, never request JSON.
export function createUnifiedPromotionAuthorization<T extends PromotionValue>(input: {
  initial: T
  sourceObservation?: SourceObservation
  verify: () => Promise<T>
  verifyAuthorized: (authorizedAt: number) => Promise<T>
  assertWriteInputs: () => void
}) {
  const initial = structuredClone(input.initial), source = structuredClone(input.sourceObservation)
  const owners = initial.ownerOrder
  assert(owners.length && owners.at(-1) === 'main' && new Set(owners).size === owners.length
    && owners.every(owner => UNIFIED_OWNERS.includes(owner)), 'Invalid promotion authorization owner order')
  assert(Number.isSafeInteger(initial.identityObservedAt) && initial.identityObservedAt <= Date.now(), 'Invalid source observation time')
  if (source) assert(Number.isSafeInteger(source.startedAt) && Number.isSafeInteger(source.observedAt)
    && source.startedAt <= source.observedAt && source.observedAt <= initial.identityObservedAt, 'Invalid next-batch source observation')
  let observedAt = initial.identityObservedAt, valid = true, busy = false, completed = 0
  let pending: { owner: string; authorization: Authorization } | undefined
  let lastAuthorization: Authorization | undefined

  const read = async (operation: () => Promise<T>) => {
    assert(!busy, 'Promotion source verification is already in progress')
    busy = true; valid = false
    try {
      const current = structuredClone(await operation())
      assert(Number.isSafeInteger(current.identityObservedAt) && current.identityObservedAt >= observedAt
        && current.identityObservedAt <= Date.now(), 'Unified source observation moved backwards or into the future')
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Unified promotion source identity changed')
      observedAt = current.identityObservedAt; valid = true
      return current
    } finally { busy = false }
  }

  const verify = async () => {
    assert(!pending && completed < owners.length, 'A write-authorized verifier cannot authorize another operation until its owner is confirmed')
    return read(input.verify)
  }
  const authorizePromotionSource = (owner?: string) => {
    assert(!pending && completed < owners.length, 'Promotion source already authorized')
    assert(!busy && valid, 'A complete successful fresh verification is required before write')
    const expected = owners[completed]
    assert.equal(owner ?? (owners.length === 1 ? expected : undefined), expected, 'Explicit next promotion owner required')
    valid = false
    input.assertWriteInputs()
    const authorizedAt = Date.now()
    assert(authorizedAt >= observedAt && authorizedAt - observedAt < 900000, 'Source identity expired before write')
    if (source) assert(authorizedAt >= source.observedAt && authorizedAt - source.startedAt < 900000, 'Next-batch source handoff expired before write')
    const authorization = { authorizedAt, identityObservedAt: observedAt }
    pending = { owner: expected, authorization }; lastAuthorization = authorization; valid = false
    return { ...authorization }
  }
  const confirmPromotionSource = (owner: string) => {
    assert(!busy, 'Promotion source verification is already in progress')
    assert(pending, 'Fresh write authorization required before promotion confirmation')
    assert.equal(owner, pending.owner, 'Promotion confirmation owner differs from authorization')
    pending = undefined; completed++
    // A completed write never makes the next owner's source observation fresh.
    valid = false
  }
  const verifyAfterPromotion = async () => {
    assert(lastAuthorization, 'Fresh write authorization required before post-promotion verification')
    assert(!pending && completed === owners.length, 'All promotion owners must be confirmed before post-promotion verification')
    return read(() => input.verifyAuthorized(lastAuthorization!.authorizedAt))
  }
  return { verify, authorizePromotionSource, confirmPromotionSource, verifyAfterPromotion }
}
