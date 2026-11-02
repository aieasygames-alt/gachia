export type RevisionFacts = { rejected: boolean; accepted: boolean; applied: boolean }
export type RevisionAction = 'accept-draft' | 'reject' | 'merge'

export function revisionBlock(facts: RevisionFacts, action: RevisionAction): string | null {
  if (facts.rejected) return 'Candidate revision was rejected under an existing review policy; explicit correction is required.'
  if (facts.accepted) return 'Candidate revision already accepted under a review policy.'
  if (facts.applied && action === 'reject') return 'Applied revision cannot be rejected; explicit reversal is required.'
  return null
}
