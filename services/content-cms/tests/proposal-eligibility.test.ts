import assert from 'node:assert/strict'
import { test } from 'node:test'
import { proposalBlock, proposalState, type ProposalAction } from '../src/proposal-eligibility'

test('proposal lifecycle matrix shares status precedence and action restrictions', () => {
  const actions: ProposalAction[] = ['apply', 'dismiss', 'close', 'reconsider']
  const allowed: Record<string, ProposalAction[]> = {
    applied: [], dismissed: ['reconsider'], closed: ['reconsider'], stale: ['close'],
    'awaiting-approval': ['apply', 'dismiss', 'close'],
    'awaiting-conflict-review': ['apply', 'dismiss', 'close'],
  }
  for (const decision of [undefined, 'apply', 'dismiss'] as const) {
    for (const closed of [false, true]) for (const stale of [false, true]) for (const conflicts of [false, true]) {
      const facts = { decision, closed, stale, conflicts }
      const expected = decision === 'apply' ? 'applied' : decision === 'dismiss' ? 'dismissed'
        : closed ? 'closed' : stale ? 'stale' : conflicts ? 'awaiting-conflict-review' : 'awaiting-approval'
      assert.equal(proposalState(facts), expected)
      for (const action of actions) assert.equal(proposalBlock(facts, action) === null, allowed[expected].includes(action), JSON.stringify({ facts, action }))
    }
  }
})
