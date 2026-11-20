import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { nteMaterialTextPairContract, NTE_MATERIAL_TEXT_SOURCE } from '../src/nte-material-text'
import { readUnifiedSources } from '../src/unified-sources'
import { baselineDirectory } from '../src/inventory-baseline'
import { unifiedPlan } from '../src/unified-plan'
import { objectValue } from '../src/unified-content'
import { exportUnifiedContent } from '../src/unified-export'
import { independentProductionOwnerScope, NTE_MATERIAL_PRODUCTION_SCOPE, NTE_PRODUCTION_SCOPE } from '../src/unified-genshin-production-scope'
import { freezeUnifiedContent, verifyUnifiedFrozenSource } from '../src/unified-build'
import { frozenNteMaterialTextPairContract, frozenMaterialConsumerContracts } from '../src/unified-owner-build'
import { assertMaterialCandidateDependencies } from '../src/material-release-dependencies'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((row: { id: string }) => row.id))
const active = plan.sources.map(row => {
  const text = readFileSync(path.join(repo, row.sourcePath), 'utf8'); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
})
const edit = (mutate: (rows: any[]) => void) => {
  const rows = JSON.parse(active.find(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)!.text)
  mutate(rows); const text = JSON.stringify(rows, null, 2) + '\n'
  return [{ sourcePath: NTE_MATERIAL_TEXT_SOURCE, text, sha256: digest(text) }]
}
const reviewed = () => edit(rows => { rows.find(row => row.id === 'collectors-drama-core').nameEn = 'Collector’s Drama Core' })

