import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { exportUnifiedContent } from '../src/unified-export'
import { objectValue, type JSONValue } from '../src/unified-content'
import { dedicatedCharacterTextContract, dedicatedCharacterTextFields, dedicatedCharacterTextPairContract, DEDICATED_CHARACTER_TEXT_SOURCES,
  mergeCharacterTextExpectations, type CharacterTextGame } from '../src/unified-character-text'
import { unifiedProductionQualification } from '../src/unified-production-scope'
import { unifiedRecoveryExpectations } from '../src/unified-publication'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const active = plan.sources.map(source => {
  const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
  return { sourcePath: source.sourcePath, text, sha256: digest(text) }
})
const recordsFor = (game: CharacterTextGame) => structuredClone(plan.sources.find(source => source.sourcePath === DEDICATED_CHARACTER_TEXT_SOURCES[game])!
  .records.filter(row => game !== 'lvmeng' || row.sourceRecord.locator.symbol === 'playableCharacters'))
const set = (value: JSONValue, pointer: string, text: JSONValue) => {
  const keys = pointer.slice(1).split('/')
  const parent = keys.slice(0, -1).reduce((node, key) => (node as Record<string, JSONValue>)[key], value)
  ;(parent as Record<string, JSONValue>)[keys.at(-1)!] = text
}

for (const game of Object.keys(DEDICATED_CHARACTER_TEXT_SOURCES) as CharacterTextGame[]) test(`${game}: actual CMS export derives all existing rendered character text fields and locale consumers`, () => {
  const records = recordsFor(game).filter(row => dedicatedCharacterTextFields(game, row.structuredValue).length)
  let fields = 0
  for (const row of records) for (const field of dedicatedCharacterTextFields(game, row.structuredValue)) {
    set(row.structuredValue, field.pointer, `Isolated & "quoted" 'text' ${row.legacyId} ${field.pointer}`)
    fields++
  }
  const candidate = exportUnifiedContent(records, active, active, true)
  const contract = dedicatedCharacterTextContract(active, candidate.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 })))
  assert.equal(contract.changes.length, records.length)
  assert.equal(contract.changes.reduce((sum, row) => sum + row.fields.length, 0), fields)
  assert(contract.expectations.every(row => row.owner === game && row.path.startsWith(game === 'lvmeng' ? '/zh/' : '/')))
  assert(contract.expectations.every(row => row.contains.every(text => text.includes('&amp;') && text.includes('&quot;') && text.includes('&#x27;'))))
  assert.equal(contract.productionReady, false)
  assert.throws(() => unifiedProductionQualification(records, active, candidate), /production-qualified/)
  const merged = mergeCharacterTextExpectations([{ owner: 'main', path: '/zh', status: 200, contains: ['Main preservation'] }], contract)
  assert.deepEqual(mergeCharacterTextExpectations(merged, contract), merged)
  assert.equal(merged.length, contract.expectations.length + 1)
  console.log(JSON.stringify({ game, records: records.length, fields, consumers: contract.expectations.length, productionReady: false }))
})

