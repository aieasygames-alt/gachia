import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { desktopCloudSnapshot, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { genshinMigrationTransport } from '../../../scripts/genshin-migration-transport.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { createNteMigrationPreviewNetwork, createGenshinPublicNetwork } from '../../../scripts/unified-preview-network.mjs'
import { assertNteMigrationIdentity, assertNteMigrationTopology } from '../../../scripts/nte-release-config.mjs'
import { executeNteRouterContinuation } from '../../../scripts/nte-migration-continuation.mjs'
import { nteContinuationKey, nteMigrationContinuationRequest, readStoppedNteMigration } from './nte-release-history'
import { nteProductionRequest } from './nte-release-production'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'

export async function auditNteMigrationContinuation(input: unknown, cloudToken: string) {
  const request = nteMigrationContinuationRequest(input)
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken), previous = await readStoppedNteMigration(request.stopped), evidence = previous.evidence
  nteProductionRequest(previous.request)
  execFileSync('git', ['merge-base', '--is-ancestor', previous.identity.sourceCommit, executor.executorCommit], { stdio: 'pipe' })
  assert.deepEqual(await verifyUnifiedCI(previous.identity.sourceCI.runID, previous.identity.sourceCommit, githubToken), previous.identity.sourceCI)
  await verifyUnifiedPublishedSource({ publication: evidence.sources.originalPublication, sourceIndex: evidence.sources.originalSourceIndex, githubToken })
  for (const ancestor of evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  const readVersion = (service: string, versionId: string) => service === 'gachia-router'
    ? readMigrationRouterVersion({ versionId, token: cloudToken, request: unifiedProductionRead }) : readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead })
  const before: any = await desktopCloudSnapshot(cloudToken, unifiedProductionRead)
  assertNteMigrationTopology(evidence.value.baseline, before, { configured: ['nte'], deployed: previous.deployed })
  assert.equal(before.services['gachia-game-nte'].id, previous.deployments.nte.deploymentId)
  for (const [owner, row] of Object.entries(evidence.sources.owners) as [string, any][]) {
    const version = owner === 'nte' ? previous.modules.nte.candidate.version : row.version
    assertModuleVersionIdentity(version, await readVersion(row.service, owner === 'nte' ? previous.deployed.nte : row.versionId))
  }
  assertModuleVersionIdentity(previous.modules.nte.recovery.version, await readVersion('gachia-game-nte', previous.accepted.nte.recovery.versionId))
  assertModuleVersionIdentity(evidence.sources.router.version, await readVersion('gachia-router', evidence.sources.router.versionId))
  assertModuleVersionIdentity(previous.modules.routerRecovery.version, await readVersion('gachia-router', previous.routerRecoveryVersionId))
  assertTopology(before, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  const identity = { ...previous.identity, releaseKey: nteContinuationKey(request, executor.executorCI), observedAt: Date.now() }
  const verify = async () => {
    executor.verify(); const reopened = await readStoppedNteMigration(request.stopped)
    assert.deepEqual(reopened.identity, previous.identity); assert.deepEqual(reopened.evidence.value, evidence.value)
    assert.deepEqual(reopened.routerRecovery, previous.routerRecovery); executor.verify()
    return { ...identity, observedAt: Date.now() }
  }
  executor.verify(); assertNteMigrationIdentity(identity)
  return { request, previous, evidence, executor, identity, verify }
}
export async function activateNteMigrationContinuation(input: { request: unknown; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditNteMigrationContinuation(input.request, input.cloudToken)
  assert.equal(input.releaseKey, audited.identity.releaseKey)
  const directory = path.resolve(input.directory); assertDiskBudget({ path: directory, operation: 'NTE remaining migration evidence', estimatedBytes: 2 * GiB })
  mkdirSync(directory, { mode: 0o700 }); migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  // Copy only the known immutable upload evidence, retaining its original
  // receipt context. A new preview is recorded in the new directory.
  cpSync(path.join(audited.previous.directory, 'router-recovery'), path.join(directory, 'router-recovery'), { recursive: true, errorOnExist: true, force: false })
  const network = audited.previous.request.previewProxy ? await createNteMigrationPreviewNetwork(audited.previous.request.previewProxy) : undefined
  const publicNetwork = audited.request.publicProxy ? await createGenshinPublicNetwork(audited.request.publicProxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  migrationSave(directory, 'public-network.json', publicNetwork?.route ?? { kind: 'direct_public_read', retries: 0 })
  let result
  try {
    const transport = genshinMigrationTransport({ evidence: audited.evidence, releaseKey: input.releaseKey, token: input.cloudToken, directory,
      knownRouterRecovery: { versionId: audited.previous.routerRecoveryVersionId, releaseKey: audited.previous.identity.releaseKey },
      ...(network ? { previewRequest: network.request } : {}), ...(publicNetwork ? { publicRequest: publicNetwork.request } : {}) })
    result = await executeNteRouterContinuation({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport,
      previous: { journal: audited.request.stopped.journal, identity: audited.previous.identity, routerRecovery: audited.previous.routerRecovery } })
  } finally { await network?.close(); await publicNetwork?.close() }
  audited.executor.verify()
  const value = { schemaVersion: 1, kind: 'nte_release_completion', request: audited.request, bundle: audited.previous.request.bundle,
    executorCI: audited.previous.identity.sourceCI, continuationExecutorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result,
    journal: { path: path.join(directory, `nte-migration-${input.releaseKey}.jsonl`), pin: result.journalPin } }
  return { proof: migrationSave(directory, 'completion.json', value), value }
}
