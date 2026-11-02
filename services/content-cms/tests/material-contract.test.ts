import assert from 'node:assert/strict'
import test from 'node:test'
import { digest, snapshot } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { draftKind } from '../src/review-plan'
import { materialSource, parseMaterial, previewMaterial } from '../src/material-contract'
import { contractCoverage } from '../src/contract-coverage'

const basic = { id: 'ore', name: 'Ore', nameEn: '', nameJa: null, type: 'resource', rarity: 3, source: 'Unverified legacy statement' }
const policy = { digest: 'contract-test', routes: { games: {} } }
const batch = (rows: unknown[], game = 'nte') => mapBatch([snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify(rows))], policy)

test('material contract preserves absent, empty, null and language without fallback', () => {
  const value = parseMaterial(basic)
  assert.deepEqual(materialSource(value), basic)
  assert.equal(value.translations[1].name, '')
  assert.equal(value.translations[2].name, null)
  assert.equal(Object.hasOwn(value.translations[0], 'description'), false)
  assert.equal(Object.hasOwn(value, 'stackLimit'), false)
})

test('shared material contract preserves ordered extensions and non-numeric stack limits', () => {
  const raw = { ...basic, typeZh: 'Resource label', stackLimit: 'Depends on server settings', descriptionEn: null, acquisition: ['First', 'Second', 'First'], acquisitionEn: [], uses: null, conversionsJa: ['A -> B'], notes: '' }
  const value = parseMaterial(raw)
  assert.deepEqual(materialSource(value), raw)
  assert.notEqual(value.translations[0].acquisition, raw.acquisition)
})

test('unknown fields and incorrect semantic shapes are blocked rather than dropped', () => {
  for (const change of [{ name: '' }, { id: 1 }, { type: null }, { rarity: '3' }, { rarity: 0 }, { rarity: 6 }, { rarity: 1.5 }, { sourceEn: {} }, { acquisition: 'A' }, { uses: [1] }, { stackLimit: 999 }, { newMechanic: true }, { nameZh: 'ambiguous' }, { nameEn: undefined }]) {
    assert.throws(() => parseMaterial({ ...basic, ...change }))
  }
  for (const raw of [null, [], 'text']) assert.throws(() => parseMaterial(raw))
})

test('reverse projection refuses runtime invalid shape, locale and unknown typed fields', () => {
  const value = parseMaterial(basic)
  assert.throws(() => materialSource({ ...value, translations: [value.translations[0], value.translations[0]] }), /duplicate/)
  assert.throws(() => materialSource(JSON.parse(JSON.stringify({ ...value, unclassified: true }))), /invalid typed/)
  assert.throws(() => materialSource(JSON.parse(JSON.stringify({ ...value, translations: [{ locale: 'fr', name: 'x' }] }))), /locale/)
  assert.throws(() => materialSource(JSON.parse(JSON.stringify({ ...value, translations: [{ locale: 'zh', name: 'x', hidden: 1 }] }))), /translation fields/)
})

test('preview checks candidate identity and revision but never enables draft intake', () => {
  for (const game of ['nte', 'genshin', 'skjh']) {
    const candidate = batch([basic], game).sources[0].records[0]
    const preview = previewMaterial(candidate)
    assert.equal(preview.gameKey, game)
    assert.equal(preview.hold, true)
    assert.equal(preview.publishable, false)
    assert.equal(preview.draftIntakeEnabled, false)
    assert.equal(draftKind(candidate), null)
    assert.throws(() => previewMaterial({ ...candidate, rawRecord: '{}' }), /integrity/)
    const { revisionKey, ...rest } = { ...candidate, legacyId: 'wrong' }
    assert.throws(() => previewMaterial({ ...rest, revisionKey: digest(canonical(rest)) }), /identity/)
    const { revisionKey: ignored, ...wrongPath } = { ...candidate, sourcePath: 'unapproved.json' }
    assert.throws(() => previewMaterial({ ...wrongPath, revisionKey: digest(canonical(wrongPath)) }), /source contract/)
    const { revisionKey: ignoredHold, ...wrongHold } = { ...candidate, hold: false }
    assert.throws(() => previewMaterial(JSON.parse(JSON.stringify({ ...wrongHold, revisionKey: digest(canonical(wrongHold)) }))), /source contract/)
  }
})

test('coverage separates contract readiness from existing draft support and incomplete contracts', () => {
  const sources = [
    snapshot('nte', 'packages/data/games/nte/raw-materials.json', 'raw-json', JSON.stringify([basic, { ...basic, id: 'unknown', newMechanic: true }])),
    snapshot('nte', 'packages/data/games/nte/raw-guides.json', 'raw-json', JSON.stringify([{ id: 'guide', title: 'Guide' }])),
    snapshot('nte', 'packages/data/games/nte/raw-weapons.json', 'raw-json', JSON.stringify([{ id: 'weapon' }])),
    snapshot('roco', 'packages/data/games/roco/raw-materials.json', 'raw-json', '[]'),
    snapshot('nte', 'packages/data/games/nte/raw-unclassified.json', 'raw-json', '{}'),
  ]
  const input = mapBatch(sources, policy)
  const report = contractCoverage(input)
  assert.deepEqual(report.counts, { 'existing-draft-path': 1, 'contract-preview': 1, 'contract-blocked': 1, 'no-contract': 1 })
  assert.equal(report.total, 4)
  assert.equal(report.scopes.find(s => s.gameKey === 'roco')!.total, 0)
  assert.equal(report.sourceBacklog.length, 1)
  assert.equal(report.draftPolicyChanged, false)
  assert.deepEqual(contractCoverage(input), report)
  assert.equal(report.rows.find(r => r.status === 'contract-blocked')!.projection, null)
})
