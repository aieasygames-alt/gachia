import assert from 'node:assert/strict'
import { dedicatedCharacterTextPairContract, DEDICATED_CHARACTER_TEXT_SOURCES } from './unified-character-text'
import type { exportUnifiedContent, SourceBytes } from './unified-export'

export const GENSHIN_LOCAL_SCOPE = 'genshin-only-local-v1'
export const GENSHIN_LOCAL_RAW = '/_games/genshin/content/data/raw-characters.json'

export function genshinLocalOwnerScope(manifest: ReturnType<typeof exportUnifiedContent>['manifest'], active: SourceBytes[], overlays: SourceBytes[]) {
  assert.equal(manifest.preview, true, 'Genshin-only scope requires a local preview')
  assert.equal(manifest.status, 'editorial_candidate')
  assert.equal(manifest.changed.length, 1, 'Genshin-only preview requires one editorial record')
  assert(manifest.baselines.every(row => row.originalSHA256 === row.activeSHA256), 'Genshin-only preview cannot omit public preservation deltas')
  const source = DEDICATED_CHARACTER_TEXT_SOURCES.genshin
  assert.deepEqual(manifest.files.map(row => row.sourcePath), [source], 'Genshin-only preview requires only the character source overlay')
  assert.deepEqual(overlays.map(row => row.sourcePath), [source])
  const [file] = manifest.files
  assert.equal(overlays[0].sha256, file.candidateSHA256, 'Genshin-only candidate bytes differ from its manifest')
  const [change, ...extra] = dedicatedCharacterTextPairContract(active, overlays).candidate.changes
  assert(change && !extra.length && change.game === 'genshin' && change.id === 'hu-tao', 'Genshin-only preview requires the Hu Tao readback case')
  assert.deepEqual(change.fields.map(field => field.pointer), ['/nameEn'], 'Genshin-only preview supports only the witnessed English name field')
  assert.equal(change.activeSHA256, file.activeSHA256, 'Genshin-only active bytes differ from its manifest')
  return { games: ['genshin'], owners: ['genshin'], services: ['gachia-game-genshin'], localScope: GENSHIN_LOCAL_SCOPE }
}
