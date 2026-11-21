import assert from 'node:assert/strict'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { prepareGenshinCollectionReview } from './genshin-collection-review'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import { characterSummaries } from '../../../packages/data/scripts/generate-character-summaries.mjs'
import type { GenshinIntakeInput } from './genshin-bounded-intake'

export const GENSHIN_COLLECTION_POLICY = 'genshin-reviewed-collection-production-v1'
// A separate publication gate: accept-export alone never authorizes a deployment.
export function assertGenshinReviewedExport(input: GenshinIntakeInput, exported: any) {
  const review = prepareGenshinCollectionReview(input), m = exported.manifest
  assert.equal(m.contract, 'genshin-reviewed-collection-export-v1')
  const { exportKey, ...unsigned } = m
  assert.equal(exportKey, digest(canonical(unsigned)), 'Collection export identity changed')
  assert.equal(m.runKey, review.runKey); assert.equal(m.stageKey, review.stage.stageKey)
  assert.equal(m.inputKey, review.manifest.inputKey); assert.equal(m.cmsKey, review.manifest.cmsKey)
  assert.deepEqual(m.sourceIndex, input.sourceIndex)
  assert.equal(m.productionReady, false); assert.equal(m.activationSupported, false)
  assert.equal(m.contentRecordWrites, 0)
  assert.equal(m.decisions.length, review.items.length)
  assert.equal(new Set(m.decisions.map((d: any) => d.revisionKey)).size, review.items.length)
  for (const item of review.items) {
    const d = m.decisions.find((d: any) => d.revisionKey === item.revisionKey)
    assert(d && d.action === 'accept-export', 'Every exact revision needs acceptance')
    assert.equal(d.decisionKey, digest(`${review.runKey}\0${item.revisionKey}`))
    assert(d.actorID && d.actorEmail && d.note.trim().length >= 10, 'Missing review attribution')
  }
  const expected = new Map(input.active.map(row => [row.sourcePath, row]))
  for (const row of review.plan.draftOverlays) expected.set(row.sourcePath, row)
  const summaryPath = 'packages/data/games/genshin/raw-character-summaries.json'
  const charactersPath = 'packages/data/games/genshin/raw-characters.json'
  const text = JSON.stringify(characterSummaries('genshin', JSON.parse(expected.get(charactersPath)!.text)), null, 2) + '\n'
  expected.set(summaryPath, { sourcePath: summaryPath, text, sha256: digest(text) })
  const sources = [...expected.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  assert.deepEqual(exported.sources, sources, 'Export contains unreviewed or incomplete source bytes')
  assert.deepEqual(exported.overlays, review.plan.draftOverlays)
  assert.deepEqual(exported.recoverySources, input.active, 'Recovery must retain exact published A')
  assert.deepEqual(m.sourcePins, sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })))
  assert.deepEqual(m.changedPaths, sources.filter(row => input.active.find(a => a.sourcePath === row.sourcePath)!.sha256 !== row.sha256).map(row => row.sourcePath))
  assert.deepEqual(m.derivedSources, [{ sourcePath: summaryPath, derivedFrom: charactersPath, generator: 'generate-character-summaries.mjs' }])
  const audit = auditMaterialReleaseDependencies('genshin', sources)
  assert(audit.dependencyClosureComplete)
  assert.deepEqual(m.dependency, { auditKey: audit.auditKey, materialDefinitions: audit.materialDefinitions,
    materialReferences: audit.materialReferences, complete: true })
  assert.deepEqual(m.recovery, { sourcePins: review.plan.sourcePins, policy: 'exact-published-A-with-legacy-dependencies',
    newEntities: review.plan.entries.filter(row => row.action === 'new-entity').map(row => row.key), renames: input.renames })
  return { review, sources, exportKey, policy: GENSHIN_COLLECTION_POLICY }
}
