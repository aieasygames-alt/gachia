import assert from 'node:assert/strict'
import test from 'node:test'
import { readLegacySources, snapshot } from '../src/legacy-intake'
import { literalModule } from '../src/literal-module'
import { diffBatches, mapBatch, mapFAQ, mapSource } from '../src/record-mapping'

const policy = { digest: 'literal-tests', routes: { games: { lvmeng: { locales: ['zh'], details: ['characters'] } } } }
const inline = (text: string, game = 'genshin') => snapshot(game, `apps/game-${game}/lib/data.ts`, 'inline-code', text)

test('literal extraction resolves only local constants and static properties, preserving escaped text and arrays', () => {
  const module = literalModule(`const game = { version: '1.0', site: 'https://example.invalid' }; export const item = { name: 'a\\nb', version: game.version, values: [-1, true, null, ''] } as const; export function reader() { throw Error('never runs') }`, 'fixture.ts')
  assert.deepEqual(module.read('item'), { name: 'a\nb', version: '1.0', values: [-1, true, null, ''] })
  assert.deepEqual(module.units.map(x => [x.name, x.kind]), [['item', 'constant'], ['reader', 'function']])
})

test('literal extraction rejects calls, imports, cycles, dynamic syntax, duplicate keys and executable statements', () => {
  for (const code of [
    'export const item = process.exit(9)',
    "import external from 'untrusted'; export const item = external",
    'const a = b; const b = a; export const item = a',
    'export const item = { ...{} }', 'export const item = { ["dynamic"]: 1 }',
    'export const item = { x: 1, x: 2 }', 'export const item = { __proto__: {} }',
    'export const item = { get value() { return 1 } }', 'export const item = [1,,2]',
    'export const item = (() => { throw Error("executed") })()',
    'export const item = -1e999', 'export const item = `dynamic ${1}`',
    'export let item = 1', 'export const item = 1; process.exit(9)',
    'export const item = {',
  ]) assert.throws(() => literalModule(code, 'fixture.ts').read('item'), code)
  const deep = `export const item = ${'['.repeat(110)}0${']'.repeat(110)}`
  assert.throws(() => literalModule(deep, 'fixture.ts').read('item'), /budget/)
})

test('explicit inline contracts fail closed on unclassified, missing, duplicated or executable data exports', () => {
  const valid = 'export const versionDecisionRoute = [{ id: "one", title: { zh: "Title" } }]'
  assert.throws(() => mapSource(inline(valid + '; export const extra = []'), policy), /Unclassified/)
  assert.throws(() => mapSource(inline('export const unknown = []'), policy), /Unclassified/)
  assert.throws(() => mapSource(inline('export function versionDecisionRoute() {}'), policy), /became code/)
  assert.throws(() => mapSource(inline('export function helper() {}'), policy), /Missing/)
  assert.throws(() => mapSource(inline('export const versionDecisionRoute = [{ id: "one" }, { id: "one" }]'), policy), /Duplicate/)
  assert.throws(() => mapSource(inline('export const versionDecisionRoute = [{ title: {} }]'), policy), /identity/)
  assert.throws(() => mapSource(inline('export const versionDecisionRoute = [{ id: "one", title: { fr: "Unmapped" } }]'), policy), /localized/)
})

test('keyed inline revisions survive reordering; symbols scope otherwise-colliding identities', () => {
  const a = mapBatch([inline('export const versionDecisionRoute = [{ id: "a", title: { zh: "A" } }, { id: "b" }]')], policy)
  const b = mapBatch([inline('export const versionDecisionRoute = [{ id: "b" }, { id: "a", title: { zh: "A" } }]')], policy)
  assert.deepEqual(a.sources[0].records.map(x => x.revisionKey), b.sources[0].records.map(x => x.revisionKey))
  assert.deepEqual(diffBatches(a, b).changes.map(x => x.kind), ['source-review-required'])
  assert.equal(a.sources[0].records[0].translations[1].title, null)
  assert.deepEqual(a.sources[0].records[0].routeCandidates, [])
})

test('inline helper/import changes require source review even when record projections are unchanged', () => {
  const text = 'export const versionDecisionRoute = [{ id: "one", title: { zh: "Original" } }]; export function helper() { return 1 }'
  const before = mapBatch([inline(text)], policy)
  const after = mapBatch([inline(text.replace('return 1', 'return 2'))], policy)
  assert.equal(before.sources[0].records[0].revisionKey, after.sources[0].records[0].revisionKey)
  assert.deepEqual(diffBatches(before, after).changes.map(x => x.kind), ['source-review-required'])
  const imported = mapBatch([inline(`import external from 'not-executed'; ${text}`)], policy)
  assert.deepEqual(diffBatches(before, imported).changes.map(x => x.kind), ['source-review-required'])
})

