import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { contentUnit, editingSource, validateUnifiedRecord } from './unified-content'
import { editingProjection, publishedEditingContext } from './published-editing-guard'
import { assertGenshinReviewedExport } from './genshin-collection-publication'
import { readNteSourceIndex } from './nte-release-history'
import { readGenshinCollectionReview } from './genshin-collection-review'
import { GENSHIN_INTAKE_PATHS, type GenshinIntakeInput } from './genshin-bounded-intake'
import { readPinnedUnifiedInput } from './unified-desktop'
import { withSourceHistoryRepository } from './source-history-repository'

type Proof = { path: string; pin: string }
const pinned = (p: Proof): any => readPinnedUnifiedInput(p.path, p.pin)
const zipped = (p: Proof) => {
  const bytes = readFileSync(p.path); assert.equal(createHash('sha256').update(bytes).digest('hex'), p.pin)
  return JSON.parse(gunzipSync(bytes).toString())
}
export const GENSHIN_EDITING_SYNC = 'genshin-published-editing-sync-v1'
export const editingRowsKey = (rows: any[]) => digest(canonical([...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))))

export async function openGenshinEditingSync(deliveryProof: Proof, repository?: string) {
  const delivery = pinned(deliveryProof)
  assert.equal(delivery.kind, 'genshin-collection-production-delivery-r143')
  assert.equal(delivery.status, 'production_accepted_sources_observed')
  const sources = await (repository
    ? withSourceHistoryRepository(repository, () => readNteSourceIndex(delivery.sourceIndex))
    : readNteSourceIndex(delivery.sourceIndex))
  assert(sources.allOwnersCurrent)
  const completion = pinned(delivery.completion), q = pinned(delivery.qualification)
  assert.equal(completion.status, 'production_accepted')
  assert.equal(completion.exportKey, delivery.exportKey)
  assert.equal(sources.owners.genshin.versionId, delivery.candidateVersion)
  const input = pinned(q.input) as GenshinIntakeInput, exported = zipped(q.export).result
  const verified = assertGenshinReviewedExport(input, exported)
  assert.equal(verified.exportKey, delivery.exportKey)
  assert.deepEqual(sources.sources, verified.sources)
  const before = zipped(delivery.cmsAfter)
  assert.deepEqual(before.draft.filter((r: any) => GENSHIN_INTAKE_PATHS.includes(r.legacyPath)), input.cms)
  return { deliveryProof, delivery, sources, input, exported, review: verified.review, before }
}
export type OpenedEditingSync = Awaited<ReturnType<typeof openGenshinEditingSync>>

export function planGenshinEditingSync(opened: Pick<OpenedEditingSync, 'delivery' | 'input' | 'exported' | 'before'>) {
  const { delivery, input, exported, before } = opened
  const { review, sources } = assertGenshinReviewedExport(input, exported)
  assert.deepEqual(before.draft.filter((r: any) => GENSHIN_INTAKE_PATHS.includes(r.legacyPath)), input.cms)
  const manifest = { kind: GENSHIN_EDITING_SYNC, sourceIndex: delivery.sourceIndex, exportKey: delivery.exportKey,
    versionId: delivery.candidateVersion, runKey: review.runKey, beforeKey: editingRowsKey(before.draft),
    sourcePins: sources.filter(s => GENSHIN_INTAKE_PATHS.includes(s.sourcePath)).map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })),
    decisions: exported.manifest.decisions, preservedEditorialFlags: true, websiteWrites: 0 }
  assert.equal(manifest.exportKey, exported.manifest.exportKey)
  const syncKey = digest(canonical(manifest)), old = new Map(input.cms.map(row => [row.stableKey, row]))
  const renames = new Map(input.renames.map(row => [row.to, row.from]))
  const changes = sources.filter(s => GENSHIN_INTAKE_PATHS.includes(s.sourcePath)).flatMap(source => {
    const family = source.sourcePath.slice('packages/data/games/genshin/raw-'.length, -5)
    const field = family === 'character-materials' ? 'characterId' : 'id'
    return JSON.parse(source.text).map((value: any) => {
      const to = value[field], from = family === 'character-materials' ? renames.get(to) ?? to : to
      const prior = input.cms.find(row => row.kind === family && row.sourceRecord.locator.identity?.[field] === from) ?? null
      if (prior) assert(old.delete(prior.stableKey), 'Duplicate editing source')
      else assert(review.plan.entries.some(e => e.family === family && e.to === to && e.action === 'new-entity'), 'Unreviewed new editing entity')
      const unit = contentUnit({ game: 'genshin', family, sourcePath: source.sourcePath, sourceSHA256: source.sha256,
        locator: { identity: { [field]: to } }, original: value })
      const game = prior?.game ?? input.cms[0].game
      const after = { ...unit, game, bodyFormat: 'plain', sourceRecord: prior?.sourceRecord ?? unit.sourceRecord,
        // Synchronize editing values without inventing another editorial review.
        // Existing flags stay exact; first imported entities begin held drafts.
        hold: prior?.hold ?? true, _status: prior?._status ?? 'draft',
        reviewEvidence: { ...(prior?.reviewEvidence as any), publishedBaseline: {
          kind: 'genshin-published-editing-baseline-v1', syncKey, exportKey: manifest.exportKey,
          sourceIndex: delivery.sourceIndex, versionId: manifest.versionId,
          importOriginalSHA256: (prior?.sourceRecord ?? unit.sourceRecord).originalSHA256, source: unit.sourceRecord } } }
      validateUnifiedRecord(after)
      return { before: prior, after, family, from: prior ? from : null, to }
    })
  })
  assert.equal(old.size, 0, 'Implicit editing withdrawal rejected')
  assert.equal(new Set(changes.map(c => c.after.stableKey)).size, changes.length)
  return { syncKey, manifest, changes }
}
export type EditingSyncPlan = ReturnType<typeof planGenshinEditingSync>

