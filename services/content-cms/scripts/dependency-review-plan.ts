import { readFile } from 'node:fs/promises'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { dependencyReviewPlan } from '../src/dependency-review-plan'
import { MATERIAL_PILOT_SCOPES } from '../src/material-public-preview'
import routes from '../../../packages/core/route-ownership.json'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local read-only dependency plan; no arguments')
const sourceHashes: Record<string, string> = {}
const plans = []
for (const game of MATERIAL_PILOT_SCOPES) {
  async function read(name: string) {
    const relative = `packages/data/games/${game}/${name}.json`
    const text = await readFile(new URL(`../../../${relative}`, import.meta.url), 'utf8')
    sourceHashes[relative] = digest(text)
    return { relative, text, value: JSON.parse(text) }
  }
  const materials = await read('raw-materials'), relations = await read('raw-character-materials'), characters = await read('raw-characters')
  const batch = mapBatch([snapshot(game, materials.relative, 'raw-json', materials.text)], { digest: digest(canonical(routes)), routes })
  const source = batch.sources[0]
  if (source.state !== 'mapped' || source.records.length !== materials.value.length) throw new Error('Incomplete source mapping')
  plans.push(dependencyReviewPlan(game, source.records, relations.value, characters.value))
}
console.log(JSON.stringify({ version: 'dependency-review-experiment-v1', sourceHashes, plans, executable: false, publishable: false }, null, 2))
