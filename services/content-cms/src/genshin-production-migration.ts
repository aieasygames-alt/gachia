import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { GENSHIN_MIGRATION_POLICY, assertGenshinMigrationIdentity, assertGenshinMigrationTopology, executeGenshinMigration, executeGenshinMigrationContinuation } from '../../../scripts/genshin-production-migration.mjs'
import { verifyGenshinMigrationBundle } from '../../../scripts/genshin-migration-prepare.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { genshinMigrationTransport } from '../../../scripts/genshin-migration-transport.mjs'
import { readMigrationRouterSource, readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { advanceGenshinMigrationSources, genshinMigrationContinuationKey, readCompletedGenshinMigration, readStoppedGenshinMigration } from '../../../scripts/genshin-migration-source-advance.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { createGenshinMigrationPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'genshin_initial_production_migration_request'; bundle: Proof; executorRunID: number; previewProxy?: string }

export function genshinProductionMigrationRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['schemaVersion', 'kind', 'bundle', 'executorRunID', ...(Object.hasOwn(request, 'previewProxy') ? ['previewProxy'] : [])].sort())
  if (Object.hasOwn(request, 'previewProxy')) assert.equal(unifiedPreviewProxy(request.previewProxy), request.previewProxy)
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_initial_production_migration_request')
  assert.deepEqual(Object.keys(request.bundle).sort(), ['path', 'pin']); assert(path.isAbsolute(request.bundle.path) && /^[a-f0-9]{64}$/.test(request.bundle.pin))
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  return structuredClone(request)
}

export async function auditGenshinProductionMigration(input: unknown, cloudToken: string) {
  const request = genshinProductionMigrationRequest(input)
  assert(typeof cloudToken === 'string' && cloudToken.length > 0)
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const evidence = await verifyGenshinMigrationBundle(request.bundle)
  assert.equal(executor.executorCommit, evidence.value.sourceCommit, 'Migration source and executor must share the exact passing CI commit')
  const original = await verifyUnifiedPublishedSource({ publication: evidence.index.publication, sourceIndex: evidence.value.sourceIndex, githubToken })
  assert.deepEqual(original.sources, evidence.sources, 'Migration omitted or changed published A')
  const router = await readMigrationRouterSource(evidence.value.routerSource)
  const before = await desktopCloudSnapshot(cloudToken, unifiedProductionRead)
  assertGenshinMigrationTopology(evidence.value.baseline, before)
  for (const row of Object.values(evidence.index.owners) as any[]) {
    assertModuleVersionIdentity(row.version, await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: cloudToken, request: unifiedProductionRead }))
  }
  assertModuleVersionIdentity(router.version, await readMigrationRouterVersion({ versionId: router.value.versionId, token: cloudToken, request: unifiedProductionRead }))
  assertGenshinMigrationTopology(before, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  executor.verify()
  const releaseKey = digest(migrationJSON({ policy: GENSHIN_MIGRATION_POLICY, bundle: request.bundle, sourceCI: executor.executorCI,
    ...(request.previewProxy ? { previewProxy: request.previewProxy } : {}) }))
  const identity = { policy: GENSHIN_MIGRATION_POLICY, releaseKey, sourceCommit: executor.executorCommit, sourceCI: executor.executorCI,
    sourceIndexPin: evidence.value.sourceIndex.pin, activePin: evidence.value.active.pin, baseline: evidence.value.baseline, observedAt: Date.now(), owners: evidence.value.owners }
  assertGenshinMigrationIdentity(identity)
  const verify = async () => {
    executor.verify()
    const reopened = await verifyGenshinMigrationBundle(request.bundle)
    assert.deepEqual(reopened.value, evidence.value, 'Sealed migration identity changed')
    executor.verify()
    return { ...identity, observedAt: Date.now() }
  }
  return { request, evidence, identity, verify, executor }
}