test('character text contracts are A-relative, preserve public increments, and cannot replace required detail consumers', () => {
  const [row] = recordsFor('genshin')
  assert(objectValue(row.structuredValue))
  row.structuredValue.description = 'Isolated new description'
  const sources = structuredClone(active), source = sources.find(source => source.sourcePath === row.sourceRecord.sourcePath)!
  const rows = JSON.parse(source.text)
  rows[0].nameEn = 'Preserved public name increment'
  source.text = JSON.stringify(rows); source.sha256 = digest(source.text)
  const candidate = exportUnifiedContent([row], active, sources, true)
  const contract = dedicatedCharacterTextContract(sources, candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
  assert.deepEqual(contract.changes[0].fields.map(field => field.pointer), ['/description'])
  assert.equal(JSON.parse(candidate.files.find(file => file.sourcePath === source.sourcePath)!.content)[0].nameEn, rows[0].nameEn)
  const expected = contract.expectations[0]
  const merged = mergeCharacterTextExpectations([{ ...expected, contains: ['Unrelated old text'] }], contract)
  assert(merged[0].contains?.includes('>Isolated new description<'))
  assert.throws(() => mergeCharacterTextExpectations([{ ...expected, status: 404 }], contract), /cannot be replaced/)
  assert.throws(() => mergeCharacterTextExpectations([expected, expected], contract), /Duplicate/)
  assert.deepEqual(dedicatedCharacterTextContract(sources, sources).changes, [])
})

test('character contracts refuse hidden fields, enum/numeric/reference edits, lifecycle changes and unsafe/empty text', () => {
  const check = (game: CharacterTextGame, mutate: (row: Record<string, JSONValue>) => void) => {
    const [record] = recordsFor(game)
    assert(objectValue(record.structuredValue)); mutate(record.structuredValue)
    assert.throws(() => {
      const candidate = exportUnifiedContent([record], active, active, true)
      dedicatedCharacterTextContract(active, candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
    })
  }
  check('genshin', row => { row.rarity = 7 })
  check('genshin', row => { row.element = 'unknown' })
  check('genshin', row => { row.image = '/new-image.webp' })
  check('genshin', row => { row.description = '   ' })
  check('genshin', row => { row.description = 'x'.repeat(16385) })
  check('genshin', row => { row.description = '<script>bad</script>' })
  check('genshin', row => { row.description = 'javascript:bad' })
  check('genshin', row => { row.id = 'new-id' })
  check('genshin', row => { row.newField = 'not existing' })
  check('nte', row => { set(row, '/skills/awakening/0/description', 'Hidden awakening fixture') })
  check('nte', row => { set(row, '/relatedCharacters/0', 'unknown-character') })
  check('nte', row => { row.nameJa = 'Unsupported summary projection' })
  check('azur-promilia', row => { row.description = 'Not in the raw name table' })
  check('lvmeng', row => { row.slug = 'new-slug' })
  const sourcePath = DEDICATED_CHARACTER_TEXT_SOURCES.genshin, source = active.find(row => row.sourcePath === sourcePath)!
  for (const mutation of [(rows: unknown[]) => rows.slice(1), (rows: unknown[]) => rows.toReversed(), (rows: unknown[]) => [...rows, rows[0]]]) {
    const text = JSON.stringify(mutation(JSON.parse(source.text)))
    assert.throws(() => dedicatedCharacterTextContract(active, [{ sourcePath, text, sha256: digest(text) }]), /membership\/order/)
  }
  assert.throws(() => dedicatedCharacterTextContract(active, [{ ...source, sha256: '0'.repeat(64) }]), /corrupt/)
  const upcoming = recordsFor('genshin').find(row => objectValue(row.structuredValue) && row.structuredValue.status === 'upcoming')!
  assert(objectValue(upcoming.structuredValue)); upcoming.structuredValue.name = 'Hidden upcoming fixture'
  const candidate = exportUnifiedContent([upcoming], active, active, true)
  assert.throws(() => dedicatedCharacterTextContract(active, candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 }))), /Unqualified/)
})

test('NTE language coverage follows actual nullish fallbacks without inventing Japanese content', () => {
  const fields = dedicatedCharacterTextFields('nte', { id: 'fixture', name: 'Chinese name', nameEn: 'English name', nameJa: '',
    description: 'Shared source text', skills: { skill: { nameEn: 'Shared skill name', description: 'Shared skill description' } } })
  assert.deepEqual(fields.find(field => field.pointer === '/nameEn')?.locales, ['en'])
  assert.deepEqual(fields.find(field => field.pointer === '/description')?.locales, ['zh', 'en', 'ja'])
  assert.deepEqual(fields.find(field => field.pointer === '/skills/skill/nameEn')?.locales, ['zh', 'en', 'ja'])
  assert.deepEqual(fields.find(field => field.pointer === '/skills/skill/description')?.locales, ['zh', 'en', 'ja'])
  assert(!fields.some(field => field.pointer === '/nameJa'))
})

