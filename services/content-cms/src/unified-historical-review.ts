import assert from 'node:assert/strict'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { validateUnifiedRecord } from './unified-content'
import { unifiedSelection } from './unified-desktop'
import { exportUnifiedContent, type SourceBytes } from './unified-export'
import type { UnifiedPlan } from './unified-plan'
import { locateValue, readSourceValue } from './unified-sources'

type Review = { id: number | string; stableKey: string; updatedAt: string; sourceSHA256: string; valueSHA256: string }
type Editorial = {
  schemaVersion: number; kind: string; cmsMode: string; preview: boolean; planSHA256: string; candidateSHA256: string
  frozenManifestPin: string; reviewPin: string; reviews: Review[]; changed: string[]
  productionReady: boolean; activationSupported: boolean; cloudWrites: boolean
}
type Candidate = ReturnType<typeof exportUnifiedContent>['manifest']
type Input = { plan: UnifiedPlan; editorial: Editorial; selected: string[]; originals: SourceBytes[]; active: SourceBytes[]
  sealedSources: SourceBytes[]; frozen: { planSHA256: string; candidate: Candidate }; frozenPin: string }
const SHA = /^[a-f0-9]{64}$/

// This reopens a pinned historical approval; it neither consults today's CMS
// documents nor grants a new approval, deployment or freshness renewal.
export function verifyUnifiedHistoricalReview(input: Input) {
  const { plan, editorial, frozen } = input
  assert(SHA.test(input.frozenPin)); assert.equal(editorial.frozenManifestPin, input.frozenPin)
  assert.equal(editorial.schemaVersion, 1); assert.equal(editorial.kind, 'unified_desktop_editorial_selection')
  assert.equal(editorial.cmsMode, 'desktop')
  for (const key of ['preview', 'productionReady', 'activationSupported', 'cloudWrites'] as const) assert.equal(editorial[key], false)
  assert.equal(editorial.planSHA256, plan.planSHA256); assert.equal(frozen.planSHA256, plan.planSHA256)
  const selected = unifiedSelection({ stableKeys: input.selected }, plan)
  assert.deepEqual(selected, input.selected, 'Canonical historical selection required')
  assert(Array.isArray(editorial.reviews)); assert.equal(editorial.reviews.length, selected.length)
  assert.deepEqual(editorial.reviews.map(row => row.stableKey), selected, 'Historical review selection changed')
  assert.equal(digest(canonical(editorial.reviews)), editorial.reviewPin, 'Historical review pin changed')
  const sources = new Map(input.sealedSources.map(source => [source.sourcePath, source]))
  assert.equal(sources.size, input.sealedSources.length, 'Duplicate historical source')
  assert.deepEqual([...sources.keys()].sort(), plan.sources.map(source => source.sourcePath).sort(), 'Complete sealed source set required')
  for (const source of sources.values()) assert.equal(digest(source.text), source.sha256, 'Historical source bytes changed')
  const templates = new Map(plan.sources.flatMap(source => source.records.map(record => [record.stableKey, record] as const)))
  const records = editorial.reviews.map(review => {
    assert.deepEqual(Object.keys(review).sort(), ['id', 'sourceSHA256', 'stableKey', 'updatedAt', 'valueSHA256'])
    assert(typeof review.id === 'number' ? Number.isSafeInteger(review.id) && review.id > 0 : typeof review.id === 'string' && review.id.length > 0)
    assert(typeof review.updatedAt === 'string' && Number.isFinite(Date.parse(review.updatedAt)) && Date.parse(review.updatedAt) <= Date.now())
    assert(SHA.test(review.sourceSHA256) && SHA.test(review.valueSHA256))
    const template = templates.get(review.stableKey)!, source = sources.get(template.sourceRecord.sourcePath)!
    assert.equal(digest(canonical(template.sourceRecord)), review.sourceSHA256, 'Historical source record changed')
    const root = readSourceValue(source.text, source.sourcePath, template.sourceRecord.locator)
    const value = locateValue(root, template.sourceRecord.locator)
    assert.equal(digest(canonical(value)), review.valueSHA256, 'Sealed content differs from historical approval')
    const record = { ...structuredClone(template), structuredValue: value, bodyFormat: 'plain', _status: 'published' as const, hold: false }
    validateUnifiedRecord(record)
    return record
  })
  const candidate = exportUnifiedContent(records, input.originals, input.active, false)
  assert.deepEqual(candidate.manifest, frozen.candidate, 'Historical three-way export differs from the frozen publication')
  assert.equal(candidate.manifest.candidateSHA256, editorial.candidateSHA256)
  assert.deepEqual(candidate.manifest.changed, editorial.changed)
  const changed = new Map(candidate.files.map(source => [source.sourcePath,
    { sourcePath: source.sourcePath, text: source.content, sha256: source.candidateSHA256 }]))
  for (const active of input.active) {
    const expected = changed.get(active.sourcePath) ?? active, sealed = sources.get(active.sourcePath)!
    assert.equal(sealed.sha256, expected.sha256, 'Unreported historical source edit')
    assert.equal(sealed.text, expected.text)
  }
  return { records, candidate, reviews: editorial.reviews, reviewPin: editorial.reviewPin,
    kind: 'historical_sealed_review_reverified', currentCMSRead: false, approvalGranted: false, freshnessRenewed: false, productionReady: false } as const
}
