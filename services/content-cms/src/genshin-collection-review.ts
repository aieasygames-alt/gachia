import assert from 'node:assert/strict'
import type { Payload, PayloadRequest } from 'payload'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { GENSHIN_INTAKE_PATHS, reconcileGenshinIntake, resumeGenshinIntake, type GenshinIntakeInput } from './genshin-bounded-intake'
import { prepareGenshinStructuralStage, readGenshinStructuralStage } from './genshin-structural-stage'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import { characterSummaries } from '../../../packages/data/scripts/generate-character-summaries.mjs'

export { GENSHIN_COLLECTION_REVIEW, assertGenshinReviewCMS } from './genshin-review-store'
import { GENSHIN_COLLECTION_REVIEW, assertGenshinReviewCMS, cmsKey } from './genshin-review-store'

export function prepareGenshinCollectionReview(input: GenshinIntakeInput) {
  const plan = reconcileGenshinIntake(input), resume = resumeGenshinIntake(plan, input)
  const stage = prepareGenshinStructuralStage(plan, input)
  assert(plan.intakeReady && !resume.pendingCompatible.length)
  // A draft outside the selected proposals must not hitch a ride on a reviewed
  // collection. Published editorial deltas (for example Hu Tao) remain intact.
  for (const source of plan.draftOverlays) {
    const family = source.sourcePath.endsWith('/raw-character-materials.json') ? 'character-materials'
      : source.sourcePath.endsWith('/raw-characters.json') ? 'characters' : 'materials'
    const key = family === 'character-materials' ? 'characterId' : 'id'
    const changed = new Set(plan.entries.filter(entry => entry.family === family).map(entry => entry.to))
    const active = new Map(JSON.parse(input.active.find(row => row.sourcePath === source.sourcePath)!.text).map((row: Record<string, unknown>) => [row[key], row]))
    for (const row of JSON.parse(source.text)) if (!changed.has(row[key]))
      assert.equal(canonical(row), canonical(active.get(row[key])), 'Unreviewed CMS draft outside the collection proposals')
  }
  // Review ALL proposals, including the 42 already saved drafts. Nothing grants
  // blanket numeric, identity, source or new-entity permission to the old editor.
  const items = plan.entries.map(entry => {
    const candidateText = canonical({ kind: GENSHIN_COLLECTION_REVIEW, inputKey: plan.inputKey, stageKey: stage.stageKey,
      sourceIndex: input.sourceIndex, candidateProof: input.candidateProof, cmsProof: input.cmsProof,
      renames: input.renames, entry })
    return { stableKey: `genshin-review:${entry.key}`, revisionKey: digest(candidateText), gameKey: 'genshin',
      family: `collection-review/${entry.family}`, legacyId: entry.to, sourcePath: entry.sourcePath,
      mappingLevel: 'structured-fields' as const, hold: true, translations: [], faqs: [],
      assetReference: { category: null, legacyId: null, url: null }, rawRecord: canonical(entry.draft),
      reviewText: canonical({ key: entry.key, action: entry.action, from: entry.from, to: entry.to,
        changeClasses: entry.changeClasses, changes: entry.changes, cmsVsImport: entry.cmsVsImport,
        publicVsImport: entry.publicVsImport, evidence: input.candidateProof, identityEvidence: input.renames }), candidateText }
  })
  const manifest = { kind: GENSHIN_COLLECTION_REVIEW, inputKey: plan.inputKey, intakeKey: plan.intakeKey,
    stageKey: stage.stageKey, sourceIndex: input.sourceIndex, candidateProof: input.candidateProof, cmsProof: input.cmsProof,
    cmsKey: cmsKey(input.cms), sourcePins: plan.sourcePins, candidatePins: plan.candidatePins,
    items: items.map(({ stableKey, revisionKey }) => ({ stableKey, revisionKey })),
    alreadySavedDrafts: resume.alreadyApplied, preserved: plan.preserved, renames: input.renames,
    scope: 'complete-three-source-collection', productionReady: false }
  return { runKey: digest(canonical(manifest)), manifest, items, stage, plan }
}
export type GenshinCollectionReview = ReturnType<typeof prepareGenshinCollectionReview>
const batchData = (review: GenshinCollectionReview) => ({ batchKey: review.runKey, mapperVersion: GENSHIN_COLLECTION_REVIEW,
  policyDigest: digest(GENSHIN_COLLECTION_REVIEW), recordCount: review.items.length, manifest: canonical(review.manifest) })