// Explicit one-time infrastructure entry; ordinary editorial production scope,
// including its Router rejection, remains unchanged. A request cannot inject
// transports, success receipts or alternate production services.
export async function activateGenshinProductionMigration(input: { request: unknown; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditGenshinProductionMigration(input.request, input.cloudToken)
  assert.equal(input.releaseKey, audited.identity.releaseKey, 'Explicit audited migration key required')
  const directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'one-time migration cloud evidence', estimatedBytes: 2 * GiB })
  mkdirSync(directory, { mode: 0o700 })
  migrationSave(directory, 'request.json', audited.request)
  migrationSave(directory, 'identity.json', audited.identity)
  const network = audited.request.previewProxy ? await createGenshinMigrationPreviewNetwork(audited.request.previewProxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  let result
  try {
    const transport = genshinMigrationTransport({ evidence: audited.evidence, releaseKey: input.releaseKey, token: input.cloudToken, directory,
      ...(network ? { previewRequest: network.request } : {}) })
    result = await executeGenshinMigration({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport })
  } finally { await network?.close() }
  audited.executor.verify()
  const value = { kind: 'genshin_initial_production_migration_completion', schemaVersion: 1, request: audited.request,
    bundle: audited.request.bundle, executorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result,
    journal: { path: path.join(directory, `genshin-migration-${input.releaseKey}.jsonl`), pin: result.journalPin }, sourceAdvanced: false }
  assert.equal(digest(readFileSync(value.journal.path)), value.journal.pin)
  return { proof: migrationSave(directory, 'completion.json', value), value }
}

export async function advanceGenshinProductionMigration(input: { completion: Proof; executorRunID: number; directory: string; cloudToken: string }) {
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(input.executorRunID, githubToken)
  const completed = await readCompletedGenshinMigration(input.completion)
  const currentCI = completed.value.continuationExecutorCI ?? completed.value.executorCI
  assert.equal(currentCI.commit, executor.executorCommit); assert.deepEqual(currentCI, executor.executorCI)
  assert.deepEqual(await verifyUnifiedCI(completed.value.executorCI.runID, completed.value.executorCI.commit, githubToken), completed.value.executorCI)
  await verifyUnifiedPublishedSource({ publication: completed.evidence.index.publication, sourceIndex: completed.evidence.value.sourceIndex, githubToken })
  assertDiskBudget({ path: input.directory, operation: 'migrated complete source index', estimatedBytes: GiB })
  const reader = { snapshot: () => { executor.verify(); return desktopCloudSnapshot(input.cloudToken, unifiedProductionRead) },
    version: (service: string, versionId: string) => service === 'gachia-router'
      ? readMigrationRouterVersion({ versionId, token: input.cloudToken, request: unifiedProductionRead })
      : readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) }
  const result = await advanceGenshinMigrationSources({ completion: input.completion, directory: input.directory, reader })
  executor.verify()
  return result
}

type ContinuationRequest = { schemaVersion: 1; kind: 'genshin_migration_continuation_request'; stopped: { request: Proof; identity: Proof; journal: Proof }; executorRunID: number }
export function genshinMigrationContinuationRequest(value: unknown): ContinuationRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  const request = value as ContinuationRequest
  assert.deepEqual(Object.keys(request).sort(), ['executorRunID', 'kind', 'schemaVersion', 'stopped'])
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_migration_continuation_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  assert.deepEqual(Object.keys(request.stopped).sort(), ['identity', 'journal', 'request'])
  for (const proof of Object.values(request.stopped)) {
    assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin']); assert(path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return structuredClone(request)
}

