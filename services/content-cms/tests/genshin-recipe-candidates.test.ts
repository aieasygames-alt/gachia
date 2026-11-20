import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { canonical } from '../src/record-mapping'
import { parseMaterial } from '../src/material-contract'
import { assertMaterialCandidateDependencies } from '../src/material-release-dependencies'
import { prepareGenshinRecipeCandidates, verifyGenshinRecipeCandidates, type RecipeDecisions, type RecipeReference } from '../src/genshin-recipe-candidates'

const source = (sourcePath: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n'; return { sourcePath, text, sha256: digest(text) }
}
const reference = (sourcePath: string, value: unknown): RecipeReference => {
  const row = source(sourcePath, value)
  return { ...row, gitBlob: createHash('sha1').update(`blob ${Buffer.byteLength(row.text)}\0`).update(row.text).digest('hex') }
}
const materialPath = 'packages/data/games/genshin/raw-materials.json'
const relationPath = 'packages/data/games/genshin/raw-character-materials.json'
const fixture = () => {
  const materials = [
    { id: 'mora', name: '摩拉', nameEn: 'Mora', type: 'currency', rarity: 3 },
    { id: 'mask', name: '面具', nameEn: 'Mask', type: 'common-drop', rarity: 1 },
  ]
  const labels = ['20-40', '40-50', '50-60', '60-70', '70-80', '80-90']
  const levels = ['1→2', '2→3', '3→4', '4→5', '5→6', '6→7', '7→8', '8→9', '9→10']
  const sources = [source(materialPath, materials), source('packages/data/games/genshin/raw-characters.json', [{ id: 'jean', name: '琴', nameEn: 'Jean' }]),
    source(relationPath, [{ characterId: 'jean', ascensionMaterials: labels.map(levelRange => ({ levelRange, materials: [{ id: 'mora', quantity: 1 }, { id: 'unverified-legacy', quantity: 3 }] })),
      talentMaterials: levels.map(talentLevel => ({ talentLevel, materials: [{ id: 'mora', quantity: 1 }, { id: 'mask', quantity: 1 }] })) }]),
    source('packages/data/games/nte/raw-materials.json', [{ id: 'collectors-drama-core', nameEn: 'Collector’s Drama Core' }]),
  ]
  const references: RecipeReference[] = []
  for (const [key, numericId, nameEn, name, rarity, typeText] of [
    ['mora', 202, 'Mora', '摩拉', 3, 'Common Currency'], ['mask', 301, 'Mask', '面具', 1, 'Character and Weapon Enhancement Material'],
    ['unratedflower', 101, 'Unrated Flower', '无评级花', undefined, 'Local Specialty (Liyue)'],
  ] as const) for (const locale of ['English', 'ChineseSimplified']) references.push(reference(`src/data/${locale}/materials/${key}.json`,
    { id: numericId, name: locale === 'English' ? nameEn : name, ...(rarity ? { rarity } : {}), typeText,
      description: 'Untranslated evidence', sources: ['Exact acquisition text'] }))
  references.push(reference('src/data/English/characters/jean.json', { id: 10000003, name: 'Jean', costs: Object.fromEntries(labels.map((_, i) => ['ascend' + (i + 1), [
    { id: 202, name: 'Mora', count: 20 * (i + 1) }, { id: 101, name: 'Unrated Flower', count: 3 * (i + 1) },
  ]])) }))
  references.push(reference('src/data/English/talents/jean.json', { id: 301, name: 'Jean', costs: Object.fromEntries(levels.map((_, i) => ['lvl' + (i + 2), [
    { id: 202, name: 'Mora', count: 30 * (i + 1) }, { id: 301, name: 'Mask', count: 2 * (i + 1) },
  ]])) }))
  const decisions: RecipeDecisions = {
    materials: [{ numericId: 202, referenceKey: 'mora', localId: 'mora', localRecordSHA256: digest(canonical(materials[0])), reason: 'Bilingual numeric identity' },
      { numericId: 301, referenceKey: 'mask', localId: 'mask', localRecordSHA256: digest(canonical(materials[1])), reason: 'Bilingual numeric identity' },
      { numericId: 101, referenceKey: 'unratedflower', localId: 'unrated-flower', localRecordSHA256: null, reason: 'New definition, missing rarity' }],
    characters: [{ localId: 'jean', referenceKey: 'jean', numericId: 10000003, talentRecordId: 301 }],
  }
  return { sources, references, decisions }
}
const prepare = (input: ReturnType<typeof fixture>) => prepareGenshinRecipeCandidates(input.sources, input.references, input.decisions)
const changeReference = (input: ReturnType<typeof fixture>, path: string, mutate: (row: any) => void) => {
  const index = input.references.findIndex(row => row.sourcePath === path), old = input.references[index]
  const value = JSON.parse(old.text); mutate(value); input.references[index] = reference(path, value)
}

