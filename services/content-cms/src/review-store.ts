import { APIError, type Payload, type PayloadRequest } from 'payload'
import type { BatchReader } from './batch-read-scope'
import { revisionBlock, type RevisionAction } from './revision-eligibility'
import { canonical } from './record-mapping'
import { loadRecordBatch } from './record-store'
import { buildReviewPlan, reviewManifest, type ReviewItem, type ReviewVersion, reviewVersion } from './review-plan'

export function reviewData(item: ReviewItem) {
  return {
    reviewKey: item.reviewKey, label: `${item.stableKey} / ${item.change} / ${item.runKey.slice(0, 12)}`, runKey: item.runKey, stableKey: item.stableKey, gameKey: item.gameKey,
    sourcePath: item.sourcePath, change: item.change, draftKind: item.draftKind ?? 'unsupported',
    beforeRevision: item.beforeRevision, afterRevision: item.afterRevision,
    blockers: item.blockers.join('\n'), warnings: item.warnings.join('\n'),
    fieldChanges: item.fields.map(field => ({ field: field.field, beforeText: field.before, afterText: field.after })),
    itemText: canonical(item),
  }
}

export async function stageReview(payload: Payload, targetKey: string, baseKey?: string, version: ReviewVersion = 'review-v1') {
  const target = await loadRecordBatch(payload, targetKey)
  const base = baseKey ? await loadRecordBatch(payload, baseKey) : undefined
  const plan = buildReviewPlan(target, base, version)
  let created = 0, reused = 0
  for (const item of plan.items) {
    const existing = (await payload.find({ collection: 'review-items', overrideAccess: true, limit: 1, where: { reviewKey: { equals: item.reviewKey } } })).docs[0]
    const data = reviewData(item)
    if (existing) {
      const { fieldChanges, ...scalars } = data
      for (const key of Object.keys(scalars) as (keyof typeof scalars)[]) if (existing[key] !== scalars[key]) throw new Error('Stored review projection mismatch')
      if (canonical(existing.fieldChanges?.map(({ field, beforeText, afterText }) => ({ field, beforeText, afterText })) ?? []) !== canonical(fieldChanges)) throw new Error('Stored review fields mismatch')
      reused++
    } else { await payload.create({ collection: 'review-items', overrideAccess: true, data }); created++ }
  }
  const manifest = reviewManifest(plan)
  const prior = (await payload.find({ collection: 'review-runs', overrideAccess: true, limit: 1, where: { runKey: { equals: plan.runKey } } })).docs[0]
  if (prior) {
    if (prior.manifest !== manifest || prior.itemCount !== plan.items.length || prior.targetBatch !== targetKey || (prior.baseBatch ?? null) !== (baseKey ?? null)) throw new Error('Stored review run mismatch')
  } else {
    await payload.create({ collection: 'review-runs', overrideAccess: true, data: { runKey: plan.runKey, targetBatch: targetKey, baseBatch: baseKey ?? null, itemCount: plan.items.length, manifest } })
  }
  return { runKey: plan.runKey, created, reused, total: plan.items.length, supported: plan.items.filter(item => !item.blockers.length).length, publishable: false }
}

export async function verifiedReview(req: PayloadRequest, id: number, readBatch?: BatchReader) {
  const item = await req.payload.findByID({ collection: 'review-items', id, req, overrideAccess: true, depth: 0 })
  const run = (await req.payload.find({ collection: 'review-runs', req, overrideAccess: true, limit: 1, where: { runKey: { equals: item.runKey } } })).docs[0]
  if (!run) throw new Error('Review run is incomplete')
  const read = readBatch ?? ((key: string) => loadRecordBatch(req.payload, key, req))
  const target = await read(run.targetBatch)
  const base = run.baseBatch ? await read(run.baseBatch) : undefined
  const expected = buildReviewPlan(target, base, reviewVersion(run.manifest!))
  if (expected.runKey !== run.runKey || reviewManifest(expected) !== run.manifest || run.itemCount !== expected.items.length) throw new Error('Review run integrity failure')
  const entry = expected.items.find(value => value.reviewKey === item.reviewKey)
  if (!entry || canonical(entry) !== item.itemText) throw new Error('Review item integrity failure')
  const data = reviewData(entry)
  for (const key of Object.keys(data).filter(key => key !== 'fieldChanges') as Exclude<keyof typeof data, 'fieldChanges'>[]) if (item[key] !== data[key]) throw new Error('Review display projection mismatch')
  if (canonical(item.fieldChanges?.map(({ field, beforeText, afterText }) => ({ field, beforeText, afterText })) ?? []) !== canonical(data.fieldChanges)) throw new Error('Review display fields mismatch')
  const candidate = target.sources.flatMap(source => source.records).find(value => value.revisionKey === entry.afterRevision)
  return { item: entry, candidate, run }
}

// Historical verification is deliberately independent of current decision eligibility.
export async function assertRevisionOpen(req: PayloadRequest, item: ReviewItem, action: RevisionAction) {
  if (!item.afterRevision) return
  const peers = await req.payload.find({ collection: 'review-items', req, overrideAccess: true, depth: 0, pagination: false,
    where: { and: [{ stableKey: { equals: item.stableKey } }, { afterRevision: { equals: item.afterRevision } }] } })
  const keys = peers.docs.map(row => row.reviewKey)
  const decisions = await req.payload.find({ collection: 'review-decisions', req, overrideAccess: true, depth: 0, pagination: false,
    where: { reviewKey: { in: keys } } })
  const applied = action === 'reject' ? await req.payload.count({ collection: 'draft-merge-decisions', req, overrideAccess: true,
    where: { and: [{ targetReviewKey: { in: keys } }, { action: { equals: 'apply' } }] } }) : { totalDocs: 0 }
  const blocked = revisionBlock({ rejected: decisions.docs.some(row => row.action === 'reject'),
    accepted: decisions.docs.some(row => row.action === 'accept-draft'), applied: applied.totalDocs > 0 }, action)
  if (blocked) throw new APIError(blocked, 409)
}
