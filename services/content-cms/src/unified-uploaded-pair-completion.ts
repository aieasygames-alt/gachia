import { sessionReadFileBytes } from '../../../scripts/artifact-verification-session.mjs'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertTopology, desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertUploadedVersion } from '../../../scripts/desktop-cloud-transport.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { unifiedRuntimeConfig, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { executeUnifiedUploadedPairCompletion, readUnifiedUploadedPairStop, readUnifiedUploadedPairCompletionStop, unifiedUploadedPairStopPin } from '../../../scripts/unified-preview-completion.mjs'
import { createUnifiedPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { unifiedPreviewReferences, verifyUnifiedVersionPreview } from '../../../scripts/unified-version-preview.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedProductionVerifier, unifiedProductionRequest } from './unified-production'
import { assertUnifiedProductionOwnerClosure } from './unified-production-scope'
import { readUnifiedPreflightBinding, RECONCILED_PREFLIGHT } from './unified-reconciled-preflight'

type Proof = { path: string; pin: string }
type RoleProof = Record<'http' | 'module' | 'version', Proof>
export type UnifiedUploadedPairRequest = {
  schemaVersion: 1; kind: 'unified_uploaded_pair_completion_request'
  production: Proof; sourceHandoff: Proof; network: Proof; originExecutorCommit: string; executorRunID: number
  stopped: { journal: Proof; recovery: RoleProof; candidate: RoleProof }
  completionStop?: { journal: Proof; recovery: Proof; candidate: Proof }
}
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
const keys = (value: object, expected: string[]) => {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unknown uploaded pair request fields')
}
export function unifiedUploadedPairRequest(value: unknown): UnifiedUploadedPairRequest {
  keys(value as object, ['schemaVersion', 'kind', 'production', 'sourceHandoff', 'network', 'originExecutorCommit', 'executorRunID', 'stopped',
    ...(Object.hasOwn(value as object, 'completionStop') ? ['completionStop'] : [])])
  const request = value as UnifiedUploadedPairRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_uploaded_pair_completion_request')
  assert(/^[a-f0-9]{40}$/.test(request.originExecutorCommit))
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  keys(request.stopped, ['journal', 'recovery', 'candidate'])
  if (Object.hasOwn(request, 'completionStop')) keys(request.completionStop!, ['journal', 'recovery', 'candidate'])
  for (const role of ['recovery', 'candidate'] as const) keys(request.stopped[role], ['http', 'module', 'version'])
  for (const proof of [request.production, request.sourceHandoff, request.network, request.stopped.journal,
    ...Object.values(request.stopped.recovery), ...Object.values(request.stopped.candidate), ...Object.values(request.completionStop ?? {})]) {
    keys(proof, ['path', 'pin']); assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}

export async function createUnifiedUploadedPairVerifier(input: { request: UnifiedUploadedPairRequest; cmsToken: string; cloudToken: string }) {
  const request = structuredClone(unifiedUploadedPairRequest(input.request)), original = unifiedProductionRequest(pinned(request.production))
  // Only source observations and the executing CI may change. Candidate, complete
  // active A, installed application, review and original executor stay bound.
  pinned(original.sourceHandoff)
  const evidence = await createUnifiedProductionVerifier({ ...original, sourceHandoff: request.sourceHandoff, executorRunID: request.executorRunID }, input,
    { originExecutor: { commit: request.originExecutorCommit, runID: original.executorRunID } })
  assertUnifiedProductionOwnerClosure(evidence.scope); assert.deepEqual(evidence.value.ownerOrder, ['main'])
  const network = pinned(request.network); keys(network, ['schemaVersion', 'kind', 'server'])
  assert.equal(network.schemaVersion, 1); assert.equal(network.kind, 'explicit_loopback_preview_network')
  const server = unifiedPreviewProxy(network.server)
  const references = (owner: string, role: string, parserVersion = 'streaming-v2') => {
    assert.equal(owner, 'main'); assert(['recovery', 'candidate'].includes(role))
    const root = path.join(evidence.transport.directory, owner, role, 'http')
    const rows = pinned({ path: path.join(root, 'references.json'), pin: evidence.value.owners.main[role].referencesPin })
    return unifiedPreviewReferences(rows, (row: { bodyFile: string }, index: number) => {
      assert.equal(row.bodyFile, `${index}.body`); return sessionReadFileBytes(path.join(root, row.bodyFile))
    }, parserVersion)
  }
  const target = unifiedTransportTarget('main', readFileSync(path.join(evidence.build, 'source/apps/web/wrangler.jsonc'), 'utf8'))
  const revalidate = async ({ role, versionId, inspected }: any) => {
    const row = evidence.value.owners.main[role]
    const saved = await revalidateUnifiedUploadedModule({ proof: inspected.moduleProof, service: 'gachia', versionId,
      moduleSHA256: row.moduleSHA256, context: { role, transportPin: evidence.value.transportPin, configPin: row.configPin },
      readVersion: (service: string, id: string) => readUnifiedVersion({ service, versionId: id, token: input.cloudToken, request: unifiedProductionRead }) })
    assertUploadedVersion(saved.version, versionId, unifiedRuntimeConfig(target), (evidence.baseline.bindings as Record<string, unknown>).gachia)
  }
  const check = async (value: typeof evidence.value) => {
    assert.deepEqual(unifiedProductionRequest(pinned(request.production)), original)
    assert.deepEqual(pinned(request.network), network)
    pinned(original.sourceHandoff)
    const stopped = request.completionStop === undefined ? readUnifiedUploadedPairStop({ run: evidence.build, stop: request.stopped, value, references }) :
      readUnifiedUploadedPairCompletionStop({ run: evidence.build, completionStop: request.completionStop, stop: request.stopped, value, references })
    const existingPair = stopped.existing as Record<string, { versionId: string; inspected: { moduleSHA256: string; versionPin: string; moduleProof: Proof } }>
    for (const role of ['recovery', 'candidate']) await revalidate({ role, ...existingPair[role] })
    assertTopology(value.baseline, await desktopCloudSnapshot(input.cloudToken, unifiedProductionRead))
    return { ...value, stop: request.stopped, stopPin: unifiedUploadedPairStopPin(request.stopped), networkPin: request.network.pin,
      existingPair, ...(request.completionStop === undefined ? {} : { completionStop: request.completionStop }) }
  }
  const verify = async () => check(await evidence.verify())
  const value = await check(evidence.value)
  return { request, evidence, references, revalidate, verify, value, server }
}

export async function completeUnifiedUploadedPair(input: { request: UnifiedUploadedPairRequest; cmsToken: string; cloudToken: string; releaseKey: string }) {
  const verified = await createUnifiedUploadedPairVerifier(input), { evidence } = verified
  assert.equal(input.releaseKey, verified.value.releaseKey)
  const suffix = verified.request.completionStop === undefined ? '' : '-continued'
  assert(!existsSync(path.join(evidence.build, `unified-uploaded-pair-completion-${evidence.value.transportPin}${suffix}.jsonl`)), 'Completion already attempted; preserve evidence')
  assertDiskBudget({ path: evidence.build, operation: 'Read-only uploaded pair completion', estimatedBytes: 2 * GiB })
  const network = await createUnifiedPreviewNetwork(verified.server)
  try {
    const result = await executeUnifiedUploadedPairCompletion({ run: evidence.build, verify: verified.verify, authorize: () => input.releaseKey,
      transport: { snapshot: () => desktopCloudSnapshot(input.cloudToken, unifiedProductionRead), revalidate: verified.revalidate,
        observe: async ({ directory, role, versionId, inspected }: any) => {
          mkdirSync(directory, { mode: 0o700 })
          const selection = verified.request.stopped[role as 'recovery' | 'candidate'], raw = readFileSync(selection.version.path)
          assert.equal(digest(raw), inspected.versionPin)
          writeFileSync(path.join(directory, 'version.json'), raw, { flag: 'wx', mode: 0o600 })
          writeFileSync(path.join(directory, 'network-route.json'), JSON.stringify({ ...network.route, inputPin: verified.request.network.pin }) + '\n', { flag: 'wx', mode: 0o600 })
          return verifyUnifiedVersionPreview({ service: 'gachia', versionId, directory: path.join(directory, 'http'),
            references: verified.references('main', role), request: network.request, parserVersion: 'streaming-v2' })
        } } })
    const save = (name: string, value: unknown) => {
      const file = path.join(result.directory, name), raw = JSON.stringify(value, null, 2) + '\n'
      writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(raw) }
    }
    const production = { ...unifiedProductionRequest(pinned(verified.request.production)), sourceHandoff: verified.request.sourceHandoff }
    const productionProof = save('reconciled-production.json', production)
    const previews = { path: path.join(result.directory, 'receipt.json'), pin: result.receiptPin }
    const audit = { schemaVersion: 1, kind: 'unified_uploaded_pair_reconciled_preflight', status: RECONCILED_PREFLIGHT,
      requestPin: productionProof.pin, scope: evidence.scope, qualification: evidence.qualification, scopeClosureRequired: false,
      sourceCI: evidence.ci, executorCI: evidence.originExecutorCI, ...evidence.value,
      reconciliation: { originalProduction: verified.request.production, previews, executorCI: evidence.executorCI },
      cloudWrites: false, productionPromoted: false, productionReady: false, activationSupported: false }
    readUnifiedPreflightBinding(audit, production, productionProof)
    const auditProof = save('reconciled-preflight.json', audit)
    save('history.json', { schemaVersion: 1, kind: 'unified_historical_publication_request', production: productionProof, audit: auditProof })
    const execution = { ...result, sourceCI: evidence.ci, executorCI: evidence.executorCI, originExecutorCI: evidence.originExecutorCI }
    save('execution.json', execution)
    return execution
  } finally { await network.close() }
}
