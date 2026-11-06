import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertUploadedVersion } from '../../../scripts/desktop-cloud-transport.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { unifiedRuntimeConfig, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { executeUnifiedPreviewCompletion, readUnifiedObservationStop } from '../../../scripts/unified-preview-completion.mjs'
import { createUnifiedPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { unifiedProductionRead, unifiedProductionTransport } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { canonical } from './record-mapping'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedProductionVerifier, unifiedProductionRequest } from './unified-production'
import { assertUnifiedProductionOwnerClosure } from './unified-production-scope'

type Proof = { path: string; pin: string }
export type UnifiedCompletionRequest = { schemaVersion: 1; kind: 'unified_observation_stop_completion_request';
  production: Proof; audit: Proof; stopped: Record<'journal' | 'http' | 'version' | 'module', Proof>; network: Proof; executorRunID: number }
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
const proofKeys = (value: object, expected: string[]) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unknown completion request fields')
export function unifiedCompletionRequest(value: unknown): UnifiedCompletionRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  proofKeys(value, ['schemaVersion', 'kind', 'production', 'audit', 'stopped', 'network', 'executorRunID'])
  const request = value as UnifiedCompletionRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_observation_stop_completion_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  assert(request.stopped && typeof request.stopped === 'object'); proofKeys(request.stopped, ['journal', 'http', 'version', 'module'])
  for (const proof of [request.production, request.audit, request.network, ...Object.values(request.stopped)]) {
    assert(proof && typeof proof === 'object'); proofKeys(proof, ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}

export async function createUnifiedCompletionVerifier(input: { request: UnifiedCompletionRequest; cmsToken: string; cloudToken: string }) {
  const request = structuredClone(unifiedCompletionRequest(input.request)), original = unifiedProductionRequest(pinned(request.production)), audit = pinned(request.audit)
  assert.equal(audit.status, 'production_preview_preflight_passed_no_upload'); assert.equal(audit.requestPin, request.production.pin)
  assert.equal(audit.scopeClosureRequired, false); assert.deepEqual(audit.ownerOrder, ['main']); assert.equal(audit.productionPromoted, false)
  assert.equal(audit.executorCI.runID, original.executorRunID); assert.equal(audit.executorCI.status, 'full_exact_ci_passed')
  const evidence = await createUnifiedProductionVerifier({ ...original, executorRunID: request.executorRunID }, input,
    { originExecutor: { commit: audit.executorCI.commit, runID: original.executorRunID } })
  assertUnifiedProductionOwnerClosure(evidence.scope); assert.deepEqual(evidence.value.ownerOrder, ['main'])
  assert.equal(evidence.value.releaseKey, audit.releaseKey); assert.deepEqual(evidence.qualification, audit.qualification)
  const network = pinned(request.network); proofKeys(network, ['schemaVersion', 'kind', 'server'])
  assert.equal(network.schemaVersion, 1); assert.equal(network.kind, 'explicit_loopback_preview_network')
  const server = unifiedPreviewProxy(network.server), stopPin = digest(canonical(request.stopped))
  const target = unifiedTransportTarget('main', readFileSync(path.join(evidence.build, 'source/apps/web/wrangler.jsonc'), 'utf8'))
  const verify = async () => {
    assert.deepEqual(pinned(request.network), network, 'Pinned preview routing changed')
    const value = await evidence.verify(), stopped = readUnifiedObservationStop({ run: evidence.build, stop: request.stopped, value })
    const saved = await revalidateUnifiedUploadedModule({ proof: stopped.inspected.moduleProof, service: 'gachia', versionId: stopped.versionId,
      moduleSHA256: value.owners.main.recovery.moduleSHA256, context: { role: 'recovery', transportPin: value.transportPin, configPin: value.owners.main.recovery.configPin },
      readVersion: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) })
    const bindings = evidence.baseline.bindings as Record<string, unknown>
    assert(Object.hasOwn(bindings, 'gachia'), 'Missing original Main binding observation')
    assertUploadedVersion(saved.version, stopped.versionId, unifiedRuntimeConfig(target), bindings.gachia)
    return { ...value, stop: request.stopped, stopPin, networkPin: request.network.pin, existingRecovery: stopped }
  }
  const value = await verify()
  return { evidence, request, value, verify, server }
}

// This fixed entry has no recovery upload or promotion operation. It consumes
// the pinned original failed attempt, preserving its journal and module receipt.
export async function completeUnifiedProductionPreviews(input: { request: UnifiedCompletionRequest; cmsToken: string; cloudToken: string; releaseKey: string }) {
  const verified = await createUnifiedCompletionVerifier(input), { evidence } = verified
  assert.equal(input.releaseKey, verified.value.releaseKey, 'Explicit original release authorization required')
  assert(!existsSync(path.join(evidence.build, `unified-preview-completion-${evidence.value.transportPin}.jsonl`)), 'Completion was already attempted; reconcile without retry')
  assertDiskBudget({ path: evidence.build, operation: 'known recovery observation and first candidate preview', estimatedBytes: 2 * GiB })
  const directory = path.join(evidence.build, `unified-cloud-preview-completion-${evidence.value.transportPin}`)
  const network = await createUnifiedPreviewNetwork(verified.server)
  try {
    const transport = unifiedProductionTransport({ evidence, token: input.cloudToken, directory, previewRequest: network.request, parserVersion: 'streaming-v2' })
    const result = await executeUnifiedPreviewCompletion({ run: evidence.build, directory, verify: verified.verify, authorize: () => input.releaseKey,
      transport: { ...transport, reuseRecovery: async (args: any) => {
        const existing = verified.value.existingRecovery
        assert.equal(args.owner, 'main'); assert.equal(args.role, 'recovery'); assert.equal(args.versionId, existing.versionId)
        assert.deepEqual(args.inspected, existing.inspected)
        const raw = readFileSync(verified.request.stopped.version.path); assert.equal(digest(raw), existing.inspected.versionPin)
        writeFileSync(path.join(directory, 'recovery-main/version.json'), raw, { flag: 'wx', mode: 0o600 })
        writeFileSync(path.join(directory, 'network-route.json'), JSON.stringify({ ...network.route, inputPin: verified.request.network.pin }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
      } } })
    return { ...result, sourceCI: evidence.ci, executorCI: evidence.executorCI, originExecutorCI: evidence.originExecutorCI }
  } finally { await network.close() }
}
