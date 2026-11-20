import assert from 'node:assert/strict'
import type { Payload, PayloadRequest } from 'payload'
import { digest, MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { canonical } from './record-mapping'
import { GENSHIN_INTAKE_PATHS, prepareGenshinIntakeBatch, resumeGenshinIntake,
  type GenshinIntakeInput, type GenshinIntakePlan } from './genshin-bounded-intake'

export const GENSHIN_STAGE_VERSION = 'genshin-structural-stage-v1'

// Reuse the existing immutable, non-editorial collections. No schema change,
// synthetic import baseline, content-record update, or publication permission.
export function prepareGenshinStructuralStage(plan: GenshinIntakePlan, input: GenshinIntakeInput) {
  const resume = resumeGenshinIntake(plan, input)
  assert.equal(resume.pendingCompatible.length, 0, 'Save compatible drafts before staging structural proposals')
  const batch = prepareGenshinIntakeBatch(plan, input, { keys: resume.pendingStructural })
  const records = batch.records.map(entry => {
    assert(!entry.existingEditorCompatible && entry.draft !== null)
    const envelope = { kind: GENSHIN_STAGE_VERSION, intakeKey: plan.intakeKey, sourceIndex: input.sourceIndex,
      candidateProof: input.candidateProof, cmsProof: input.cmsProof, entry,
      recovery: batch.recovery.find(row => row.key === entry.key)!, hold: true, publishable: false }
    const candidateText = canonical(envelope)
    assert(Buffer.byteLength(candidateText) <= MAX_SNAPSHOT_BYTES, 'Staged record exceeds snapshot budget')
    return { key: entry.key, stableKey: `genshin-staged:${entry.key}`, revisionKey: digest(candidateText),
      gameKey: 'genshin', family: entry.family, legacyId: entry.to, sourcePath: entry.sourcePath,
      mappingLevel: 'structured-fields' as const, hold: true, translations: [], faqs: [],
      assetReference: { category: null, legacyId: null, url: null }, rawRecord: canonical(entry.draft),
      reviewText: canonical({ action: entry.action, from: entry.from, to: entry.to, changes: entry.changes,
        changeClasses: entry.changeClasses, renames: input.renames, requiredReleaseContracts: plan.requiredReleaseContracts }), candidateText }
  })
  const manifest = { kind: GENSHIN_STAGE_VERSION, intakeKey: plan.intakeKey, batchKey: batch.batchKey,
    sourceIndex: input.sourceIndex, candidateProof: input.candidateProof, cmsProof: input.cmsProof,
    alreadyApplied: resume.alreadyApplied, records: records.map(({ key, revisionKey }) => ({ key, revisionKey })),
    hold: true, publishable: false, contentRecordWrites: 0, sourceAdvanced: false }
  return { stageKey: digest(canonical(manifest)), policyDigest: digest(canonical(plan.requiredReleaseContracts)), manifest, records }
}
export type GenshinStructuralStage = ReturnType<typeof prepareGenshinStructuralStage>

function projection<Row extends object>(row: Row, expected: Record<string, unknown>) {
  const value = Object.fromEntries(Object.keys(expected).map(key => [key, row[key as keyof Row]]))
  // Payload adds IDs to nested arrays. These stages deliberately have none.
  return canonical(value)
}
function storedData(row: GenshinStructuralStage['records'][number]) {
  const { key: _key, ...data } = row
  return data
}
const batchData = (stage: GenshinStructuralStage) => ({ batchKey: stage.stageKey, mapperVersion: GENSHIN_STAGE_VERSION,
  policyDigest: stage.policyDigest, recordCount: stage.records.length, manifest: canonical(stage.manifest) })

async function verifyLiveCMS(payload: Payload, input: GenshinIntakeInput, req?: Partial<PayloadRequest>) {
  const found = await payload.find({ collection: 'content-records', req, overrideAccess: true, draft: true,
    locale: 'all', fallbackLocale: false, depth: 0, pagination: false,
    where: { legacyPath: { in: GENSHIN_INTAKE_PATHS } } })
  const sorted = (rows: { id: string | number }[]) => [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))
  assert.equal(canonical(sorted(found.docs)), canonical(sorted(input.cms)), 'Live CMS changed since post-write capture; recapture before staging')
}

export async function readGenshinStructuralStage(payload: Payload, stage: GenshinStructuralStage, req?: Partial<PayloadRequest>) {
  const batch = (await payload.find({ collection: 'migration-batches', req, overrideAccess: true,
    limit: 2, depth: 0, where: { batchKey: { equals: stage.stageKey } } })).docs
  assert.equal(batch.length, 1, 'Complete structural intake not found')
  assert.equal(projection(batch[0], batchData(stage)), canonical(batchData(stage)), 'Stored structural manifest mismatch')
  const rows = (await payload.find({ collection: 'migration-records', req, overrideAccess: true, depth: 0,
    limit: 200, pagination: false, where: { revisionKey: { in: stage.records.map(row => row.revisionKey) } } })).docs
  assert.equal(rows.length, stage.records.length, 'Incomplete structural intake')
  const byRevision = new Map(rows.map(row => [row.revisionKey, row]))
  for (const expected of stage.records) {
    const row = byRevision.get(expected.revisionKey); assert(row, 'Missing structural revision')
    assert.equal(projection(row, storedData(expected)), canonical(storedData(expected)), 'Stored structural revision mismatch')
  }
  return { stageKey: stage.stageKey, records: rows.length, held: true, publishable: false }
}

export async function importGenshinStructuralStage(payload: Payload, plan: GenshinIntakePlan, input: GenshinIntakeInput) {
  const stage = prepareGenshinStructuralStage(plan, input)
  const transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'Structural staging requires a real transaction')
  const req = { transactionID }
  let created = 0, reused = 0
  try {
    await verifyLiveCMS(payload, input, req)
    const complete = await payload.count({ collection: 'migration-batches', req, overrideAccess: true,
      where: { batchKey: { equals: stage.stageKey } } })
    if (complete.totalDocs) {
      // An uncertain network/process result is reconciled by reads alone.
      await readGenshinStructuralStage(payload, stage, req)
      reused = stage.records.length
    } else {
      for (const row of stage.records) {
        const previous = (await payload.find({ collection: 'migration-records', req, overrideAccess: true, depth: 0,
          limit: 1, where: { revisionKey: { equals: row.revisionKey } } })).docs[0]
        const data = storedData(row)
        if (previous) {
          assert.equal(projection(previous, data), canonical(data), 'Existing staged revision differs')
          reused++
        } else {
          await payload.create({ collection: 'migration-records', req, overrideAccess: true, data })
          created++
        }
      }
      await payload.create({ collection: 'migration-batches', req, overrideAccess: true, data: batchData(stage) })
      await readGenshinStructuralStage(payload, stage, req)
    }
    await verifyLiveCMS(payload, input, req)
    await payload.db.commitTransaction(transactionID)
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  return { ...await readGenshinStructuralStage(payload, stage), created, reused,
    alreadyAppliedSkipped: stage.manifest.alreadyApplied.length, contentRecordWrites: 0,
    approvalWrites: 0, sourceAdvanced: false, productionDeployments: 0 }
}
