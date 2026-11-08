import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertTopology, desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertUploadedVersion } from '../../../scripts/desktop-cloud-transport.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { unifiedRuntimeConfig, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { unifiedMainDeploymentWriter } from '../../../scripts/unified-main-deployment.mjs'
import { createUnifiedPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { recheckUnifiedMainPublic, unifiedMainPublicReferences, verifyUnifiedMainPublic } from '../../../scripts/unified-main-public.mjs'
import { executeUnifiedPromotionProtocol, readUnifiedCloudPreviews, unifiedPinnedJSON } from '../../../scripts/unified-promotion-protocol.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { recheckUnifiedPreview, verifyUnifiedVersionPreview } from '../../../scripts/unified-version-preview.mjs'
import { readUnifiedHistoricalMainPreviews, readUnifiedHistoricalPublication } from './unified-historical-publication'
import { assertUnifiedProductionOwnerClosure } from './unified-production-scope'
import { createUnifiedProductionVerifier, unifiedProductionRequest } from './unified-production'

type Proof = { path: string; pin: string }
export type UnifiedPromotionRequest = {
  schemaVersion: 1; kind: 'unified_main_promotion_request'; production: Proof; audit: Proof; previews: Proof; network: Proof; executorRunID: number
}
const SHA = /^[a-f0-9]{64}$/
const save = (file: string, value: unknown) => {
  const raw = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return digest(raw)
}
const pinned = (proof: Proof) => unifiedPinnedJSON(proof.path, proof.pin)
export function unifiedPromotionRequest(value: unknown): UnifiedPromotionRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  assert.deepEqual(Object.keys(value).sort(), ['audit', 'executorRunID', 'kind', 'network', 'previews', 'production', 'schemaVersion'])
  const request = value as UnifiedPromotionRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_main_promotion_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  for (const proof of [request.production, request.audit, request.previews, request.network]) {
    assert(proof && typeof proof === 'object'); assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && SHA.test(proof.pin))
  }
  return request
}

export async function openUnifiedPromotion(input: { request: UnifiedPromotionRequest; cmsToken: string; cloudToken: string }) {
  const { cmsToken, cloudToken } = input
  const request = structuredClone(unifiedPromotionRequest(input.request)), production = unifiedProductionRequest(pinned(request.production)), audit = pinned(request.audit)
  assert.equal(audit.requestPin, request.production.pin, 'Original upload request differs from its exact audit')
  assert.equal(audit.status, 'production_preview_preflight_passed_no_upload'); assert.equal(audit.scopeClosureRequired, false)
  assert.equal(audit.productionPromoted, false); assert.deepEqual(audit.ownerOrder, ['main'])
  assert.equal(audit.executorCI.runID, production.executorRunID); assert.equal(audit.executorCI.status, 'full_exact_ci_passed')
  const evidence = await createUnifiedProductionVerifier({ ...production, executorRunID: request.executorRunID }, { cmsToken, cloudToken },
    { originExecutor: { runID: production.executorRunID, commit: audit.executorCI.commit } })
  assertUnifiedProductionOwnerClosure(evidence.scope); assert.deepEqual(evidence.value.ownerOrder, ['main'], 'Only Main promotion is qualified')
  assert.equal(evidence.value.releaseKey, audit.releaseKey); assert.deepEqual(evidence.qualification, audit.qualification)
  const historical = await readUnifiedHistoricalPublication({ schemaVersion: 1, kind: 'unified_historical_publication_request', production: request.production, audit: request.audit })
  assert.deepEqual(evidence.ci, historical.audit.sourceCI, 'Source CI differs from sealed historical audit')
  assert.deepEqual(evidence.originExecutorCI, historical.audit.executorCI, 'Original executor CI differs from sealed historical audit')
  assert.deepEqual(historical.scope, evidence.scope)
  assertTopology(historical.value.baseline, evidence.value.baseline)
  assert.deepEqual({ ...evidence.value, baseline: historical.value.baseline, identityObservedAt: historical.value.identityObservedAt }, historical.value,
    'Live release differs from sealed historical publication')
  const network = pinned(request.network)
  assert.deepEqual(Object.keys(network).sort(), ['kind', 'schemaVersion', 'server'])
  assert.equal(network.schemaVersion, 1); assert.equal(network.kind, 'explicit_loopback_preview_network')
  const server = unifiedPreviewProxy(network.server)
  const { references, previews } = await readUnifiedHistoricalMainPreviews(historical, request.previews)
  if (previews.receipt.kind === 'unified_completed_observation_stop_cloud_previews') assert.equal(previews.receipt.networkPin, request.network.pin)
  const target = unifiedTransportTarget('main', readFileSync(path.join(evidence.build, 'source/apps/web/wrangler.jsonc'), 'utf8'))
  const revalidateModule = async (role: string, proof: any) => {
    const row = evidence.value.owners.main[role]
    const saved = await revalidateUnifiedUploadedModule({ proof: proof.moduleProof, service: 'gachia', versionId: proof.versionId,
      moduleSHA256: row.moduleSHA256, context: { role, transportPin: evidence.value.transportPin, configPin: row.configPin },
      readVersion: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead }) })
    assertUploadedVersion(saved.version, proof.versionId, unifiedRuntimeConfig(target), (evidence.baseline.bindings as Record<string, unknown>).gachia)
    return saved
  }
  return { evidence, historical, previews, references, revalidateModule, request, network, server }
}

