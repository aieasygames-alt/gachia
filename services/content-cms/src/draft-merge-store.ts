import { APIError, type PayloadRequest } from 'payload'
import { canonical } from './record-mapping'
import { verifiedReview, assertRevisionOpen } from './review-store'
import { buildMergePlan, reconsideredPlan, type MergePlan } from './draft-merge'
import { withBatchReads } from './batch-read-scope'
import { digest } from './legacy-intake'
import { proposalBlock, type ProposalAction } from './proposal-eligibility'

export async function prepareMerge(req: PayloadRequest, draftID: number, reviewID: number) {
  return withBatchReads(req.payload, req, async readBatch => {
    const draft = await req.payload.findByID({ collection: 'editorial-drafts', id: draftID, req, overrideAccess: false, depth: 0 })
    const sourceKey = draft.sourceReviewKey || draft.reviewKey
    const sourceItem = (await req.payload.find({ collection: 'review-items', req, overrideAccess: true, where: { reviewKey: { equals: sourceKey } }, limit: 1 })).docs[0]
    if (!sourceItem) throw new APIError('Draft source baseline is missing.', 409)
    const base = await verifiedReview(req, sourceItem.id, readBatch)
    const target = await verifiedReview(req, reviewID, readBatch)
    if (!base.candidate || !target.candidate || target.item.blockers.length || target.item.draftKind !== draft.kind || base.item.draftKind !== draft.kind || base.candidate.stableKey !== draft.stableKey || target.candidate.stableKey !== draft.stableKey || base.candidate.sourcePath !== target.candidate.sourcePath || target.item.beforeRevision !== base.candidate.revisionKey || target.candidate.revisionKey === base.candidate.revisionKey || base.candidate.mapperVersion !== target.candidate.mapperVersion || base.candidate.policyDigest !== target.candidate.policyDigest) throw new APIError('Merge requires a supported forward diff from this draft source baseline, with matching identity, kind, source and policy.', 409)
    const terminal = await req.payload.count({ collection: 'review-decisions', req, overrideAccess: true, where: { reviewKey: { equals: target.item.reviewKey } } })
    if (terminal.totalDocs) throw new APIError('Target review already has a terminal intake decision; correction requires a separate workflow.', 409)
    await assertRevisionOpen(req, target.item, 'merge')
    if (draft.mergeHead) {
      const head = (await req.payload.find({ collection: 'draft-merge-decisions', req, overrideAccess: true, depth: 0, where: { proposalKey: { equals: draft.mergeHead } }, limit: 1 })).docs[0]
      if (!head || head.action !== 'apply' || head.draft !== draft.id || head.targetReviewKey !== sourceKey) throw new APIError('Draft merge history is inconsistent.', 409)
    } else if (sourceKey !== draft.reviewKey || base.candidate.revisionKey !== draft.candidateRevision) throw new APIError('Draft initial baseline is inconsistent.', 409)
    if (draft.hold !== true || draft.state !== 'draft') throw new APIError('Only held drafts may be merged.', 409)
    return { draft, target, plan: buildMergePlan(draft, base.candidate, target.candidate, target.item.reviewKey) }
  })
}

export function mergeProjection(plan: MergePlan) {
  return {
    proposalKey: plan.proposalKey, sourceReviewKey: plan.sourceReviewKey, targetReviewKey: plan.targetReviewKey,
    draftFingerprint: plan.draftFingerprint, conflictCount: plan.cells.filter(cell => cell.status === 'conflict').length,
    comparison: plan.cells.map(cell => ({ field: cell.field, baseText: cell.base, currentText: cell.current, incomingText: cell.incoming, status: cell.status, suggested: cell.suggested ?? 'choose' })),
    planText: canonical(plan),
  }
}

export async function verifiedMerge(req: PayloadRequest, id: number, action: Extract<ProposalAction, 'apply' | 'dismiss'> = 'apply') {
  const { proposal } = await storedMerge(req, id)
  const decision = (await req.payload.find({ collection: 'draft-merge-decisions', req, overrideAccess: true, depth: 0, where: { proposal: { equals: id } }, limit: 1 })).docs[0]
  const closed = (await req.payload.count({ collection: 'merge-workflow-events', req, overrideAccess: true, where: { and: [{ proposal: { equals: id } }, { action: { equals: 'close' } }] } })).totalDocs > 0
  const facts = { decision: decision?.action, closed, stale: false, conflicts: false }
  const blocked = proposalBlock(facts, action)
  if (blocked) throw new APIError(blocked, 409)
  const prepared = await prepareMerge(req, Number(proposal.draft), Number(proposal.reviewItem))
  prepared.plan = reconsideredPlan(prepared.plan, proposal.parentProposalKey)
  const projection = mergeProjection(prepared.plan)
  const stale = (['proposalKey', 'sourceReviewKey', 'targetReviewKey', 'draftFingerprint', 'conflictCount', 'planText'] as const).some(key => proposal[key] !== projection[key])
  const freshnessBlock = proposalBlock({ ...facts, stale }, action)
  if (freshnessBlock) throw new APIError(freshnessBlock, 409)
  if (canonical(proposal.comparison?.map(({ field, baseText, currentText, incomingText, status, suggested }) => ({ field, baseText, currentText, incomingText, status, suggested }))) !== canonical(projection.comparison)) throw new APIError('Merge comparison projection was modified.', 409)
  return { ...prepared, proposal }
}

// Historical checks do not compare against today's draft: stale proposals must remain closable.
export async function storedMerge(req: PayloadRequest, id: number) {
  const proposal = await req.payload.findByID({ collection: 'draft-merge-proposals', id, req, overrideAccess: true, depth: 0 })
  let plan: MergePlan
  try { plan = JSON.parse(proposal.planText || '') } catch { throw new APIError('Invalid stored comparison.', 409) }
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.cells)) throw new APIError('Invalid or tampered stored comparison.', 409)
  const { proposalKey, ...content } = plan
  if (proposalKey !== proposal.proposalKey || digest(canonical(content)) !== proposalKey || plan.draftID !== proposal.draft || (plan.reconsideredFrom ?? null) !== (proposal.parentProposalKey ?? null)) throw new APIError('Stored comparison integrity failure: tampered snapshot.', 409)
  const projection = mergeProjection(plan)
  for (const key of ['sourceReviewKey', 'targetReviewKey', 'draftFingerprint', 'conflictCount'] as const) if (proposal[key] !== projection[key]) throw new APIError('Stored comparison projection mismatch.', 409)
  if (canonical(proposal.comparison?.map(({ field, baseText, currentText, incomingText, status, suggested }) => ({ field, baseText, currentText, incomingText, status, suggested }))) !== canonical(projection.comparison)) throw new APIError('Merge comparison projection was modified.', 409)
  const target = await req.payload.findByID({ collection: 'review-items', id: Number(proposal.reviewItem), req, overrideAccess: true, depth: 0 })
  if (target.reviewKey !== plan.targetReviewKey) throw new APIError('Stored comparison target mismatch.', 409)
  if (proposal.parentProposalKey) {
    const event = (await req.payload.find({ collection: 'merge-workflow-events', req, overrideAccess: true, depth: 0, where: { replacement: { equals: proposal.id } }, limit: 1 })).docs[0]
    if (!event || event.action !== 'reconsider' || event.sourceProposalKey !== proposal.parentProposalKey || event.replacementKey !== proposal.proposalKey) throw new APIError('Reconsideration audit link is missing.', 409)
  }
  return { proposal, plan }
}
