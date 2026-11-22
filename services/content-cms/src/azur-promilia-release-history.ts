import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { activeVersion, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { readMigrationOwner } from '../../../scripts/genshin-migration-source-advance.mjs'
import { AZUR_PROMILIA_INDEPENDENT_POLICY } from '../../../scripts/genshin-independent-release.mjs'
import { recheckNteHTTP, verifyNteHTTP } from '../../../scripts/nte-release-http.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { azurPromiliaPublicReferences } from '../../../scripts/azur-promilia-independent-transport.mjs'
import { verifyAzurPromiliaIndependentBundle } from './azur-promilia-independent-bundle'
import { azurPromiliaProductionRequest, azurPromiliaReleaseKey } from './azur-promilia-independent-production'
import { azurPromiliaGuidePairContract } from './azur-promilia-independent-text'

type Proof = { path: string; pin: string }
const owner = 'azur-promilia', service = 'gachia-game-azur-promilia'
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
const publicReferences = (e: any) => azurPromiliaPublicReferences(migrationPinned(e.value.finalReferences))

// A successful upload or a published CMS status is insufficient. Reopen the
// fixed single-owner journal, both immutable modules/previews and public proof.
export async function readCompletedAzurPromiliaRelease(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32, 'Azur release ancestry exceeds its bound')
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'completion.json'))
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'azur_promilia_release_completion')
  assert.equal(value.status, 'production_accepted'); assert.equal(value.policy, AZUR_PROMILIA_INDEPENDENT_POLICY)
  assert.equal(value.sourceAdvanced, false)
  const request = azurPromiliaProductionRequest(value.request)
  assert.deepEqual(value.bundle, request.bundle)
  const evidence = await verifyAzurPromiliaIndependentBundle(value.bundle, depth + 1)
  assert.equal(value.executorCI.status, 'full_exact_ci_passed')
  assert.equal(value.executorCI.commit, evidence.value.sourceCommit)
  assert.equal(value.executorCI.runID, request.executorRunID)
  assert.equal(value.releaseKey, azurPromiliaReleaseKey(request, value.executorCI))
  assert.equal(value.journal.path, path.join(directory, `${owner}-independent-${value.releaseKey}.jsonl`))
  const bytes = readFileSync(value.journal.path)
  assert.equal(digest(bytes), value.journal.pin); assert.equal(value.journal.pin, value.journalPin)
  assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map(line => JSON.parse(line))
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'upload_intent', 'upload_returned', 'preview_accepted',
    'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'production_accepted'])
  assert.deepEqual(rows[0].baseline, evidence.value.baseline); assert.deepEqual(rows[0].owners, evidence.value.owners)
  let at = -Infinity
  for (const row of rows) {
    assert.equal(row.policy, value.policy); assert.equal(row.releaseKey, value.releaseKey)
    const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next
  }
  const reopened: any = await readMigrationOwner({ owner, rows, offset: 1, directory, releaseKey: value.releaseKey,
    evidence, requireStep: false, nte: true })
  assert.deepEqual(value.accepted, reopened.accepted); assert.deepEqual(value.deployment, reopened.deployment)
  assert.deepEqual(value.versions, { [service]: reopened.accepted.candidate.versionId })
  assert.deepEqual(rows[9].proof.versions, value.versions); assert.equal(rows[9].proof.status, 'passed')
  assert.equal(rows[9].proof.evidenceSHA256, value.publicEvidencePin)
  recheckNteHTTP({ proof: { path: path.join(directory, 'public/result.json'), pin: value.publicEvidencePin },
    origin: 'https://gachia.com', references: publicReferences(evidence) })
  return { value, directory, evidence, rows, ...reopened }
}

export function assertAzurPromiliaSourceTransition(value: any, previous: any, completion: any, candidateSources: any[]) {
  assert.equal(previous.allOwnersCurrent, true, 'Complete current five-owner source required')
  assert.equal(value.kind, 'nte_azur_editorial_source_index_v1'); assert.equal(value.schemaVersion, 1)
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false)
  assert.equal(value.newPublicationAuthorized, false)
  assert.equal(completion.status, 'production_accepted'); assert.equal(completion.policy, AZUR_PROMILIA_INDEPENDENT_POLICY)
  assert.equal(completion.executorCI.status, 'full_exact_ci_passed')
  assert(/^[a-f0-9]{40}$/.test(completion.executorCI.commit))
  assert.deepEqual(value.executorCI, completion.executorCI); assert.equal(value.sourceCommit, completion.executorCI.commit)
  assert.equal(previous.sources.length, 115, 'Complete 115-source baseline required')
  assert.deepEqual(candidateSources.map(row => row.sourcePath), previous.sources.map((row: any) => row.sourcePath), 'Incomplete candidate sources')
  azurPromiliaGuidePairContract(previous.sources, candidateSources)
  assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous.owners).sort())
  assert.deepEqual(value.router, previous.router)
  for (const name of Object.keys(previous.owners)) if (name !== owner) assert.deepEqual(value.owners[name], previous.owners[name])
  const candidate = completion.accepted.candidate, row = value.owners[owner]
  assert.equal(completion.accepted.recovery.moduleSHA256, previous.owners[owner].moduleSHA256, 'Recovery must retain exact current Azur runtime')
  assert.equal(row.owner, owner); assert.equal(row.service, service); assert.equal(row.versionId, candidate.versionId)
  assert.equal(row.moduleSHA256, candidate.moduleSHA256); assert.deepEqual(row.moduleProof, candidate.moduleProof)
  assertTopology(previous.baseline, value.baseline, { [service]: candidate.versionId })
  assert.equal(value.baseline.services[service].id, completion.deployment.deploymentId)
}