// Only fresh network observations create a new renewal. The old upload receipt,
// preview timestamps and release identity are never rewritten or extended.
export async function renewUnifiedMainPreviews(opened: Awaited<ReturnType<typeof openUnifiedPromotion>>, cloudToken: string, directory: string) {
  const { evidence, previews, references, revalidateModule } = opened, accepted: Record<string, any> = {}
  mkdirSync(directory, { mode: 0o700 })
  assertTopology(evidence.baseline, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  const network = await createUnifiedPreviewNetwork(opened.server)
  try {
    save(path.join(directory, 'network-route.json'), { ...network.route, inputPin: opened.request.network.pin })
    for (const role of ['recovery', 'candidate']) {
      const old = previews.receipt.accepted[role].main
      await revalidateModule(role, old)
      const result = await verifyUnifiedVersionPreview({ service: 'gachia', versionId: old.versionId, references: references('main', role),
        directory: path.join(directory, role), request: network.request, parserVersion: 'streaming-v2' })
      await revalidateModule(role, old)
      accepted[role] = { main: { ...old, originalEvidenceSHA256: old.evidenceSHA256, evidenceSHA256: result.evidenceSHA256, acceptedAt: Date.now() } }
    }
  } finally { await network.close() }
  const current = await evidence.verify()
  assert.deepEqual(pinned(opened.request.network), opened.network, 'Preview network input changed during renewal')
  assert.deepEqual({ ...current, identityObservedAt: evidence.value.identityObservedAt }, evidence.value, 'Renewal source or review changed')
  assertTopology(evidence.baseline, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  const receipt = { schemaVersion: 1, kind: 'unified_main_preview_renewal', releaseKey: current.releaseKey, transportPin: current.transportPin,
    previewPin: opened.request.previews.pin, accepted, cloudWrites: false, productionPromoted: false }
  return { directory, pin: save(path.join(directory, 'receipt.json'), receipt), receipt }
}

export async function auditUnifiedMainPreviewRenewal(input: { request: UnifiedPromotionRequest; cmsToken: string; cloudToken: string; directory: string }) {
  const { directory, cmsToken, cloudToken, request } = input
  assert(path.isAbsolute(directory), 'Preview renewal requires an absolute new directory')
  assert(!existsSync(directory), 'Preview renewal directory already exists; preserve previous evidence')
  const opened = await openUnifiedPromotion({ request, cmsToken, cloudToken })
  assertDiskBudget({ path: opened.evidence.build, operation: 'Read-only Main preview renewal', estimatedBytes: 2 * GiB })
  const renewal = await renewUnifiedMainPreviews(opened, cloudToken, directory)
  return { status: 'unified_main_preview_renewal_passed_no_promotion', directory: renewal.directory, pin: renewal.pin,
    releaseKey: renewal.receipt.releaseKey, previewPin: opened.request.previews.pin,
    sourceCI: opened.evidence.ci, executorCI: opened.evidence.executorCI, originExecutorCI: opened.evidence.originExecutorCI,
    cloudWrites: false, productionPromoted: false }
}

export async function promoteUnifiedMain(input: { request: UnifiedPromotionRequest; cmsToken: string; cloudToken: string; releaseKey: string }) {
  const { cmsToken, cloudToken, releaseKey } = input
  const request = structuredClone(unifiedPromotionRequest(input.request))
  const opened = await openUnifiedPromotion({ request, cmsToken, cloudToken }), { evidence, previews, references, revalidateModule } = opened
  assert.equal(releaseKey, evidence.value.releaseKey, 'Explicit matching release authorization required')
  assert(!existsSync(path.join(evidence.build, `unified-promotion-${evidence.value.transportPin}.jsonl`)), 'Existing promotion requires read-only reconciliation, never retry')
  assertDiskBudget({ path: evidence.build, operation: 'Main promotion and fresh preview evidence', estimatedBytes: 2 * GiB })
  const directory = path.join(evidence.build, `unified-main-promotion-${randomUUID()}`); mkdirSync(directory, { mode: 0o700 })
  const renewal = await renewUnifiedMainPreviews(opened, cloudToken, path.join(directory, 'renewal'))
  const publicReferences = unifiedMainPublicReferences(references('main', 'candidate'), (row: { bodyFile: string }) =>
    readFileSync(path.join(evidence.transport.directory, 'main/candidate/http', row.bodyFile)))
  const verify = async () => {
    assert.deepEqual(pinned(opened.request.network), opened.network)
    const value = await evidence.verify()
    readUnifiedCloudPreviews({ run: evidence.build, directory: previews.directory, pin: previews.pin, value, references })
    const fresh = unifiedPinnedJSON(path.join(renewal.directory, 'receipt.json'), renewal.pin)
    assert.deepEqual(fresh, renewal.receipt)
    for (const role of ['recovery', 'candidate']) {
      const proof: Record<string, any> = fresh.accepted[role].main, old = previews.receipt.accepted[role].main
      assert.equal(proof.originalEvidenceSHA256, old.evidenceSHA256)
      const { originalEvidenceSHA256: _, evidenceSHA256: _e, acceptedAt: _a, ...identity } = proof
      const { evidenceSHA256: _oldE, acceptedAt: _oldA, ...oldIdentity } = old
      assert.deepEqual(identity, oldIdentity, 'Renewal cannot replace a version, module or upload receipt')
      recheckUnifiedPreview(path.join(renewal.directory, role), proof.evidenceSHA256, { service: 'gachia', versionId: proof.versionId, references: references('main', role), parserVersion: 'streaming-v2' })
    }
    return { ...value, previewPin: previews.pin, renewalPin: renewal.pin, accepted: fresh.accepted,
      evidenceDirectory: directory, renewalDirectory: renewal.directory }
  }
  let remoteCount = 0
  const result = await executeUnifiedPromotionProtocol({ run: evidence.build, verify, authorize: () => releaseKey,
    makeTransport: (initial: any) => ({
      snapshot: () => desktopCloudSnapshot(cloudToken, unifiedProductionRead, { allowSplit: true }),
      verifyVersions: async () => {
        const observed = []
        for (const role of ['recovery', 'candidate']) {
          const proof = initial.accepted[role].main, saved = await revalidateModule(role, proof)
          observed.push({ role, versionId: proof.versionId, version: saved.version, moduleSHA256: proof.moduleSHA256, moduleProof: proof.moduleProof })
        }
        const proof = { status: 'passed', versions: { gachia: initial.accepted.candidate.main.versionId },
          modules: { gachia: initial.accepted.candidate.main.moduleSHA256 }, recoveryVersions: { gachia: initial.accepted.recovery.main.versionId }, observed }
        return { ...proof, evidenceSHA256: save(path.join(directory, `remote-${remoteCount++}.json`), proof) }
      },
      promote: unifiedMainDeploymentWriter({ releaseKey, versionId: initial.accepted.candidate.main.versionId, token: cloudToken,
        request: fetch, recordResponse: ({ kind, status, headers, bytes }: any) => {
          const file = path.join(directory, `deployment-${kind}`)
          writeFileSync(file + '.body', bytes, { flag: 'wx', mode: 0o600 }); save(file + '.json', { kind, status, headers, sha256: digest(bytes), bytes: bytes.length })
        } }),
      acceptProduction: async () => {
        const http = path.join(directory, 'public'), result = await verifyUnifiedMainPublic({ references: publicReferences, directory: http, request: unifiedProductionRead })
        recheckUnifiedMainPublic(http, result.evidenceSHA256, publicReferences)
        const proof = { status: 'passed', releaseKey, versions: { gachia: initial.accepted.candidate.main.versionId },
          owners: { main: { directory: http, evidenceSHA256: result.evidenceSHA256, responses: result.observations.length } } }
        return { ...proof, evidenceSHA256: save(path.join(directory, 'public-acceptance.json'), proof) }
      },
    }) })
  const receipt = { ...result, directory, productionRequest: opened.request.production, preview: opened.request.previews,
    executorCI: evidence.executorCI, originExecutorCI: evidence.originExecutorCI, sourceCI: evidence.ci }
  return { ...receipt, receiptPin: save(path.join(directory, 'receipt.json'), receipt) }
}
