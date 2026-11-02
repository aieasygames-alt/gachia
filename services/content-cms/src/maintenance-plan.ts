import { digest } from './legacy-intake'
import { canonical, type RecordBatch } from './record-mapping'
import { buildReviewPlan, type ReviewVersion } from './review-plan'

export type MaintenanceState = {
  decisions: { reviewKey: string; action: 'accept-draft' | 'reject' }[];
  drafts: { stableKey: string }[];
  blockedReviewKeys?: string[];
  operationalStates?: Record<string, string>;
}
export function maintenancePlan(target: RecordBatch, base: RecordBatch | undefined, state: MaintenanceState, options: { games?: string[]; chunkSize?: number; version?: ReviewVersion } = {}) {
  const chunkSize = options.chunkSize ?? 50
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > 200) throw new Error('Chunk size must be 1..200')
  const available = [...new Set([...target.sources, ...(base?.sources ?? [])].map(s => s.gameKey))].sort()
  const games = [...new Set(options.games ?? available)].sort()
  if (!games.length || games.some(game => !available.includes(game))) throw new Error('Unknown or empty game scope')
  const review = buildReviewPlan(target, base, options.version)
  const decisions = new Map(state.decisions.map(d => [d.reviewKey, d.action]))
  const drafts = new Set(state.drafts.map(d => d.stableKey))
  if (decisions.size !== state.decisions.length || drafts.size !== state.drafts.length) throw new Error('Duplicate maintenance state identity')
  const candidates = new Map(target.sources.flatMap(s => s.records).map(r => [r.revisionKey, r]))
  const items = review.items.filter(i => games.includes(i.gameKey)).map(item => {
    const decision = decisions.get(item.reviewKey)
    if (decision && !['accept-draft', 'reject'].includes(decision)) throw new Error('Unknown decision')
    if (decision === 'accept-draft' && !drafts.has(item.stableKey)) throw new Error('Accepted item has no draft')
    const blockers = [...item.blockers, ...(state.blockedReviewKeys?.includes(item.reviewKey) ? ['Same revision rejected under another review policy; explicit correction required.'] : [])]
    // Acceptance is immutable history; a verified newer source head can supersede it.
    const status = decision === 'reject' ? 'rejected' : decision === 'accept-draft'
      ? (state.operationalStates?.[item.reviewKey] === 'superseded' ? 'superseded' : 'accepted-held')
      : blockers.length ? 'blocked' : state.operationalStates?.[item.reviewKey] ?? (drafts.has(item.stableKey) ? 'existing-draft-review' : 'intake-review')
    return { reviewKey: item.reviewKey, stableKey: item.stableKey, gameKey: item.gameKey,
      family: candidates.get(item.afterRevision ?? '')?.family ?? 'source-withdrawal', draftKind: item.draftKind,
      status, blockers, warnings: item.warnings }
  })
  const groups = games.flatMap(gameKey => {
    const selected = items.filter(i => i.gameKey === gameKey)
    return [...new Set(selected.map(i => `${i.family}\0${i.status}`))].sort().map(key => {
      const [family, status] = key.split('\0')
      const matching = selected.filter(i => i.family === family && i.status === status)
      const chunks = []
      for (let offset = 0; offset < matching.length; offset += chunkSize) {
        const reviewKeys = matching.slice(offset, offset + chunkSize).map(i => i.reviewKey)
        chunks.push({ chunkKey: digest(canonical({ runKey: review.runKey, gameKey, family, status, reviewKeys })), reviewKeys })
      }
      return { gameKey, family, status, count: matching.length, chunks }
    })
  })
  const data = { version: 'maintenance-plan-v1', runKey: review.runKey, targetBatch: target.batchKey,
    baseBatch: base?.batchKey ?? null, games, chunkSize, total: items.length,
    counts: Object.fromEntries(['intake-review', 'existing-draft-review', 'blocked', 'accepted-held', 'rejected', ...[...new Set(items.map(i => i.status))].filter(s => !['intake-review', 'existing-draft-review', 'blocked', 'accepted-held', 'rejected'].includes(s)).sort()].map(s => [s, items.filter(i => i.status === s).length])),
    sourceBacklog: target.sources.filter(s => games.includes(s.gameKey) && s.state !== 'mapped').map(s => ({ gameKey: s.gameKey, sourcePath: s.sourcePath, state: s.state, reason: s.reason })).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    groups, items, authority: 'legacy', publishable: false, executable: false }
  return { ...data, planKey: digest(canonical(data)) }
}
