import assert from 'node:assert/strict'
import { digest } from '../../../scripts/desktop-release-assets.mjs'

export const nteMaterialSource = 'packages/data/games/nte/raw-character-materials.json'
export const nteMaterialReader = 'apps/game-nte/lib/data.ts'
const sourceImport = "import rawCharacterMaterials from '@gachia/data/games/nte/raw-character-materials.json';"
const relationImport = "import { nteCharacterMaterialRelationId } from '@gachia/data/games/nte/character-identity';"
const oldReader = 'export function getCharacterMaterials(id: string) { return characterMaterials.find((entry) => entry.characterId === id); }'
const correctedReader = `export function getCharacterMaterials(id: string) {
  const relationId = nteCharacterMaterialRelationId(id);
  return characterMaterials.find((entry) => entry.characterId === relationId);
}`

// This is the complete reviewed reader patch, not permission to publish arbitrary application code.
export function correctedNteMaterialReader(text: string) {
  if (text.includes(relationImport) && text.includes(correctedReader)) return text
  assert.equal(text.split(sourceImport).length, 2, 'Unexpected NTE material import')
  assert.equal(text.split(oldReader).length, 2, 'Unexpected NTE material reader')
  assert(!text.includes('nteCharacterMaterialRelationId'), 'Partially changed NTE material reader')
  return text.replace(sourceImport, sourceImport + '\n' + relationImport).replace(oldReader, correctedReader)
}

type Source = { sourcePath: string; text: string; sha256: string }
export function assertNteMaterialSourceChanges(baseline: Source[], candidate: Source[]) {
  assert.deepEqual(candidate.map(row => row.sourcePath), baseline.map(row => row.sourcePath))
  assert.equal(new Set(baseline.map(row => row.sourcePath)).size, baseline.length)
  const changed: string[] = []
  for (const [index, next] of candidate.entries()) {
    const previous = baseline[index]
    assert.equal(digest(previous.text), previous.sha256); assert.equal(digest(next.text), next.sha256)
    if (previous.sha256 === next.sha256) continue
    assert([nteMaterialSource, nteMaterialReader].includes(next.sourcePath), 'Unapproved NTE source correction')
    if (next.sourcePath === nteMaterialReader) assert.equal(next.text, correctedNteMaterialReader(previous.text), 'Reader differs from the exact reviewed canonical identity patch')
    changed.push(next.sourcePath)
  }
  assert(changed.length > 0, 'No NTE source correction')
  return changed
}
