import assert from 'node:assert/strict'
import test from 'node:test'
import { revisionBlock, type RevisionAction } from '../src/revision-eligibility'

test('revision gate consistently protects rejected and accepted revisions for every action', () => {
  for (const action of ['accept-draft', 'reject', 'merge'] as RevisionAction[]) {
    assert.match(revisionBlock({ rejected: true, accepted: false, applied: false }, action)!, /rejected/)
    assert.match(revisionBlock({ rejected: false, accepted: true, applied: false }, action)!, /accepted/)
    assert.equal(revisionBlock({ rejected: false, accepted: false, applied: false }, action), null)
  }
  assert.match(revisionBlock({ rejected: false, accepted: false, applied: true }, 'reject')!, /reversal/)
  // Merge applicability still depends on the current draft head, not just revision-level decisions.
  assert.equal(revisionBlock({ rejected: false, accepted: false, applied: true }, 'merge'), null)
})