async function rows(payload: Payload, req: any, draft = true) {
  return (await payload.find({ collection: 'content-records', req, overrideAccess: true, draft,
    locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
}
export function verifyEditingSyncRows(plan: EditingSyncPlan, before: any[], after: any[]) {
  const expected = new Map(plan.changes.map(c => [c.after.stableKey, c]))
  const previous = new Map(before.map(r => [String(r.id), r])), used = new Set<string>()
  for (const row of after) {
    const change = expected.get(row.stableKey)
    if (change) {
      assert(!used.has(row.stableKey)); used.add(row.stableKey)
      assert.equal(canonical(editingProjection(row)), canonical(editingProjection(change.after)), 'Synced editing record drift')
      if (change.before) {
        assert.equal(row.id, change.before.id, 'Existing CMS ID changed')
        assert.deepEqual(row.sourceRecord, change.before.sourceRecord, 'Real import O changed')
        assert.equal(row.createdAt, (change.before as any).createdAt)
      }
      validateUnifiedRecord(row)
      assert.deepEqual(row.structuredValue, editingSource(row).original)
    } else assert.equal(canonical(row), canonical(previous.get(String(row.id))), 'Unrelated CMS content changed')
  }
  assert.equal(used.size, plan.changes.length, 'Incomplete editing-source sync')
  const added = plan.changes.filter(c => !c.before).length
  assert.equal(after.length, before.length + added)
}

export async function applyGenshinEditingSync(payload: Payload, opened: OpenedEditingSync, reviewerID: number) {
  const plan = planGenshinEditingSync(opened), transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'Editing-source sync requires a real transaction')
  const req = { transactionID }, batchData = { batchKey: plan.syncKey, mapperVersion: GENSHIN_EDITING_SYNC,
    policyDigest: digest(GENSHIN_EDITING_SYNC), recordCount: plan.changes.length, manifest: canonical(plan.manifest) }
  let created = 0, updated = 0
  try {
    const existing = (await payload.find({ collection: 'migration-batches', req, overrideAccess: true, depth: 0,
      limit: 2, where: { batchKey: { equals: plan.syncKey } } })).docs
    const current = await rows(payload, req)
    if (existing.length) {
      assert.equal(existing.length, 1)
      for (const [key, value] of Object.entries(batchData)) assert.equal(canonical((existing[0] as any)[key]), canonical(value))
      verifyEditingSyncRows(plan, opened.before.draft, current)
    } else {
      assert.equal(editingRowsKey(current), plan.manifest.beforeKey, 'Live CMS changed since R143 final snapshot; do not overwrite newer work')
      assert.equal(editingRowsKey(await rows(payload, req, false)), editingRowsKey(opened.before.published), 'Published CMS changed since R143')
      const items = await readGenshinCollectionReview(payload, opened.review, req)
      const locks = (await payload.find({ collection: 'payload-locked-documents', req, overrideAccess: true, depth: 0,
        pagination: false, where: { and: [{ 'document.relationTo': { equals: 'content-records' } },
          { 'document.value': { in: plan.changes.filter(c => c.before).map(c => c.before!.id) } }] } })).docs
      assert(!locks.some(lock => Date.now() - Date.parse(lock.updatedAt) <= 300000), 'An editor holds a live content lock')
      const decisions = (await payload.find({ collection: 'genshin-review-decisions', req, overrideAccess: true, depth: 0,
        pagination: false, where: { runKey: { equals: opened.review.runKey } } })).docs
      const fields = ['decisionKey', 'revisionKey', 'actorID', 'actorEmail', 'action', 'note']
      for (const decision of decisions) {
        const item = items.find(i => i.revisionKey === decision.revisionKey)
        assert(item && decision.reviewItem === item.id && decision.cmsKey === opened.review.manifest.cmsKey, 'Production decision relationship changed')
      }
      assert.equal(canonical(decisions.map(r => Object.fromEntries(fields.map(f => [f, r[f as keyof typeof r]]))).sort((a, b) => String(a.revisionKey).localeCompare(String(b.revisionKey)))), canonical(plan.manifest.decisions), 'Stored production reviews changed')
      const user = await payload.findByID({ collection: 'users', id: reviewerID, req, depth: 0, overrideAccess: true })
      assert(['admin', 'reviewer'].includes(user.role))
      for (const change of plan.changes) {
        const context = publishedEditingContext(change.before, change.after)
        if (change.before) {
          await payload.update({ collection: 'content-records', id: change.before.id, req, user, context,
            overrideAccess: false, draft: false, depth: 0, data: change.after as any }); updated++
        } else {
          await payload.create({ collection: 'content-records', req, user, context,
            overrideAccess: false, draft: false, depth: 0, data: change.after as any }); created++
        }
      }
      verifyEditingSyncRows(plan, opened.before.draft, await rows(payload, req))
      await payload.create({ collection: 'migration-batches', req, overrideAccess: true, data: batchData })
    }
    await payload.db.commitTransaction(transactionID)
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  verifyEditingSyncRows(plan, opened.before.draft, await rows(payload, undefined))
  return { syncKey: plan.syncKey, created, updated, reused: plan.changes.length - created - updated,
    total: plan.changes.length, realImportPreserved: plan.changes.filter(c => c.before).length,
    identityMigrations: plan.changes.filter(c => c.before && c.from !== c.to).map(c => ({ id: c.before!.id, from: c.from, to: c.to })),
    reviewWrites: 0, workerUploads: 0, productionDeployments: 0, sourceIndex: opened.delivery.sourceIndex }
}
