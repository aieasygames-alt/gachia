import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { digest } from '../src/legacy-intake'
import { reviewGenshinMaterialIdentities, verifyGenshinMaterialIdentityReview } from '../src/material-identity-review'

const source = (sourcePath: string, value: unknown) => {
  const text = JSON.stringify(value)
  return { sourcePath, text, sha256: digest(text) }
}
const input = () => [
  source('packages/data/games/genshin/raw-materials.json', [
    { id: 'calla-lily', name: '嘟嘟莲', nameEn: 'Calla Lily', type: 'specialty', rarity: 1 },
  ]),
  source('packages/data/games/genshin/raw-characters.json', [{ id: 'kujou-sara', name: '九条裟罗', nameEn: 'Kujou Sara' }]),
  source('packages/data/games/genshin/raw-character-materials.json', [{ characterId: 'sara',
    ascensionMaterials: [{ levelRange: '20-40', materials: [{ id: 'callalily', quantity: 3 }, { id: 'unverified', quantity: 5 }] }],
    talentMaterials: [] }]),
]
const reference = () => [
  source('src/data/English/materials/callalily.json', { id: 100056, name: 'Calla Lily' }),
  source('src/data/ChineseSimplified/materials/callalily.json', { id: 100056, name: '嘟嘟莲' }),
  source('src/data/English/characters/kujousara.json', { id: 10000056, name: 'Kujou Sara' }),
  source('src/data/ChineseSimplified/characters/kujousara.json', { id: 10000056, name: '九条裟罗' }),
]

test('bilingual numeric identities repair only exact ID pointers and retain unresolved facts', () => {
  const sources = input(), refs = reference(), plan = reviewGenshinMaterialIdentities(sources, refs)
  assert.equal(plan.patches.length, 2)
  assert.deepEqual(plan.after, { missingMaterialIds: 1, missingMaterialReferences: 1, missingCharacterIds: 0, materialReferences: 2 })
  assert.deepEqual(JSON.parse(plan.candidate.text), [{ characterId: 'kujou-sara',
    ascensionMaterials: [{ levelRange: '20-40', materials: [{ id: 'calla-lily', quantity: 3 }, { id: 'unverified', quantity: 5 }] }], talentMaterials: [] }])
  assert.equal(plan.hold, true)
  assert.equal(plan.publishable, false)
  assert.equal(plan.recipeReviewed, false)
  assert.equal(plan.quantityReviewed, false)
  assert.equal(JSON.parse(sources[2].text)[0].characterId, 'sara', 'caller input is immutable')
  assert.deepEqual(verifyGenshinMaterialIdentityReview(plan, sources, refs), plan)
})

test('lexical matches without both agreeing locales stay held', () => {
  for (const refs of [[], reference().filter(row => !row.sourcePath.includes('ChineseSimplified')), [
    ...reference().filter(row => row.sourcePath !== 'src/data/ChineseSimplified/materials/callalily.json'),
    source('src/data/ChineseSimplified/materials/callalily.json', { id: 100056, name: '另一个材料' }),
  ]]) {
    const plan = reviewGenshinMaterialIdentities(input(), refs)
    assert.equal(plan.decisions.find(row => row.sourceId === 'callalily')!.status, 'held')
    assert(!plan.patches.some(row => row.before === 'callalily'))
  }
})

test('mismatched numeric identities, corrupt/duplicate evidence, and unbounded paths fail', () => {
  const refs = reference()
  assert.throws(() => reviewGenshinMaterialIdentities(input(), [refs[0], source(refs[1].sourcePath, { id: 100057, name: '嘟嘟莲' })]), /locale identity mismatch/)
  assert.throws(() => reviewGenshinMaterialIdentities(input(), [{ ...refs[0], sha256: '0'.repeat(64) }]), /Corrupt/)
  assert.throws(() => reviewGenshinMaterialIdentities(input(), [...refs, refs[0]]), /Duplicate reference/)
  assert.throws(() => reviewGenshinMaterialIdentities(input(), [source('../outside.json', { id: 1, name: 'anything' })]), /Unexpected identity reference path/)
  assert.throws(() => reviewGenshinMaterialIdentities([...input(), input()[0]], refs), /Duplicate content/)
})

test('stale content and quantity edits cannot reuse an approved identity plan', () => {
  const sources = input(), refs = reference(), plan = reviewGenshinMaterialIdentities(sources, refs)
  const changed = JSON.parse(sources[2].text); changed[0].ascensionMaterials[0].materials[0].quantity = 8
  const next = [...sources.slice(0, 2), source(sources[2].sourcePath, changed)]
  assert.throws(() => verifyGenshinMaterialIdentityReview(plan, next, refs), /Stale or altered/)
  const tampered = structuredClone(plan)
  tampered.candidate = source(plan.candidate.sourcePath, changed)
  assert.throws(() => verifyGenshinMaterialIdentityReview(tampered, sources, refs), /Stale or altered/)
})

test('the real R135 repair replays 498 reviewed ID changes without changing quantities, stages or other records', () => {
  const root = new URL('../../../', import.meta.url)
  const review = JSON.parse(readFileSync(new URL('../reviews/2026-11-20-genshin-material-identities.json', import.meta.url), 'utf8'))
  const currentText = readFileSync(new URL(review.sourcePath, root), 'utf8')
  assert.equal(digest(currentText), review.candidateSHA256)
  assert.equal(readFileSync(new URL(review.sourcePath.replace('packages/data/games/', 'apps/web/public/data/'), root), 'utf8'), currentText)
  const before = JSON.parse(currentText)
  for (const patch of review.patches) {
    const parts = patch.pointer.slice(1).split('/'), field = parts.pop()!
    const row = parts.reduce((value: any, key: string) => value[key], before)
    assert.equal(row[field], patch.after)
    row[field] = patch.before
  }
  const originalText = JSON.stringify(before, null, 2) + '\n'
  assert.equal(digest(originalText), review.sourceSHA256, 'No unrelated source bytes changed')
  for (const ref of review.referenceSources) {
    assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(ref.text)}\0`).update(ref.text).digest('hex'), ref.gitBlob)
  }
  const sources = ['materials', 'characters', 'character-materials'].map(family => {
    const sourcePath = `packages/data/games/genshin/raw-${family}.json`
    const text = family === 'character-materials' ? originalText : readFileSync(new URL(sourcePath, root), 'utf8')
    return { sourcePath, text, sha256: digest(text) }
  })
  const replay = reviewGenshinMaterialIdentities(sources, review.referenceSources)
  assert.deepEqual(replay.patches, review.patches)
  assert.equal(replay.candidate.sha256, review.candidateSHA256)
  assert.equal(replay.patches.length, 498)
  assert.equal(replay.decisions.filter(row => row.approved).length, 23)
  assert.deepEqual(replay.after, review.after)
})
