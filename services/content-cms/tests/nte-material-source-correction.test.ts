import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertNteMaterialSourceChanges, correctedNteMaterialReader, nteMaterialReader, nteMaterialSource } from '../src/nte-material-source-correction'
import { projectRoot } from '../src/local-environment'

const current = readFileSync(path.resolve(projectRoot, '../../', nteMaterialReader), 'utf8')
const old = current.replace("import { nteCharacterMaterialRelationId } from '@gachia/data/games/nte/character-identity';\n", '')
  .replace(/export function getCharacterMaterials\(id: string\) \{\n  const relationId = nteCharacterMaterialRelationId\(id\);\n  return characterMaterials.find\(\(entry\) => entry.characterId === relationId\);\n\}/,
    'export function getCharacterMaterials(id: string) { return characterMaterials.find((entry) => entry.characterId === id); }')
const row = (sourcePath: string, text: string) => ({ sourcePath, text, sha256: digest(text) })

test('published reader restoration applies exactly the reviewed Zero canonical lookup', () => {
  assert.notEqual(old, current)
  assert.equal(correctedNteMaterialReader(old), current)
  assert.equal(correctedNteMaterialReader(current), current)
  assert.deepEqual(assertNteMaterialSourceChanges([row(nteMaterialReader, old), row(nteMaterialSource, '[]')],
    [row(nteMaterialReader, current), row(nteMaterialSource, '[]')]), [nteMaterialReader])
})
test('source correction preserves historical raw-only releases and rejects unrelated code, source reorder and no-op', () => {
  assert.deepEqual(assertNteMaterialSourceChanges([row(nteMaterialReader, old), row(nteMaterialSource, '[]')],
    [row(nteMaterialReader, old), row(nteMaterialSource, '[{}]')]), [nteMaterialSource])
  assert.throws(() => assertNteMaterialSourceChanges([row(nteMaterialReader, old)], [row(nteMaterialReader, current + '\n// unrelated')]))
  assert.throws(() => assertNteMaterialSourceChanges([row('packages/data/games/genshin/raw-characters.json', 'a')], [row('packages/data/games/genshin/raw-characters.json', 'b')]))
  assert.throws(() => assertNteMaterialSourceChanges([row(nteMaterialReader, old)], [row(nteMaterialReader, old)]))
  assert.throws(() => assertNteMaterialSourceChanges([row(nteMaterialReader, old), row(nteMaterialSource, '[]')], [row(nteMaterialSource, '[{}]'), row(nteMaterialReader, current)]))
  assert.throws(() => correctedNteMaterialReader(old.replace('return characterMaterials.find((entry) => entry.characterId === id)', 'return characterMaterials.find((entry) => entry.characterId.includes(id))')))
})
