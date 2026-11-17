import assert from 'node:assert/strict'
import test from 'node:test'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { buildMaterialDependencySnapshot, verifyMaterialDependencySnapshot } from '../src/material-dependency-snapshot'
import routes from '../../../packages/core/route-ownership.json'

const policy = { digest: digest(canonical(routes)), routes }
function candidates() {
  return mapBatch([snapshot('nte', 'packages/data/games/nte/raw-materials.json', 'raw-json', JSON.stringify([
    { id: 'ore', name: 'Ore', type: 'ore', rarity: 1 },
  ]))], policy).sources[0].records
}
const relations = [{ characterId: 'zero', levelingMaterials: [{ levelRange: '1-10', materials: [{ id: 'ore', quantity: 2 }, { id: 'missing', quantity: 3 }] }], skillMaterials: [{ id: 'ore', quantity: 4 }] }]
const characters = [{ id: 'zero-male' }, { id: 'zero-female' }]

test('dependency snapshot keeps source order, stages and quantities while held', () => {
  const result = buildMaterialDependencySnapshot('nte', candidates(), relations, characters)
  assert.deepEqual(result.materials.map(row => row.dto.material.id), ['ore'])
  assert.deepEqual(result.relations, relations)
  assert.deepEqual(result.edges.map(row => [row.materialId, row.quantity]), [['ore', 2], ['missing', 3], ['ore', 4]])
  assert.deepEqual(result.missingMaterials, ['missing'])
  assert.deepEqual(result.missingCharacters, [])
  assert.deepEqual(result.characterIdentityResolutions.map(identity => ({ sourceId: identity.sourceId, displayVariantIds: identity.displayVariantIds })), [
    { sourceId: 'zero', displayVariantIds: ['zero-male', 'zero-female'] },
  ])
  assert.equal(result.hold, true)
  assert.equal(result.executable, false)
  assert.equal(result.publishable, false)
  assert.equal(result.releaseCompatible, false)
  assert.deepEqual(verifyMaterialDependencySnapshot(result), result)
})

test('dependency snapshot integrity rejects changed stages, quantities and flags', () => {
  const result = buildMaterialDependencySnapshot('nte', candidates(), relations, characters)
  const changed = structuredClone(result)
  const firstRelation = changed.relations[0] as unknown as { levelingMaterials: { materials: { quantity: number }[] }[] }
  firstRelation.levelingMaterials[0].materials[0].quantity++
  assert.throws(() => verifyMaterialDependencySnapshot(changed), /integrity/)
  assert.throws(() => verifyMaterialDependencySnapshot({ ...result, releaseCompatible: true } as never), /flags/)
})
