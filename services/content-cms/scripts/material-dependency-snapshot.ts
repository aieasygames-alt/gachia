import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { buildMaterialDependencySnapshot } from '../src/material-dependency-snapshot'
import { MATERIAL_PILOT_SCOPES } from '../src/material-public-preview'
import routes from '../../../packages/core/route-ownership.json'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local read-only material dependency snapshot; no arguments')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const policy = { digest: digest(canonical(routes)), routes }
const snapshots = []
const sourceHashes: Record<string, string> = {}
for (const game of MATERIAL_PILOT_SCOPES) {
  async function read(name: string) {
    const relative = `packages/data/games/${game}/${name}.json`
    const text = await readFile(path.join(root, relative), 'utf8')
    sourceHashes[relative] = digest(text)
    return { relative, text, value: JSON.parse(text) }
  }
  const materials = await read('raw-materials')
  const relations = await read('raw-character-materials')
  const characters = await read('raw-characters')
  const batch = mapBatch([snapshot(game, materials.relative, 'raw-json', materials.text)], policy)
  const source = batch.sources[0]
  if (source.state !== 'mapped' || source.records.length !== materials.value.length) throw new Error(`Incomplete material mapping for ${game}`)
  snapshots.push(buildMaterialDependencySnapshot(game, source.records, relations.value, characters.value))
}
console.log(JSON.stringify({ version: 'material-dependency-snapshot-run-v1', sourceHashes, snapshots }, null, 2))
