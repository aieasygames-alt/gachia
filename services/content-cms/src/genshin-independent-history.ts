import assert from 'node:assert/strict'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { activeVersion, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { readCompletedGenshinMigration } from '../../../scripts/genshin-migration-source-advance.mjs'
import { GENSHIN_MIGRATION_ORDER, assertGenshinMigrationTopology } from '../../../scripts/genshin-production-migration.mjs'
import { GENSHIN_INDEPENDENT_POLICY } from '../../../scripts/genshin-independent-release.mjs'
import { migrationJSON, migrationPinned, migrationPreviewOrigin, migrationSave, recheckMigrationHTTP, verifyMigrationHTTP } from '../../../scripts/genshin-migration-http.mjs'
import { readUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'

type Proof = { path: string; pin: string }
const service = 'gachia-game-genshin', UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
export async function readGenshinIndependentSourceIndex(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32, 'Independent source ancestry exceeds its bound')
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'source-index.json')); assert.equal(value.status, 'published_sources_observed')
  assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  if (value.kind.startsWith('nte_')) {
    const sources = await (await import('./nte-release-history')).readNteSourceIndex(proof, depth)
    assert.equal(sources.allOwnersCurrent, true, 'Full current published owner topology required')
    const genshin = await readUnifiedSourceOwner(sources.owners.genshin)
    return { ...sources, genshinCode: genshin.code }
  }
  let sources: any[], workspace: string, routerCode: Buffer, ancestors: any[], originalPublication: Proof, originalSourceIndex: Proof, baseline: any
  if (value.kind === 'genshin_independent_published_source_index') {
    const completed: any = await readCompletedGenshinMigration(value.completion), e = completed.evidence
    assert.deepEqual(value.originalSourceIndex, e.value.sourceIndex); assert.deepEqual(value.executorCI, completed.value.executorCI)
    assert.deepEqual(value.continuationExecutorCI, completed.value.continuationExecutorCI)
    assert.deepEqual(value.finalizationExecutorCI, completed.value.finalizationExecutorCI)
    assert.deepEqual(value.readOnlyExecutorCI, completed.value.readOnlyExecutorCI)
    sources = e.sources; workspace = e.workspace; routerCode = completed.modules.router.candidate.code
    originalPublication = e.index.publication; originalSourceIndex = e.value.sourceIndex
    ancestors = [completed.value.executorCI, ...(completed.value.continuationExecutorCI ? [completed.value.continuationExecutorCI] : []),
      ...(completed.value.request.preflightStop ? [completed.value.request.preflightStop.executorCI] : []), ...(completed.value.finalizationExecutorCI ? [completed.value.finalizationExecutorCI] : []),
      ...(completed.value.readOnlyExecutorCI ? [completed.value.readOnlyExecutorCI] : [])]
    baseline = migrationPinned(value.baseline)
    const deployed = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => [owner, completed.accepted[owner].candidate.versionId]))
    assertGenshinMigrationTopology(e.value.baseline, baseline, { configured: [...GENSHIN_MIGRATION_ORDER], deployed })
    assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(e.index.owners).sort())
    for (const owner of Object.keys(value.owners)) {
      const row = value.owners[owner]
      if (!['genshin', 'main'].includes(owner)) { assert.deepEqual(row, e.index.owners[owner]); continue }
      const accepted = completed.accepted[owner].candidate
      assert.equal(row.versionId, accepted.versionId); assert.equal(row.moduleSHA256, accepted.moduleSHA256); assert.deepEqual(row.moduleProof, accepted.moduleProof)
      assert.equal(row.directory, path.join(directory, owner)); assertModuleVersionIdentity(row.version, completed.modules[owner].candidate.version)
    }
    assert.deepEqual(value.router.moduleProof, completed.accepted.router.candidate.moduleProof)
    assert.equal(value.router.versionId, deployed.router); assertModuleVersionIdentity(value.router.version, completed.modules.router.candidate.version)
    for (const owner of GENSHIN_MIGRATION_ORDER) assert.equal(baseline.services[e.value.owners[owner].service].id, completed.deployments[owner].deploymentId)
    recheckMigrationHTTP({ directory: path.join(directory, 'public'), pin: value.observation.publicAcceptance.evidenceSHA256, origin: 'https://gachia.com',
      references: migrationPinned(e.value.finalReferences), owner: 'router', role: 'candidate', expected: e.expected, bases: e.bases })
  } else {
    assert.equal(value.kind, 'genshin_independent_editorial_source_index')
    const completed = await readCompletedGenshinIndependentRelease(value.completion, depth), e = completed.evidence
    assert.deepEqual(value.previousSourceIndex, e.value.sourceIndex); assert.deepEqual(value.executorCI, completed.value.executorCI)
    sources = e.candidateSources; workspace = e.workspace; routerCode = e.sources.routerCode
    originalPublication = e.sources.originalPublication; originalSourceIndex = e.sources.originalSourceIndex
    ancestors = [...e.sources.ancestors, completed.value.executorCI]
    baseline = value.baseline
    const previous = e.sources.owners
    assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous).sort()); assert.deepEqual(value.router, e.sources.router)
    for (const owner of Object.keys(previous).filter(owner => owner !== 'genshin')) assert.deepEqual(value.owners[owner], previous[owner])
    const row = value.owners.genshin, accepted = completed.value.accepted.candidate
    assert.equal(row.directory, path.join(directory, 'genshin')); assert.equal(row.versionId, accepted.versionId)
    assert.equal(row.moduleSHA256, accepted.moduleSHA256); assert.deepEqual(row.moduleProof, accepted.moduleProof); assertModuleVersionIdentity(row.version, completed.modules.candidate.version)
    assertTopology(e.sources.baseline, value.baseline, { [service]: accepted.versionId }); assert.equal(value.baseline.services[service].id, completed.value.deployment.deploymentId)
    recheckMigrationHTTP({ directory: path.join(directory, 'public'), pin: value.observation.publicAcceptance.evidenceSHA256, origin: 'https://gachia.com',
      references: migrationPinned(e.value.finalReferences), owner: 'router', role: 'candidate', expected: e.expected, bases: e.bases })
  }
  assert.deepEqual(migrationPinned(value.active), sources, 'Incomplete or substituted active sources')
  assert.deepEqual(migrationPinned(value.observation.after), baseline)
  assertTopology(migrationPinned(value.observation.before), baseline)
  const modules: Record<string, any> = {}
  for (const [owner, row] of Object.entries(value.owners) as [string, any][]) {
    modules[owner] = await readUnifiedSourceOwner(row); assert.equal(activeVersion(baseline, row.service), row.versionId)
  }
  return { value, owners: value.owners, router: value.router, baseline, sources, workspace, routerCode, genshinCode: modules.genshin.code,
    ancestors, originalPublication, originalSourceIndex, allOwnersCurrent: true }
}

