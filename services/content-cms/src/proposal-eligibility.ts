export type ProposalFacts = {
  decision?: 'apply' | 'dismiss' | null;
  closed: boolean;
  stale: boolean;
  conflicts: boolean;
}
export type ProposalAction = 'apply' | 'dismiss' | 'close' | 'reconsider'

export function proposalState(facts: ProposalFacts) {
  if (facts.decision === 'apply') return 'applied'
  if (facts.decision === 'dismiss') return 'dismissed'
  if (facts.closed) return 'closed'
  if (facts.stale) return 'stale'
  return facts.conflicts ? 'awaiting-conflict-review' : 'awaiting-approval'
}

// Lifecycle permission only: ACL, current baseline, integrity and conflict choices remain required.
export function proposalBlock(facts: ProposalFacts, action: ProposalAction): string | null {
  const state = proposalState(facts)
  if (action === 'apply' || action === 'dismiss') {
    if (facts.decision) return 'This proposal already has a terminal decision.'
    if (state === 'closed') return 'This proposal was closed. Use the explicit reconsideration workflow.'
    if (state === 'stale') return 'Stale or tampered merge proposal. Prepare a new comparison after reviewing the latest draft.'
    return null
  }
  if (state === 'applied') return 'An applied merge cannot be closed or reconsidered; reversal requires a separate workflow.'
  if (action === 'close') {
    if (facts.decision) return 'A decided proposal is already terminal.'
    if (state === 'closed') return 'This workflow action already exists.'
    return null
  }
  return state === 'closed' || state === 'dismissed' ? null : 'Close or dismiss the proposal before reconsidering it.'
}
