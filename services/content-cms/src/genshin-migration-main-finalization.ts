import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { GENSHIN_MIGRATION_ORDER, assertGenshinMigrationTopology } from '../../../scripts/genshin-production-migration.mjs'
import { executeGenshinMainFinalization, genshinMainFinalizationKey, genshinMainFinalizationTransport, readStoppedMainMigration } from '../../../scripts/genshin-migration-main-finalization.mjs'
import { migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { createGenshinMigrationPreviewNetwork, createGenshinPublicNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'genshin_main_migration_finalization_request'; executorRunID: number; continuationCI: any; publicProxy?: string;
  stopped: { request: Proof; identity: Proof; journal: Proof; mainCandidateModule: Proof; mainCandidateVersion: Proof; failedPreview: Proof } }
export function genshinMainFinalizationRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value)); const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['continuationCI', 'executorRunID', 'kind', 'schemaVersion', 'stopped', ...(Object.hasOwn(request, 'publicProxy') ? ['publicProxy'] : [])].sort())
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_main_migration_finalization_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  assert.deepEqual(Object.keys(request.stopped).sort(), ['failedPreview', 'identity', 'journal', 'mainCandidateModule', 'mainCandidateVersion', 'request'])
  for (const proof of Object.values(request.stopped)) {
    assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin']); assert(path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  assert.equal(request.continuationCI.status, 'full_exact_ci_passed'); assert(/^[a-f0-9]{40}$/.test(request.continuationCI.commit))
  assert(Number.isSafeInteger(request.continuationCI.runID) && request.continuationCI.runID > 0)
  if (Object.hasOwn(request, 'publicProxy')) assert.equal(unifiedPreviewProxy(request.publicProxy), request.publicProxy)
  return structuredClone(request)
}
export async function auditGenshinMainFinalization(input: unknown, cloudToken: string) {
  const request = genshinMainFinalizationRequest(input)
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const previous: any = await readStoppedMainMigration(request), evidence = previous.evidence
  assert.equal(request.publicProxy, previous.request.publicProxy)
  for (const ci of [previous.identity.sourceCI, request.continuationCI]) {
    assert.deepEqual(await verifyUnifiedCI(ci.runID, ci.commit, githubToken), ci)
    execFileSync('git', ['merge-base', '--is-ancestor', ci.commit, executor.executorCommit], { stdio: ['ignore', 'pipe', 'pipe'] })
  }
  const original = await verifyUnifiedPublishedSource({ publication: evidence.index.publication, sourceIndex: evidence.value.sourceIndex, githubToken })
  assert.deepEqual(original.sources, evidence.sources)
  const readVersion = (service: string, versionId: string) => service === 'gachia-router'
    ? readMigrationRouterVersion({ versionId, token: cloudToken, request: unifiedProductionRead })
    : readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead })
  const before: any = await desktopCloudSnapshot(cloudToken, unifiedProductionRead)
  assertGenshinMigrationTopology(evidence.value.baseline, before, { configured: [...GENSHIN_MIGRATION_ORDER], deployed: previous.deployed })
  for (const owner of ['genshin', 'router']) assert.equal(before.services[evidence.value.owners[owner].service].id, previous.deployments[owner].deploymentId)
  for (const [owner, row] of Object.entries(evidence.index.owners) as [string, any][]) {
    const module = owner === 'genshin' ? previous.modules.genshin.candidate : undefined
    assertModuleVersionIdentity(module?.version ?? row.version, await readVersion(row.service, module ? previous.deployed.genshin : row.versionId))
  }
  for (const owner of GENSHIN_MIGRATION_ORDER) for (const role of ['recovery', 'candidate']) {
    const recorded = previous.accepted[owner][role]
    assertModuleVersionIdentity(previous.modules[owner][role].version, await readVersion(evidence.value.owners[owner].service, recorded.versionId))
  }
  assertGenshinMigrationTopology(before, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  const releaseKey = genshinMainFinalizationKey(request, executor.executorCI), identity = { ...previous.identity, releaseKey, observedAt: Date.now() }
  const verify = async () => {
    executor.verify(); const reopened = await readStoppedMainMigration(request)
    assert.deepEqual(reopened.identity, previous.identity); assert.deepEqual(reopened.evidence.value, evidence.value); executor.verify()
    return { ...identity, observedAt: Date.now() }
  }
  executor.verify(); return { request, previous, evidence, executor, identity, verify }
}
export async function activateGenshinMainFinalization(input: { request: unknown; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditGenshinMainFinalization(input.request, input.cloudToken)
  assert.equal(input.releaseKey, audited.identity.releaseKey)
  const directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'known Main migration finalization', estimatedBytes: GiB }); mkdirSync(directory, { mode: 0o700 })
  migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const proxy = audited.previous.original.request.previewProxy
  const network = proxy ? await createGenshinMigrationPreviewNetwork(proxy) : undefined
  const publicNetwork = audited.request.publicProxy ? await createGenshinPublicNetwork(audited.request.publicProxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  migrationSave(directory, 'public-network.json', publicNetwork?.route ?? { kind: 'direct_public_read', retries: 0 })
  let result
  try {
    const transport = genshinMainFinalizationTransport({ previous: audited.previous, releaseKey: input.releaseKey, token: input.cloudToken, directory,
      previewRequest: network?.request ?? unifiedProductionRead, publicRequest: publicNetwork?.request ?? unifiedProductionRead })
    result = await executeGenshinMainFinalization({ run: directory, releaseKey: input.releaseKey, verify: audited.verify,
      previous: { ...audited.previous, journal: audited.request.stopped.journal }, transport })
  } finally { await network?.close(); await publicNetwork?.close() }
  audited.executor.verify()
  const value = { schemaVersion: 1, kind: 'genshin_initial_production_migration_completion', request: audited.request,
    bundle: audited.previous.original.request.bundle, executorCI: audited.previous.identity.sourceCI, continuationExecutorCI: audited.request.continuationCI,
    finalizationExecutorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result,
    journal: { path: path.join(directory, `genshin-migration-${input.releaseKey}.jsonl`), pin: result.journalPin } }
  return { proof: migrationSave(directory, 'completion.json', value), value }
}
