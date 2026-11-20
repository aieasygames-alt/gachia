import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { canonical } from '../src/record-mapping'
import { completeGenshinCandidates, verifyGenshinCandidateCompletion, type CompletionEvidence } from '../src/genshin-candidate-completion'

const bytes = readFileSync(new URL('../reviews/2026-11-20-genshin-completion-r137.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '7682c018fde90ed5366905c9bf53e0484dc4b796db905bfbfb62f20b336ff43d')
const input = JSON.parse(gunzipSync(bytes).toString('utf8'))
const prepare = (fixture = input) => completeGenshinCandidates(fixture.parent, fixture.parentKey, fixture.sources, fixture.evidence)
const plan = prepare()
const changedEvidence = (sourcePath: string, mutate: (value: any) => void) => {
  const fixture = structuredClone(input), row = fixture.evidence.find((row: CompletionEvidence) => row.sourcePath === sourcePath)
  assert(row); const value = JSON.parse(row.text); mutate(value)
  row.text = JSON.stringify(value); row.sha256 = digest(row.text)
  if (row.gitBlob) row.gitBlob = createHash('sha1').update(`blob ${Buffer.byteLength(row.text)}\0`).update(row.text).digest('hex')
  return fixture
}

test('R137 replays complete specialty/character overlays and closes all identity dependencies', () => {
  assert.equal(plan.completionKey, input.expectedCompletionKey)
  assert.deepEqual(plan.overlays.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), input.expectedOverlayPins)
  assert.deepEqual(plan.counts, { materialDefinitions: 269, materialReferences: 5490, characters: 117,
    missingMaterialIds: 0, missingMaterialReferences: 0, missingCharacterIds: 0, specialtyRanksReviewed: 49,
    newDefinitionsCompleted: 16, existingSpecialtiesVerified: 33, characterDefinitionsAdded: 2 })
  assert.equal(plan.dependencyClosureComplete, true)
  assert.equal(plan.dependencyGate.games.length, 1)
  assert.equal(plan.dependencyGate.games[0].mode, 'complete-material-closure')
  assert.equal(plan.dependencyGate.games[0].remainingIssues, 0)
  assert.deepEqual(verifyGenshinCandidateCompletion(plan, input.parent, input.parentKey, input.sources, input.evidence), plan)
})

test('all 49 ranks have explicit numeric API evidence and preserve the absent game rankLevel distinction', () => {
  assert.equal(plan.rankReviews.filter(row => row.action === 'new-definition-completed').length, 16)
  assert.equal(plan.rankReviews.filter(row => row.action === 'existing-display-rank-verified').length, 33)
  const game = JSON.parse(input.evidence.find((row: CompletionEvidence) => row.sourcePath.startsWith('ExcelBinOutput/')).text)
  for (const review of plan.rankReviews) {
    assert.equal(review.displayRank, 1); assert.equal(review.officialRarityCertified, false)
    const record = game[Number(review.gamePointer.slice(1))]
    assert.equal(record.id, review.numericId); assert(!Object.hasOwn(record, 'rankLevel'))
    assert(review.gameSortRank > 5, 'Sort order cannot be mistaken for the 1–5 display rank')
    if (review.action === 'existing-display-rank-verified') assert.equal(review.previousRarity, 1)
    assert(review.evidenceMeaning.includes('not official'))
  }
})

test('API identity, rank, missing evidence and game/API disagreement fail closed', () => {
  const first = plan.rankReviews[0], apiPath = `api/materials/${first.numericId}.json`
  for (const [mutate, expected] of [
    [(value: any) => { value.data.rank = '1' }, /display rank/],
    [(value: any) => { value.data.rank = 2 }, /display rank/],
    [(value: any) => { value.data.icon = 'UI_ItemIcon_999' }, /numeric identity/],
    [(value: any) => { value.data.name = 'Other material' }, /name mismatch/],
  ] as const) assert.throws(() => prepare(changedEvidence(apiPath, mutate)), expected)
  assert.throws(() => prepare(changedEvidence('ExcelBinOutput/MaterialExcelConfigData.json', (game: any[]) => {
    game.find(row => row.id === first.numericId).rankLevel = 2
  })), /Game rarity evidence changed/)
  const missing = structuredClone(input); missing.evidence = missing.evidence.filter((row: CompletionEvidence) => row.sourcePath !== apiPath)
  assert.throws(() => prepare(missing), /Missing completion evidence/)
})

test('two characters preserve all seven/eight skills, six constellations and evidenced version/acquisition', () => {
  const [mualani, ororon] = plan.characterReviews
  assert.equal(mualani.record.name, '玛拉妮'); assert.equal(ororon.record.name, '欧洛伦')
  assert.equal(mualani.record.rarity, 5); assert.equal(ororon.record.rarity, 4)
  assert.equal(mualani.record.element, 'hydro'); assert.equal(ororon.record.element, 'electro')
  assert.equal(mualani.record.weaponType, 'Catalyst'); assert.equal(ororon.record.weaponType, 'Bow')
  assert.equal(mualani.record.releaseVersion, '5.0'); assert.equal(ororon.record.releaseVersion, '5.2')
  assert.equal(mualani.record.acquisitionMethod, 'limited-banner'); assert.equal(ororon.record.acquisitionMethod, 'standard')
  assert.equal(Object.keys(mualani.record.skills).length, 7); assert.equal(Object.keys(ororon.record.skills).length, 8)
  assert.equal(ororon.skillSourceMapping.combatju, 'specialJump')
  assert.equal(mualani.record.skills.passive3.name, '夜域赐礼·波涛顶底')
  for (const review of plan.characterReviews) {
    assert.deepEqual(review.record.constellations.map(row => row.level), [1, 2, 3, 4, 5, 6])
    assert.equal(review.record.image, ''); assert.equal(review.mediaQualified, false)
    assert.equal(review.record.recommendedBuild.bestWeapon, '')
    assert.deepEqual(review.record.teamComps, []); assert.equal(review.record.tierRank, '')
    assert.equal(review.editorialRecommendationsInvented, false)
    assert(review.record.nameJa && review.record.cvZh && review.record.cvJp && review.record.cvEn)
  }
})

test('wrong character/skill/constellation/wiki identities or lost skills cannot close the candidate', () => {
  const cases: [string, (value: any) => void, RegExp][] = [
    ['src/data/ChineseSimplified/characters/mualani.json', value => { value.id = 10000105 }, /locale numeric/],
    ['src/data/English/constellations/ororon.json', value => { value.id = 10201 }, /numeric identity/],
    ['src/data/ChineseSimplified/talents/ororon.json', value => { value.name = '玛拉妮' }, /family name/],
    ['src/data/ChineseSimplified/talents/mualani.json', value => { delete value.passive3 }, /locale fields/],
    ['wiki/ororon-rendered.json', value => { value.parse.revid += 1 }, /revision mismatch/],
    ['api/avatars/mualani.json', value => { value.data.rank = 4 }, /strictly equal/],
  ]
  for (const [sourcePath, mutate, expected] of cases) assert.throws(() => prepare(changedEvidence(sourcePath, mutate)), expected)
})

test('corruption, duplicate/escaping evidence and mutable Git URLs are rejected', () => {
  const corrupt = structuredClone(input); corrupt.evidence[0].sha256 = '0'.repeat(64)
  assert.throws(() => prepare(corrupt), /Corrupt completion evidence/)
  const duplicate = structuredClone(input); duplicate.evidence.push(duplicate.evidence[0])
  assert.throws(() => prepare(duplicate), /Duplicate completion evidence/)
  const escaping = structuredClone(input); escaping.evidence[0].sourcePath = '../other.json'
  assert.throws(() => prepare(escaping), /Unbounded completion evidence/)
  const blob = structuredClone(input); blob.evidence.find((row: CompletionEvidence) => row.gitBlob).gitBlob = '0'.repeat(40)
  assert.throws(() => prepare(blob), /Git blob mismatch/)
  const mutable = structuredClone(input); mutable.evidence.find((row: CompletionEvidence) => row.sourcePath.startsWith('src/')).url = 'https://raw.githubusercontent.com/theBowja/genshin-db/main/characters/mualani.json'
  assert.throws(() => prepare(mutable), /Unpinned completion Git/)
})

test('stale/tampered parents, sources and result overlays cannot reuse a completion seal', () => {
  const stale = structuredClone(input); stale.parentKey = '0'.repeat(64)
  assert.throws(() => prepare(stale), /Unexpected parent/)
  const forged = structuredClone(input); forged.parent.proposals[0].draft.rarity += 1
  assert.throws(() => prepare(forged), /Corrupt parent/)
  const sourceDrift = structuredClone(input); sourceDrift.sources[0].text += ' '
  assert.throws(() => prepare(sourceDrift), /Corrupt completion source/)
  const altered = structuredClone(plan); altered.overlays[0].text += ' '
  assert.throws(() => verifyGenshinCandidateCompletion(altered, input.parent, input.parentKey, input.sources, input.evidence), /Stale or altered/)
})

test('R136 recipes, all existing characters and other source identities are preserved; closure never grants release', () => {
  assert.deepEqual(plan.overlays[1], input.parent.overlays[1], 'No recipe repeat or edits in R137')
  const before = JSON.parse(input.sources.find((row: any) => row.sourcePath.endsWith('/raw-characters.json')).text)
  const after = JSON.parse(plan.overlays[2].text)
  assert.deepEqual(after.slice(0, before.length), before)
  assert.equal(after.find((row: any) => row.id === 'hu-tao').descriptionEn,
    'The 77th Director of the Wangsheng Funeral Parlor in Liyue, Hu Tao is a 5-star Pyro character who wields a polearm.')
  assert(plan.overlays.every(row => row.sourcePath.startsWith('packages/data/games/genshin/')))
  assert.equal(plan.hold, true); assert.equal(plan.publishable, false); assert.equal(plan.newEntityQualified, false)
  assert.equal(plan.draftIntakeEnabled, false)
  const { candidateKey, ...data } = input.parent
  assert.equal(digest(canonical(data)), candidateKey, 'Caller-owned parent remains intact')
  for (const row of input.sources) assert.equal(digest(row.text), row.sha256)
})
