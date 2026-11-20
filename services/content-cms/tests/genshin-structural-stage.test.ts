import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { digest } from '../src/legacy-intake'
import { canonical } from '../src/record-mapping'
import { reconcileGenshinIntake, resumeGenshinIntake, prepareGenshinExistingMaterialDrafts, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
import { prepareGenshinStructuralStage } from '../src/genshin-structural-stage'
const bytes = readFileSync(new URL('../reviews/2026-11-20-genshin-resume-r141.json.gz', import.meta.url))
assert.equal(createHash('sha256').update(bytes).digest('hex'), '4cf578a0267028f1c268da183d4f4cb2a32769db43b6f94bf3278702eaa10561')
const fixture = JSON.parse(gunzipSync(bytes).toString()), input: GenshinIntakeInput = fixture.input
const plan = reconcileGenshinIntake(input), stage = prepareGenshinStructuralStage(plan, input)

test('post-write snapshot resumes 221 proposals as 42 already applied and 179 structural proposals', () => {
  assert.equal(plan.intakeKey, fixture.expected.intakeKey)
  assert.deepEqual(resumeGenshinIntake(plan, input), fixture.expected.resume)
  assert.equal(stage.stageKey, fixture.expected.stageKey); assert.equal(stage.records.length, 179)
  assert.equal(stage.manifest.alreadyApplied.length, 42)
  assert.equal(stage.manifest.contentRecordWrites, 0); assert.equal(stage.manifest.publishable, false)
  assert.equal(stage.manifest.sourceAdvanced, false)
})
test('saved drafts cannot be passed to the old PATCH preparation path again', () => {
  for (const key of stage.manifest.alreadyApplied) assert.throws(() => prepareGenshinExistingMaterialDrafts(plan, input, { keys: [key] }), /already applied/)
})
test('immutable staged revisions include full old CMS provenance, reviewed changes and recovery', () => {
  const counts: Record<string, number> = {}, migrations: string[][] = []
  for (const row of stage.records) {
    assert.equal(digest(row.candidateText), row.revisionKey)
    const envelope = JSON.parse(row.candidateText), entry = envelope.entry
    assert.equal(canonical(entry.draft), row.rawRecord)
    assert.deepEqual(envelope.recovery.previous, entry.cms)
    assert.equal(envelope.hold, true); assert.equal(envelope.publishable, false)
    assert.deepEqual(envelope.cmsProof, input.cmsProof)
    if (entry.cms) assert.deepEqual(entry.cms.sourceRecord, input.cms.find(value => value.id === entry.cms.id)!.sourceRecord)
    counts[entry.family] = (counts[entry.family] ?? 0) + 1
    if (entry.action === 'identity-migration') migrations.push([entry.from, entry.to])
  }
  assert.deepEqual(counts, { 'character-materials': 90, characters: 2, materials: 87 })
  assert.deepEqual(migrations, [['sara', 'kujou-sara'], ['shinobu', 'kuki-shinobu']])
})
test('staging rejects the old pre-write snapshot and incompatible saved-state changes', () => {
  const old = JSON.parse(gunzipSync(readFileSync(new URL('../reviews/2026-11-20-genshin-intake-r140.json.gz', import.meta.url))).toString()).input
  assert.throws(() => prepareGenshinStructuralStage(reconcileGenshinIntake(old), old), /Save compatible drafts/)
  const changed = structuredClone(input), row = changed.cms.find(row => row.id === plan.entries.find(row => row.key === stage.manifest.alreadyApplied[0])!.cms!.id)!
  row.hold = false; row._status = 'published'
  assert.throws(() => prepareGenshinStructuralStage(reconcileGenshinIntake(changed), changed), /held draft/)
})
test('new CMS edits and tampered held/readiness/provenance state invalidate the prepared stage', () => {
  const changed = structuredClone(input); changed.cms[0].updatedAt = '2026-11-21T00:00:00.000Z'
  assert.throws(() => prepareGenshinStructuralStage(plan, changed), /Stale or altered/)
  for (const mutate of [(p: any) => p.publishable = true, (p: any) => p.hold = false,
    (p: any) => p.entries[0].cms.sourceRecord.original.characterId = 'forged']) {
    const altered = structuredClone(plan); mutate(altered)
    assert.throws(() => prepareGenshinStructuralStage(altered, input), /Stale or altered/)
  }
  assert.equal(canonical(input), canonical(fixture.input))
})
