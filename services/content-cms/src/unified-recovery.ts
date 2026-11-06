import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { activeVersion, assertTopology, desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertUploadedVersion } from '../../../scripts/desktop-cloud-transport.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { readUnifiedMainRenewal } from '../../../scripts/unified-main-evidence.mjs'
import { unifiedMainDeploymentWriter } from '../../../scripts/unified-main-deployment.mjs'
import { recheckUnifiedMainPublic, verifyUnifiedMainPublic } from '../../../scripts/unified-main-public.mjs'
import { executeUnifiedManualRecovery } from '../../../scripts/unified-manual-recovery.mjs'
import { createUnifiedPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedMainPromotionJournal } from '../../../scripts/unified-promotion-reconciliation.mjs'
import { recheckUnifiedPreview, verifyUnifiedVersionPreview } from '../../../scripts/unified-version-preview.mjs'
import { readUnifiedVersion, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedExecutorVerifier } from './unified-production'
import { unifiedHistoricalMainRequest, verifyUnifiedHistoricalMain } from './unified-published-main'

type Proof = { path: string; pin: string }
export type UnifiedRecoveryRequest = {
  schemaVersion: 1; kind: 'unified_main_compatible_recovery_request'; history: Proof; promotionJournal: Proof; network: Proof; executorRunID: number
}
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
const save = (file: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n'; writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return digest(text)
}
export function unifiedRecoveryRequest(value: unknown): UnifiedRecoveryRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  assert.deepEqual(Object.keys(value).sort(), ['executorRunID', 'history', 'kind', 'network', 'promotionJournal', 'schemaVersion'])
  const request = value as UnifiedRecoveryRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_main_compatible_recovery_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  for (const proof of [request.history, request.promotionJournal, request.network]) {
    assert(proof && typeof proof === 'object' && !Array.isArray(proof)); assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}

export async function openUnifiedRecovery(input: { request: UnifiedRecoveryRequest; cloudToken: string }) {
  const request = structuredClone(unifiedRecoveryRequest(input.request))
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const historyRequest = unifiedHistoricalMainRequest(pinned(request.history)), opened = await verifyUnifiedHistoricalMain(historyRequest, githubToken)
  const { historical, previews, references } = opened, value = historical.value, run = historical.build
  assert.equal(request.promotionJournal.path, path.join(run, `unified-promotion-${value.transportPin}.jsonl`))
  const readJournal = () => {
    const journal = readUnifiedMainPromotionJournal({ run, pin: request.promotionJournal.pin, releaseKey: value.releaseKey, transportPin: value.transportPin })
    assert(journal.stopped && journal.rows.some(row => row.phase === 'promotion_intent'), 'Only a recorded stopped promotion can be recovered')
    readUnifiedMainRenewal({ original: journal, value, previews, references }); return journal
  }
  const original = readJournal(), network = pinned(request.network)
  assert.deepEqual(Object.keys(network).sort(), ['kind', 'schemaVersion', 'server'])
  assert.equal(network.schemaVersion, 1); assert.equal(network.kind, 'explicit_loopback_preview_network')
  const server = unifiedPreviewProxy(network.server)
  const revalidateModule = async (role: string) => {
    assert(['candidate', 'recovery'].includes(role))
    const proof = previews.receipt.accepted[role].main, target = value.owners.main[role]
    const saved = await revalidateUnifiedUploadedModule({ proof: proof.moduleProof, service: 'gachia', versionId: proof.versionId, moduleSHA256: target.moduleSHA256,
      context: { role, transportPin: value.transportPin, configPin: target.configPin },
      readVersion: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) })
    assertUploadedVersion(saved.version, proof.versionId, opened.runtimeConfig, value.baseline.bindings.gachia); return saved
  }
  const verify = async () => {
    executor.verify(); readJournal(); assert.deepEqual(pinned(request.network), network); assert.deepEqual(pinned(request.history), historyRequest)
    const historicalAgain = await verifyUnifiedHistoricalMain(historyRequest, githubToken)
    assert.deepEqual(historicalAgain.historical.value, value); assert.deepEqual(historicalAgain.previews.receipt, previews.receipt)
    const observed = await desktopCloudSnapshot(input.cloudToken, unifiedProductionRead, { allowSplit: true })
    const main = activeVersion(observed, 'gachia')
    assert([original.expected.candidate, original.expected.recovery].includes(main), 'Unknown active Main cannot enter recovery')
    assertTopology(value.baseline, observed, { gachia: main })
    for (const source of Object.values(historical.sources.owners) as any[]) {
      const version = await readUnifiedVersion({ service: source.service, versionId: source.versionId, token: input.cloudToken, request: unifiedProductionRead })
      assertModuleVersionIdentity(source.version, version)
    }
    for (const role of ['recovery', 'candidate']) await revalidateModule(role)
    executor.verify(); readJournal(); return { identityObservedAt: Date.now(), observed }
  }
  const initial = await verify()
  assert.equal(activeVersion(initial.observed, 'gachia'), original.expected.candidate, 'Recovery requires the exact known candidate to be active at entry')
  return { ...opened, request, executor, original, server, network, verify, revalidateModule }
}

