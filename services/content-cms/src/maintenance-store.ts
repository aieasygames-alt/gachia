import type { Payload, PayloadRequest, CollectionSlug } from 'payload'
import { withBatchReads } from './batch-read-scope'
import { revisionBlock } from './revision-eligibility'
import { proposalState } from './proposal-eligibility'
import { buildReviewPlan, reviewManifest, reviewVersion } from './review-plan'
import { buildMergePlan } from './draft-merge'
import { canonical } from './record-mapping'
import { reviewData } from './review-store'
import { maintenancePlan } from './maintenance-plan'

// Trusted local CLI only. No public endpoint; one transaction prevents mixed-time status reads.
export async function loadMaintenancePlan(payload: Payload, runKey: string, options: Parameters<typeof maintenancePlan>[3] = {}) {
  if (!/^[a-f0-9]{64}$/.test(runKey)) throw new Error('Invalid review run key')
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Maintenance snapshot requires a transaction')
  const req: Partial<PayloadRequest> = { transactionID }
  return withBatchReads(payload, req, async readBatch => {
    try {
      const run = (await payload.find({ collection: 'review-runs', req, overrideAccess: true, depth: 0, limit: 1, where: { runKey: { equals: runKey } } })).docs[0]
      if (!run) throw new Error('Complete review run not found')
      const target = await readBatch(run.targetBatch)
      const base = run.baseBatch ? await readBatch(run.baseBatch) : undefined
      const expected = buildReviewPlan(target, base, reviewVersion(run.manifest!))
      if (expected.runKey !== runKey || reviewManifest(expected) !== run.manifest || expected.items.length !== run.itemCount) throw new Error('Review run integrity failure')
      async function all<C extends CollectionSlug>(collection: C, scoped: boolean) {
        const docs = []
        for (let page = 1; ; page++) {
          const result = await payload.find({ collection, req, overrideAccess: true, depth: 0, limit: 100, page, sort: 'id', ...(scoped ? { where: { runKey: { equals: runKey } } } : {}) })
          docs.push(...result.docs)
          if (!result.hasNextPage) return docs
        }
      }
      const items = await all('review-items', true)
      if (items.length !== expected.items.length) throw new Error('Review items incomplete')
      const byKey = new Map(items.map(i => [i.reviewKey, i]))
      for (const item of expected.items) {
        const stored = byKey.get(item.reviewKey)
        const { fieldChanges, ...scalars } = reviewData(item)
        if (!stored || Object.entries(scalars).some(([key, value]) => stored[key as keyof typeof stored] !== value)
          || canonical(stored.fieldChanges?.map(({ field, beforeText, afterText }) => ({ field, beforeText, afterText })) ?? []) !== canonical(fieldChanges)) throw new Error('Review projection mismatch')
      }
      const allDecisions = await all('review-decisions', false)
      const blockedReviewKeys: string[] = []
      for (const decision of allDecisions.filter(d => revisionBlock({ rejected: d.action === 'reject', accepted: false, applied: false }, 'merge'))) {
        const id = typeof decision.reviewItem === 'object' ? decision.reviewItem.id : decision.reviewItem
        const rejected = await payload.findByID({ collection: 'review-items', id, req, overrideAccess: true, depth: 0 })
        blockedReviewKeys.push(...expected.items.filter(i => i.stableKey === rejected.stableKey && i.afterRevision === rejected.afterRevision).map(i => i.reviewKey))
      }
      const decisions = allDecisions.flatMap(d => {
        if (!d.reviewKey) throw new Error('Decision identity missing')
        if (!byKey.has(d.reviewKey)) return []
        const relation = typeof d.reviewItem === 'object' ? d.reviewItem.id : d.reviewItem
        if (relation !== byKey.get(d.reviewKey)!.id) throw new Error('Decision relation mismatch')
        return [{ ...d, reviewKey: d.reviewKey }]
      })
      const drafts = await all('editorial-drafts', false)
      for (const decision of decisions) {
        if (decision.action !== 'accept-draft') continue
        const id = typeof decision.draft === 'object' ? decision.draft?.id : decision.draft
        const draft = drafts.find(d => d.id === id)
        if (!draft || draft.reviewKey !== decision.reviewKey || draft.stableKey !== byKey.get(decision.reviewKey)!.stableKey) throw new Error('Accepted draft relation mismatch')
      }
      const historyItems = await all('review-items', false)
      const historyByKey = new Map(historyItems.map(i => [i.reviewKey, i]))
      const operationalStates: Record<string, string> = {}
      const mergeDecisions = await all('draft-merge-decisions', false)
      const proposals = await all('draft-merge-proposals', false)
      const events = await all('merge-workflow-events', false)
      for (const item of expected.items) {
        const draft = drafts.find(d => d.stableKey === item.stableKey)
        if (!draft || item.blockers.length || blockedReviewKeys.includes(item.reviewKey)) continue
        const head = historyByKey.get(draft.sourceReviewKey || draft.reviewKey)
        const initial = historyByKey.get(draft.reviewKey)
        if (head?.afterRevision === item.afterRevision) { operationalStates[item.reviewKey] = draft.mergeHead ? 'applied' : 'accepted-held'; continue }
        const applied = mergeDecisions.find(d => d.action === 'apply' && historyByKey.get(d.targetReviewKey!)?.afterRevision === item.afterRevision && historyByKey.get(d.targetReviewKey!)?.stableKey === item.stableKey)
        if (applied || initial?.afterRevision === item.afterRevision) { operationalStates[item.reviewKey] = 'superseded'; continue }
        if (head?.afterRevision !== item.beforeRevision) { operationalStates[item.reviewKey] = 'baseline-mismatch'; continue }
        const related = proposals.filter(p => p.targetReviewKey === item.reviewKey).sort((a, b) => b.id - a.id)
        const latest = related[0]
        if (!latest) continue
        const decision = mergeDecisions.find(d => d.proposalKey === latest.proposalKey)
        const sourceKey = draft.sourceReviewKey || draft.reviewKey
        const facts = { decision: decision?.action, closed: events.some(e => e.sourceProposalKey === latest.proposalKey && e.action === 'close'), stale: latest.sourceReviewKey !== sourceKey, conflicts: false }
        const lifecycle = proposalState(facts)
        if (['applied', 'dismissed', 'closed', 'stale'].includes(lifecycle)) { operationalStates[item.reviewKey] = lifecycle; continue }
        const sourceItem = await payload.find({ collection: 'review-items', req, overrideAccess: true, depth: 0, limit: 1, where: { reviewKey: { equals: sourceKey } } })
        if (!sourceItem.docs[0]) throw new Error('Missing draft source review')
        const sourceRun = await payload.find({ collection: 'review-runs', req, overrideAccess: true, limit: 1, where: { runKey: { equals: sourceItem.docs[0].runKey } } })
        const sourceBatch = await readBatch(sourceRun.docs[0].targetBatch)
        const before = sourceBatch.sources.flatMap(s => s.records).find(c => c.revisionKey === sourceItem.docs[0].afterRevision)
        const incoming = target.sources.flatMap(s => s.records).find(c => c.revisionKey === item.afterRevision)
        if (!before || !incoming) throw new Error('Missing merge candidates')
        const fresh = buildMergePlan(draft, before, incoming, item.reviewKey)
        operationalStates[item.reviewKey] = proposalState({ ...facts, stale: fresh.draftFingerprint !== latest.draftFingerprint, conflicts: fresh.cells.some(c => c.status === 'conflict') })
      }
      const plan = maintenancePlan(target, base, { decisions, drafts, blockedReviewKeys, operationalStates }, { ...options, version: reviewVersion(run.manifest!) })
      await payload.db.commitTransaction(transactionID)
      return plan
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  })
}