export async function auditGenshinMigrationContinuation(input: unknown, cloudToken: string) {
  const request = genshinMigrationContinuationRequest(input)
  assert(typeof cloudToken === 'string' && cloudToken.length > 0)
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const previous: any = await readStoppedGenshinMigration(request.stopped), evidence = previous.evidence
  genshinProductionMigrationRequest(previous.request)
  execFileSync('git', ['merge-base', '--is-ancestor', previous.identity.sourceCommit, executor.executorCommit], { stdio: ['ignore', 'pipe', 'pipe'] })
  assert.deepEqual(await verifyUnifiedCI(previous.identity.sourceCI.runID, previous.identity.sourceCommit, githubToken), previous.identity.sourceCI)
  const original = await verifyUnifiedPublishedSource({ publication: evidence.index.publication, sourceIndex: evidence.value.sourceIndex, githubToken })
  assert.deepEqual(original.sources, evidence.sources, 'Continuation omitted or changed published A')
  const readVersion = (service: string, versionId: string) => service === 'gachia-router'
    ? readMigrationRouterVersion({ versionId, token: cloudToken, request: unifiedProductionRead })
    : readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead })
  const before: any = await desktopCloudSnapshot(cloudToken, unifiedProductionRead)
  assertGenshinMigrationTopology(evidence.value.baseline, before, { configured: ['genshin'], deployed: previous.deployed })
  assert.equal(before.services['gachia-game-genshin'].id, previous.deployments.genshin.deploymentId)
  for (const [owner, row] of Object.entries(evidence.index.owners) as [string, any][]) {
    assertModuleVersionIdentity(owner === 'genshin' ? previous.modules.genshin.candidate.version : row.version,
      await readVersion(row.service, owner === 'genshin' ? previous.deployed.genshin : row.versionId))
  }
  assertModuleVersionIdentity(previous.modules.genshin.recovery.version, await readVersion('gachia-game-genshin', previous.accepted.genshin.recovery.versionId))
  const router = await readMigrationRouterSource(evidence.value.routerSource)
  assertModuleVersionIdentity(router.version, await readVersion('gachia-router', router.value.versionId))
  assertGenshinMigrationTopology(before, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  const releaseKey = genshinMigrationContinuationKey(request, executor.executorCI)
  const identity = { ...previous.identity, releaseKey, observedAt: Date.now() }
  const verify = async () => {
    executor.verify()
    const reopened = await readStoppedGenshinMigration(request.stopped)
    assert.deepEqual(reopened.identity, previous.identity); assert.deepEqual(reopened.evidence.value, evidence.value)
    executor.verify()
    return { ...identity, observedAt: Date.now() }
  }
  executor.verify(); assertGenshinMigrationIdentity(identity)
  return { request, previous, evidence, executor, identity, verify }
}

// A new one-shot journal continues only the verified, known deployed Genshin
// prefix. It cannot replay the original writer or select another owner/order.
export async function activateGenshinMigrationContinuation(input: { request: unknown; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditGenshinMigrationContinuation(input.request, input.cloudToken)
  assert.equal(input.releaseKey, audited.identity.releaseKey, 'Explicit audited continuation key required')
  const directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'remaining migration cloud evidence', estimatedBytes: 2 * GiB })
  mkdirSync(directory, { mode: 0o700 }); migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const proxy = audited.previous.request.previewProxy
  const network = proxy ? await createGenshinMigrationPreviewNetwork(proxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  let result
  try {
    const transport = genshinMigrationTransport({ evidence: audited.evidence, releaseKey: input.releaseKey, token: input.cloudToken, directory,
      ...(network ? { previewRequest: network.request } : {}) })
    result = await executeGenshinMigrationContinuation({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport,
      previous: { journal: audited.request.stopped.journal, identity: audited.previous.identity } })
  } finally { await network?.close() }
  audited.executor.verify()
  const value = { kind: 'genshin_initial_production_migration_completion', schemaVersion: 1, request: audited.request,
    bundle: audited.previous.request.bundle, executorCI: audited.previous.identity.sourceCI, continuationExecutorCI: audited.executor.executorCI,
    releaseKey: input.releaseKey, ...result, journal: { path: path.join(directory, `genshin-migration-${input.releaseKey}.jsonl`), pin: result.journalPin }, sourceAdvanced: false }
  return { proof: migrationSave(directory, 'completion.json', value), value }
}