test('FAQ adapters preserve exact languages, empty and partial pairs without inventing translations', () => {
  assert.deepEqual(mapFAQ([{ question: 'English', answer: '', questionZh: 'Chinese', answerJa: 'Japanese answer' }], 'legacy', 'faq'), [
    { locale: 'zh', sourcePointer: 'faq/0', question: 'Chinese', answer: null },
    { locale: 'en', sourcePointer: 'faq/0', question: 'English', answer: '' },
    { locale: 'ja', sourcePointer: 'faq/0', question: null, answer: 'Japanese answer' },
  ])
  assert.equal(mapFAQ([{ question: 'Original', answer: 'Original answer' }], 'zh', 'launchFaq')[0].locale, 'zh')
  assert.throws(() => mapFAQ([{ questionEn: 'Ambiguous' }], 'legacy', 'faq'), /Unmapped/)
  assert.throws(() => mapFAQ([{ question: 1 }], 'legacy', 'faq'), /text/)
  const gacha = (answerZh: string) => snapshot('nte', 'packages/data/games/nte/raw-gacha-system.json', 'raw-json', JSON.stringify({ banners: [], faqs: [{ question: 'Q', answer: 'A', questionZh: 'Qz', answerZh }] }))
  const diff = diffBatches(mapBatch([gacha('before')], policy), mapBatch([gacha('after')], policy))
  assert.deepEqual(diff.changes[0].translationReview, ['en'])
})

test('singleton asset adapters preserve empty references, reject unknown categories and never fetch assets', () => {
  const source = (value: unknown) => snapshot('nte', 'packages/data/games/nte/raw-image-sources.json', 'raw-json', JSON.stringify(value))
  const data = { _comment: 'Reference only', characters: { same: '' }, weapons: { same: 'https://example.invalid/image.png' }, vehicles: {} }
  const result = mapSource(source(data), policy)
  assert.equal(result.records.length, 3)
  assert.equal(new Set(result.records.map(x => x.stableKey)).size, 3)
  assert.equal(result.records[0].assetReference?.url, '')
  assert.ok(result.records.every(x => x.hold && x.routeCandidates.length === 0))
  assert.throws(() => mapSource(source({ ...data, unknown: {} }), policy), /category/)
  assert.throws(() => mapSource(source({ ...data, characters: { one: 'javascript:alert(1)' } }), policy), /protocol/)
  assert.throws(() => mapSource(source({ ...data, characters: { one: 'https://' } }), policy))
})

test('real repository sources cover all previous deferred sources while reporting sections and reader code separately', () => {
  const { sources } = readLegacySources()
  const batch = mapBatch(sources, policy)
  assert.equal(batch.sources.filter(x => x.state === 'deferred').length, 0)
  assert.equal(batch.sources.filter(x => x.state === 'mapped').length, 99)
  const lvmeng = batch.sources.find(x => x.gameKey === 'lvmeng' && x.sourcePath.endsWith('data.ts'))!
  const characters = lvmeng.records.filter(x => x.family === 'characters')
  assert.equal(characters.length, 13)
  assert.ok(characters.every(x => x.translations[1].title === null && x.translations[2].body === null))
  assert.equal(lvmeng.records.find(x => x.legacyId === 'launchFaq')?.faqs?.length, 11)
  const sourcesSection = JSON.parse(lvmeng.records.find(x => x.legacyId === 'officialSources')!.rawRecord)
  assert.equal(sourcesSection.value[0].url, 'https://lvmeng.zhuziplay.com/')
  assert.ok(lvmeng.units?.some(x => x.state === 'section'))
  const nte = batch.sources.find(x => x.gameKey === 'nte' && x.sourcePath.endsWith('data.ts'))!
  assert.ok(nte.units?.some(x => x.name === 'tierLists' && x.state === 'reader-code'))
  assert.ok(!nte.records.some(x => x.family === 'characters'))
  const azur = batch.sources.find(x => x.gameKey === 'azur-promilia' && x.sourcePath.endsWith('data.ts'))!
  assert.ok(azur.records.some(x => x.family === 'guides' && x.translations[1].body))
  assert.equal(new Set(batch.sources.flatMap(x => x.records.map(r => r.stableKey))).size, 3440)
})
