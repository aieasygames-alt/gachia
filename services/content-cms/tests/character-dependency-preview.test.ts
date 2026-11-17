import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { CHARACTER_READER_SOURCES, characterDependencyPreview, verifyCharacterReaderSources } from '../src/character-dependency-preview'
import { resolveNteCharacterReference } from '../../../packages/data/games/nte/character-identity'
import routes from '../../../packages/core/route-ownership.json'

function candidates(game: string, raw = [{ id: 'ore', name: 'Ore', type: 'ore', rarity: 1 }]) {
  return mapBatch([snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify(raw))], { digest: digest(canonical(routes)), routes }).sources[0].records
}
const relation = (id: string) => ({ characterId: id, levelingMaterials: [], skillMaterials: [{ id: 'ore', quantity: 1 }] })
test('related character summaries preserve names, exact NTE image paths and reader exclusion without leaking source fields', () => {
  const raw = [{ id: 'hero', name: 'Hero', nameEn: '', nameJa: null, attribute: 'anima', privateNote: 'secret', image: 'https://evil.invalid/image' },
    { id: 'future', name: 'Future', attribute: 'anima', status: 'upcoming' },
    { id: 'disabled', name: 'Disabled', attribute: 'anima', availableAtLaunch: false }]
  const result = characterDependencyPreview('nte', candidates('nte'), ['hero', 'future', 'disabled', 'missing'].map(relation), raw, CHARACTER_READER_SOURCES)
  const summary = result.summaries[0]
  assert.deepEqual(summary.dto.names, [{ locale: 'zh', value: 'Hero' }, { locale: 'en', value: '' }, { locale: 'ja', value: null }])
  assert.equal(summary.dto.image.url, 'https://img.gachia.com/images/characters/hero.webp')
  assert.equal(summary.dto.routes[0].owner, 'nte')
  assert.ok(!JSON.stringify(summary.dto).includes('secret'))
  assert.ok(!JSON.stringify(summary.dto).includes('evil.invalid'))
  assert.deepEqual(summary.media, { bytesVerified: false, rightsVerified: false })
  assert.deepEqual(result.links[0].characters.map(r => [r.id, r.state]), [
    ['disabled', 'excluded-by-reader-policy'], ['future', 'excluded-by-reader-policy'], ['hero', 'eligible-preview'], ['missing', 'missing'],
  ])
  assert.ok(result.links[0].characters.filter(r => r.state !== 'eligible-preview').every(r => !r.paths.length))
  assert.equal(result.publishable, false)
  assert.equal(result.dependencyClosureComplete, false)
  assert.equal(result.releaseCompatible, false)
})

test('canonical NTE Zero material relation links both display pages and rejects unknown variants', () => {
  const raw = [{ id: 'zero-male', name: '零（男）', nameEn: 'Zero (Male)', attribute: 'cosmos' }, { id: 'zero-female', name: '零（女）', nameEn: 'Zero (Female)', attribute: 'cosmos' }]
  const result = characterDependencyPreview('nte', candidates('nte'), [{ characterId: 'zero', levelingMaterials: [], skillMaterials: [{ id: 'ore', quantity: 1 }] }], raw, CHARACTER_READER_SOURCES)
  assert.deepEqual(result.missingCharacters, [])
  assert.deepEqual(result.links[0].characters.map(character => character.id), ['zero-female', 'zero-male'])
  assert.deepEqual(result.characterIdentityResolutions.map(identity => identity.displayVariantIds), [['zero-male', 'zero-female']])
  assert.equal(resolveNteCharacterReference('zero-unknown', ['zero-male', 'zero-female']), null)
  assert.throws(() => resolveNteCharacterReference('zero', ['zero-male']), /missing display variants/)
})
test('reader policy drift and malformed public fields fail; source changes invalidate preview', () => {
  const raw = [{ id: 'hero', name: 'Hero', element: 'pyro', status: 'released' }]
  const rows = candidates('genshin')
  const run = (characters: unknown) => characterDependencyPreview('genshin', rows, [], characters, CHARACTER_READER_SOURCES)
  const result = run(raw)
  assert.equal(result.summaries[0].dto.image.pathname, '/images/genshin/characters/hero.webp')
  assert.throws(() => verifyCharacterReaderSources({}), /drift/)
  assert.throws(() => verifyCharacterReaderSources({ ...CHARACTER_READER_SOURCES, extra: 'forged' }), /drift/)
  for (const fields of [{ nameEn: 1 }, { name: '' }, { status: null }, { availableAtLaunch: 'false' }, { element: null }]) {
    assert.throws(() => run([{ ...raw[0], ...fields }]))
  }
  assert.notEqual(run([{ ...raw[0], status: 'upcoming' }]).previewKey, result.previewKey)
  assert.notEqual(run([{ ...raw[0], privateNote: 'source change' }]).previewKey, result.previewKey)
})
test('real character inputs and pinned adapter files match the reviewed three-scope policy', async () => {
  const read = (file: string) => readFile(new URL(`../../../${file}`, import.meta.url), 'utf8')
  const hashes = Object.fromEntries(await Promise.all(Object.keys(CHARACTER_READER_SOURCES).map(async file => [file, digest(await read(file))])))
  verifyCharacterReaderSources(hashes)
  for (const game of ['starrail', 'genshin', 'nte']) {
    const raw = async (name: string) => JSON.parse(await read(`packages/data/games/${game}/${name}.json`))
    const characters = await raw('raw-characters')
    const result = characterDependencyPreview(game, candidates(game, await raw('raw-materials')), await raw('raw-character-materials'), characters, hashes)
    assert.equal(result.summaries.length, characters.length)
    const expected = characters.filter((row: { status?: string; availableAtLaunch?: boolean }) => row.status !== 'upcoming' && (game !== 'nte' || row.availableAtLaunch !== false))
    assert.equal(result.summaries.filter(row => row.eligible).length, expected.length)
    assert.ok(result.summaries.every(row => !row.media.bytesVerified && !row.media.rightsVerified))
  }
})
