import assert from 'node:assert/strict'
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

type Proof = { path: string; pin: string }
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
export const nteReleaseKey = (request: any, executorCI: any, migration: boolean) => digest(migrationJSON({
  policy: migration ? NTE_MIGRATION_POLICY : NTE_INDEPENDENT_POLICY, bundle: request.bundle, executorCI,
  ...(request.previewProxy ? { previewProxy: request.previewProxy } : {}), ...(request.publicProxy ? { publicProxy: request.publicProxy } : {}),
}))
export async function readCompletedNteRelease(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'completion.json')); assert.equal(value.schemaVersion, 1)
  assert.equal(value.kind, 'nte_release_completion'); assert.equal(value.status, 'production_accepted'); assert.equal(value.sourceAdvanced, false)
  const { verifyNteReleaseBundle } = await import('./nte-release-bundle'), evidence = await verifyNteReleaseBundle(value.bundle, depth + 1), migration = evidence.migration
  const order = migration ? NTE_MIGRATION_ORDER : ['nte'], policy = migration ? NTE_MIGRATION_POLICY : NTE_INDEPENDENT_POLICY
  assert.equal(value.policy, policy); assert.equal(value.executorCI.status, 'full_exact_ci_passed'); assert.equal(value.executorCI.commit, evidence.value.sourceCommit)
  assert.deepEqual(value.bundle, value.request.bundle); assert.equal(value.request.executorRunID, value.executorCI.runID)
  assert.equal(value.releaseKey, nteReleaseKey(value.request, value.executorCI, migration))
  assert.equal(value.journal.path, path.join(directory, `nte-${migration ? 'migration' : 'independent'}-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin)
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((text: string) => JSON.parse(text))
  const phases = ['baseline', ...order.flatMap(() => ['upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', ...(migration ? ['step_accepted'] : [])]), 'production_accepted']
  assert.deepEqual(rows.map((row: any) => row.phase), phases); assert.deepEqual(rows[0].baseline, evidence.value.baseline); assert.deepEqual(rows[0].owners, evidence.value.owners)
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
  return { value, directory, evidence, accepted, modules, deployments, versions }
}
export async function readNteSourceIndex(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  if (!value.kind.startsWith('nte_')) return readGenshinIndependentSourceIndex(proof, depth + 1)
  assert.equal(proof.path, path.join(directory, 'source-index.json')); assert.equal(value.kind, 'nte_published_source_index')
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  const completed = await readCompletedNteRelease(value.completion, depth + 1), e = completed.evidence, previous = e.sources
  assert.deepEqual(value.previousSourceIndex, e.value.sourceIndex); assert.deepEqual(value.executorCI, completed.value.executorCI)
  assert.equal(value.sourceCommit, e.value.sourceCommit); assert.deepEqual(migrationPinned(value.active), e.candidateSources)
  const baseline = value.baseline, order = e.migration ? NTE_MIGRATION_ORDER : ['nte']
  if (e.migration) assertNteMigrationTopology(previous.baseline, baseline, { configured: [...order], deployed: Object.fromEntries(order.map((owner: string) => [owner, completed.accepted[owner].candidate.versionId])) })
  else assertTopology(previous.baseline, baseline, completed.versions)
  assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous.owners).sort())
  for (const [owner, row] of Object.entries(value.owners) as [string, any][]) {
    if (!order.includes(owner)) assert.deepEqual(row, previous.owners[owner])
    else {
      const accepted = completed.accepted[owner].candidate
      assert.equal(row.directory, path.join(directory, owner)); assert.equal(row.versionId, accepted.versionId); assert.equal(row.moduleSHA256, accepted.moduleSHA256)
      assert.deepEqual(row.moduleProof, accepted.moduleProof); assertModuleVersionIdentity(row.version, completed.modules[owner].candidate.version)
      assert.equal(baseline.services[row.service].id, completed.deployments[owner].deploymentId)
    }
    await readUnifiedSourceOwner(row); assert.equal(activeVersion(baseline, row.service), row.versionId)
  }
  if (e.migration) {
    assert.equal(value.router.versionId, completed.accepted.router.candidate.versionId); assert.deepEqual(value.router.moduleProof, completed.accepted.router.candidate.moduleProof)
    assertModuleVersionIdentity(value.router.version, completed.modules.router.candidate.version); assert.equal(baseline.services['gachia-router'].id, completed.deployments.router.deploymentId)
  } else assert.deepEqual(value.router, previous.router)
  assert.deepEqual(migrationPinned(value.observation.after), baseline); assertTopology(migrationPinned(value.observation.before), baseline)
  recheckNteHTTP({ proof: { path: path.join(directory, 'public/result.json'), pin: value.observation.publicAcceptance.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(e.value.finalReferences) })
  return { value, owners: value.owners, router: value.router, baseline, sources: e.candidateSources, workspace: e.workspace,
    routerCode: e.migration ? completed.modules.router.candidate.code : previous.routerCode,
    ancestors: [...previous.ancestors, completed.value.executorCI], originalPublication: previous.originalPublication, originalSourceIndex: previous.originalSourceIndex }
}
export async function advanceNteSources(input: { completion: Proof; directory: string; reader: any }) {
  const completed = await readCompletedNteRelease(input.completion), e = completed.evidence, directory = path.resolve(input.directory), order = e.migration ? NTE_MIGRATION_ORDER : ['nte']
  mkdirSync(directory, { mode: 0o700 })
  try {
    const before = await input.reader.snapshot()
    if (e.migration) assertNteMigrationTopology(e.sources.baseline, before, { configured: [...order], deployed: Object.fromEntries(order.map((owner: string) => [owner, completed.accepted[owner].candidate.versionId])) })
    else assertTopology(e.sources.baseline, before, completed.versions)
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
