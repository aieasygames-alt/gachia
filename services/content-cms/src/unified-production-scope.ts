import assert from 'node:assert/strict'
import { unifiedOwnerPlan } from './unified-build'
import { verifyUnifiedPlan, type UnifiedPlan } from './unified-plan'
import type { exportUnifiedContent } from './unified-export'

type Candidate = ReturnType<typeof exportUnifiedContent>['manifest']

// A build overlay is O -> B. Editorial intent is A -> B. Keeping these
// separate does not by itself prove that a preservation owner can be skipped.
export function unifiedEditorialScope(candidate: Candidate, plan: UnifiedPlan, ownership: { games: Record<string, unknown> }) {
  verifyUnifiedPlan(plan)
  assert.equal(candidate.preview, false, 'Fixture cannot enter production scope')
  assert.equal(candidate.status, 'editorial_candidate')
  assert(candidate.changed.length > 0 && new Set(candidate.changed).size === candidate.changed.length, 'Explicit unique editorial changes required')
  assert.equal(candidate.baselines.length, plan.sources.length, 'Complete public A required')
  assert.deepEqual(candidate.baselines.map(row => row.sourcePath).sort(), plan.sources.map(row => row.sourcePath).sort())
  const baselines = new Map(candidate.baselines.map(row => [row.sourcePath, row]))
  const known = new Map(plan.sources.flatMap(source => source.records.map(record => [record.stableKey, source.sourcePath] as const)))
  const editorialPaths = [...new Set(candidate.changed.map(key => {
    const source = known.get(key); assert(source, 'Editorial key is outside the plan'); return source
  }))].sort()
  assert.equal(new Set(candidate.files.map(row => row.sourcePath)).size, candidate.files.length, 'Duplicate overlay')
  for (const row of candidate.files) {
    const baseline = baselines.get(row.sourcePath)
    assert(baseline && /^[a-f0-9]{64}$/.test(row.candidateSHA256), 'Unknown or unpinned overlay')
    assert.equal(row.originalSHA256, baseline.originalSHA256); assert.equal(row.activeSHA256, baseline.activeSHA256)
    assert.equal(row.candidateSHA256 !== row.activeSHA256, editorialPaths.includes(row.sourcePath), 'Overlay differs from actual editorial scope')
  }
  const overlayPaths = candidate.files.map(row => row.sourcePath).sort()
  assert(editorialPaths.every(file => overlayPaths.includes(file)), 'Editorial source missing from overlay')
  for (const baseline of candidate.baselines) {
    const source = plan.sources.find(row => row.sourcePath === baseline.sourcePath)!
    assert.equal(baseline.originalSHA256, source.sourceSHA256)
    assert(/^[a-f0-9]{64}$/.test(baseline.activeSHA256), 'Unpinned public A')
    if (baseline.activeSHA256 !== baseline.originalSHA256) assert(overlayPaths.includes(baseline.sourcePath), 'Public-only change lost from overlay')
  }
  const editorial = unifiedOwnerPlan(editorialPaths, plan, ownership), build = unifiedOwnerPlan(overlayPaths, plan, ownership)
  const preservationPaths = overlayPaths.filter(file => !editorialPaths.includes(file))
  return { editorial: { ...editorial, paths: editorialPaths, changed: [...candidate.changed] },
    preservationPaths, build, preservationOnlyOwners: build.owners.filter(owner => !editorial.owners.includes(owner)),
    uploadOwners: build.owners, preservationOwnerOmissionAuthorized: false }
}
