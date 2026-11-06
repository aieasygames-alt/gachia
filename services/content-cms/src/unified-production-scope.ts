import assert from 'node:assert/strict'
import { unifiedOwnerPlan } from './unified-build'
import { verifyUnifiedPlan, type UnifiedPlan } from './unified-plan'
import type { exportUnifiedContent } from './unified-export'
import type { SourceBytes } from './unified-export'
import { objectValue, type UnifiedRecord } from './unified-content'
import { locateValue, readSourceValue } from './unified-sources'
import type { PreservedRuntime } from './unified-preservation'

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
    uploadOwners: build.owners, preservationOwnerOmissionAuthorized: false, preservedOwners: {} as Record<string, PreservedRuntime> }
}

// Qualification grows only after each domain/consumer slice is accepted.
// Generic JSON fidelity and a published flag cannot qualify all 16 scopes.
export function unifiedPilotQualification(records: UnifiedRecord[], active: SourceBytes[], candidate: ReturnType<typeof exportUnifiedContent>) {
  assert.equal(candidate.manifest.changed.length, 1, 'Only the accepted single-record pilot is production-qualified')
  const record = records.find(row => row.stableKey === candidate.manifest.changed[0])
  assert(record, 'Pilot record missing')
  const source = record.sourceRecord
  assert.equal(source.game, 'ananta', 'Game domain is not production-qualified yet')
  assert.equal(source.sourcePath, 'packages/data/games/ananta/raw-guides.json', 'Content domain is not production-qualified yet')
  assert.deepEqual(source.locator, { identity: { id: 'download-install-guide' } }, 'Consumer is not production-qualified yet')
  const a = active.find(row => row.sourcePath === source.sourcePath), b = candidate.files.find(row => row.sourcePath === source.sourcePath)
  assert(a && b, 'Pilot public/candidate source missing')
  const before = locateValue(readSourceValue(a.text, source.sourcePath, source.locator), source.locator)
  const after = locateValue(readSourceValue(b.content, source.sourcePath, source.locator), source.locator)
  assert(objectValue(before) && objectValue(after) && typeof before.content === 'string' && typeof after.content === 'string')
  const { content: originalContent, ...originalRest } = before, { content: editedContent, ...editedRest } = after
  assert.deepEqual(editedRest, originalRest, 'Only the accepted Chinese content field is production-qualified')
  assert(editedContent.trim() && editedContent !== originalContent, 'Pilot must contain a genuine nonempty content edit')
  return { policy: 'ananta-existing-installation-content-v1', game: 'ananta', changed: [record.stableKey], fields: ['/content'], locale: 'zh' }
}

export function assertUnifiedProductionOwnerClosure(scope: ReturnType<typeof unifiedEditorialScope>) {
  if (scope.preservationOnlyOwners.length) {
    assert.equal(scope.preservationOwnerOmissionAuthorized, true, 'Main-only preservation runtime proof is still required; no broader cloud upload is authorized')
    assert.deepEqual(Object.keys(scope.preservedOwners).sort(), [...scope.preservationOnlyOwners].sort(), 'Preserved owner proof is incomplete')
    for (const [owner, proof] of Object.entries(scope.preservedOwners)) {
      assert.equal(proof.policy, 'accepted-published-runtime-v1'); assert.equal(proof.service, `gachia-game-${owner}`)
      for (const key of ['moduleSHA256', 'catalogPin', 'sourcesPin', 'identityPin'] as const) assert(/^[a-f0-9]{64}$/.test(proof[key]))
      assert(/^[a-f0-9]{40}$/.test(proof.sourceCommit)); assert(/^[a-f0-9-]{36}$/.test(proof.versionId))
    }
  } else assert.deepEqual(scope.preservedOwners, {})
  assert.deepEqual(scope.uploadOwners, scope.editorial.owners, 'Production owner scope is not closed')
}

export function closeUnifiedProductionOwnerScope(scope: ReturnType<typeof unifiedEditorialScope>, preservedOwners: Record<string, PreservedRuntime>) {
  assert.deepEqual(scope.editorial.owners, ['main'], 'Only Main-only preservation is qualified')
  const closed = { ...scope, uploadOwners: [...scope.editorial.owners], preservedOwners,
    preservationOwnerOmissionAuthorized: scope.preservationOnlyOwners.length > 0 }
  assertUnifiedProductionOwnerClosure(closed)
  return closed
}
