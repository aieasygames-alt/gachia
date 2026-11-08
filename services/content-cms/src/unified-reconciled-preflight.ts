import assert from 'node:assert/strict'
import path from 'node:path'
import { readPinnedUnifiedInput } from './unified-desktop'
import { unifiedProductionRequest, type UnifiedProductionRequest } from './unified-production'

export const RECONCILED_PREFLIGHT = 'readonly_uploaded_pair_preflight_passed'
type Proof = { path: string; pin: string }
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
const keys = (value: any, expected: string[]) => {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort())
}
function proof(value: Proof) {
  keys(value, ['path', 'pin']); assert(path.isAbsolute(value.path) && /^[a-f0-9]{64}$/.test(value.pin))
}

// This is a new post-upload provenance record, never a reconstructed old audit.
// Historical callers must additionally reconstruct the release and reopen the
// completed preview bodies/modules before treating it as publication evidence.
export function readUnifiedPreflightBinding(audit: any, production: UnifiedProductionRequest, productionProof: Proof) {
  assert.equal(audit.requestPin, productionProof.pin)
  if (audit.status === 'production_preview_preflight_passed_no_upload') {
    assert(!Object.hasOwn(audit, 'reconciliation'), 'Reconciliation cannot be relabelled as original preflight')
    return undefined
  }
  assert.equal(audit.status, RECONCILED_PREFLIGHT)
  assert.equal(audit.schemaVersion, 1); assert.equal(audit.kind, 'unified_uploaded_pair_reconciled_preflight')
  assert.equal(audit.cloudWrites, false); assert.equal(audit.productionPromoted, false)
  assert.equal(audit.productionReady, false); assert.equal(audit.activationSupported, false)
  const binding = audit.reconciliation
  keys(binding, ['originalProduction', 'previews', 'executorCI'])
  proof(binding.originalProduction); proof(binding.previews)
  keys(binding.executorCI, ['commit', 'runID', 'runAttempt', 'status'])
  assert(/^[a-f0-9]{40}$/.test(binding.executorCI.commit))
  for (const key of ['runID', 'runAttempt']) assert(Number.isSafeInteger(binding.executorCI[key]) && binding.executorCI[key] > 0)
  assert.equal(binding.executorCI.status, 'full_exact_ci_passed')
  const original = unifiedProductionRequest(pinned(binding.originalProduction))
  pinned(original.sourceHandoff)
  assert.deepEqual(production, { ...original, sourceHandoff: production.sourceHandoff }, 'Reconciliation may only replace source observations')
  assert.equal(audit.executorCI.runID, original.executorRunID, 'Original executor identity must remain bound')
  const completed = pinned(binding.previews)
  assert.equal(completed.kind, 'unified_readonly_uploaded_pair_cloud_previews')
  assert.equal(completed.schemaVersion, 1); assert.equal(completed.status, 'all_cloud_previews_accepted_no_promotion')
  assert.equal(completed.releaseKey, audit.releaseKey); assert.equal(completed.transportPin, audit.transportPin)
  assert.equal(completed.cloudWrites, false); assert.equal(completed.productionPromoted, false); assert.equal(completed.activationSupported, false)
  return binding as { originalProduction: Proof; previews: Proof; executorCI: { commit: string; runID: number; runAttempt: number; status: string } }
}
