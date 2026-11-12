import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditNteItems, locales, publicationReadiness, type ItemObservation } from '../src/nte-item-audit'

const raw = [{ id: 'example', name: 'Source name', nameEn: 'English', type: 'guide', rarity: 1, source: 'Source only' }]
const observations = (): ItemObservation[] => locales.map(locale => ({ locale,
  main: [{ id: 'example', name: locale === 'zh' ? 'Source name' : 'English', type: 'guide', rarity: 1, source: 'Source only' }],
  nte: [{ id: 'example', name: locale === 'zh' ? 'Source name' : 'English', type: 'guide', rarity: 1, source: locale === 'zh' ? 'Source only' : '' }] }))
test('semantic audit distinguishes explicit translations, legacy fallbacks and owner splits', () => {
  const result = auditNteItems(raw, observations())
  assert.equal(result.counts.differingViews, 2)
  assert.equal(result.counts.fallbackViews, 2)
  assert.ok(result.pages.every(row => row.owner === 'nte' && row.collectionOwner === 'nte'))
  assert.equal(result.materials[0].translations.some(row => row.locale === 'ja'), false)
  assert.equal(result.publishable, false)
})
test('semantic audit rejects missing, duplicated, reordered and silently extended source contracts', () => {
  assert.throws(() => auditNteItems(raw, observations().slice(1)), /locale/)
  const wrong = observations(); wrong[0].main[0].id = 'wrong'
  assert.throws(() => auditNteItems(raw, wrong), /identity/)
  assert.throws(() => auditNteItems([...raw, ...raw], observations()), /Duplicate/)
  assert.throws(() => auditNteItems([{ ...raw[0], unknown: true }], observations()), /unclassified/)
})
test('readiness requires every independently verified gate and never grants publication authority', () => {
  const complete = { semanticApproved: true, rightsReceiptsAuthenticated: true, editorAssigned: true, freezeApproved: true }
  for (const field of Object.keys(complete)) assert.equal(publicationReadiness({ ...complete, [field]: false }).ready, false)
  assert.equal(publicationReadiness({}).ready, false)
  assert.equal(publicationReadiness(complete).publishable, false)
})
