import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { canonical } from '../src/record-mapping'
import { reconcileGenshinIntake, verifyGenshinIntake, prepareGenshinIntakeBatch, prepareGenshinExistingMaterialDrafts, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
const bytes = readFileSync(new URL('../reviews/2026-11-20-genshin-intake-r140.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), 'f0b5e5741fe57fe104507820d57b576ba7ab5d9a5c15be3442dc62e8a29c9bbb')
const fixture = JSON.parse(gunzipSync(bytes).toString('utf8')), input: GenshinIntakeInput = fixture.input
const plan = reconcileGenshinIntake(input)
function editSource(rows: GenshinIntakeInput['active'], family: string, mutate: (rows: any[]) => void) {
  const row = rows.find(row => row.sourcePath.endsWith(`/raw-${family}.json`))!
  const parsed = JSON.parse(row.text); mutate(parsed); row.text = JSON.stringify(parsed, null, 2) + '\n'; row.sha256 = digest(row.text)
}
const copy = () => structuredClone(input)

test('real O/A/R137/R138 reconciliation preserves all source pins and produces 221 held proposals', () => {
  assert.equal(plan.intakeKey, fixture.expected.intakeKey)
  assert.deepEqual(plan.counts, { cmsRecords: 390, changedRecords: 221, preservedRecords: 255, existingUpdates: 133, newEntities: 86, identityMigrations: 2, conflicts: 0 })
  assert.deepEqual(plan.dependency, fixture.expected.dependency)
  assert.equal(plan.dependency!.materialDefinitions, 269); assert.equal(plan.dependency!.materialReferences, 5490)
  assert.equal(plan.intakeReady, true); assert.equal(plan.publishable, false); assert.equal(plan.hold, true)
  assert.equal(plan.sourcePins.length, 115); assert.equal(plan.draftOverlays.length, 3)
  assert.deepEqual(plan.draftOverlays.map(row => row.sha256).sort(), input.candidate.map(row => row.sha256).sort())
  assert.equal(plan.sourceAdvanced, false); assert.equal(plan.cmsWrites, false)
})

test('Hu Tao keeps the actual immutable CMS origin and published edit instead of replacing O with A', () => {
  const huTao = input.cms.find(row => row.sourceRecord.locator.identity?.id === 'hu-tao')!
  assert.notDeepEqual(huTao.sourceRecord.original, huTao.structuredValue)
  const preserved = plan.preserved.find(row => row.cmsId === huTao.id)!
  assert(preserved.cmsWorkPreserved); assert.equal(preserved.valueSHA256, preserved.publishedSHA256)
  assert(!plan.entries.some(row => row.family === 'characters' && row.to === 'hu-tao'))
  assert.equal(plan.entries.filter(row => row.family === 'characters').length, 2)
  assert.deepEqual(plan.entries.filter(row => row.family === 'characters').map(row => row.to).sort(), ['mualani', 'ororon'])
})

test('two explicit relation migrations retain old IDs, source records and exact recovery state', () => {
  const entries = plan.entries.filter(row => row.action === 'identity-migration')
  assert.deepEqual(entries.map(row => [row.from, row.to]), [['sara', 'kujou-sara'], ['shinobu', 'kuki-shinobu']])
  for (const row of entries) {
    assert.equal((row.cms!.sourceRecord.original as any).characterId, row.from)
    assert.equal((row.active as any).characterId, row.from)
    assert.equal((row.draft as any).characterId, row.to)
    assert(row.changeClasses.includes('relation') && row.changeClasses.includes('identity-migration'))
  }
  const batch = prepareGenshinIntakeBatch(plan, input, { keys: entries.map(row => row.key) })
  assert.deepEqual(batch.recovery.map(row => row.previous), entries.map(row => row.cms))
  const missing = copy(); missing.renames = []
  assert.throws(() => reconcileGenshinIntake(missing), /withdrawal/)
  const duplicate = copy(); duplicate.renames.push(duplicate.renames[0])
  assert.throws(() => reconcileGenshinIntake(duplicate), /Ambiguous/)
  const unused = copy(); unused.renames.push({ ...unused.renames[0], from: 'unused', to: 'other' })
  assert.throws(() => reconcileGenshinIntake(unused), /Unused/)
})

test('independent CMS draft text survives incoming numeric/recipe changes and remains held', () => {
  const changed = copy()
  const row = changed.cms.find(row => row.sourceRecord.locator.identity?.id === 'mora')!
  ;(row.structuredValue as any).name = '摩拉（待审核草稿）'
  const next = reconcileGenshinIntake(changed)
  assert(next.intakeReady)
  const material = JSON.parse(next.draftOverlays.find(row => row.sourcePath.endsWith('/raw-materials.json'))!.text).find((row: any) => row.id === 'mora')
  assert.equal(material.name, '摩拉（待审核草稿）')
  assert.equal(next.publishable, false); assert.equal(next.hold, true)
  assert.equal(canonical(input), canonical(fixture.input), 'Reconciliation must not mutate the captured CMS')
})

test('competing CMS/public/candidate fields produce conflicts and no draft overlays or batches', () => {
  const changed = copy(), target = plan.entries.find(row => row.family === 'materials' && row.changes.some(cell => cell.pointer === '/rarity'))!
  const cms = changed.cms.find(row => row.id === target.cms!.id)!
  ;(cms.structuredValue as any).rarity = 99
  const next = reconcileGenshinIntake(changed)
  assert.equal(next.intakeReady, false); assert(next.conflicts.some(row => row.key === target.key && row.message?.includes('/rarity')))
  assert.deepEqual(next.draftOverlays, []); assert.equal(next.dependency, null)
  assert.throws(() => prepareGenshinIntakeBatch(next, changed, { keys: [target.key] }), /unresolved/)
})

test('CMS recipe lists merge atomically and do not pair ingredients by array index', () => {
  const changed = copy(), row = changed.cms.find(row => row.kind === 'character-materials' && (row.structuredValue as any).characterId === 'jean')!
  ;(row.structuredValue as any).ascensionMaterials[0].materials[0].quantity += 1
  const next = reconcileGenshinIntake(changed)
  assert.equal(next.intakeReady, false)
  assert(next.conflicts.some(row => row.key === 'character-materials:jean' && row.message?.includes('/ascensionMaterials')))
  const reordered = copy(), reorderedRow = reordered.cms.find(item => item.id === row.id)!
  ;(reorderedRow.structuredValue as any).ascensionMaterials[0].materials.reverse()
  assert.throws(() => reconcileGenshinIntake(reordered), /Protected/)
})

test('installed intake accepts only the 42 compatible material edits; other contracts remain enforced', () => {
  const keys = plan.entries.filter(row => row.family === 'materials' && row.existingEditorCompatible).map(row => row.key)
  assert.equal(keys.length, 42)
  const batch = prepareGenshinExistingMaterialDrafts(plan, input, { keys })
  assert.equal(batch.records.length, 42); assert.equal(batch.productionQualified, false)
  for (const row of plan.entries.filter(row => !keys.includes(row.key)).filter((_, index) => index < 5)) {
    assert.throws(() => prepareGenshinExistingMaterialDrafts(plan, input, { keys: [row.key] }), /only accepts/)
  }
  assert(plan.entries.filter(row => row.family === 'character-materials').every(row => row.changeClasses.includes('numeric')))
})

test('stale candidate ancestor, corrupt bytes, duplicate inputs and another game are rejected', () => {
  const stale = copy(); editSource(stale.candidateBase, 'materials', rows => { rows[0].name = 'stale' })
  assert.throws(() => reconcileGenshinIntake(stale), /ancestor differs/)
  const corrupt = copy(); corrupt.candidate[0].sha256 = '0'.repeat(64)
  assert.throws(() => reconcileGenshinIntake(corrupt), /Corrupt/)
  const duplicate = copy(); duplicate.active.push(duplicate.active[0])
  assert.throws(() => reconcileGenshinIntake(duplicate), /Duplicate/)
  const escaped = copy(); escaped.candidate[0].sourcePath = 'packages/data/games/nte/raw-materials.json'
  assert.throws(() => reconcileGenshinIntake(escaped), /Unbounded/)
  const foreignCMS = copy(); foreignCMS.cms.push({ ...foreignCMS.cms[0], legacyPath: 'packages/data/games/nte/raw-materials.json' })
  assert.throws(() => reconcileGenshinIntake(foreignCMS), /Unbounded/)
})

test('withdrawal, missing CMS origin and new entity collision never silently delete editorial work', () => {
  const missing = copy(); missing.cms.shift()
  assert.throws(() => reconcileGenshinIntake(missing), /Missing CMS/)
  const withdrawn = copy(); editSource(withdrawn.candidate, 'materials', rows => { rows.shift() })
  assert.throws(() => reconcileGenshinIntake(withdrawn), /withdrawal/)
  const duplicate = copy(); duplicate.cms.push(duplicate.cms[0])
  assert.throws(() => reconcileGenshinIntake(duplicate), /Duplicate CMS/)
  const relation = copy(); editSource(relation.candidate, 'character-materials', rows => { rows.push({ ...rows[0], characterId: 'new-character' }) })
  assert.throws(() => reconcileGenshinIntake(relation), /membership addition/)
})

test('dependency closure blocks undefined materials and invalid quantities after merging', () => {
  const dangling = copy(); editSource(dangling.candidate, 'character-materials', rows => { rows[0].ascensionMaterials[0].materials[0].id = 'undefined-material' })
  const next = reconcileGenshinIntake(dangling)
  assert.equal(next.intakeReady, false); assert(next.dependency!.issues.length > 0)
  const invalid = copy(); editSource(invalid.candidate, 'character-materials', rows => { rows[0].ascensionMaterials[0].materials[0].quantity = 0 })
  assert.throws(() => reconcileGenshinIntake(invalid), /positive safe integer/)
})

test('review batches are bounded, independently replayable and cannot supply approval or replacement content', () => {
  for (const expected of fixture.expected.batches) {
    const keys = plan.entries.filter(row => row.family === expected.family).map(row => row.key)
    const result = prepareGenshinIntakeBatch(plan, input, { keys })
    assert.equal(result.batchKey, expected.batchKey); assert.equal(result.records.length, expected.records)
    assert.equal(result.productionQualified, false); assert.equal(result.hold, true); assert.equal(result._status, 'draft')
    assert.equal(result.recovery.length, result.records.length)
  }
  const key = plan.entries[0].key
  for (const selection of [{ keys: [] }, { keys: [key, key] }, { keys: ['unknown'] }, { keys: plan.entries.map(row => row.key) },
    { keys: [key], publishable: true }, { keys: [key], approved: true }, { keys: [key], structuredValue: {} }]) {
    assert.throws(() => prepareGenshinIntakeBatch(plan, input, selection))
  }
})

test('changed CMS version, edited plan and forged readiness invalidate previously prepared batches', () => {
  const stale = copy(); stale.cms[0].updatedAt = '2026-11-21T00:00:00.000Z'
  assert.throws(() => verifyGenshinIntake(plan, stale), /Stale or altered/)
  const forged = structuredClone(plan); forged.publishable = true
  assert.throws(() => verifyGenshinIntake(forged, input), /Stale or altered/)
  const altered = structuredClone(plan); (altered.entries[0].candidate as any).name = 'tampered'
  assert.throws(() => prepareGenshinIntakeBatch(altered, input, { keys: [altered.entries[0].key] }), /Stale or altered/)
})