export async function readAzurPromiliaSourceIndex(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32, 'Azur source ancestry exceeds its bound')
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'source-index.json'))
  const completed = await readCompletedAzurPromiliaRelease(value.completion, depth + 1), e = completed.evidence
  assert.deepEqual(value.previousSourceIndex, e.value.sourceIndex)
  assertAzurPromiliaSourceTransition(value, e.sources, completed.value, e.candidateSources)
  assert.deepEqual(migrationPinned(value.active), e.candidateSources)
  assert.equal(value.owners[owner].directory, path.join(directory, owner))
  assertModuleVersionIdentity(value.owners[owner].version, completed.modules.candidate.version)
  assert.deepEqual(artifactFiles(value.owners[owner].directory), artifactFiles(path.join(e.directory, owner, 'candidate/artifact'))
    .map((row: any) => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: completed.accepted.candidate.moduleSHA256 } : row))
  for (const row of Object.values(value.owners) as any[]) {
    await readUnifiedSourceOwner(row); assert.equal(activeVersion(value.baseline, row.service), row.versionId)
    assertModuleVersionIdentity(row.version, migrationPinned(value.observation.versions[row.owner]))
  }
  assert.deepEqual(migrationPinned(value.observation.after), value.baseline)
  assertTopology(migrationPinned(value.observation.before), value.baseline)
  recheckNteHTTP({ proof: { path: path.join(directory, 'public/result.json'), pin: value.observation.publicAcceptance.evidenceSHA256 },
    origin: 'https://gachia.com', references: publicReferences(e) })
  return { ...e.sources, value, owners: value.owners, baseline: value.baseline, sources: e.candidateSources,
    workspace: e.workspace, allOwnersCurrent: true, ancestors: [...e.sources.ancestors, value.executorCI] }
}

// This continuation performs only cloud reads and local evidence creation.
export async function advanceAzurPromiliaSources(input: { completion: Proof; directory: string; reader: any }) {
  const completed = await readCompletedAzurPromiliaRelease(input.completion), e = completed.evidence
  const directory = path.resolve(input.directory); assert(!existsSync(directory)); mkdirSync(directory, { mode: 0o700 })
  try {
    const before = await input.reader.snapshot(), candidate = completed.accepted.candidate
    assertTopology(e.sources.baseline, before, { [service]: candidate.versionId })
    assert.equal(before.services[service].id, completed.deployment.deploymentId)
    const target = path.join(directory, owner), original = path.join(e.directory, owner, 'candidate/artifact')
    cpSync(original, target, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false })
    writeFileSync(path.join(target, 'worker.js'), completed.modules.candidate.code, { mode: 0o600 })
    const module = completed.modules.candidate, owners = structuredClone(e.sources.owners)
    owners[owner] = { owner, service, versionId: candidate.versionId, directory: target, artifactSHA256: treePin(target),
      modulePath: module.receipt.archive.path, archiveSHA256: module.receipt.archive.pin, moduleSHA256: candidate.moduleSHA256,
      version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: candidate.moduleProof, moduleContext: module.receipt.context }
    const versions: Record<string, Proof> = {}
    for (const [name, row] of Object.entries(owners) as [string, any][]) {
      await readUnifiedSourceOwner(row)
      const version = await input.reader.version(row.service, row.versionId)
      assertModuleVersionIdentity(row.version, version); versions[name] = migrationSave(directory, name + '-version.json', version)
    }
    assertModuleVersionIdentity(e.sources.router.version, await input.reader.version('gachia-router', e.sources.router.versionId))
    const publicAcceptance = await verifyNteHTTP({ origin: 'https://gachia.com', references: publicReferences(e),
      directory: path.join(directory, 'public'), request: input.reader.publicRequest })
    const after = await input.reader.snapshot(); assertTopology(before, after)
    const value = { schemaVersion: 1, kind: 'nte_azur_editorial_source_index_v1', status: 'published_sources_observed',
      completion: input.completion, previousSourceIndex: e.value.sourceIndex, sourceCommit: e.value.sourceCommit,
      executorCI: completed.value.executorCI, owners, router: e.sources.router, active: migrationSave(directory, 'active.json', e.candidateSources),
      baseline: after, observation: { before: migrationSave(directory, 'before.json', before), after: migrationSave(directory, 'after.json', after),
        versions, publicAcceptance, observedAt: Date.now() }, cloudWrites: false, newPublicationAuthorized: false }
    assertAzurPromiliaSourceTransition(value, e.sources, completed.value, e.candidateSources)
    const proof = migrationSave(directory, 'source-index.json', value)
    await readAzurPromiliaSourceIndex(proof)
    return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: String(error), cloudWrites: false }); throw error }
}