test('existing NTE material names bind 174 candidate/recovery consumers and exact A text', () => {
  const pair = nteMaterialTextPairContract(active, reviewed())
  assert.equal(pair.candidate.changes[0].id, 'collectors-drama-core')
  assert.equal(pair.candidate.expectations.length, 174)
  const detail = '/en/nte/items/collectors-drama-core'
  assert.equal(pair.candidate.expectations.find(row => row.path === detail)!.materialPage!.name, 'Collector’s Drama Core')
  assert.equal(pair.recovery.expectations.find(row => row.path === detail)!.materialPage!.name, "Collector's Drama Core")
  assert.equal(pair.candidate.expectations.find(row => row.path === '/ja/nte/items')!.materialPage!.indexable, false)
  assert.equal(pair.candidate.expectations.find(row => row.path === '/ja/nte/items/collectors-drama-core')!.materialPage!.indexable, true)
})
test('material text qualification refuses membership, identity, nontext, provenance and unrelated changes', () => {
  for (const mutate of [
    (rows: any[]) => { rows[0].rarity += 1 },
    (rows: any[]) => { rows[0].type = 'currency' },
    (rows: any[]) => { rows[0].source += '未经核实' },
    (rows: any[]) => { rows[0].id += '-changed' },
    (rows: any[]) => { rows.push(structuredClone(rows[0])) },
    (rows: any[]) => { rows.reverse() },
    (rows: any[]) => { rows[0].nameEn = '' },
    (rows: any[]) => { rows[0].nameEn = '<script>' },
    (rows: any[]) => { rows[0].nameEn += ' A'; rows[1].nameEn += ' B' },
  ]) assert.throws(() => nteMaterialTextPairContract(active, edit(mutate)))
  const other = active.find(row => row.sourcePath === 'packages/data/games/nte/raw-characters.json')!
  assert.throws(() => nteMaterialTextPairContract(active, [...reviewed(), { ...other, text: other.text + ' ', sha256: digest(other.text + ' ') }]))
  const bad = structuredClone(active), rel = bad.find(row => row.sourcePath.endsWith('/nte/raw-character-materials.json'))!
  rel.text = rel.text.replace('elite-hunter-guide', 'unconfirmed-missing-id'); rel.sha256 = digest(rel.text)
  assert.throws(() => nteMaterialTextPairContract(bad, reviewed()), /dependencies/)
})
test('formal material scope keeps all public increments and qualifies only NTE', () => {
  const record = structuredClone(plan.sources.find(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)!.records.find(row => row.sourceRecord.locator.identity?.id === 'collectors-drama-core')!)
  assert(objectValue(record.structuredValue)); record.structuredValue.nameEn = 'Collector’s Drama Core'; record._status = 'published'; record.hold = false
  const published = structuredClone(active), genshin = published.find(row => row.sourcePath.endsWith('/genshin/raw-characters.json'))!
  const characters = JSON.parse(genshin.text); characters.find((row: any) => row.id === 'hu-tao').descriptionEn += ' Preserved public increment'
  genshin.text = JSON.stringify(characters, null, 2) + '\n'; genshin.sha256 = digest(genshin.text)
  // Git O contains the held R135 identity repair, while published A still has
  // the R134 relations. An NTE edit must preserve A, not publish that repair.
  const identityReview = JSON.parse(readFileSync(new URL('../reviews/2026-11-20-genshin-material-identities.json', import.meta.url), 'utf8'))
  const genshinRelations = published.find(row => row.sourcePath === identityReview.sourcePath)!
  const oldRelations = JSON.parse(genshinRelations.text)
  for (const patch of identityReview.patches) {
    const parts = patch.pointer.slice(1).split('/'), field = parts.pop()!
    const row = parts.reduce((value: any, key: string) => value[key], oldRelations)
    assert.equal(row[field], patch.after); row[field] = patch.before
  }
  genshinRelations.text = JSON.stringify(oldRelations, null, 2) + '\n'; genshinRelations.sha256 = digest(genshinRelations.text)
  assert.equal(genshinRelations.sha256, identityReview.sourceSHA256)
  const candidate = exportUnifiedContent([record], active, published, false)
  const overlays = candidate.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 }))
  assert.equal(overlays.find(row => row.sourcePath === genshinRelations.sourcePath)!.sha256, genshinRelations.sha256)
  assert.deepEqual(assertMaterialCandidateDependencies(published, overlays).games.map(row => row.game), ['nte'])
  assert.deepEqual(independentProductionOwnerScope('nte', candidate.manifest, published, overlays), {
    games: ['nte'], owners: ['nte'], services: ['gachia-game-nte'], productionScope: NTE_MATERIAL_PRODUCTION_SCOPE,
  })
  assert.throws(() => independentProductionOwnerScope('genshin', candidate.manifest, published, overlays))
  assert.throws(() => independentProductionOwnerScope('nte', { ...candidate.manifest, preview: true }, published, overlays))
  assert.throws(() => independentProductionOwnerScope('nte', candidate.manifest, published.slice(1), overlays))
})

test('real material freeze reopens the explicit content type and mandatory candidate/recovery consumers', () => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'nte-material-freeze-')))
  try {
    const record = structuredClone(plan.sources.find(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)!.records.find(row => row.sourceRecord.locator.identity?.id === 'collectors-drama-core')!)
    assert(objectValue(record.structuredValue)); record.structuredValue.nameEn = 'Collector’s Drama Core'; record._status = 'published'; record.hold = false
    const input = { repo, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), directory: path.join(directory, 'freeze'), plan, records: [record], activeSources: active, preview: false }
    assert.throws(() => freezeUnifiedContent({ ...input, productionScope: NTE_PRODUCTION_SCOPE }), /content type/)
    const frozen = freezeUnifiedContent({ ...input, productionScope: NTE_MATERIAL_PRODUCTION_SCOPE })
    const reopened = verifyUnifiedFrozenSource(frozen.directory, frozen.manifestPin)
    assert.equal(reopened.productionScope, NTE_MATERIAL_PRODUCTION_SCOPE); assert.deepEqual(reopened.owners, ['nte'])
    assert.equal(frozenMaterialConsumerContracts(frozen.directory, reopened)[0].pages.length, 174)
    assert.equal(frozenNteMaterialTextPairContract(frozen.directory, reopened).recovery.expectations.length, 174)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
