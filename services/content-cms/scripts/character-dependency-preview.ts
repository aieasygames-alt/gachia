import { readFile } from 'node:fs/promises'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { MATERIAL_PILOT_SCOPES } from '../src/material-public-preview'
import { CHARACTER_READER_SOURCES, characterDependencyPreview } from '../src/character-dependency-preview'
import routes from '../../../packages/core/route-ownership.json'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Read-only local preview; no arguments')
const read = (relative: string) => readFile(new URL(`../../../${relative}`, import.meta.url), 'utf8')
const readerHashes = Object.fromEntries(await Promise.all(Object.keys(CHARACTER_READER_SOURCES).map(async file => [file, digest(await read(file))])))
const sourceHashes: Record<string, string> = {}
const results = []
for (const game of MATERIAL_PILOT_SCOPES) {
  const source = async (name: string) => {
    const file = `packages/data/games/${game}/${name}.json`, text = await read(file)
    sourceHashes[file] = digest(text)
    return { file, text, value: JSON.parse(text) }
  }
  const materials = await source('raw-materials'), relations = await source('raw-character-materials'), characters = await source('raw-characters')
  const mapped = mapBatch([snapshot(game, materials.file, 'raw-json', materials.text)], { digest: digest(canonical(routes)), routes }).sources[0]
  if (mapped.state !== 'mapped' || mapped.records.length !== materials.value.length) throw new Error('Incomplete material mapping')
  const result = characterDependencyPreview(game, mapped.records, relations.value, characters.value, readerHashes)
  results.push({ game, previewKey: result.previewKey, summaries: result.summaries.length,
    eligible: result.summaries.filter(row => row.eligible).length,
    excluded: result.summaries.filter(row => !row.eligible).map(row => row.dto.id),
    materialCharacterLinks: result.links.reduce((n, row) => n + row.characters.length, 0),
    missingCharacters: result.missingCharacters, missingMaterials: result.missingMaterials,
    representativeSummary: result.summaries[0], blockers: result.blockers, dependencyClosureComplete: false })
}
console.log(JSON.stringify({ version: 'character-dependency-experiment-v1', readerHashes, sourceHashes, results, publishable: false, realWorkerIntegration: false }, null, 2))
