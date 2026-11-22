import assert from 'node:assert/strict'
import { dedicatedCharacterTextPairContract, DEDICATED_CHARACTER_TEXT_SOURCES } from './unified-character-text'
import { azurPromiliaGuideContract, AZUR_PROMILIA_GUIDE_SOURCE } from './azur-promilia-independent-text'
import type { exportUnifiedContent, SourceBytes } from './unified-export'
import { digest } from './legacy-intake'
import { NTE_MATERIAL_TEXT_SOURCE, nteMaterialTextPairContract } from './nte-material-text'
import { GENSHIN_MATERIAL_TEXT_SOURCE, genshinMaterialTextPairContract } from './genshin-material-text'

export const GENSHIN_PRODUCTION_SCOPE = 'genshin-independent-existing-character-text-v1'
export const GENSHIN_MATERIAL_PRODUCTION_SCOPE = 'genshin-independent-existing-material-text-v1'
export const NTE_PRODUCTION_SCOPE = 'nte-independent-existing-character-text-v1'
export const NTE_MATERIAL_PRODUCTION_SCOPE = 'nte-independent-existing-material-text-v1'
export const AZUR_PROMILIA_PRODUCTION_SCOPE = 'azur-promilia-independent-existing-text-v1'
export const LVMENG_PRODUCTION_SCOPE = 'lvmeng-independent-existing-character-text-v1'
export type IndependentProductionScope = typeof GENSHIN_PRODUCTION_SCOPE | typeof GENSHIN_MATERIAL_PRODUCTION_SCOPE | typeof NTE_PRODUCTION_SCOPE | typeof NTE_MATERIAL_PRODUCTION_SCOPE | typeof AZUR_PROMILIA_PRODUCTION_SCOPE | typeof LVMENG_PRODUCTION_SCOPE

// Source/build qualification only. The fixed production entry additionally
// requires the completed migration, current full A, live CMS review, exact CI,
// compatible recovery and unchanged Main/Router deployment identities.
export function genshinProductionOwnerScope(manifest: ReturnType<typeof exportUnifiedContent>['manifest'], active: SourceBytes[], overlays: SourceBytes[]) {
  return independentProductionOwnerScope('genshin', manifest, active, overlays)
}

export function independentProductionOwnerScope(owner: 'genshin' | 'nte' | 'azur-promilia' | 'lvmeng', manifest: ReturnType<typeof exportUnifiedContent>['manifest'], active: SourceBytes[], overlays: SourceBytes[]) {
  assert(['genshin', 'nte', 'azur-promilia', 'lvmeng'].includes(owner), 'Unqualified independent owner')
  assert.equal(manifest.preview, false, 'Rehearsal content cannot enter independent production')
  assert.equal(manifest.status, 'editorial_candidate'); assert.equal(manifest.changed.length, 1, 'One existing record per independent release')
  assert.equal(active.length, 115, 'Complete registered published A required')
  assert.equal(new Set(active.map(row => row.sourcePath)).size, active.length)
  assert.deepEqual(manifest.baselines.map(row => ({ sourcePath: row.sourcePath, sha256: row.activeSHA256 })).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    active.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)))
  for (const row of active) assert.equal(digest(row.text), row.sha256)
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length, 'Duplicate production overlay')
  assert.deepEqual(overlays.map(row => ({ sourcePath: row.sourcePath, sha256: row.sha256 })),
    manifest.files.map(row => ({ sourcePath: row.sourcePath, sha256: row.candidateSHA256 })), 'Production overlay differs from compiler manifest')
  const edited = overlays.filter(row => {
    const before = active.find(source => source.sourcePath === row.sourcePath); assert(before)
    assert.equal(digest(row.text), row.sha256)
    return row.sha256 !== before.sha256
  })
  const material = owner === 'nte' && edited.some(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)
  const genshinMaterial = owner === 'genshin' && edited.some(row => row.sourcePath === GENSHIN_MATERIAL_TEXT_SOURCE)
  if (genshinMaterial) {
    assert.deepEqual(edited.map(row => row.sourcePath), [GENSHIN_MATERIAL_TEXT_SOURCE], 'Other games and non-material sources must stay at published A')
    genshinMaterialTextPairContract(active, edited)
  } else if (material) {
    assert.deepEqual(edited.map(row => row.sourcePath), [NTE_MATERIAL_TEXT_SOURCE], 'Other games and non-material sources must stay at published A')
    nteMaterialTextPairContract(active, edited)
  } else if (owner === 'azur-promilia') {
    assert.deepEqual(edited.map(row => row.sourcePath), [AZUR_PROMILIA_GUIDE_SOURCE], 'Other games and non-guide sources must stay at published A')
    const pair = azurPromiliaGuideContract(active, edited)
    assert.equal(pair.changes.length, 1); assert.equal(pair.changes[0].game, owner)
  } else {
    assert.deepEqual(edited.map(row => row.sourcePath), [DEDICATED_CHARACTER_TEXT_SOURCES[owner]], 'Other games and non-character sources must stay at published A')
    const pair = dedicatedCharacterTextPairContract(active, edited)
    assert.equal(pair.candidate.changes.length, 1); assert.equal(pair.candidate.changes[0].game, owner)
  }
  return { games: [owner], owners: [owner], services: [`gachia-game-${owner}`], productionScope: genshinMaterial ? GENSHIN_MATERIAL_PRODUCTION_SCOPE : material ? NTE_MATERIAL_PRODUCTION_SCOPE : owner === 'genshin' ? GENSHIN_PRODUCTION_SCOPE : owner === 'nte' ? NTE_PRODUCTION_SCOPE : owner === 'azur-promilia' ? AZUR_PROMILIA_PRODUCTION_SCOPE : LVMENG_PRODUCTION_SCOPE }
}