// Remains private until the next-batch source path is qualified. The CLI can
// audit this fixed adapter, but cannot invoke it or inject the core protocol.
async function recoverUnifiedMain(input: { request: UnifiedRecoveryRequest; cloudToken: string; releaseKey: string }) {
  const opened = await openUnifiedRecovery(input), { historical, original, previews, references } = opened
  const run = historical.build, value = historical.value
  assert.equal(input.releaseKey, value.releaseKey, 'Explicit matching compatible recovery authorization required')
  assert(!existsSync(path.join(run, `unified-manual-recovery-${value.transportPin}.jsonl`)), 'Existing recovery requires read-only reconciliation, never retry')
  assertDiskBudget({ path: run, operation: 'Main compatible recovery evidence', estimatedBytes: GiB })
  const directory = path.join(run, `unified-main-recovery-${randomUUID()}`); mkdirSync(directory, { mode: 0o700 })
  await opened.verify(); await opened.revalidateModule('recovery')
  const network = await createUnifiedPreviewNetwork(opened.server)
  let recovery: Record<string, any>
  try {
    save(path.join(directory, 'network-route.json'), { ...network.route, inputPin: opened.request.network.pin })
    const old = previews.receipt.accepted.recovery.main
    const http = await verifyUnifiedVersionPreview({ service: 'gachia', versionId: old.versionId, references: references('main', 'recovery'),
      directory: path.join(directory, 'preview'), request: network.request, parserVersion: 'streaming-v2' })
    recovery = { ...old, originalEvidenceSHA256: old.evidenceSHA256, evidenceSHA256: http.evidenceSHA256, acceptedAt: Date.now() }
  } finally { await network.close() }
  await opened.revalidateModule('recovery')
  const renewal = { schemaVersion: 1, kind: 'unified_manual_recovery_preview_renewal', releaseKey: value.releaseKey, transportPin: value.transportPin,
    promotionJournal: opened.request.promotionJournal, originalRenewalPin: original.first.renewalPin, recovery, cloudWrites: false }
  const renewalPin = save(path.join(directory, 'renewal.json'), renewal)
  const verify = async () => {
    const current = await opened.verify()
    assert.deepEqual(pinned({ path: path.join(directory, 'renewal.json'), pin: renewalPin }), renewal)
    recheckUnifiedPreview(path.join(directory, 'preview'), recovery.evidenceSHA256, { service: 'gachia', versionId: recovery.versionId,
      references: references('main', 'recovery'), parserVersion: 'streaming-v2' })
    return { releaseKey: value.releaseKey, transportPin: value.transportPin, promotionJournalPin: opened.request.promotionJournal.pin, renewalPin,
      recovery, evidenceDirectory: directory, identityObservedAt: current.identityObservedAt }
  }
  const publicReferences = opened.publicReferences('recovery')
  const result = await executeUnifiedManualRecovery({ run, verify, authorize: () => input.releaseKey, makeTransport: () => ({
    snapshot: () => desktopCloudSnapshot(input.cloudToken, unifiedProductionRead, { allowSplit: true }),
    verifyVersions: async () => {
      const saved = await opened.revalidateModule('recovery'), proof = { status: 'passed', versions: { gachia: original.expected.recovery },
        modules: { gachia: recovery.moduleSHA256 }, version: saved.version, moduleProof: recovery.moduleProof }
      return { ...proof, evidenceSHA256: save(path.join(directory, 'remote.json'), proof) }
    },
    promote: unifiedMainDeploymentWriter({ releaseKey: input.releaseKey, versionId: original.expected.recovery, token: input.cloudToken, request: fetch,
      recordResponse: ({ kind, status, headers, bytes }: any) => {
        writeFileSync(path.join(directory, `deployment-${kind}.body`), bytes, { flag: 'wx', mode: 0o600 })
        save(path.join(directory, `deployment-${kind}.json`), { kind, status, headers, sha256: digest(bytes), bytes: bytes.length })
      } }),
    acceptProduction: async () => {
      const http = path.join(directory, 'public'), result = await verifyUnifiedMainPublic({ references: publicReferences, directory: http, request: unifiedProductionRead })
      recheckUnifiedMainPublic(http, result.evidenceSHA256, publicReferences)
      const proof = { status: 'passed', releaseKey: value.releaseKey, versions: { gachia: original.expected.recovery },
        owners: { main: { directory: http, evidenceSHA256: result.evidenceSHA256, responses: result.observations.length } } }
      return { ...proof, evidenceSHA256: save(path.join(directory, 'public-acceptance.json'), proof) }
    },
  }) })
  const receipt = { ...result, directory, request: opened.request, executorCI: opened.executor.executorCI,
    sourceCI: historical.sourceCI, originExecutorCI: historical.originExecutorCI, previewExecutorCI: opened.previewExecutorCI }
  return { ...receipt, receiptPin: save(path.join(directory, 'receipt.json'), receipt) }
}