export async function readCompletedGenshinIndependentRelease(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32)
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'completion.json')); assert.equal(value.kind, 'genshin_independent_editorial_completion')
  assert.equal(value.status, 'production_accepted'); assert.equal(value.policy, GENSHIN_INDEPENDENT_POLICY); assert.equal(value.sourceAdvanced, false)
  const { verifyGenshinIndependentBundle } = await import('./genshin-independent-bundle')
  const evidence = await verifyGenshinIndependentBundle(value.bundle, depth)
  assert.equal(value.executorCI.commit, evidence.value.sourceCommit); assert.equal(value.executorCI.status, 'full_exact_ci_passed')
  assert.deepEqual(value.bundle, value.request.bundle); assert.equal(value.request.executorRunID, value.executorCI.runID)
  assert.equal(value.releaseKey, digest(migrationJSON({ policy: GENSHIN_INDEPENDENT_POLICY, bundle: value.bundle, executorCI: value.executorCI,
    ...(value.request.previewProxy ? { previewProxy: value.request.previewProxy } : {}), ...(value.request.publicProxy ? { publicProxy: value.request.publicProxy } : {}) })))
  assert.equal(value.journal.path, path.join(directory, `genshin-independent-${value.releaseKey}.jsonl`)); assert.equal(value.journal.pin, value.journalPin)
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map(text => JSON.parse(text))
  assert.deepEqual(rows.map((row: any) => row.phase), ['baseline', 'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'production_accepted'])
  assert.deepEqual(rows[0].baseline, evidence.value.baseline); assert.deepEqual(rows[0].owners, evidence.value.owners)
  let at = -Infinity
  for (const row of rows) { assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.policy, GENSHIN_INDEPENDENT_POLICY); const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next }
  const modules: Record<string, any> = {}
  for (const [index, role] of ['recovery', 'candidate'].entries()) {
    const offset = 1 + index * 3, sealed = evidence.value.owners.genshin[role], accepted = rows[offset + 2].proof
    for (const row of rows.slice(offset, offset + 3)) { assert.equal(row.owner, 'genshin'); assert.equal(row.role, role) }
    assert.deepEqual(rows[offset].sealed, sealed); assert.equal(rows[offset].service, service); assert.equal(rows[offset + 1].versionId, accepted.versionId)
    assert(UUID.test(accepted.versionId)); assert.notEqual(accepted.versionId, evidence.value.owners.genshin.sourceVersionId)
    assert.deepEqual(value.accepted[role], accepted); assert.equal(accepted.moduleSHA256, sealed.moduleSHA256)
    modules[role] = await readUnifiedUploadedModule(accepted.moduleProof, { service, versionId: accepted.versionId, moduleSHA256: sealed.moduleSHA256,
      context: { role, transportPin: value.releaseKey, configPin: sealed.configPin } })
    assertModuleVersionIdentity(modules[role].version, migrationPinned({ path: path.join(directory, `genshin-${role}/version.json`), pin: accepted.versionPin }))
    recheckMigrationHTTP({ directory: path.join(directory, `genshin-${role}/preview`), pin: accepted.evidenceSHA256, origin: migrationPreviewOrigin(service, accepted.versionId),
      references: migrationPinned({ path: path.join(evidence.directory, `genshin/${role}/local-http/responses/references.json`), pin: sealed.referencesPin }), owner: 'genshin', role,
      expected: evidence.expected, bases: evidence.bases, preview: true })
    assert(accepted.acceptedAt <= Date.parse(rows[7].at) && Date.parse(rows[7].at) - accepted.acceptedAt < 900000)
  }
  assert.notEqual(value.accepted.candidate.versionId, value.accepted.recovery.versionId)
  assert.equal(rows[7].versionId, value.accepted.candidate.versionId); assert.equal(rows[7].service, service); assert.equal(rows[7].owner, 'genshin')
  assert(rows[7].observedAt <= Date.parse(rows[7].at) && Date.parse(rows[7].at) - rows[7].observedAt < 900000)
  assert.deepEqual(rows[8].result, value.deployment); assert.equal(value.deployment.versionId, value.accepted.candidate.versionId)
  assert.equal(value.deployment.service, service); assert.equal(value.deployment.releaseKey, value.releaseKey); assert(UUID.test(value.deployment.deploymentId))
  for (const kind of ['creation', 'verification']) {
    const bytes = readFileSync(path.join(directory, `deployment-genshin-${kind}.body`)), metadata = JSON.parse(readFileSync(path.join(directory, `deployment-genshin-${kind}.json`), 'utf8'))
    assert.equal(metadata.kind, kind); assert.equal(metadata.sha256, digest(bytes)); assert.equal(metadata.bytes, bytes.length); assert(metadata.status >= 200 && metadata.status < 300)
    const response = JSON.parse(bytes.toString()); assert.equal(response.success, true); assert.equal(response.result.id, value.deployment.deploymentId)
    if (kind === 'verification' || response.result.versions) assert.deepEqual(response.result.versions, [{ version_id: value.accepted.candidate.versionId, percentage: 100 }])
    if (kind === 'verification' || response.result.strategy) assert.equal(response.result.strategy, 'percentage')
  }
  assert.deepEqual(value.versions, { [service]: value.accepted.candidate.versionId }); assert.deepEqual(rows[9].proof.versions, value.versions)
  assert.equal(rows[9].proof.evidenceSHA256, value.publicEvidencePin); assert.equal(rows[9].proof.status, 'passed')
  recheckMigrationHTTP({ directory: path.join(directory, 'public-0-router'), pin: value.publicEvidencePin, origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences),
    owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases })
  return { value, evidence, modules, directory }
}

