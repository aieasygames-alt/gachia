import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest, snapshot } from '../src/legacy-intake'
import { baselineDirectory } from '../src/inventory-baseline'
import { projectRoot } from '../src/local-environment'
import { assertStructuredEdit, assertJSON, mergePublishedContent, validateUnifiedRecord, type JSONValue } from '../src/unified-content'
import { sourceUnits, replaceSourceSymbol, readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan, verifyUnifiedPlan } from '../src/unified-plan'
import { exportUnifiedContent } from '../src/unified-export'

const file = 'packages/data/games/hi3/raw-characters.json'
const row = { id: 'fixture', name: 'Old', nameEn: '', rarity: 4, skills: [{ name: 'Skill', amount: 1 }], image: '/old.png', sourceReview: { status: 'hold' } }
const bytes = (text: string, sourcePath = file) => ({ sourcePath, text, sha256: digest(text) })
const units = (value: unknown = [row]) => sourceUnits(snapshot('hi3', file, 'raw-json', JSON.stringify(value))).records

test('unified contract preserves all existing scalar fields, locales, nulls, and empty arrays', () => {
  const original = { id: 'fixture', title: 'Old', titleEn: '', optional: null, values: [], count: 1, active: false }
  assert.doesNotThrow(() => assertStructuredEdit(original, { ...original, title: 'New', titleEn: 'English', count: 2, active: true }))
  assert.throws(() => assertStructuredEdit(original, { ...original, optional: '' }), /type/)
  assert.throws(() => assertStructuredEdit(original, { ...original, values: ['new'] }), /membership/)
  assert.throws(() => assertStructuredEdit(original, { ...original, added: true }), /fields/)
  assert.throws(() => assertStructuredEdit(original, { ...original, count: '1' }), /type/)
})

