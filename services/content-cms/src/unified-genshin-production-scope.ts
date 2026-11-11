import assert from 'node:assert/strict'
import { dedicatedCharacterTextPairContract, DEDICATED_CHARACTER_TEXT_SOURCES } from './unified-character-text'
import type { exportUnifiedContent, SourceBytes } from './unified-export'
import { digest } from './legacy-intake'

export const GENSHIN_PRODUCTION_SCOPE = 'genshin-independent-existing-character-text-v1'

// Source/build qualification only. The fixed production entry additionally
// requires the completed migration, current full A, live CMS review, exact CI,
// compatible recovery and unchanged Main/Router deployment identities.
export function genshinProductionOwnerScope(manifest: ReturnType<typeof exportUnifiedContent>['manifest'], active: SourceBytes[], overlays: SourceBytes[]) {
  assert.equal(manifest.preview, false, 'Rehearsal content cannot enter independent production')
  assert.equal(manifest.status, 'editorial_candidate'); assert.equal(manifest.changed.length, 1, 'One existing character per independent release')
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
  assert.deepEqual(edited.map(row => row.sourcePath), [DEDICATED_CHARACTER_TEXT_SOURCES.genshin], 'Other games and non-character sources must stay at published A')
  const pair = dedicatedCharacterTextPairContract(active, edited)
  assert.equal(pair.candidate.changes.length, 1); assert.equal(pair.candidate.changes[0].game, 'genshin')
  return { games: ['genshin'], owners: ['genshin'], services: ['gachia-game-genshin'], productionScope: GENSHIN_PRODUCTION_SCOPE }
}
