import assert from 'node:assert/strict'
import { test } from 'node:test'
import { presence, mediaReferences, candidateLedger, buildContentLedger } from '../src/content-ledger'
import { mapBatch } from '../src/record-mapping'
import { snapshot } from '../src/legacy-intake'
import routes from '../../../packages/core/route-ownership.json'
test('ledger preserves missing/null/empty languages and does not infer rights from URLs', () => {
  assert.deepEqual([undefined, null, '', 'text'].map(presence), ['absent', 'null', 'empty', 'value'])
  assert.deepEqual(mediaReferences({ portrait: '/images/hero.webp', nested: [{ imageUrl: 'https://example.invalid/x.png' }] }), [{ pointer: '/portrait', value: '/images/hero.webp' }, { pointer: '/nested/0/imageUrl', value: 'https://example.invalid/x.png' }])
})
test('ledger reports candidates, unmapped facts, source ownership and holds without approval', () => {
  const source = snapshot('nte', 'packages/data/games/nte/raw-guides.json', 'raw-json', JSON.stringify([{ id: 'fixture', title: 'English', titleZh: '', content: 'Body', unknownFact: 42 }]))
  const rows = mapBatch([source], { digest: 'test', routes }).sources.flatMap(source => source.records)
  const entry = candidateLedger(rows[0])
  assert.equal(entry.hold, true); assert.equal(entry.publishable, false); assert.equal(entry.authority, 'legacy')
  assert.ok(entry.unmappedFields.includes('unknownFact')); assert.ok(entry.candidateURLs.every(url => url.liveVerified === false && url.indexable === false))
  assert.equal(entry.aliasStatus, 'unverified')
})

test('full ledger reconciles historical source identities without promoting bytes to rights', () => {
  const ledger = buildContentLedger()
  // Reader changes invalidate the batch identity even with unchanged content projections.
  assert.equal(ledger.historicalBatchMatches, false)
  assert.equal(ledger.counts.scopes, 16)
  assert.equal(ledger.counts.sources, 116)
  assert.equal(ledger.counts.candidates, 3440)
  assert.equal(ledger.families.reduce((count, family) => count + family.records, 0), 3440)
  assert.equal(ledger.counts.historicalHTTPMatches, 10)
  assert.equal(ledger.counts.rightsVerified, 0)
  assert.ok(ledger.media.every(row => row.publishable === false && row.rightsReceipt === null))
  assert.ok(ledger.sourceLedger.some(source => source.units?.some(unit => unit.state === 'reader-code')))
  assert.deepEqual(ledger.gaps.rawFilesOutsideBaseline, [])
  assert.deepEqual(ledger.gaps.missingManifestFiles, [])
})
