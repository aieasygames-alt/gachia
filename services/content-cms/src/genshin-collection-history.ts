import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { activeVersion, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationPinned } from '../../../scripts/genshin-migration-http.mjs'
import { recheckNteHTTP, recheckNteReferences } from '../../../scripts/nte-release-http.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { readUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { assertGenshinReviewedExport, GENSHIN_COLLECTION_POLICY } from './genshin-collection-publication'
import { verifyMainConsumerSource } from './main-consumer-source'
type Proof = { path: string; pin: string }
export async function readGenshinCollectionSource(proof: Proof, readPrevious: (proof: Proof, depth: number) => Promise<any>, depth: number) {
  const value = migrationPinned(proof), c = migrationPinned(value.completion), q = migrationPinned(c.qualification)
  assert.equal(value.kind, 'nte_genshin_reviewed_collection_source_index_v1')
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  assert.equal(c.policy, GENSHIN_COLLECTION_POLICY); assert.equal(c.status, 'production_accepted')
  const previous = await readPrevious(value.previousSourceIndex, depth + 1)
  assert.deepEqual(c.parent, value.previousSourceIndex); assert.deepEqual(q.parent, c.parent)
  const bytes = readFileSync(q.export.path); assert.equal(digest(bytes), q.export.pin)
  const exported = JSON.parse(gunzipSync(bytes).toString()).result, input = migrationPinned(q.input)
  const qualified = assertGenshinReviewedExport(input, exported)
  assert.deepEqual(exported.recoverySources, previous.sources)
  assert.deepEqual(migrationPinned(value.active), qualified.sources)
  assert.equal(q.exportKey, qualified.exportKey); assert.equal(c.exportKey, qualified.exportKey)
  assert.equal(q.commit, c.commit); assert.equal(value.sourceCommit, c.commit)
  assert.deepEqual(value.executorCI, c.executorCI); assert.equal(c.executorCI.commit, c.commit)
  assert.equal(c.executorCI.status, 'full_exact_ci_passed')
  assert.deepEqual(value.router, previous.router)
  assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(previous.owners).sort())
  for (const owner of Object.keys(previous.owners)) if (owner !== 'genshin') assert.deepEqual(value.owners[owner], previous.owners[owner])
  assertTopology(previous.baseline, c.before)
  assert.deepEqual(c.promoted, { 'gachia-game-genshin': c.accepted.candidate.versionId })
  assertTopology(c.before, c.after, c.promoted); assert.deepEqual(value.baseline, c.after)
  assert.equal(c.accepted.recovery.moduleSHA256, previous.owners.genshin.moduleSHA256)
  assert.equal(value.baseline.services['gachia-game-genshin'].id, c.deployment.deploymentId)
  assert.equal(digest(readFileSync(c.journal.path)), c.journal.pin)
  const journal = readFileSync(c.journal.path, 'utf8').trim().split('\n').map((line: string) => JSON.parse(line))
  assert.deepEqual(journal.map((r: any) => r.phase), ['deployment_intent', 'deployed', 'production_accepted'])
  assert.equal(journal[0].versionId, c.accepted.candidate.versionId); assert.deepEqual(journal[1].deployment, c.deployment)
  const owner = value.owners.genshin
  assert.equal(activeVersion(value.baseline, owner.service), owner.versionId)
  assert.deepEqual(owner.moduleProof, c.accepted.candidate.moduleProof)
  assert.equal(owner.moduleSHA256, c.accepted.candidate.moduleSHA256)
  await readUnifiedSourceOwner(owner)
  assert.deepEqual(artifactFiles(owner.directory), artifactFiles(q.roles.candidate.artifact)
    .map((row: any) => row.path === 'worker.js' ? { path: row.path, type: 'file', sha256: owner.moduleSHA256 } : row))
  for (const role of ['candidate', 'recovery']) {
    const accepted = c.accepted[role], receipt = migrationPinned(accepted.moduleProof)
    await readUnifiedUploadedModule(accepted.moduleProof, { service: owner.service, versionId: accepted.versionId,
      moduleSHA256: accepted.moduleSHA256, context: receipt.context })
    assert.equal(accepted.moduleSHA256, q.roles[role].moduleSHA256)
    recheckNteHTTP({ proof: accepted.preview, origin: accepted.origin, references: recheckNteReferences(q.roles[role].local), preview: true })
  }
  recheckNteHTTP({ proof: c.publicProof, origin: 'https://gachia.com', references: recheckNteReferences(q.finalReferences) })
  for (const row of qualified.sources) assert.equal(digest(readFileSync(join(q.workspace, row.sourcePath))), row.sha256)
  verifyMainConsumerSource(q.repo, q.workspaceProof, qualified.sources)
  return { ...previous, value, owners: value.owners, baseline: value.baseline, sources: qualified.sources, workspace: q.workspace,
    allOwnersCurrent: true, ancestors: [...previous.ancestors, value.executorCI] }
}