test('costs use numeric identities and explicit stage labels, preserve inputs and keep missing fields held', () => {
  const input = fixture(), original = structuredClone(input), plan = prepare(input)
  assert.equal(plan.stages.length, 15); assert.equal(plan.patches.length, 15)
  const relations = JSON.parse(plan.overlays[1].text)
  assert.deepEqual(relations[0].ascensionMaterials[1].materials, [{ id: 'mora', quantity: 40 }, { id: 'unrated-flower', quantity: 6 }])
  assert.deepEqual(relations[0].talentMaterials[8].materials, [{ id: 'mora', quantity: 270 }, { id: 'mask', quantity: 18 }])
  const flower = plan.proposals.find(row => row.localId === 'unrated-flower')!
  assert.deepEqual(flower.missingFields, ['rarity']); assert(!Object.hasOwn(flower.draft, 'rarity'))
  assert(!JSON.parse(plan.overlays[0].text).some((row: any) => row.id === 'unrated-flower'))
  assert.deepEqual(plan.remainingMaterialIds, ['unrated-flower'])
  assert.equal(plan.after.missingMaterialReferences, 6)
  assert.equal(plan.hold, true); assert.equal(plan.publishable, false); assert.equal(plan.draftIntakeEnabled, false)
  assert(plan.overlays.every(row => row.sourcePath.includes('/genshin/')))
  assert.deepEqual(input, original, 'No raw sources, cross-game data or references mutated')
  assert.deepEqual(verifyGenshinRecipeCandidates(plan, input.sources, input.references, input.decisions), plan)
  assert.throws(() => assertMaterialCandidateDependencies(input.sources, plan.overlays), /blocked by dependencies/)
})

test('a new definition requires agreeing rarity, copies evidence fields and invents no Japanese translation', () => {
  const input = fixture()
  for (const locale of ['English', 'ChineseSimplified']) changeReference(input, `src/data/${locale}/materials/unratedflower.json`, row => { row.rarity = 1 })
  const plan = prepare(input), definition = plan.proposals.find(row => row.localId === 'unrated-flower')!
  assert.deepEqual(definition.missingFields, []); parseMaterial(definition.draft)
  assert.equal(definition.draft.rarity, 1); assert.equal(definition.draft.type, 'local-specialty')
  assert.equal(definition.draft.description, 'Untranslated evidence')
  assert.deepEqual(definition.draft.acquisitionEn, ['Exact acquisition text'])
  assert(!Object.keys(definition.draft).some(key => key.endsWith('Ja')))
  assert.equal(plan.after.dependencyClosureComplete, true)
  assert.equal(plan.publishable, false, 'Structural closure is not publication approval')
})

test('invalid quantities, duplicate cost identities, unknown stages and shifted labels fail without inference', () => {
  for (const count of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '3', null]) {
    const input = fixture()
    changeReference(input, 'src/data/English/characters/jean.json', row => { row.costs.ascend1[0].count = count })
    assert.throws(() => prepare(input), /positive safe integer/)
  }
  const duplicate = fixture()
  changeReference(duplicate, 'src/data/English/talents/jean.json', row => { row.costs.lvl2.push(row.costs.lvl2[0]) })
  assert.throws(() => prepare(duplicate), /Duplicate cost material/)
  const missing = fixture()
  changeReference(missing, 'src/data/English/talents/jean.json', row => { delete row.costs.lvl10 })
  assert.throws(() => prepare(missing), /cost stages/)
  const shifted = fixture(), relation = JSON.parse(shifted.sources[2].text)
  relation[0].ascensionMaterials[0].levelRange = '40-50'; shifted.sources[2] = source(relationPath, relation)
  assert.throws(() => prepare(shifted), /Stage label/)
})

test('locale/cost/character identity mismatches and ambiguous or unanchored decisions fail', () => {
  const cases: [string, (row: any) => void, RegExp][] = [
    ['src/data/ChineseSimplified/materials/mora.json', row => { row.id = 203 }, /locale identity/],
    ['src/data/ChineseSimplified/materials/mora.json', row => { row.rarity = 4 }, /locale rarity/],
    ['src/data/English/characters/jean.json', row => { row.costs.ascend1[0].name = 'A different material' }, /Cost\/material identity/],
    ['src/data/English/talents/jean.json', row => { row.name = 'A different character' }, /Character\/talent name/],
    ['src/data/English/talents/jean.json', row => { row.id = 10000003 }, /Talent numeric identity/],
  ]
  for (const [path, mutate, expected] of cases) { const input = fixture(); changeReference(input, path, mutate); assert.throws(() => prepare(input), expected) }
  const duplicate = fixture(); duplicate.decisions.materials.push(duplicate.decisions.materials[0])
  assert.throws(() => prepare(duplicate), /Ambiguous numeric\/local/)
  const unanchored = fixture(), defs = JSON.parse(unanchored.sources[0].text)
  defs[0].name = '完全不同'; defs[0].nameEn = 'Different'; unanchored.sources[0] = source(materialPath, defs)
  unanchored.decisions.materials[0].localRecordSHA256 = digest(canonical(defs[0]))
  assert.throws(() => prepare(unanchored), /Unanchored local/)
})

