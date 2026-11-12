import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { materialSource } from '../src/material-contract'
import { MATERIAL_PILOT_SCOPES, materialPublicPreview, materialDependencyPreview } from '../src/material-public-preview'
import routes from '../../../packages/core/route-ownership.json'

const policy = { digest: digest(canonical(routes)), routes }
function candidates(game = 'nte', rows = [{ id: 'ore', name: 'Ore', type: 'ore', rarity: 1 }]) {
  return mapBatch([snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify(rows))], policy).sources[0].records
}
test('typed material projection preserves presence and routes without fallback or private fields', () => {
  const raw = { id: 'ore', name: 'Ore', type: 'ore', rarity: 1, nameEn: '', nameJa: null, acquisition: [], notes: null }
  const candidate = candidates('nte', [raw])[0], result = materialPublicPreview(candidate)
  assert.deepEqual(materialSource(result.dto.material), raw)
  assert.equal(result.dto.routes[0].owner, 'nte')
  assert.equal(result.dto.routes[0].collectionOwner, 'nte')
  assert.equal(result.dto.routes[0].path, '/zh/nte/items/ore')
  assert.equal(materialPublicPreview(candidates('genshin')[0]).dto.routes[0].owner, 'genshin')
  assert.equal(materialPublicPreview(candidates('starrail')[0]).dto.routes[0].owner, 'main')
  assert.equal(result.publishable, false)
  assert.equal(result.releaseCompatible, false)
  assert.ok(!JSON.stringify(result.dto).includes('rawRecord'))
  assert.deepEqual(materialPublicPreview(candidate), result)
  assert.throws(() => materialPublicPreview({ ...candidate, rawRecord: '{}' }), /integrity/)
  assert.throws(() => materialPublicPreview(candidates('nte', [{ ...raw, id: '../escape' }])[0]), /identity/)
  assert.throws(() => materialPublicPreview(candidates('wuwa')[0]), /scope/)
  const stale = mapBatch([snapshot('nte', 'packages/data/games/nte/raw-materials.json', 'raw-json', JSON.stringify([raw]))], { ...policy, digest: 'old-policy' }).sources[0].records[0]
  assert.throws(() => materialPublicPreview(stale), /route policy/)
})
test('dependency graph preserves occurrences and reports missing references without claiming closure', () => {
  const rows = [{ characterId: 'hero', levelingMaterials: [{ levelRange: '1-10', materials: [{ id: 'ore', quantity: 2 }, { id: 'absent', quantity: 3 }] }], skillMaterials: [{ id: 'ore', quantity: 4 }] }]
  const report = materialDependencyPreview('nte', candidates(), rows, [])
  assert.equal(report.edges.length, 3)
  assert.deepEqual(report.related, [{ materialId: 'ore', characterIds: ['hero'] }])
  assert.deepEqual(report.missingMaterials, ['absent'])
  assert.deepEqual(report.missingCharacters, ['hero'])
  assert.equal(report.dependencyClosureComplete, false)
  assert.equal(report.publishable, false)
  assert.throws(() => materialDependencyPreview('nte', candidates(), [{ ...rows[0], unknown: [] }], []), /Unclassified/)
  assert.throws(() => materialDependencyPreview('nte', candidates(), [{ ...rows[0], skillMaterials: [{ id: 'ore', quantity: 0 }] }], []), /quantity/)
  assert.throws(() => materialDependencyPreview('nte', candidates(), [...rows, ...rows], []), /Duplicate/)
  assert.throws(() => materialDependencyPreview('nte', candidates('genshin'), [], []), /scope/)
  assert.throws(() => materialDependencyPreview('nte', candidates(), {}, []), /array/)
  assert.notEqual(materialDependencyPreview('nte', candidates(), rows, [{ id: 'hero', image: '/changed.webp' }]).previewKey, report.previewKey)
})
test('real material pilot round-trips every source field and audits actual dependency data', async () => {
  for (const game of MATERIAL_PILOT_SCOPES) {
    const read = async (name: string) => JSON.parse(await readFile(new URL(`../../../packages/data/games/${game}/${name}.json`, import.meta.url), 'utf8'))
    const raw = await read('raw-materials')
    const report = materialDependencyPreview(game, candidates(game, raw), await read('raw-character-materials'), await read('raw-characters'))
    assert.equal(report.previews.length, raw.length)
    const byId = new Map(raw.map((row: { id: string }) => [row.id, row]))
    report.previews.forEach(preview => assert.deepEqual(materialSource(preview.dto.material), byId.get(preview.dto.material.id)))
    assert.ok(report.edges.length > 0)
    assert.equal(report.dependencyClosureComplete, false)
  }
})
