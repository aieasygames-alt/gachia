import assert from 'node:assert/strict'
import { readPinnedUnifiedInput } from './unified-desktop'
import type { UnifiedProductionRequest } from './unified-production'

type Proof = { path: string; pin: string }
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any

// A new observation may refresh the same source index, never select a new A.
export function readUnifiedPromotionSourceSelection(production: UnifiedProductionRequest, proof: Proof) {
  const original = pinned(production.sourceHandoff), current = pinned(proof)
  for (const handoff of [original, current]) {
    assert.equal(handoff.schemaVersion, 1); assert.equal(handoff.kind, 'unified_next_batch_baseline')
    assert.equal(handoff.status, 'published_A_freshly_observed')
  }
  for (const key of ['publication', 'sourceIndex', 'releaseKey', 'planSHA256']) {
    assert.deepEqual(current[key], original[key], `Promotion source selection changed: ${key}`)
  }
  assert.deepEqual(pinned(current.active), pinned(production.active), 'Promotion source must preserve the complete public A')
  assert.deepEqual(pinned(current.active), pinned(original.active))
  assert.deepEqual(pinned(current.previous), pinned(original.previous), 'Promotion source previous artifacts changed')
  return current
}

export async function readUnifiedHistoricalPromotionSource(historical: any, proof: Proof, identityObservedAt: number) {
  readUnifiedPromotionSourceSelection(historical.production, proof)
  const previous = pinned({ path: historical.publication.previousPath, pin: historical.publication.previousPin })
  const { readUnifiedPublicationSources } = await import('./unified-source-advance')
  const sources = await readUnifiedPublicationSources(proof, { baseline: historical.value.baseline, active: historical.active,
    frozen: historical.built.frozen, previous, identityObservedAt })
  assert.deepEqual(sources.owners, historical.sources.owners, 'Promotion source modules differ from the sealed release')
  assert.deepEqual(sources.provenance, historical.sources.provenance, 'Promotion source provenance differs from the sealed release')
  return sources
}