test('corrupt, duplicate, missing and escaping evidence and stale content or edited candidates are rejected', () => {
  const corrupt = fixture(); corrupt.references[0].sha256 = '0'.repeat(64)
  assert.throws(() => prepare(corrupt), /Corrupt recipe reference/)
  const blob = fixture(); blob.references[0].gitBlob = '0'.repeat(40)
  assert.throws(() => prepare(blob), /Git blob/)
  const duplicate = fixture(); duplicate.references.push(duplicate.references[0])
  assert.throws(() => prepare(duplicate), /Duplicate recipe reference/)
  const missing = fixture(); missing.references = missing.references.filter(row => row.sourcePath !== 'src/data/ChineseSimplified/materials/mora.json')
  assert.throws(() => prepare(missing), /Missing recipe reference/)
  const escaping = fixture(); escaping.references[0].sourcePath = '../outside.json'
  assert.throws(() => prepare(escaping), /Unexpected recipe reference path/)
  const input = fixture(), plan = prepare(input), altered = structuredClone(plan)
  altered.overlays[1] = source(relationPath, [])
  assert.throws(() => verifyGenshinRecipeCandidates(altered, input.sources, input.references, input.decisions), /Stale or altered/)
  const defs = JSON.parse(input.sources[0].text); defs[0].rarity = 4; input.sources[0] = source(materialPath, defs)
  assert.throws(() => verifyGenshinRecipeCandidates(plan, input.sources, input.references, input.decisions), /Stale local material/)
})

