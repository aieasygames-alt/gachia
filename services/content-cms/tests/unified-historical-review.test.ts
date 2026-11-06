import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { canonical } from '../src/record-mapping'
import { exportUnifiedContent } from '../src/unified-export'
import { verifyUnifiedHistoricalReview } from '../src/unified-historical-review'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'

const repo = path.resolve(projectRoot, '../..'), inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const originals = plan.sources.map(source => { const text = readFileSync(path.join(repo, source.sourcePath), 'utf8'); return { sourcePath: source.sourcePath, text, sha256: digest(text) } })
function fixture() {
  const record = structuredClone(plan.sources.find(source => source.sourcePath === 'packages/data/games/ananta/raw-guides.json')!
    .records.find(row => row.sourceRecord.locator.identity?.id === 'download-install-guide')!)
  record._status = 'published'; record.hold = false
  const value = record.structuredValue as Record<string, string>
  record.structuredValue = { ...value, content: value.content + '\nHistorical isolated fixture.' }
  const candidate = exportUnifiedContent([record], originals, originals, false)
  const reviews = [{ id: 99, stableKey: record.stableKey, updatedAt: '2026-11-05T00:00:00.000Z',
    sourceSHA256: digest(canonical(record.sourceRecord)), valueSHA256: digest(canonical(record.structuredValue)) }]
  const editorial = { schemaVersion: 1, kind: 'unified_desktop_editorial_selection', cmsMode: 'desktop', preview: false, planSHA256: plan.planSHA256,
    candidateSHA256: candidate.manifest.candidateSHA256, frozenManifestPin: 'a'.repeat(64), reviewPin: digest(canonical(reviews)), reviews,
    changed: candidate.manifest.changed, productionReady: false, activationSupported: false, cloudWrites: false }
  const changes = new Map(candidate.files.map(source => [source.sourcePath,
    { sourcePath: source.sourcePath, text: source.content, sha256: source.candidateSHA256 }]))
  return { plan, editorial, selected: [record.stableKey], originals, active: structuredClone(originals),
    sealedSources: originals.map(source => structuredClone(changes.get(source.sourcePath) ?? source)),
    frozen: { planSHA256: plan.planSHA256, candidate: structuredClone(candidate.manifest) }, frozenPin: 'a'.repeat(64) }
}

test('historical review is independently reconstructed from sealed sources without current CMS access', t => {
  let reads = 0
  t.mock.method(globalThis, 'fetch', async () => { reads++; throw Error('Current CMS must not be consulted') })
  const f = fixture(), result = verifyUnifiedHistoricalReview(f)
  assert.equal(result.kind, 'historical_sealed_review_reverified'); assert.equal(reads, 0)
  assert.equal(result.currentCMSRead, false); assert.equal(result.approvalGranted, false); assert.equal(result.freshnessRenewed, false)
  assert.deepEqual(result.candidate.manifest, f.frozen.candidate); assert.equal(result.productionReady, false)
})

for (const fault of ['frozen-pin', 'fixture', 'authority', 'plan', 'selection', 'missing-review', 'review-pin', 'source-record', 'value', 'date',
  'unknown-review-field', 'missing-source', 'duplicate-source', 'source-bytes', 'unreported-edit', 'candidate', 'changed']) {
  test(`historical sealed review refuses ${fault}`, () => {
    const f = fixture()
    if (fault === 'frozen-pin') f.frozenPin = 'b'.repeat(64)
    if (fault === 'fixture') f.editorial.preview = true
    if (fault === 'authority') f.editorial.productionReady = true
    if (fault === 'plan') f.frozen.planSHA256 = 'b'.repeat(64)
    if (fault === 'selection') f.selected = []
    if (fault === 'missing-review') f.editorial.reviews = []
    if (fault === 'review-pin') f.editorial.reviewPin = 'b'.repeat(64)
    if (fault === 'source-record') f.editorial.reviews[0].sourceSHA256 = 'b'.repeat(64)
    if (fault === 'value') f.editorial.reviews[0].valueSHA256 = 'b'.repeat(64)
    if (fault === 'date') f.editorial.reviews[0].updatedAt = '2999-01-01T00:00:00.000Z'
    if (fault === 'unknown-review-field') Object.assign(f.editorial.reviews[0], { approved: true })
    if (['source-record', 'value', 'date', 'unknown-review-field'].includes(fault)) f.editorial.reviewPin = digest(canonical(f.editorial.reviews))
    if (fault === 'missing-source') f.sealedSources.pop()
    if (fault === 'duplicate-source') f.sealedSources.push(f.sealedSources[0])
    if (fault === 'source-bytes') f.sealedSources[0].text += '\n'
    if (fault === 'unreported-edit') { f.sealedSources[0].text += '\n'; f.sealedSources[0].sha256 = digest(f.sealedSources[0].text) }
    if (fault === 'candidate') f.frozen.candidate.candidateSHA256 = 'b'.repeat(64)
    if (fault === 'changed') f.editorial.changed = []
    assert.throws(() => verifyUnifiedHistoricalReview(f))
  })
}
