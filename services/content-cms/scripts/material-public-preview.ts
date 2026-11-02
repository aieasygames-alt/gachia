import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { MATERIAL_PILOT_SCOPES, materialDependencyPreview } from '../src/material-public-preview'
import routes from '../../../packages/core/route-ownership.json'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local read-only preview only; no arguments')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const policy = { digest: digest(canonical(routes)), routes }
const results = []
const sourceHashes: Record<string, string> = {}
for (const game of MATERIAL_PILOT_SCOPES) {
  async function source(name: string) {
    const relative = `packages/data/games/${game}/${name}.json`
    const text = await readFile(path.join(root, relative), 'utf8')
    sourceHashes[relative] = digest(text)
    return { text, relative }
  }
  const materials = await source('raw-materials'), relations = await source('raw-character-materials'), characters = await source('raw-characters')
  const batch = mapBatch([snapshot(game, materials.relative, 'raw-json', materials.text)], policy)
  const mapped = batch.sources[0]
  if (mapped.state !== 'mapped' || mapped.records.length !== JSON.parse(materials.text).length) throw new Error('Incomplete material mapping')
  const result = materialDependencyPreview(game, mapped.records, JSON.parse(relations.text), JSON.parse(characters.text))
  results.push({ game, previewKey: result.previewKey, materials: result.previews.length, edges: result.edges.length,
    missingMaterials: result.missingMaterials, missingCharacters: result.missingCharacters,
    blockers: result.blockers, dependencyClosureComplete: result.dependencyClosureComplete,
    representativePreview: result.previews[0] ?? null })
}
console.log(JSON.stringify({ version: 'material-public-pilot-v1', sourceHashes, sourceAuthority: 'legacy',
  results, publishable: false, realContentApproved: false, realWorkerIntegration: false }, null, 2))