function exact(row: object, expected: object) {
  assert.equal(canonical(Object.fromEntries(Object.keys(expected).map(key => [key, row[key as keyof typeof row]]))), canonical(expected), 'Stored collection review projection mismatch')
}
export async function readGenshinCollectionReview(payload: Payload, review: GenshinCollectionReview, req?: Partial<PayloadRequest>) {
  await readGenshinStructuralStage(payload, review.stage, req)
  const batches = (await payload.find({ collection: 'migration-batches', req, overrideAccess: true, depth: 0,
    limit: 2, where: { batchKey: { equals: review.runKey } } })).docs
  assert.equal(batches.length, 1, 'Complete collection review manifest required'); exact(batches[0], batchData(review))
  const rows = (await payload.find({ collection: 'migration-records', req, overrideAccess: true, depth: 0, pagination: false,
    where: { revisionKey: { in: review.items.map(item => item.revisionKey) } } })).docs
  assert.equal(rows.length, review.items.length, 'Incomplete collection review')
  const index = new Map(rows.map(row => [row.revisionKey, row]))
  for (const item of review.items) { const row = index.get(item.revisionKey); assert(row); exact(row, item) }
  return rows
}
export async function stageGenshinCollectionReview(payload: Payload, input: GenshinIntakeInput) {
  const review = prepareGenshinCollectionReview(input), transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'Collection review requires a real transaction')
  const req = { transactionID }; let created = 0
  try {
    await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
    await readGenshinStructuralStage(payload, review.stage, req)
    const prior = await payload.count({ collection: 'migration-batches', req, overrideAccess: true, where: { batchKey: { equals: review.runKey } } })
    if (!prior.totalDocs) {
      for (const item of review.items) {
        await payload.create({ collection: 'migration-records', req, overrideAccess: true, data: item }); created++
      }
      await payload.create({ collection: 'migration-batches', req, overrideAccess: true, data: batchData(review) })
    }
    await readGenshinCollectionReview(payload, review, req)
    await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
    await payload.db.commitTransaction(transactionID)
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  return { runKey: review.runKey, created, reused: review.items.length - created, total: review.items.length,
    alreadySavedDrafts: review.manifest.alreadySavedDrafts.length, contentRecordWrites: 0, productionReady: false }
}


export async function exportGenshinCollection(payload: Payload, input: GenshinIntakeInput) {
  const review = prepareGenshinCollectionReview(input), transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'Collection export requires a real transaction')
  const req = { transactionID }
  try {
    const rows = await readGenshinCollectionReview(payload, review, req)
    await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
    const decisions = (await payload.find({ collection: 'genshin-review-decisions', req, overrideAccess: true, depth: 0, pagination: false,
      where: { runKey: { equals: review.runKey } } })).docs
    assert.equal(decisions.length, review.items.length, 'Every proposal requires an independent review decision')
    for (const item of rows) {
      const matches = decisions.filter(decision => decision.revisionKey === item.revisionKey)
      assert.equal(matches.length, 1, 'Missing or duplicate collection decision')
      const decision = matches[0]
      assert.equal(decision.action, 'accept-export', `Rejected proposal: ${item.stableKey}`)
      assert.equal(decision.reviewItem, item.id); assert.equal(decision.cmsKey, review.manifest.cmsKey)
      assert.equal(decision.decisionKey, digest(`${review.runKey}\0${item.revisionKey}`))
      assert(decision.actorID && decision.actorEmail && decision.note.trim().length >= 10, 'Unattributed review decision')
    }
    const complete = new Map(input.active.map(row => [row.sourcePath, row]))
    for (const source of review.plan.draftOverlays) complete.set(source.sourcePath, source)
    // This public source is derived from the reviewed characters. Keeping its
    // old bytes would hide the two new characters in Main membership and fail
    // the frozen workspace's independent generator check.
    const summaryPath = 'packages/data/games/genshin/raw-character-summaries.json'
    assert(complete.has(summaryPath), 'Published character summary baseline required')
    const summaryText = JSON.stringify(characterSummaries('genshin', JSON.parse(complete.get(GENSHIN_INTAKE_PATHS[2])!.text)), null, 2) + '\n'
    complete.set(summaryPath, { sourcePath: summaryPath, text: summaryText, sha256: digest(summaryText) })
    const sources = [...complete.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
    const dependency = auditMaterialReleaseDependencies('genshin', sources)
    assert(dependency.dependencyClosureComplete, 'Incomplete collection dependencies')
    const changedPaths = sources.filter(row => input.active.find(a => a.sourcePath === row.sourcePath)!.sha256 !== row.sha256).map(row => row.sourcePath)
    assert(changedPaths.every(sourcePath => GENSHIN_INTAKE_PATHS.includes(sourcePath) || sourcePath === summaryPath), 'Unbounded collection export')
    await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
    const manifest = { contract: 'genshin-reviewed-collection-export-v1', runKey: review.runKey, stageKey: review.stage.stageKey,
      inputKey: review.manifest.inputKey, sourceIndex: input.sourceIndex, cmsKey: review.manifest.cmsKey,
      sourcePins: sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), changedPaths,
      derivedSources: [{ sourcePath: summaryPath, derivedFrom: GENSHIN_INTAKE_PATHS[2], generator: 'generate-character-summaries.mjs' }],
      decisions: decisions.map(({ decisionKey, revisionKey, actorID, actorEmail, action, note }) => ({ decisionKey, revisionKey, actorID, actorEmail, action, note })).sort((a, b) => a.revisionKey.localeCompare(b.revisionKey)),
      dependency: { auditKey: dependency.auditKey, materialDefinitions: dependency.materialDefinitions,
        materialReferences: dependency.materialReferences, complete: dependency.dependencyClosureComplete },
      recovery: { sourcePins: review.plan.sourcePins, policy: 'exact-published-A-with-legacy-dependencies', newEntities: review.plan.entries.filter(row => row.action === 'new-entity').map(row => row.key), renames: input.renames },
      contentRecordWrites: 0, productionReady: false, activationSupported: false }
    await payload.db.commitTransaction(transactionID)
    return { manifest: { ...manifest, exportKey: digest(canonical(manifest)) }, sources, overlays: review.plan.draftOverlays, recoverySources: input.active }
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}