const fixtureBytes = readFileSync(new URL('../reviews/2026-11-20-genshin-recipes-r136.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), 'ff3739acc01be5be398e1f0d703fec69a7fc9986587b43b4c0100428c2e60b57')
const real = JSON.parse(gunzipSync(fixtureBytes).toString('utf8'))
const realPlan = prepareGenshinRecipeCandidates(real.sources, real.references, real.decisions)

test('the self-contained R136 fixture replays all 90 characters and 1,350 stages against pinned bilingual evidence', () => {
  assert.equal(real.referenceCommit, '8e5badd60b5d894284ccc927a56c9683529d2592')
  assert.equal(realPlan.candidateKey, real.expectedCandidateKey)
  assert.deepEqual(realPlan.overlays.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), real.expectedOverlayPins)
  assert.equal(realPlan.stages.length, 1350); assert.equal(realPlan.patches.length, 1066)
  assert.equal(real.decisions.characters.length, 90)
  assert.equal(realPlan.before.materialReferences, 5400); assert.equal(realPlan.after.materialReferences, 5490)
  assert.equal(realPlan.proposals.filter(row => row.action === 'new-definition').length, 84)
  assert.equal(realPlan.proposals.filter(row => row.action === 'new-definition' && !row.missingFields.length).length, 68)
  assert.equal(realPlan.proposals.filter(row => row.action === 'correct-existing').length, 45)
  assert.equal(realPlan.after.missingMaterialIds, 16); assert.equal(realPlan.after.missingMaterialReferences, 150)
  assert.deepEqual(realPlan.after.missingCharacterIds, ['mualani', 'ororon'])
  const relations = JSON.parse(realPlan.overlays[1].text)
  const index = new Map(real.references.map((row: RecipeReference) => [row.sourcePath, JSON.parse(row.text)]))
  const numericById = new Map(real.decisions.materials.map((row: RecipeDecisions['materials'][number]) => [row.localId, row.numericId]))
  for (const stage of realPlan.stages) {
    const parts = stage.pointer.slice(1).split('/'), ingredients = parts.reduce((value: any, key: string) => value[key], relations)
    const actual = ingredients.map((row: any) => ({ id: numericById.get(row.id), count: row.quantity })).sort((a: any, b: any) => a.id - b.id)
    const expected = (index.get(stage.referencePath) as any).costs[stage.costKey].map((row: any) => ({ id: row.id, count: row.count })).sort((a: any, b: any) => a.id - b.id)
    assert.deepEqual(actual, expected, stage.pointer)
  }
  assert.equal(real.license.sha256, digest(real.license.text))
  assert.match(real.license.text, /MIT License/)
  assert.throws(() => assertMaterialCandidateDependencies(real.sources, realPlan.overlays), /blocked by dependencies/)
})

test('R136 separates Treasure Hoarder and Fatui identities, resolves six conflicts and preserves stable IDs', () => {
  const mapping = new Map(realPlan.proposals.map(row => [row.numericId, row]))
  for (const [numericId, localId, zh] of [[112032, 'recruits-insignia', '新兵的徽记'], [112033, 'sergeants-insignia', '士官的徽记'],
    [112034, 'lieutenants-insignia', '尉官的徽记'], [112035, 'treasure-hoarder-insignia', '寻宝鸦印'], [112037, 'golden-raven-insignia', '攫金鸦印']] as const) {
    assert.equal(mapping.get(numericId)!.localId, localId); assert.equal(mapping.get(numericId)!.draft.name, zh)
  }
  assert.equal(mapping.get(113009)!.localId, 'basalt-petrification'); assert.equal(mapping.get(113009)!.draft.nameEn, 'Basalt Pillar')
  assert.equal(mapping.get(112046)!.localId, 'famous-handguard'); assert.equal(mapping.get(112046)!.draft.nameEn, 'Famed Handguard')
  assert.equal(mapping.get(112009)!.localId, 'concealing-scroll'); assert.equal(mapping.get(112009)!.draft.name, '封魔绘卷')
  assert.equal(mapping.get(113036)!.localId, 'smaragdistite-jade-branch'); assert.equal(mapping.get(113036)!.draft.name, '蕈王钩喙')
  const malicious = structuredClone(real.decisions)
  const recruit = malicious.materials.find((row: any) => row.numericId === 112032), treasure = malicious.materials.find((row: any) => row.numericId === 112035)
  const old = { localId: recruit.localId, localRecordSHA256: recruit.localRecordSHA256 }
  recruit.localId = treasure.localId; recruit.localRecordSHA256 = null
  Object.assign(treasure, old)
  assert.throws(() => prepareGenshinRecipeCandidates(real.sources, real.references, malicious), /Conflicting English numeric/)
})

test('Jean receives the missing boss cost and Hu Tao has 46 boss drops, 168 specialties and one crown per talent', () => {
  const relations = JSON.parse(realPlan.overlays[1].text)
  const jean = relations.find((row: any) => row.characterId === 'jean')
  assert.deepEqual(Object.fromEntries(jean.ascensionMaterials[1].materials.map((row: any) => [row.id, row.quantity])), {
    'vayuda-turquoise-fragment': 3, 'dandelion-seed': 10, 'damaged-mask': 15, mora: 40000, 'hurricane-seed': 2,
  })
  const hutao = relations.find((row: any) => row.characterId === 'hu-tao')
  const total = (group: any[], id: string) => group.flatMap(row => row.materials).filter(row => row.id === id).reduce((sum, row) => sum + row.quantity, 0)
  assert.equal(total(hutao.ascensionMaterials, 'juvenile-jade'), 46)
  assert.equal(total(hutao.ascensionMaterials, 'silk-flower'), 168)
  assert.equal(total(hutao.talentMaterials, 'crown-of-insight'), 1)
  assert.equal(total(hutao.talentMaterials, 'mora'), 1652500)
  const characters = JSON.parse(real.sources.find((row: any) => row.sourcePath.endsWith('/raw-characters.json')).text)
  assert.equal(characters.find((row: any) => row.id === 'hu-tao').descriptionEn,
    'The 77th Director of the Wangsheng Funeral Parlor in Liyue, Hu Tao is a 5-star Pyro character who wields a polearm.')
  assert(!realPlan.overlays.some(row => row.sourcePath.endsWith('/raw-characters.json')))
})

test('unresolved legacy IDs have no generated aliases, missing rarity is not guessed and original raw data is preserved', () => {
  const original = JSON.parse(real.sources.find((row: any) => row.sourcePath === relationPath).text)
  const identityReview = JSON.parse(readFileSync(new URL('../reviews/2026-11-20-genshin-material-identities.json', import.meta.url), 'utf8'))
  assert.equal(real.sources.find((row: any) => row.sourcePath === relationPath).sha256, identityReview.candidateSHA256)
  for (const row of real.sources) assert.equal(digest(row.text), row.sha256, 'Historical input stays immutable')
  assert(original.some((row: any) => JSON.stringify(row).includes('alien-life-conjecture')))
  assert(!realPlan.proposals.some(row => row.localId === 'alien-life-conjecture'))
  const held = realPlan.proposals.filter(row => row.missingFields.length)
  assert.equal(held.length, 16)
  for (const row of held) { assert.deepEqual(row.missingFields, ['rarity']); assert(!Object.hasOwn(row.draft, 'rarity')); assert(row.hold) }
  assert.equal(realPlan.proposals.filter(row => row.rarityEvidence === 'retained-local-unverified').length, 33)
})
