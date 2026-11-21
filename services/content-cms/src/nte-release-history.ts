import assert from 'node:assert/strict'
import { readAdsenseInfrastructureSource } from '../../../scripts/adsense-infrastructure-history.mjs'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { activeVersion, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { readMigrationOwner } from '../../../scripts/genshin-migration-source-advance.mjs'
import { NTE_MIGRATION_ORDER, NTE_MIGRATION_POLICY, assertNteMigrationTopology } from '../../../scripts/nte-release-config.mjs'
import { NTE_INDEPENDENT_POLICY } from '../../../scripts/genshin-independent-release.mjs'
import { recheckNteHTTP, verifyNteHTTP } from '../../../scripts/nte-release-http.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { readGenshinIndependentSourceIndex } from './genshin-independent-history'
import { assertNteStoppedRouterRecovery, assertNteStoppedMainRecovery } from '../../../scripts/nte-migration-continuation.mjs'
import { migrationRouterModule } from '../../../scripts/genshin-migration-router.mjs'
import { multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { scriptETag } from '../../../scripts/desktop-version-provenance.mjs'
import { migrationUploadResponse } from '../../../scripts/genshin-migration-transport.mjs'
import { unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { readUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { recheckNteFailedHTTP } from '../../../scripts/nte-release-http.mjs'
import { readNteSourceCheckpoint } from './nte-source-checkpoint'

type Proof = { path: string; pin: string }
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
export const nteReleaseKey = (request: any, executorCI: any, migration: boolean) => digest(migrationJSON({
  policy: migration ? NTE_MIGRATION_POLICY : NTE_INDEPENDENT_POLICY, bundle: request.bundle, executorCI,
  ...(request.previewProxy ? { previewProxy: request.previewProxy } : {}), ...(request.publicProxy ? { publicProxy: request.publicProxy } : {}),
}))
export const nteContinuationKey = (request: any, executorCI: any) => digest(migrationJSON({ policy: request.kind === 'nte_main_migration_continuation_request' ? 'nte-known-main-recovery-continuation-v1' : 'nte-known-router-recovery-continuation-v1', request, executorCI }))
export function nteMigrationContinuationRequest(input: any) {
  assert(input && typeof input === 'object' && !Array.isArray(input))
  const main = input.kind === 'nte_main_migration_continuation_request'
  assert.deepEqual(Object.keys(input).sort(), ['schemaVersion', 'kind', 'stopped', 'executorRunID', ...(main ? ['continuationCI'] : []), ...(Object.hasOwn(input, 'publicProxy') ? ['publicProxy'] : [])].sort())
  assert.equal(input.schemaVersion, 1); assert(['nte_migration_continuation_request', 'nte_main_migration_continuation_request'].includes(input.kind))
  if (main) { assert.equal(input.continuationCI.status, 'full_exact_ci_passed'); assert(/^[a-f0-9]{40}$/.test(input.continuationCI.commit)); assert(Number.isSafeInteger(input.continuationCI.runID) && input.continuationCI.runID > 0) }
  assert(Number.isSafeInteger(input.executorRunID) && input.executorRunID > 0)
  if (Object.hasOwn(input, 'publicProxy')) assert.equal(unifiedPreviewProxy(input.publicProxy), input.publicProxy)
  assert.deepEqual(Object.keys(input.stopped).sort(), ['identity', 'journal', 'request', ...(main ? ['failedPreview'] : [])].sort())
  for (const proof of Object.values(input.stopped) as any[]) { assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin']); assert(path.isAbsolute(proof.path)); assert(/^[a-f0-9]{64}$/.test(proof.pin)) }
  return structuredClone(input)
}
export async function readStoppedNteMainMigration(proofs: any, continuationCI: any, depth = 0): Promise<any> {
  assert(depth < 32)
  const request = migrationPinned(proofs.request), identity = migrationPinned(proofs.identity), directory = path.dirname(proofs.journal.path)
  nteMigrationContinuationRequest(request); assert.equal(request.kind, 'nte_migration_continuation_request')
  assert.equal(proofs.request.path, path.join(directory, 'request.json')); assert.equal(proofs.identity.path, path.join(directory, 'identity.json'))
  assert.equal(proofs.journal.path, path.join(directory, `nte-migration-${identity.releaseKey}.jsonl`))
  const original = await readStoppedNteMigration(request.stopped, depth + 1), evidence = original.evidence
  assert.equal(continuationCI.status, 'full_exact_ci_passed'); assert.equal(continuationCI.runID, request.executorRunID)
  assert.equal(identity.releaseKey, nteContinuationKey(request, continuationCI))
  assert.deepEqual({ ...identity, releaseKey: original.identity.releaseKey, observedAt: original.identity.observedAt }, original.identity)
  const bytes = readFileSync(proofs.journal.path); assert.equal(digest(bytes), proofs.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((s: string) => JSON.parse(s)), state = assertNteStoppedMainRecovery(identity, rows)
  assert.deepEqual(rows[0].previousJournal, request.stopped.journal); assert.equal(rows[0].previousReleaseKey, original.identity.releaseKey)
  assert.deepEqual(rows[0].accepted, { nte: original.accepted.nte }); assert.deepEqual(rows[2].proof, original.routerRecovery)
  assert.equal(rows[2].versionId, original.routerRecoveryVersionId)
  assert.deepEqual({ ...rows[3].proof, evidenceSHA256: undefined, acceptedAt: undefined }, { ...original.routerRecovery, evidenceSHA256: undefined, acceptedAt: undefined })
  const router: any = await readMigrationOwner({ owner: 'router', rows: [original.rows[10], original.rows[11], rows[3], ...rows.slice(4, 10)], offset: 0, directory, releaseKey: identity.releaseKey, evidence, nte: true, roleTransportPins: { recovery: original.identity.releaseKey } })
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-0-nte/result.json'), pin: rows[1].proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(evidence.value.stepReferences) })
  const routerRefs = { path: path.join(evidence.directory, 'router/candidate/local-http/responses/references.json'), pin: evidence.value.owners.router.candidate.referencesPin }
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-1-router/result.json'), pin: rows[9].proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(routerRefs) })
  assert.equal(state.deployed.nte, original.deployed.nte)
  const output = path.join(directory, 'main-recovery'), sealed = evidence.value.owners.main.recovery
  assert.deepEqual(migrationUploadResponse(readFileSync(path.join(output, 'upload.log'), 'utf8'), 'gachia'), { versionId: state.mainRecoveryVersionId })
  const receiptPath = path.join(output, 'module/receipt.json'), moduleProof = { path: receiptPath, pin: digest(readFileSync(receiptPath)) }
  const module = await readUnifiedUploadedModule(moduleProof, { service: 'gachia', versionId: state.mainRecoveryVersionId, moduleSHA256: sealed.moduleSHA256, context: { role: 'recovery', transportPin: identity.releaseKey, configPin: sealed.configPin } })
  const versionBytes = readFileSync(path.join(output, 'version.json')), version = JSON.parse(versionBytes.toString()); assertModuleVersionIdentity(module.version, version)
  assert.equal(proofs.failedPreview.path, path.join(output, 'preview/failure.json'))
  const refs = { path: path.join(evidence.directory, 'main/recovery/local-http/responses/references.json'), pin: sealed.referencesPin }
  const failure = recheckNteFailedHTTP({ proof: proofs.failedPreview, references: migrationPinned(refs) }); assert.equal(failure.error, rows[12].error)
  assert(failure.observations.some((row: any) => row.path === '/data/genshin/raw-character-materials.json'))
  return { request, identity, evidence, original, directory, rows, ...state, modules: { nte: original.modules.nte, router: router.modules, mainRecovery: module }, deployments: { nte: original.deployments.nte, router: router.deployment }, mainRecovery: { versionId: state.mainRecoveryVersionId, moduleSHA256: sealed.moduleSHA256, moduleProof, versionPin: digest(versionBytes) } }
}
export async function readStoppedNteMigration(proofs: { request: Proof; identity: Proof; journal: Proof }, depth = 0): Promise<any> {
  assert(depth < 32)
  const request = migrationPinned(proofs.request), identity = migrationPinned(proofs.identity), directory = path.dirname(proofs.journal.path)
  assert.equal(proofs.request.path, path.join(directory, 'request.json')); assert.equal(proofs.identity.path, path.join(directory, 'identity.json'))
  assert.equal(request.kind, 'nte_release_request'); assert.equal(proofs.journal.path, path.join(directory, `nte-migration-${identity.releaseKey}.jsonl`))
  const { verifyNteReleaseBundle } = await import('./nte-release-bundle'), evidence = await verifyNteReleaseBundle(request.bundle, depth + 1)
  assert.equal(evidence.migration, true); assert.equal(identity.sourceCommit, evidence.value.sourceCommit)
  assert.equal(identity.sourceCI.commit, identity.sourceCommit); assert.equal(request.executorRunID, identity.sourceCI.runID)
  assert.equal(identity.releaseKey, nteReleaseKey(request, identity.sourceCI, true)); assert.deepEqual(identity.baseline, evidence.value.baseline)
  assert.deepEqual(identity.owners, evidence.value.owners); assert.equal(identity.sourceIndexPin, evidence.value.sourceIndex.pin); assert.equal(identity.activePin, evidence.built.value.active.pin)
  const bytes = readFileSync(proofs.journal.path); assert.equal(digest(bytes), proofs.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((s: string) => JSON.parse(s)), state = assertNteStoppedRouterRecovery(identity, rows)
  const nte = await readMigrationOwner({ owner: 'nte', rows, offset: 1, directory, releaseKey: identity.releaseKey, evidence, nte: true })
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-0-nte/result.json'), pin: rows[9].proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(evidence.value.stepReferences) })
  const output = path.join(directory, 'router-recovery'), sealed = evidence.value.owners.router.recovery
  assert.deepEqual(migrationUploadResponse(readFileSync(path.join(output, 'upload.log'), 'utf8'), 'gachia-router'), { versionId: state.routerRecoveryVersionId })
  const receiptPath = path.join(output, 'module/receipt.json'), moduleProof = { path: receiptPath, pin: digest(readFileSync(receiptPath)) }
  const module = migrationPinned(moduleProof), versionBytes = readFileSync(path.join(output, 'version.json')), version = JSON.parse(versionBytes.toString())
  assert.equal(module.kind, 'genshin_migration_router_upload_module'); assert.equal(module.service, 'gachia-router'); assert.equal(module.versionId, state.routerRecoveryVersionId)
  assert.equal(version.id, module.versionId); assert.deepEqual(module.context, { role: 'recovery', transportPin: identity.releaseKey, configPin: sealed.configPin })
  assertModuleVersionIdentity(module.before, module.after); assertModuleVersionIdentity(module.before, version); assert.equal(scriptETag(module.etag), version.resources.script.etag)
  const archive = readFileSync(path.join(output, 'module/download.multipart')); assert.equal(digest(archive), module.archivePin)
  const downloaded = await migrationRouterModule(archive), uploaded = await multipartModule(readFileSync(path.join(output, 'uploaded.multipart')))
  assert.equal(downloaded.moduleSHA256, sealed.moduleSHA256); assert.equal(uploaded.moduleSHA256, sealed.moduleSHA256); assert(downloaded.code.equals(uploaded.code))
  assert.equal(module.moduleSHA256, sealed.moduleSHA256)
  return { request, identity, evidence, directory, rows, ...state, modules: { nte: nte.modules, routerRecovery: { version, receipt: module } }, deployments: { nte: nte.deployment }, routerRecovery: { versionId: module.versionId, moduleSHA256: sealed.moduleSHA256, moduleProof, versionPin: digest(versionBytes) } }
}
export async function readCompletedNteRelease(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'completion.json')); assert.equal(value.schemaVersion, 1)
  assert.equal(value.kind, 'nte_release_completion'); assert.equal(value.status, 'production_accepted'); assert.equal(value.sourceAdvanced, false)
  if (value.request.kind === 'nte_migration_continuation_request') return readCompletedNteContinuation(proof, depth + 1)
  if (value.request.kind === 'nte_main_migration_continuation_request') return readCompletedNteMainContinuation(proof, depth + 1)
  const { verifyNteReleaseBundle } = await import('./nte-release-bundle'), evidence = await verifyNteReleaseBundle(value.bundle, depth + 1), migration = evidence.migration
  const order = migration ? NTE_MIGRATION_ORDER : ['nte'], policy = migration ? NTE_MIGRATION_POLICY : NTE_INDEPENDENT_POLICY
  assert.equal(value.policy, policy); assert.equal(value.executorCI.status, 'full_exact_ci_passed'); assert.equal(value.executorCI.commit, evidence.value.sourceCommit)
  assert.deepEqual(value.bundle, value.request.bundle); assert.equal(value.request.executorRunID, value.executorCI.runID)
  assert.equal(value.releaseKey, nteReleaseKey(value.request, value.executorCI, migration))
  assert.equal(value.journal.path, path.join(directory, `nte-${migration ? 'migration' : 'independent'}-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin)
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((text: string) => JSON.parse(text))
  const phases = ['baseline', ...order.flatMap(() => ['upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', ...(migration ? ['step_accepted'] : [])]), 'production_accepted']
  assert.deepEqual(rows.map((row: any) => row.phase), phases)
  if (migration) assert.deepEqual(rows[0].baseline, evidence.value.baseline)
  else assertTopology(evidence.value.baseline, rows[0].baseline, evidence.sources.allOwnersCurrent ? {} : {
    gachia: activeVersion(rows[0].baseline, 'gachia'),
    'gachia-game-azur-promilia': activeVersion(rows[0].baseline, 'gachia-game-azur-promilia'),
    'gachia-game-lvmeng': activeVersion(rows[0].baseline, 'gachia-game-lvmeng'),
  })
  assert.deepEqual(rows[0].owners, evidence.value.owners)
  let at = -Infinity
  for (const row of rows) { assert.equal(row.policy, policy); assert.equal(row.releaseKey, value.releaseKey); const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next }
  const accepted: any = {}, modules: any = {}, deployments: any = {}
  for (const [index, owner] of order.entries()) {
    const offset = 1 + index * 9, read = await readMigrationOwner({ owner, rows, offset, directory, releaseKey: value.releaseKey, evidence, requireStep: migration, nte: true })
    accepted[owner] = read.accepted; modules[owner] = read.modules; deployments[owner] = read.deployment
    if (migration) {
      const refs = owner === 'nte' ? evidence.value.stepReferences : owner === 'router'
        ? { path: path.join(evidence.directory, 'router/candidate/local-http/responses/references.json'), pin: evidence.value.owners.router.candidate.referencesPin } : evidence.value.finalReferences
      recheckNteHTTP({ proof: { path: path.join(directory, `public-${index}-${owner === 'nte' ? 'nte' : 'router'}/result.json`), pin: rows[offset + 8].proof.evidenceSHA256 },
        origin: 'https://gachia.com', references: migrationPinned(refs) })
    } else { assert.deepEqual(value.accepted, read.accepted); assert.deepEqual(value.deployment, read.deployment) }
  }
  const versions = Object.fromEntries(order.map((owner: string) => [evidence.value.owners[owner].service, accepted[owner].candidate.versionId]))
  assert.deepEqual(value.versions, versions); assert.deepEqual(rows.at(-1).proof.versions, versions); assert.equal(rows.at(-1).proof.status, 'passed')
  recheckNteHTTP({ proof: { path: path.join(directory, `public-${migration ? 3 : 0}-router/result.json`), pin: rows.at(-1).proof.evidenceSHA256 },
    origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences) })
  return { value, directory, evidence, rows, accepted, modules, deployments, versions }
}
async function readCompletedNteMainContinuation(proof: Proof, depth: number): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path); nteMigrationContinuationRequest(value.request)
  const previous = await readStoppedNteMainMigration(value.request.stopped, value.request.continuationCI, depth + 1), evidence = previous.evidence
  assert.deepEqual(value.bundle, previous.original.request.bundle); assert.deepEqual(value.executorCI, previous.identity.sourceCI)
  assert.deepEqual(value.continuationExecutorCI, value.request.continuationCI); assert.equal(value.finalizationExecutorCI.status, 'full_exact_ci_passed')
  assert.equal(value.request.executorRunID, value.finalizationExecutorCI.runID); assert.equal(value.releaseKey, nteContinuationKey(value.request, value.finalizationExecutorCI)); assert.equal(value.policy, NTE_MIGRATION_POLICY)
  assert.equal(value.journal.path, path.join(directory, `nte-migration-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin)
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((s: string) => JSON.parse(s))
  assert.deepEqual(rows.map((r: any) => r.phase), ['main_continuation_baseline', 'step_accepted', 'known_upload_reopened', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted', 'production_accepted'])
  let at = -Infinity; for (const row of rows) { assert.equal(row.policy, value.policy); assert.equal(row.releaseKey, value.releaseKey); const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next }
  assert.deepEqual(rows[0].previousJournal, value.request.stopped.journal); assert.equal(rows[0].previousReleaseKey, previous.identity.releaseKey)
  assert.deepEqual(rows[0].baseline, previous.identity.baseline); assert.deepEqual(rows[0].owners, previous.identity.owners); assert.deepEqual(rows[0].deployed, previous.deployed)
  assert.deepEqual(rows[0].accepted, { nte: previous.accepted.nte, router: previous.accepted.router })
  assert.equal(rows[1].owner, 'router'); assert.equal(rows[1].proof.status, 'passed')
  assert.equal(rows[2].owner, 'main'); assert.equal(rows[2].role, 'recovery'); assert.equal(rows[2].service, 'gachia'); assert.equal(rows[2].versionId, previous.mainRecoveryVersionId); assert.deepEqual(rows[2].proof, previous.mainRecovery)
  assert.deepEqual({ ...rows[3].proof, evidenceSHA256: undefined, acceptedAt: undefined }, { ...previous.mainRecovery, evidenceSHA256: undefined, acceptedAt: undefined })
  const main: any = await readMigrationOwner({ owner: 'main', rows: [previous.rows[10], previous.rows[11], rows[3], ...rows.slice(4, 10)], offset: 0, directory, releaseKey: value.releaseKey, evidence, nte: true, roleTransportPins: { recovery: previous.identity.releaseKey } })
  const routerRefs = { path: path.join(evidence.directory, 'router/candidate/local-http/responses/references.json'), pin: evidence.value.owners.router.candidate.referencesPin }
  for (const [index, row, refs] of [[0, rows[1], routerRefs], [1, rows[9], evidence.value.finalReferences], [2, rows[10], evidence.value.finalReferences]] as any[]) recheckNteHTTP({ proof: { path: path.join(directory, `public-${index}-router/result.json`), pin: row.proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(refs) })
  const accepted: any = { nte: previous.accepted.nte, router: previous.accepted.router, main: main.accepted }, modules = { nte: previous.modules.nte, router: previous.modules.router, main: main.modules }, deployments = { ...previous.deployments, main: main.deployment }
  const versions = Object.fromEntries(NTE_MIGRATION_ORDER.map(owner => [evidence.value.owners[owner].service, accepted[owner].candidate.versionId])); assert.deepEqual(value.versions, versions); assert.deepEqual(rows.at(-1).proof.versions, versions); assert.equal(rows.at(-1).proof.status, 'passed')
  return { value, directory, evidence, accepted, modules, deployments, versions }
}
async function readCompletedNteContinuation(proof: Proof, depth: number): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  nteMigrationContinuationRequest(value.request)
  const previous = await readStoppedNteMigration(value.request.stopped, depth + 1), evidence = previous.evidence
  assert.deepEqual(value.bundle, previous.request.bundle); assert.deepEqual(value.executorCI, previous.identity.sourceCI)
  assert.equal(value.continuationExecutorCI.status, 'full_exact_ci_passed'); assert.equal(value.request.executorRunID, value.continuationExecutorCI.runID)
  assert.equal(value.releaseKey, nteContinuationKey(value.request, value.continuationExecutorCI)); assert.equal(value.policy, NTE_MIGRATION_POLICY)
  assert.equal(value.journal.path, path.join(directory, `nte-migration-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin)
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((s: string) => JSON.parse(s))
  assert.deepEqual(rows.map((r: any) => r.phase), ['continuation_baseline', 'step_accepted', 'known_upload_reopened', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted', ...['upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted'], 'production_accepted'])
  let at = -Infinity; for (const row of rows) { assert.equal(row.policy, value.policy); assert.equal(row.releaseKey, value.releaseKey); const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next }
  assert.deepEqual(rows[0].previousJournal, value.request.stopped.journal); assert.equal(rows[0].previousReleaseKey, previous.identity.releaseKey)
  assert.deepEqual(rows[0].baseline, previous.identity.baseline); assert.deepEqual(rows[0].owners, previous.identity.owners)
  assert.deepEqual(rows[0].deployed, previous.deployed); assert.deepEqual(rows[0].accepted, { nte: previous.accepted.nte })
  assert.equal(rows[1].owner, 'nte'); assert.equal(rows[1].proof.status, 'passed')
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-0-nte/result.json'), pin: rows[1].proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(evidence.value.stepReferences) })
  assert.equal(rows[2].owner, 'router'); assert.equal(rows[2].role, 'recovery'); assert.equal(rows[2].service, 'gachia-router')
  assert.equal(rows[2].versionId, previous.routerRecoveryVersionId); assert.deepEqual(rows[2].proof, previous.routerRecovery)
  assert.deepEqual({ ...rows[3].proof, evidenceSHA256: undefined, acceptedAt: undefined }, { ...previous.routerRecovery, evidenceSHA256: undefined, acceptedAt: undefined })
  // Normalize only in memory: the two upload events come from the pinned old
  // journal, while their fresh acceptance comes from this continuation.
  const routerRows = [previous.rows[10], previous.rows[11], rows[3], ...rows.slice(4, 10)]
  const router: any = await readMigrationOwner({ owner: 'router', rows: routerRows, offset: 0, directory, releaseKey: value.releaseKey, evidence, nte: true, roleTransportPins: { recovery: previous.identity.releaseKey } })
  assert.deepEqual(router.accepted.recovery.moduleProof, previous.routerRecovery.moduleProof)
  const main = await readMigrationOwner({ owner: 'main', rows, offset: 10, directory, releaseKey: value.releaseKey, evidence, nte: true })
  for (const [i, owner, refs] of [[1, 'router', { path: path.join(evidence.directory, 'router/candidate/local-http/responses/references.json'), pin: evidence.value.owners.router.candidate.referencesPin }], [2, 'main', evidence.value.finalReferences]] as any[]) {
    const offset = owner === 'router' ? 9 : 18
    recheckNteHTTP({ proof: { path: path.join(directory, `public-${i}-router/result.json`), pin: rows[offset].proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(refs) })
  }
  const accepted: Record<string, any> = { nte: previous.accepted.nte, router: router.accepted, main: main.accepted }, modules = { nte: previous.modules.nte, router: router.modules, main: main.modules }, deployments = { nte: previous.deployments.nte, router: router.deployment, main: main.deployment }
  const versions = Object.fromEntries(NTE_MIGRATION_ORDER.map(owner => [evidence.value.owners[owner].service, accepted[owner].candidate.versionId]))
  assert.deepEqual(value.versions, versions); assert.deepEqual(rows.at(-1).proof.versions, versions); assert.equal(rows.at(-1).proof.status, 'passed')
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-3-router/result.json'), pin: rows.at(-1).proof.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences) })
  return { value, directory, evidence, accepted, modules, deployments, versions }
}
export async function readNteSourceIndex(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  if (value.kind === 'nte_public_runtime_source_index_v1') return (await import('../../../scripts/public-runtime-history.mjs')).readPublicRuntimeSource(proof, readNteSourceIndex, depth)
  if (value.kind === 'nte_reconstructed_source_checkpoint') return readNteSourceCheckpoint(proof)
  if (value.kind === 'nte_genshin_reviewed_collection_source_index_v1') return (await import('./genshin-collection-history')).readGenshinCollectionSource(proof, readNteSourceIndex, depth)
  if (value.kind === 'nte_genshin_preserved_code_source_index_v1') return (await import('../../../scripts/genshin-code-history.mjs')).readGenshinCodeSource(proof, readNteSourceIndex, depth)
  if (['nte_restored_main_source_index', 'nte_main_material_consumer_source_index_v1'].includes(value.kind)) return (await import('./main-content-restoration')).readRestoredMainSources(proof)
  if (value.kind === 'nte_adsense_infrastructure_source_index') return readAdsenseInfrastructureSource(proof, readNteSourceIndex, depth)
  if (!value.kind.startsWith('nte_')) return readGenshinIndependentSourceIndex(proof, depth + 1)
  assert.equal(proof.path, path.join(directory, 'source-index.json')); assert.equal(value.kind, 'nte_published_source_index')
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  const completed = await readCompletedNteRelease(value.completion, depth + 1), e = completed.evidence, previous = e.sources
  assert.deepEqual(value.previousSourceIndex, e.value.sourceIndex); assert.deepEqual(value.executorCI, completed.value.executorCI)
  assert.equal(value.sourceCommit, e.value.sourceCommit); assert.deepEqual(migrationPinned(value.active), e.candidateSources)
  const baseline = value.baseline, order = e.migration ? NTE_MIGRATION_ORDER : ['nte']
  if (e.migration) assertNteMigrationTopology(previous.baseline, baseline, { configured: [...order], deployed: Object.fromEntries(order.map((owner: string) => [owner, completed.accepted[owner].candidate.versionId])) })
  else assertTopology(previous.baseline, baseline, previous.allOwnersCurrent ? completed.versions : {
    ...completed.versions,
    gachia: activeVersion(baseline, 'gachia'),
    'gachia-game-azur-promilia': activeVersion(baseline, 'gachia-game-azur-promilia'),
    'gachia-game-lvmeng': activeVersion(baseline, 'gachia-game-lvmeng'),
  })
  assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous.owners).sort())
  for (const [owner, row] of Object.entries(value.owners) as [string, any][]) {
    if (!order.includes(owner)) assert.deepEqual(row, previous.owners[owner])
    else {
      const accepted = completed.accepted[owner].candidate
      assert.equal(row.directory, path.join(directory, owner)); assert.equal(row.versionId, accepted.versionId); assert.equal(row.moduleSHA256, accepted.moduleSHA256)
      assert.deepEqual(row.moduleProof, accepted.moduleProof); assertModuleVersionIdentity(row.version, completed.modules[owner].candidate.version)
      assert.equal(baseline.services[row.service].id, completed.deployments[owner].deploymentId)
    }
    await readUnifiedSourceOwner(row)
    if (previous.allOwnersCurrent || e.migration || ['main', 'azur-promilia'].includes(owner)) assert.equal(activeVersion(baseline, row.service), row.versionId)
  }
  if (e.migration) {
    assert.equal(value.router.versionId, completed.accepted.router.candidate.versionId); assert.deepEqual(value.router.moduleProof, completed.accepted.router.candidate.moduleProof)
    assertModuleVersionIdentity(value.router.version, completed.modules.router.candidate.version); assert.equal(baseline.services['gachia-router'].id, completed.deployments.router.deploymentId)
  } else assert.deepEqual(value.router, previous.router)
  assert.deepEqual(migrationPinned(value.observation.after), baseline); assertTopology(migrationPinned(value.observation.before), baseline)
  recheckNteHTTP({ proof: { path: path.join(directory, 'public/result.json'), pin: value.observation.publicAcceptance.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(e.value.finalReferences) })
  return { value, owners: value.owners, router: value.router, baseline, sources: e.candidateSources, workspace: e.workspace,
    allOwnersCurrent: previous.allOwnersCurrent === true,
    routerCode: e.migration ? completed.modules.router.candidate.code : previous.routerCode,
    ancestors: [...previous.ancestors, completed.value.executorCI, ...(completed.value.continuationExecutorCI ? [completed.value.continuationExecutorCI] : []), ...(completed.value.finalizationExecutorCI ? [completed.value.finalizationExecutorCI] : [])], originalPublication: previous.originalPublication, originalSourceIndex: previous.originalSourceIndex }
}
export async function advanceNteSources(input: { completion: Proof; directory: string; reader: any }) {
  const completed = await readCompletedNteRelease(input.completion), e = completed.evidence, directory = path.resolve(input.directory), order = e.migration ? NTE_MIGRATION_ORDER : ['nte']
  mkdirSync(directory, { mode: 0o700 })
  try {
    const before = await input.reader.snapshot()
    if (e.migration) assertNteMigrationTopology(e.sources.baseline, before, { configured: [...order], deployed: Object.fromEntries(order.map((owner: string) => [owner, completed.accepted[owner].candidate.versionId])) })
    else assertTopology(completed.rows[0].baseline, before, completed.versions)
    const owners = structuredClone(e.sources.owners)
    for (const owner of order.filter((name: string) => name !== 'router')) {
      const accepted = completed.accepted[owner].candidate, module = completed.modules[owner].candidate, original = path.join(e.directory, owner, 'candidate/artifact'), target = path.join(directory, owner)
      assert.equal(before.services[e.value.owners[owner].service].id, completed.deployments[owner].deploymentId)
      cpSync(original, target, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false }); writeFileSync(path.join(target, 'worker.js'), module.code, { mode: 0o600 })
      assert.deepEqual(artifactFiles(target), artifactFiles(original).map((row: any) => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: accepted.moduleSHA256 } : row))
      owners[owner] = { owner, service: e.value.owners[owner].service, versionId: accepted.versionId, directory: target, artifactSHA256: treePin(target), modulePath: module.receipt.archive.path,
        archiveSHA256: module.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256, version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context }
    }
    const router = e.migration ? { service: 'gachia-router', versionId: completed.accepted.router.candidate.versionId, moduleProof: completed.accepted.router.candidate.moduleProof,
      version: completed.modules.router.candidate.version, deploymentId: completed.deployments.router.deploymentId } : e.sources.router
    const versions: Record<string, Proof> = {}
    for (const [owner, row] of Object.entries(owners) as [string, any][]) { await readUnifiedSourceOwner(row); const version = await input.reader.version(row.service, row.versionId); assertModuleVersionIdentity(row.version, version); versions[owner] = migrationSave(directory, owner + '-version.json', version) }
    assertModuleVersionIdentity(router.version, await input.reader.version(router.service, router.versionId))
    const publicAcceptance = await verifyNteHTTP({ origin: 'https://gachia.com', references: migrationPinned(e.value.finalReferences), directory: path.join(directory, 'public'), request: input.reader.publicRequest })
    const after = await input.reader.snapshot(); assertTopology(before, after)
    const value = { schemaVersion: 1, kind: 'nte_published_source_index', status: 'published_sources_observed', completion: input.completion, previousSourceIndex: e.value.sourceIndex,
      sourceCommit: e.value.sourceCommit, executorCI: completed.value.executorCI, owners, router, active: migrationSave(directory, 'active.json', e.candidateSources), baseline: after,
      observation: { before: migrationSave(directory, 'before.json', before), after: migrationSave(directory, 'after.json', after), versions, publicAcceptance, observedAt: Date.now() }, cloudWrites: false, newPublicationAuthorized: false }
    const proof = migrationSave(directory, 'source-index.json', value); await readNteSourceIndex(proof); return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