for (const game of Object.keys(DEDICATED_CHARACTER_TEXT_SOURCES) as CharacterTextGame[]) test(`${game}: candidate/recovery bind the same real edited fields and restore exact public A`, () => {
  const records = recordsFor(game).filter(row => dedicatedCharacterTextFields(game, row.structuredValue).length)
  for (const record of records) for (const field of dedicatedCharacterTextFields(game, record.structuredValue)) {
    set(record.structuredValue, field.pointer, `New fixture ${record.legacyId} ${field.pointer}`)
  }
  const candidate = exportUnifiedContent(records, active, active, true)
  const pair = dedicatedCharacterTextPairContract(active, candidate.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 })))
  assert.deepEqual(pair.candidate, dedicatedCharacterTextContract(active, candidate.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 }))))
  for (const [index, restored] of pair.recovery.changes.entries()) {
    const next = pair.candidate.changes[index], original = plan.sources.find(row => row.sourcePath === restored.sourcePath)!.records
      .find(row => (row.sourceRecord.locator.identity?.id ?? row.sourceRecord.locator.identity?.slug) === restored.id)!
    assert(original)
    assert.equal(restored.activeSHA256, next.candidateSHA256); assert.equal(restored.candidateSHA256, next.activeSHA256)
    assert.deepEqual(restored.fields, dedicatedCharacterTextFields(game, original.structuredValue))
  }
  const main = { owner: 'main', path: '/zh', status: 200, contains: ['Preserved Main'] }
  const forward = [main, ...pair.candidate.expectations]
  const recovery = unifiedRecoveryExpectations(forward, [main], pair)
  assert.deepEqual(recovery, [main, ...pair.recovery.expectations])
  assert.deepEqual(unifiedRecoveryExpectations(forward, recovery.toReversed(), pair), recovery)
  assert.equal(pair.productionReady, false)
  assert.throws(() => unifiedRecoveryExpectations(forward, [], pair), /Recovery/)
  assert.throws(() => unifiedRecoveryExpectations(forward, [main, main], pair), /Duplicate/)
  assert.throws(() => unifiedRecoveryExpectations(forward, [main, { ...main, path: '/en' }], pair), /Recovery/)
  assert.throws(() => unifiedRecoveryExpectations([main], [main], pair), /Candidate/)
})

test('recovery restores old empty values and A-relative public increments without qualifying a new empty edit', () => {
  const sourcePath = DEDICATED_CHARACTER_TEXT_SOURCES.genshin
  const before = [{ id: 'fixture', name: 'Public name increment', nameEn: '', description: 'Public description increment' }]
  const after = [{ ...before[0], nameEn: 'New English text' }]
  const source = (rows: unknown[]) => { const text = JSON.stringify(rows); return { sourcePath, text, sha256: digest(text) } }
  const pair = dedicatedCharacterTextPairContract([source(before)], [source(after)])
  assert.deepEqual(pair.candidate.changes[0].fields, [{ pointer: '/nameEn', value: 'New English text', locales: ['en', 'ja'] }])
  assert.deepEqual(pair.recovery.changes[0].fields, [{ pointer: '/nameEn', value: '', locales: ['en', 'ja'] }])
  assert.deepEqual(pair.recovery.expectations.map(row => row.contains), [['><'], ['><']])
  assert.throws(() => dedicatedCharacterTextPairContract([source(after)], [source(before)]), /nonempty/)
})

for (const skill of ['passive3', 'specialJump']) test(`Genshin ${skill}: existing bilingual text supports three locales and exact recovery`, () => {
  const sourcePath = DEDICATED_CHARACTER_TEXT_SOURCES.genshin
  const before = [{ id: 'ororon', name: '欧洛伦', skills: { [skill]: {
    name: '既有名称', nameEn: 'Existing name', description: '既有说明', descriptionEn: 'Existing description',
    cooldown: 10, image: '/preserved.webp',
  } } }]
  const source = (rows: unknown[]) => { const text = JSON.stringify(rows); return { sourcePath, text, sha256: digest(text) } }
  const after = structuredClone(before)
  Object.assign(after[0].skills[skill], { name: '新名称', nameEn: 'New name', description: '新说明', descriptionEn: 'New description' })
  const pair = dedicatedCharacterTextPairContract([source(before)], [source(after)])
  assert.deepEqual(pair.candidate.changes[0].fields.map(field => field.pointer).sort(),
    ['name', 'nameEn', 'description', 'descriptionEn'].map(field => `/skills/${skill}/${field}`).sort())
  assert.deepEqual(pair.candidate.expectations.map(row => row.path), ['zh', 'en', 'ja'].map(locale => `/${locale}/genshin/characters/ororon`))
  assert.deepEqual(pair.candidate.expectations.map(row => row.contains.slice().sort()),
    [['>新名称<', '>新说明<'].sort(), ['>New name<', '>New description<'].sort(), ['>New name<', '>New description<'].sort()])
  assert(pair.recovery.expectations[0].contains.includes('>既有说明<'))
  assert(pair.recovery.expectations[1].contains.includes('>Existing description<'))
  assert.equal(pair.recovery.changes[0].candidateSHA256, source(before).sha256)
  for (const mutate of [
    (row: any) => { row.skills[skill].cooldown = 11 },
    (row: any) => { row.skills[skill].image = '/other.webp' },
    (row: any) => { delete row.skills[skill] },
    (row: any) => { row.skills[skill].extraName = 'New member' },
  ]) {
    const invalid = structuredClone(after); mutate(invalid[0])
    assert.throws(() => dedicatedCharacterTextPairContract([source(before)], [source(invalid)]))
  }
})
