import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { auditMaterialReleaseDependencies, assertMaterialCandidateDependencies } from '../src/material-release-dependencies'
import type { SourceBytes } from '../src/unified-export'
import { projectRoot } from '../src/local-environment'

const root = path.resolve(projectRoot, '../..')
const source = (game: string, family: string, value: unknown): SourceBytes => {
  const text = JSON.stringify(value)
  return { sourcePath: `packages/data/games/${game}/raw-${family}.json`, text, sha256: digest(text) }
}
const materials = [{ id: 'ore', name: '矿石', nameEn: 'Ore', type: 'ore', rarity: 1 }]
const nte = () => [source('nte', 'materials', materials), source('nte', 'characters', [{ id: 'zero-male' }, { id: 'zero-female' }]),
  source('nte', 'character-materials', [{ characterId: 'zero', levelingMaterials: [{ levelRange: '1-20', materials: [{ id: 'ore', quantity: 4 }] }], skillMaterials: [] }])]
const replace = (rows: SourceBytes[], family: string, value: unknown) => rows.map(row => row.sourcePath.endsWith(`/raw-${family}.json`) ? source(row.sourcePath.split('/')[3], family, value) : row)

test('dependency audit preserves occurrences, quantities and approved canonical page identities', () => {
  const input = nte(), audit = auditMaterialReleaseDependencies('nte', input)
  assert.equal(audit.dependencyClosureComplete, true)
  assert.deepEqual(audit.characterResolutions, [{ sourceId: 'zero', displayVariantIds: ['zero-male', 'zero-female'] }])
  assert.deepEqual(audit.edges, [{ characterId: 'zero', materialId: 'ore', quantity: 4, sourcePointer: '/0/levelingMaterials/0/materials/0' }])
  assert.equal(audit.publishable, false)
  assert.equal(audit.releaseCompatible, false)
  assert.throws(() => auditMaterialReleaseDependencies('nte', replace(input, 'characters', [{ id: 'zero-male' }])), /missing display variants/)
})

test('anonymous material entries are blockers instead of disappearing from reference counts', () => {
  const audit = auditMaterialReleaseDependencies('guihuan', [source('guihuan', 'materials', materials), source('guihuan', 'characters', [{ id: 'hero' }]),
    source('guihuan', 'character-materials', [{ characterId: 'hero', ascensionMaterials: [{ levelRange: '1-20', materials: [{ quantity: 20000 }, { id: 'ore', quantity: 2 }] }], talentMaterials: [] }])])
  assert.equal(audit.materialReferences, 2)
  assert.equal(audit.anonymousMaterialReferences, 1)
  assert.equal(audit.dependencyClosureComplete, false)
  assert.deepEqual(audit.issues, [{ code: 'missing-material-id', sourcePointer: '/0/ascensionMaterials/0/materials/0', identity: null, quantity: 20000 }])
})

test('new material edits require closure while unchanged legacy defects do not prevent character text edits', () => {
  const input = nte()
  const valid = assertMaterialCandidateDependencies(input, [source('nte', 'materials', [{ ...materials[0], name: '新矿石' }])])
  assert.equal(valid.games[0].mode, 'complete-material-closure')
  assert.throws(() => assertMaterialCandidateDependencies(input, [source('nte', 'materials', [])]), /blocked by dependencies/)
  const legacy = replace(input, 'character-materials', [{ characterId: 'unresolved-hero', levelingMaterials: [{ levelRange: '1-20', materials: [{ id: 'missing', quantity: 1 }] }], skillMaterials: [] }])
  const text = assertMaterialCandidateDependencies(legacy, [source('nte', 'characters', [{ id: 'zero-male', name: 'new text' }, { id: 'zero-female' }])])
  assert.equal(text.games[0].mode, 'no-dependency-regression')
  assert.equal(text.games[0].remainingIssues, 2)
  assert.throws(() => assertMaterialCandidateDependencies(legacy, [source('nte', 'materials', [{ ...materials[0], name: 'changed' }])]), /blocked by dependencies/)
  assert.throws(() => assertMaterialCandidateDependencies(input, [source('nte', 'characters', [{ id: 'zero-male' }])]), /missing display variants/)
  assert.deepEqual(assertMaterialCandidateDependencies(legacy, legacy).games, [])
})

test('invalid quantities, missing sources, unexpected shapes, duplicate and corrupt inputs fail closed', () => {
  const input = nte(), relation = JSON.parse(input[2].text)
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '4', null]) {
    const next = structuredClone(relation); next[0].levelingMaterials[0].materials[0].quantity = quantity
    assert.throws(() => auditMaterialReleaseDependencies('nte', replace(input, 'character-materials', next)), /positive safe integer/)
  }
  assert.throws(() => auditMaterialReleaseDependencies('nte', input.slice(0, 2)), /Missing material dependency source/)
  assert.throws(() => auditMaterialReleaseDependencies('nte', [...input, input[0]]), /Duplicate/)
  assert.throws(() => auditMaterialReleaseDependencies('nte', [{ ...input[0], sha256: '0'.repeat(64) }]), /Corrupt/)
  assert.throws(() => auditMaterialReleaseDependencies('nte', replace(input, 'materials', [...materials, ...materials])), /Duplicate/)
  assert.throws(() => auditMaterialReleaseDependencies('nte', replace(input, 'character-materials', [...relation, ...relation])), /Duplicate/)
  assert.throws(() => auditMaterialReleaseDependencies('nte', replace(input, 'character-materials', [{ ...relation[0], unknown: [] }])), /Unclassified/)
  assert.throws(() => auditMaterialReleaseDependencies('unreviewed', [source('unreviewed', 'materials', materials), source('unreviewed', 'characters', []), source('unreviewed', 'character-materials', [{}])]), /Unreviewed/)
})

test('all thirteen actual material domains retain every reference and expose previously missed blockers', () => {
  const reports = readdirSync(path.join(root, 'packages/data/games')).filter(game => {
    try { readFileSync(path.join(root, `packages/data/games/${game}/raw-materials.json`)); return true } catch { return false }
  }).map(game => {
    const input = ['materials', 'character-materials', 'characters'].flatMap(family => {
      const sourcePath = `packages/data/games/${game}/raw-${family}.json`
      try { const text = readFileSync(path.join(root, sourcePath), 'utf8'); return [{ sourcePath, text, sha256: digest(text) }] } catch { return [] }
    })
    return auditMaterialReleaseDependencies(game, input)
  })
  assert.equal(reports.length, 13)
  const genshin = reports.find(row => row.game === 'genshin')!
  assert.equal(genshin.missingMaterialIds.length, 53)
  assert.equal(genshin.issues.filter(row => row.code === 'missing-material-definition').length, 1279)
  assert.deepEqual(genshin.missingCharacterIds, ['mualani', 'ororon'])
  assert.equal(genshin.materialReferences, 5400)
  const guihuan = reports.find(row => row.game === 'guihuan')!
  assert(guihuan.anonymousMaterialReferences > 0)
  assert.equal(guihuan.status, 'blocked-by-dependencies')
  assert.equal(reports.find(row => row.game === 'nte')!.issues.length, 0)
  assert.equal(reports.find(row => row.game === 'nte')!.materialReferences, 42)
  assert.equal(reports.find(row => row.game === 'endfield')!.issues.length, 0)
})
