import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { executeGenshinReadonlyCompletion, genshinReadonlyCompletionKey, genshinReadonlyCompletionTransport, readDeployedMainStop } from '../../../scripts/genshin-migration-readonly-completion.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { createGenshinPublicNetwork } from '../../../scripts/unified-preview-network.mjs'
import { genshinMainFinalizationRequest } from './genshin-migration-main-finalization'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'genshin_deployed_migration_readonly_request'; executorRunID: number; finalizationCI: any;
  stopped: { request: Proof; identity: Proof; journal: Proof; publicResult: Proof } }
export function genshinReadonlyCompletionRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value)); const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['executorRunID', 'finalizationCI', 'kind', 'schemaVersion', 'stopped'])
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_deployed_migration_readonly_request')
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  assert.deepEqual(Object.keys(request.stopped).sort(), ['identity', 'journal', 'publicResult', 'request'])
  for (const proof of Object.values(request.stopped)) {
    assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin']); assert(path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  assert.equal(request.finalizationCI.status, 'full_exact_ci_passed'); assert(/^[a-f0-9]{40}$/.test(request.finalizationCI.commit))
  assert(Number.isSafeInteger(request.finalizationCI.runID) && request.finalizationCI.runID > 0)
  return structuredClone(request)
}
export async function auditGenshinReadonlyCompletion(input: unknown) {
  const request = genshinReadonlyCompletionRequest(input)
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken), previous: any = await readDeployedMainStop(request)
  genshinMainFinalizationRequest(previous.request)
  for (const ci of [previous.identity.sourceCI, previous.request.continuationCI, ...(previous.request.preflightStop ? [previous.request.preflightStop.executorCI] : []), request.finalizationCI]) {
    assert.deepEqual(await verifyUnifiedCI(ci.runID, ci.commit, githubToken), ci)
    execFileSync('git', ['merge-base', '--is-ancestor', ci.commit, executor.executorCommit], { stdio: ['ignore', 'pipe', 'pipe'] })
  }
  const original = await verifyUnifiedPublishedSource({ publication: previous.evidence.index.publication, sourceIndex: previous.evidence.value.sourceIndex, githubToken })
  assert.deepEqual(original.sources, previous.evidence.sources)
  const identity = { ...previous.identity, releaseKey: genshinReadonlyCompletionKey(request, executor.executorCI), observedAt: Date.now() }
  const verify = async () => {
    executor.verify(); const reopened = await readDeployedMainStop(request)
    assert.deepEqual(reopened.identity, previous.identity); assert.deepEqual(reopened.evidence.value, previous.evidence.value); executor.verify()
    return { ...identity, observedAt: Date.now() }
  }
  executor.verify(); return { request, previous, executor, identity, verify }
}
export async function completeGenshinMigrationReadonly(input: { request: unknown; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditGenshinReadonlyCompletion(input.request); assert.equal(input.releaseKey, audited.identity.releaseKey)
  const directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'read-only deployed migration completion', estimatedBytes: GiB }); mkdirSync(directory, { mode: 0o700 })
  migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const network = audited.previous.request.publicProxy ? await createGenshinPublicNetwork(audited.previous.request.publicProxy) : undefined
  migrationSave(directory, 'public-network.json', network?.route ?? { kind: 'direct_public_read', retries: 0 })
  const reader = { snapshot: () => desktopCloudSnapshot(input.cloudToken, unifiedProductionRead), publicRequest: network?.request ?? unifiedProductionRead,
    version: (service: string, versionId: string) => service === 'gachia-router'
      ? readMigrationRouterVersion({ versionId, token: input.cloudToken, request: unifiedProductionRead })
      : readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) }
  let result
  try {
    const transport = genshinReadonlyCompletionTransport({ previous: audited.previous, reader, directory })
    result = await executeGenshinReadonlyCompletion({ run: directory, releaseKey: input.releaseKey, verify: audited.verify,
      previous: { ...audited.previous, journal: audited.request.stopped.journal }, transport })
  } finally { await network?.close() }
  audited.executor.verify()
  const previous = audited.previous
  const value = { schemaVersion: 1, kind: 'genshin_initial_production_migration_completion', request: previous.request, readOnlyRequest: audited.request,
    bundle: previous.previous.original.request.bundle, executorCI: previous.identity.sourceCI, continuationExecutorCI: previous.request.continuationCI,
    finalizationExecutorCI: audited.request.finalizationCI, finalizationReleaseKey: previous.releaseKey, deploymentJournal: audited.request.stopped.journal,
    readOnlyExecutorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result,
    journal: { path: path.join(directory, `genshin-migration-${input.releaseKey}.jsonl`), pin: result.journalPin } }
  return { proof: migrationSave(directory, 'completion.json', value), value }
}
