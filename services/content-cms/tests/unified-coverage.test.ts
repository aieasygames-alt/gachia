import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { unifiedCoverage, coverageMarkdown } from '../src/unified-coverage'
import { unifiedPlan } from '../src/unified-plan'
import { snapshot } from '../src/legacy-intake'
import { readUnifiedSources } from '../src/unified-sources'
import { structuredEditableLeaves, assertStructuredEdit } from '../src/unified-content'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { editProbe } from './fixtures/unified-edit-probe'

test('editable leaf inventory shares protected subtree, identity and structure policy', () => {
  const value = { id: 'one', name: 'old', nested: [{ 'a/b~c': 1 }], media: { caption: 'locked' },
    sourceReview: { note: 'locked' }, empty: [], optional: null, active: false }
  assert.deepEqual(structuredEditableLeaves(value).map(row => row.pointer), ['/name', '/nested/0/a~1b~0c', '/active'])
  const edited = editProbe(value)
  assert(edited)
  assert.doesNotThrow(() => assertStructuredEdit(value, edited))
  assert.deepEqual(structuredEditableLeaves({ id: 'one', values: [], value: null }), [])
  assert.deepEqual(structuredEditableLeaves('text'), [{ pointer: '', value: 'text' }])
  assert.doesNotThrow(() => assertStructuredEdit({ 'a/~': 'old' }, editProbe({ 'a/~': 'old' })))
})

test('coverage distinguishes empty/protected-only records, delegation and unmapped symbols', () => {
  const plan = unifiedPlan([
    snapshot('hi3', 'packages/data/games/hi3/raw-characters.json', 'raw-json', '[{"id":"one","name":"old"},{"id":"two","image":"/x.png"}]'),
    snapshot('hi3', 'packages/data/games/hi3/raw-guides.json', 'raw-json', '[]'),
    snapshot('lvmeng', 'apps/game-lvmeng/lib/data.ts', 'inline-code', 'export const unknown = readUnknown();'),
    snapshot('genshin', 'packages/data/games/genshin/raw-guides.json', 'raw-json', '[]'),
  ], ['hi3', 'lvmeng', 'genshin'])
  const report = unifiedCoverage(plan, { games: { lvmeng: {} } }, ['hi3/raw-characters.json'])
  const characters = report.rows.find(row => row.family === 'characters')!
  assert.equal(characters.records, 2)
  assert.equal(characters.leafEditableRecords, 1)
  assert.equal(characters.structureOnlyRecords.length, 1)
  assert.equal(characters.publicMirror, 'apps/web/public/data/hi3/raw-characters.json')
  assert.deepEqual(characters.owners, ['main'])
  assert.equal(report.rows.find(row => row.game === 'genshin')!.delegated, 'desktop-guides-v1')
  assert.equal(report.rows.find(row => row.game === 'genshin')!.lifecycle, null)
  assert.equal(report.rows.find(row => row.game === 'lvmeng')!.blocked.length, 1)
  assert.equal(report.rows.find(row => row.game === 'lvmeng')!.editor, null)
  assert.deepEqual(report.rows.find(row => row.game === 'lvmeng')!.owners, ['lvmeng', 'main'])
  assert.equal(report.summary.productionQualifiedRecords, 0)
  assert(report.rows.every(row => row.installedCMS === 'not-observed'))
})

test('actual matrix covers every plan record once without equating source coverage with production', () => {
  const repo = path.resolve(projectRoot, '../..')
  const read = (file: string) => JSON.parse(readFileSync(path.join(repo, file), 'utf8'))
  const inventory = read(`${baselineDirectory}/inventory.json`)
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const report = unifiedCoverage(plan, read('packages/core/route-ownership.json'), read('packages/data/raw-content-review.json').pairs)
  assert.equal(report.summary.scopes, 16)
  assert.equal(report.summary.sources, 115)
  assert.equal(report.summary.records, 2795)
  assert.equal(report.summary.delegatedSources, 6)
  const qualified = report.rows.filter(row => row.productionQualifiedEdits.length)
  assert.equal(qualified.length, 11)
  assert.equal(report.summary.productionQualifiedRecords, qualified.reduce((sum, row) => sum + row.records, 0))
  assert(qualified.every(row => row.family === 'guides' && row.owners.join(',') === 'main'))
  assert.equal(new Set(report.rows.map(row => row.sourcePath)).size, plan.sources.length)
  assert.equal(new Set(report.rows.map(row => `${row.sourcePath}:${row.family}`)).size, report.rows.length)
  assert.match(coverageMarkdown(report), /not proof that a page consumes it/)
  assert.equal(report.productionReady, false)
  for (const source of plan.sources) for (const record of source.records) {
    const edited = editProbe(record.structuredValue)
    if (edited !== null) assert.doesNotThrow(() => assertStructuredEdit(record.structuredValue, edited), record.stableKey)
  }
})
