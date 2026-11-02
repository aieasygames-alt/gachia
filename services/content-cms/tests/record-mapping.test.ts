import assert from 'node:assert/strict'
import test from 'node:test'
import { snapshot } from '../src/legacy-intake'
import { diffBatches, mapBatch, mapSource } from '../src/record-mapping'

const policy = { digest: 'fixture-policy', routes: { games: { nte: { locales: ['zh', 'en', 'ja'], details: ['guides', 'characters'] } } } }
const source = (rows: unknown[], game = 'nte', family = 'guides') => snapshot(game, `packages/data/games/${game}/raw-${family}.json`, 'raw-json', JSON.stringify(rows))

test('identity adapters reject duplicates, malformed rows and unsupported shape instead of using array positions', () => {
  for (const rows of [[{ id: 'same' }, { id: 'same' }], [null], [{}], [{ id: 7 }], [{ id: 'x', title: 4 }]]) assert.throws(() => mapSource(source(rows), policy))
  assert.throws(() => mapSource(snapshot('nte', 'x/raw-guides.json', 'raw-json', '{}'), policy), /array/)
  assert.throws(() => mapSource(snapshot('nte', 'x/raw-image-sources.json', 'raw-json', '{}'), policy), /asset map/)
  assert.throws(() => mapSource(snapshot('lvmeng', 'apps/game-lvmeng/lib/data.ts', 'inline-code', 'throw Error()'), policy), /top-level/)
  assert.equal(mapSource(source([{ characterId: 'one', builds: [] }], 'nte', 'builds'), policy).records[0].legacyId, 'one')
})

test('game/region and family identities remain separate, including code-level regions', () => {
  const rows = [{ code: 'ABC', region: 'cn' }, { code: 'ABC', region: 'global' }]
  const local = mapSource(source(rows, 'roco-cn', 'redeem-codes'), policy).records
  const global = mapSource(source(rows, 'roco', 'redeem-codes'), policy).records
  assert.equal(new Set([...local, ...global].map(record => record.stableKey)).size, 4)
  assert.equal(local[0].mappingLevel, 'identity-only')
  assert.deepEqual(local[0].routeCandidates, [])
})

test('common fields preserve exact text and missing languages without granting indexability', () => {
  const row = { id: 'guide', title: 'Original', content: '**original**', titleEn: 'English', contentEn: '', faq: [{ question: 'Q' }], contentReview: { status: 'needs_verification' } }
  const record = mapSource(source([row]), policy).records[0]
  assert.deepEqual(record.translations[2], { locale: 'ja', title: null, body: null, summary: null })
  assert.equal(record.translations[1].body, '')
  assert.equal(record.translations[0].body, row.content)
  assert.ok(!record.unmappedFields.includes('faq'))
  assert.deepEqual(record.faqs, [{ locale: 'en', sourcePointer: 'faq/0', question: 'Q', answer: null }])
  assert.deepEqual(JSON.parse(record.rawRecord), row)
  assert.match(record.reviewText, /needs_verification/)
  assert.equal(record.hold, true)
  assert.ok(record.routeCandidates.every(route => route.owner === 'nte' && route.indexable === false))
  const correction = mapSource(source([{ id: 'legacy', contentReview: { status: 'needs_verification' } }], 'roco', 'characters'), policy).records[0]
  assert.equal(correction.mappingLevel, 'identity-only')
  assert.deepEqual(correction.translations, [])
})

test('record revisions are stable across formatting, reordering and unrelated record changes', () => {
  const a = source([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }])
  const b = source([{ title: 'B2', id: 'b' }, { title: 'A', id: 'a' }])
  const old = mapBatch([a], policy)
  const next = mapBatch([b], policy)
  assert.equal(old.sources[0].records[0].revisionKey, next.sources[0].records[0].revisionKey)
  assert.equal(diffBatches(old, next).changes.length, 1)
  assert.equal(diffBatches(old, old).changes.length, 0)
})

test('missing sources and incomplete mappings never imply withdrawal; explicit complete empty lists require review', () => {
  const old = mapBatch([source([{ id: 'a' }])], policy)
  assert.equal(diffBatches(old, mapBatch([], policy)).changes[0].kind, 'source-review-required')
  const removed = diffBatches(old, mapBatch([source([])], policy))
  assert.equal(removed.changes[0].kind, 'withdrawal-review-required')
  assert.equal(removed.automaticallyDeleted, 0)
  assert.equal(removed.publishable, false)
  assert.throws(() => diffBatches(old, mapBatch([source([])], { ...policy, digest: 'new-policy' })), /re-baselining/)
})

test('source changes mark unchanged existing translations for review, without inventing missing translations', () => {
  const before = mapBatch([source([{ id: 'a', title: 'Before', content: 'Before', titleEn: 'English', contentEn: 'English body' }])], policy)
  const after = mapBatch([source([{ id: 'a', title: 'After', content: 'After', titleEn: 'English', contentEn: 'English body' }])], policy)
  assert.deepEqual(diffBatches(before, after).changes[0].translationReview, ['en'])
})