export async function advanceGenshinIndependentSources(input: { completion: Proof; directory: string; reader: any }) {
  const completed = await readCompletedGenshinIndependentRelease(input.completion), { evidence } = completed, directory = path.resolve(input.directory)
  mkdirSync(directory, { mode: 0o700 })
  try {
    const before = await input.reader.snapshot(), accepted = completed.value.accepted.candidate
    assertTopology(evidence.sources.baseline, before, { [service]: accepted.versionId }); assert.equal(before.services[service].id, completed.value.deployment.deploymentId)
    const owners = structuredClone(evidence.sources.owners), module = completed.modules.candidate, artifact = path.join(directory, 'genshin')
    const original = path.join(evidence.directory, 'genshin/candidate/artifact'); cpSync(original, artifact, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false })
    writeFileSync(path.join(artifact, 'worker.js'), module.code, { mode: 0o600 })
    assert.deepEqual(artifactFiles(artifact), artifactFiles(original).map((row: any) => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: accepted.moduleSHA256 } : row))
    owners.genshin = { owner: 'genshin', service, versionId: accepted.versionId, directory: artifact, artifactSHA256: treePin(artifact), modulePath: module.receipt.archive.path,
      archiveSHA256: module.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256, version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context }
    const versions: Record<string, Proof> = {}
    for (const [owner, row] of Object.entries(owners) as [string, any][]) {
      await readUnifiedSourceOwner(row); const version = await input.reader.version(row.service, row.versionId); assertModuleVersionIdentity(row.version, version)
      versions[owner] = migrationSave(directory, owner + '-version.json', version)
    }
    assertModuleVersionIdentity(evidence.sources.router.version, await input.reader.version('gachia-router', evidence.sources.router.versionId))
    const publicAcceptance = await verifyMigrationHTTP({ origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences), directory: path.join(directory, 'public'),
      owner: 'router', role: 'candidate', expected: evidence.expected, bases: evidence.bases, request: input.reader.publicRequest ?? unifiedProductionRead })
    const after = await input.reader.snapshot(); assertTopology(before, after)
    const value = { schemaVersion: 1, kind: 'genshin_independent_editorial_source_index', status: 'published_sources_observed', completion: input.completion,
      previousSourceIndex: evidence.value.sourceIndex, sourceCommit: evidence.value.sourceCommit, executorCI: completed.value.executorCI, owners, router: evidence.sources.router,
      active: migrationSave(directory, 'active.json', evidence.candidateSources), baseline: after,
      observation: { before: migrationSave(directory, 'before.json', before), after: migrationSave(directory, 'after.json', after), versions, publicAcceptance, observedAt: Date.now() },
      cloudWrites: false, newPublicationAuthorized: false }
    return { proof: migrationSave(directory, 'source-index.json', value), value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
