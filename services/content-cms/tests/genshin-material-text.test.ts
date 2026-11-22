import assert from 'node:assert/strict'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { genshinMaterialTextPairContract, GENSHIN_MATERIAL_TEXT_SOURCE } from '../src/genshin-material-text'
import { materialConsumerContract } from '../src/material-consumer-contract'
import { independentProductionOwnerScope, GENSHIN_MATERIAL_PRODUCTION_SCOPE } from '../src/unified-genshin-production-scope'
import { mergeGenshinMaterialTextExpectations, validateUnifiedConsumer } from '../src/unified-owner-build'
import { exportUnifiedContent } from '../src/unified-export'
import { assertStructuredEdit, contentUnit, structuredEditableLeaves, validateUnifiedRecord } from '../src/unified-content'

const source = (sourcePath: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n'; return { sourcePath, text, sha256: digest(text) }
}
const materials = [{ id: 'teachings-of-freedom', name: '自由的教导', nameEn: 'Teachings of Freedom', type: 'talent', rarity: 2,
  source: '秘境：蒙德（周一/四/日）', sourceEn: 'Domain: Mondstadt (周一/四/日)' },
{ id: 'ore', name: '矿石', nameEn: 'Ore', type: 'ore', rarity: 1, source: '采集', sourceEn: 'Gathering' }]
const active = [source(GENSHIN_MATERIAL_TEXT_SOURCE, materials), source('packages/data/games/genshin/raw-characters.json', [{ id: 'hu-tao' }]),
  source('packages/data/games/genshin/raw-character-materials.json', [{ characterId: 'hu-tao', ascensionMaterials: [
    { levelRange: '1-20', materials: [{ id: 'ore', quantity: 2 }] }], talentMaterials: [] }])]
const edit = (mutate: (rows: typeof materials) => void) => {
  const next = structuredClone(materials); mutate(next); return [source(GENSHIN_MATERIAL_TEXT_SOURCE, next)]
}
const approved = () => edit(rows => { rows[0].sourceEn = 'Domain: Mondstadt (Monday/Thursday/Sunday)' })
const editingBaseline = (row: ReturnType<typeof contentUnit>) => ({ publishedBaseline: {
  kind: 'genshin-published-editing-baseline-v1', source: row.sourceRecord, importOriginalSHA256: row.sourceRecord.originalSHA256,
  syncKey: 'a'.repeat(64), exportKey: 'b'.repeat(64), sourceIndex: { path: '/fixture/source-index.json', pin: 'c'.repeat(64) }, versionId: 'fixture-version',
} })

test('acquisition text is editable only in the exact Genshin material source; provenance and nested source remain protected', () => {
  const context = { game: 'genshin', family: 'materials', sourcePath: GENSHIN_MATERIAL_TEXT_SOURCE }
  assert.throws(() => assertStructuredEdit(materials[0], JSON.parse(approved()[0].text)[0]), /Protected/)
  assert.doesNotThrow(() => assertStructuredEdit(materials[0], JSON.parse(approved()[0].text)[0], '', context))
  assert(structuredEditableLeaves(materials[0], context).some(row => row.pointer === '/sourceEn'))
  assert(!structuredEditableLeaves(materials[0]).some(row => row.pointer === '/sourceEn'))
  for (const changed of [{ game: 'nte' }, { family: 'characters' }, { sourcePath: 'untrusted.json' }]) {
    assert.throws(() => assertStructuredEdit(materials[0], JSON.parse(approved()[0].text)[0], '', { ...context, ...changed }), /Protected/)
  }
  assert.throws(() => assertStructuredEdit({ nested: { source: 'old' } }, { nested: { source: 'new' } }, '', context), /Protected/)
  const row = contentUnit({ ...context, sourceSHA256: active[0].sha256, locator: { identity: { id: materials[0].id } }, original: materials[0] })
  row.reviewEvidence = editingBaseline(row)
  const next = { ...row, bodyFormat: 'plain', structuredValue: JSON.parse(approved()[0].text)[0] }
  assert.doesNotThrow(() => validateUnifiedRecord(next, { ...row, bodyFormat: 'plain' }))
  assert.throws(() => validateUnifiedRecord({ ...next, sourceRecord: { ...row.sourceRecord, sourceSHA256: 'a'.repeat(64) } }, { ...row, bodyFormat: 'plain' }), /Immutable/)
})