for (const field of ['id', 'slug', 'characterId', 'code', 'region', 'cmsOrigin', 'source', 'sourceReview', 'contentReview', 'hold', 'rights', 'image', 'imageUrl', 'icon', 'url']) {
  test(`unified contract protects ${field}`, () => assert.throws(() => assertStructuredEdit({ [field]: 'old' }, { [field]: 'new' }), /Protected/))
}
for (const value of ['<script>alert(1)</script>', 'javascript:alert(1)', 'data:text/html,x', 'text\u0000']) {
  test(`unified edited text rejects unsafe input ${JSON.stringify(value)}`, () => assert.throws(() => assertStructuredEdit({ body: 'old' }, { body: value }), /Unsafe/))
}
test('non-JSON, prototype pollution and nonfinite values are rejected', () => {
  for (const value of [NaN, Infinity, undefined, new Date(), () => 1, JSON.parse('{"__proto__":{}}')]) assert.throws(() => assertJSON(value))
  let value: JSONValue = null
  for (let i = 0; i < 66; i++) value = [value]
  assert.throws(() => assertJSON(value), /budget/)
})
test('record identity is source-located, not based on title or row position', () => {
  const first = units(), reordered = units([{ ...row, id: 'other' }, row])
  assert.equal(first[0].stableKey, reordered[1].stableKey)
  assert.notEqual(first[0].stableKey, reordered[0].stableKey)
  assert.throws(() => units([row, row]), /Duplicate/)
  const regional = sourceUnits(snapshot('hi3', 'packages/data/games/hi3/raw-redeem-codes.json', 'raw-json',
    JSON.stringify([{ code: 'SAME', region: 'cn' }, { code: 'SAME', region: 'global' }]))).records
  assert.notEqual(regional[0].stableKey, regional[1].stableKey)
})
test('immutable provenance and editorial identity cannot be replaced or escaped', () => {
  const record = { ...units()[0], bodyFormat: 'plain' }
  assert.doesNotThrow(() => validateUnifiedRecord(record))
  assert.doesNotThrow(() => validateUnifiedRecord({ ...record, title: { zh: null, en: null, ja: null }, body: {} }))
  assert.throws(() => validateUnifiedRecord({ ...record, title: { zh: 'Alternate content', en: null, ja: null } }), /structured editor/)
  assert.throws(() => validateUnifiedRecord({ ...record, body: { unknownLocale: null } }), /structured editor/)
  assert.throws(() => validateUnifiedRecord({ ...record, sourceRecord: { ...record.sourceRecord, sourcePath: '../../escape.json' } }))
  assert.throws(() => validateUnifiedRecord({ ...record, structuredValue: { ...row, id: 'changed' } }), /Protected/)
  assert.throws(() => validateUnifiedRecord({ ...record, title: 'Ignored alternate content' }), /structured editor/)
  assert.throws(() => validateUnifiedRecord({ ...record, game: 2 }, { ...record, game: 1 }), /Immutable/)
  assert.throws(() => validateUnifiedRecord({ ...record, sourceRecord: { ...record.sourceRecord, sourceSHA256: 'a'.repeat(64) } }, record), /Immutable/)
})
test('public A is preserved, independently edited fields merge, conflicting or missing records stop', () => {
  assert.deepEqual(mergePublishedContent({ name: 'O', body: 'O' }, { name: 'A', body: 'O', extra: true }, { name: 'O', body: 'B' }), { name: 'A', body: 'B', extra: true })
  assert.deepEqual(mergePublishedContent({ name: 'O' }, { name: 'A' }, { name: 'O' }), { name: 'A' })
  assert.throws(() => mergePublishedContent({ name: 'O' }, { name: 'A' }, { name: 'B' }), /conflict/)
  assert.throws(() => mergePublishedContent({ name: 'O' }, {}, { name: 'B' }), /conflict/)
  assert.throws(() => mergePublishedContent(['O'], ['A'], ['B']), /conflict/)
})
test('raw export merges current public values and preserves public-only rows without reordering', () => {
  const source = JSON.stringify([row]), current = JSON.stringify([{ ...row, name: 'Already public' }, { id: 'cms-public-only', name: 'Keep' }])
  const record = units()[0]
  record.structuredValue = { ...row, rarity: 5 }
  record.hold = false; record._status = 'published'
  const output = exportUnifiedContent([record], [bytes(source)], [bytes(current)], false)
  assert.deepEqual(JSON.parse(output.files[0].content), [{ ...row, name: 'Already public', rarity: 5 }, { id: 'cms-public-only', name: 'Keep' }])
  assert.equal(output.manifest.activationSupported, false)
  assert.equal(output.manifest.productionReady, false)
  assert.equal(output.manifest.files[0].activeSHA256, digest(current))
})
test('export rejects unapproved, stale, missing, duplicate and conflicting inputs', () => {
  const source = JSON.stringify([row]), record = units()[0]
  record.structuredValue = { ...row, name: 'Editorial' }
  assert.throws(() => exportUnifiedContent([record], [bytes(source)], [bytes(source)], false), /Unapproved/)
  assert.throws(() => exportUnifiedContent([record], [bytes(source)], [], true), /Complete public baseline/)
  assert.throws(() => exportUnifiedContent([record], [bytes(source + ' ')], [bytes(source)], true), /stale/)
  assert.throws(() => exportUnifiedContent([record], [bytes(source)], [bytes('[]')], true), /missing/)
  assert.throws(() => exportUnifiedContent([record, record], [bytes(source)], [bytes(source)], true), /Duplicate/)
  assert.throws(() => exportUnifiedContent([record], [bytes(source)], [bytes(JSON.stringify([{ ...row, name: 'Public' }]))], true), /conflict/)
  assert.throws(() => exportUnifiedContent([record], [{ ...bytes(source), sha256: 'f'.repeat(64) }], [bytes(source)], true), /corrupt/)
})
test('untouched drafts preserve public values in the frozen build overlay but do not authorize a no-op release', () => {
  const source = JSON.stringify([row]), current = JSON.stringify([{ ...row, name: 'A' }])
  const result = exportUnifiedContent(units(), [bytes(source)], [bytes(current)], true)
  assert.equal(result.files[0].content, current)
  assert.deepEqual(result.manifest.changed, [])
  assert.equal(result.manifest.status, 'no_changes')
})
test('unedited and delegated games carry their entire active content into the candidate overlay', () => {
  const source = JSON.stringify([row]), delegated = 'packages/data/games/genshin/raw-guides.json'
  const record = units()[0]
  record.structuredValue = { ...row, name: 'Editorial' }
  const originals = [bytes(source), bytes('[{"id":"old"}]', delegated)]
  const current = [bytes(source), bytes('[{"id":"old"},{"id":"cms-public-only"}]', delegated)]
  const exported = exportUnifiedContent([record], originals, current, true)
  assert.equal(exported.files.find(file => file.sourcePath === delegated)?.content, current[1].text)
  assert.equal(exported.manifest.baselines.length, 2)
  assert.throws(() => exportUnifiedContent([record], originals, [bytes(source)], true), /Complete public baseline/)
})
test('literal exports round-trip Markdown/backticks without executing code, preserving assertions and readers', () => {
  const file = 'apps/game-lvmeng/lib/data.ts'
  const source = 'import type { T } from "./types";\nexport const sections = [{ id: "one", text: "old" }] as const;\nexport function read() { return sections }\n'
  const { records, readers } = sourceUnits(snapshot('lvmeng', file, 'inline-code', source))
  assert.deepEqual(readers, ['read'])
  const record = records[0]
  record.structuredValue = { id: 'one', text: 'Markdown `code` ${notExecuted} and \\ path' }
  const exported = exportUnifiedContent([record], [bytes(source, file)], [bytes(source, file)], true)
  assert.match(exported.files[0].content, /as const;\nexport function read\(\) \{ return sections \}/)
  assert.match(exported.files[0].content, /\$\{notExecuted\}/)
  assert.equal(exported.files[0].content.split('import type').length, 2)
  assert.throws(() => replaceSourceSymbol(source, file, 'missing', []), /Missing/)
})
test('dynamic exports are explicitly blocked, never executed or claimed as covered', () => {
  const source = snapshot('lvmeng', 'apps/game-lvmeng/lib/data.ts', 'inline-code', 'export const data = executeAnything();')
  const result = sourceUnits(source)
  assert.equal(result.records.length, 0)
  assert.equal(result.blocked[0].symbol, 'data')
})
test('all registered scopes have actual source coverage, existing guides and generated summaries remain delegated', () => {
  const inventory = JSON.parse(readFileSync(path.resolve(projectRoot, '../..', baselineDirectory, 'inventory.json'), 'utf8'))
  const { sources } = readUnifiedSources()
  const games = inventory.scopes.map((scope: { id: string }) => scope.id)
  const plan = unifiedPlan(sources, games)
  verifyUnifiedPlan(plan)
  assert.equal(plan.scopeCoverage.length, 16)
  assert.ok(plan.scopeCoverage.every(scope => scope.recordCount > 0))
  assert.ok(plan.sources.reduce((sum, source) => sum + source.records.length, 0) > 2500)
  for (const game of ['genshin', 'nte']) assert.equal(plan.sources.find(source => source.sourcePath === `packages/data/games/${game}/raw-guides.json`)?.delegated, 'desktop-guides-v1')
  assert.ok(plan.sources.filter(source => source.sourcePath.endsWith('raw-character-summaries.json')).every(source => source.delegated === 'character-summary-generator'))
  assert.deepEqual(plan.sources.flatMap(source => source.blocked), [])
  assert.ok(plan.sources.some(source => source.sourcePath.endsWith('/tier-lists.ts') && source.records.length))
  for (const source of plan.sources) for (const record of source.records) assert.doesNotThrow(() => validateUnifiedRecord({ ...record, bodyFormat: 'plain' }))
  assert.throws(() => verifyUnifiedPlan({ ...plan, games: [] }), /integrity/)
})
test('private tier inputs are editable without duplicating derived localized readers', () => {
  const file = 'packages/data/games/hi3/tier-lists.ts'
  const text = 'const tierEntries = [{ characterId: "one", tier: "A" }];\nexport const tierLists = build(tierEntries);\n'
  const result = sourceUnits(snapshot('hi3', file, 'inline-code', text))
  assert.equal(result.records.length, 1)
  assert.deepEqual(result.readers, ['tierLists'])
  result.records[0].structuredValue = [{ characterId: 'one', tier: 'S' }]
  const exported = exportUnifiedContent(result.records, [bytes(text, file)], [bytes(text, file)], true)
  assert.match(exported.files[0].content, /export const tierLists = build\(tierEntries\);/)
  assert.match(exported.files[0].content, /"tier": "S"/)
})