test('Genshin acquisition text binds visible candidate/recovery content in every actual fallback locale', () => {
  const pair = genshinMaterialTextPairContract(active, approved())
  assert.equal(pair.candidate.expectations.length, 9)
  assert.deepEqual(pair.candidate.changes[0].fields, [{ pointer: '/sourceEn', before: materials[0].sourceEn, value: 'Domain: Mondstadt (Monday/Thursday/Sunday)' }])
  for (const locale of ['en', 'ja']) {
    const route = `/${locale}/genshin/items/teachings-of-freedom`
    assert(pair.candidate.expectations.find(row => row.path === route)!.contains!.includes('>Domain: Mondstadt (Monday/Thursday/Sunday)<'))
    assert(pair.recovery.expectations.find(row => row.path === route)!.contains!.includes('>Domain: Mondstadt (周一/四/日)<'))
  }
  assert.deepEqual(materialConsumerContract('genshin', active).search, materialConsumerContract('genshin', [approved()[0], ...active.slice(1)]).search)
  const expected = pair.candidate.expectations.find(row => row.path === '/en/genshin/items/teachings-of-freedom')!
  const html = '<link rel="canonical" href="https://gachia.com' + expected.path + '"/><main><h1>Teachings of Freedom</h1><a href="/en/genshin/items">Back</a><p>Domain: Mondstadt (Monday/Thursday/Sunday)</p></main>'
  validateUnifiedConsumer({ status: 200, headers: new Headers({ 'content-type': 'text/html' }) }, Buffer.from(html), expected)
  assert.throws(() => validateUnifiedConsumer({ status: 200, headers: new Headers({ 'content-type': 'text/html' }) }, Buffer.from(html.replace('<p>Domain: Mondstadt (Monday/Thursday/Sunday)</p>', '<p>Old text</p>') + '<script>Domain: Mondstadt (Monday/Thursday/Sunday)</script>'), expected))
  assert.deepEqual(mergeGenshinMaterialTextExpectations(pair.candidate.expectations, pair.candidate.expectations), pair.candidate.expectations)
})

test('material text rejects structural edits, hidden fields, extra leaves, missing dependencies and other owners', () => {
  for (const mutate of [
    (rows: any[]) => { rows[0].rarity = 5 }, (rows: any[]) => { rows[0].id = 'new-id' },
    (rows: any[]) => { rows[0].type = 'currency' }, (rows: any[]) => { rows.reverse() },
    (rows: any[]) => { rows.pop() }, (rows: any[]) => { rows.push(rows[0]) },
    (rows: any[]) => { rows[0].sourceEn = '' }, (rows: any[]) => { rows[0].sourceEn = '<script>' },
    (rows: any[]) => { rows[0].sourceEn = null }, (rows: any[]) => { rows[0].description = 'Hidden' },
    (rows: any[]) => { rows[0].sourceEn += ' update'; rows[0].name += '更新' },
    (rows: any[]) => { rows[0].sourceEn += ' update'; rows[1].sourceEn += ' update' },
  ]) assert.throws(() => genshinMaterialTextPairContract(active, edit(mutate)))
  assert.throws(() => genshinMaterialTextPairContract(active, [...approved(), approved()[0]]))
  assert.throws(() => genshinMaterialTextPairContract(active, [...approved(), source(active[1].sourcePath, [{ id: 'changed' }])]))
  const bad = active.map(row => row.sourcePath.endsWith('raw-character-materials.json') ? source(row.sourcePath, [{ characterId: 'hu-tao', ascensionMaterials: [{ levelRange: '1-20', materials: [{ id: 'missing', quantity: 2 }] }], talentMaterials: [] }]) : row)
  assert.throws(() => genshinMaterialTextPairContract(bad, approved()), /dependencies/)
})

test('production scope retains complete published A and authorizes only one Genshin material', () => {
  const full = [...active, ...Array.from({ length: 112 }, (_, index) => source(`fixture/preserved-${index}.json`, { text: 'Published increment' }))]
  const record = contentUnit({ game: 'genshin', family: 'materials', sourcePath: GENSHIN_MATERIAL_TEXT_SOURCE,
    sourceSHA256: active[0].sha256, locator: { identity: { id: materials[0].id } }, original: materials[0] })
  record.reviewEvidence = editingBaseline(record)
  record.structuredValue = JSON.parse(approved()[0].text)[0]; record._status = 'published'; record.hold = false
  const exported = exportUnifiedContent([record], full, full, false)
  const overlays = exported.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 }))
  assert.deepEqual(independentProductionOwnerScope('genshin', exported.manifest, full, overlays), {
    games: ['genshin'], owners: ['genshin'], services: ['gachia-game-genshin'], productionScope: GENSHIN_MATERIAL_PRODUCTION_SCOPE,
  })
  assert.throws(() => independentProductionOwnerScope('nte', exported.manifest, full, overlays))
  assert.throws(() => independentProductionOwnerScope('genshin', exported.manifest, full.slice(1), overlays))
  assert.throws(() => independentProductionOwnerScope('genshin', { ...exported.manifest, preview: true }, full, overlays))
})
