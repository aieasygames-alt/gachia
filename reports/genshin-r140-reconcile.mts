import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { GENSHIN_INTAKE_PATHS, reconcileGenshinIntake, prepareGenshinIntakeBatch, type GenshinIntakeInput } from '../services/content-cms/src/genshin-bounded-intake.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const pinned = (proof: { path: string; pin: string }) => { const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin); return JSON.parse(bytes.toString('utf8')) }
const bind = (file: string) => ({ path: file, pin: digest(readFileSync(file)) })
const seal = (value: any, key: string) => { const { [key]: pin, ...data } = value; assert.equal(digest(canonical(data)), pin, `Broken ${key}`) }
const save = (name: string, value: unknown) => { const file = path.join(root, name); writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return bind(file) }
const reopen = load(path.join(root, 'source-reopen.json')), active = pinned(reopen.sources)
assert(reopen.allOwnersCurrent && active.length === 115)
pinned(reopen.sourceIndex)
const r137 = load(path.join(repo, 'reports/genshin-specialty-characters-2026-11-20-r137/delivery.json'))
const r138 = load(path.join(repo, 'reports/genshin-media-skills-2026-11-20-r138/delivery.json'))
assert.equal(bind(path.join(repo, 'reports/genshin-specialty-characters-2026-11-20-r137/delivery.json')).pin, r138.parentDelivery.pin)
const completion = pinned(r137.candidate).plan; seal(completion, 'completionKey')
const patch = pinned(r138.candidateMediaPatch); seal(patch, 'patchKey')
assert.equal(patch.parentCompletionKey, completion.completionKey)
const r136 = pinned(r137.parentDelivery), recipe = pinned(r136.candidate).plan; seal(recipe, 'candidateKey')
assert.equal(completion.parentCandidateKey, recipe.candidateKey)
const identityFile = path.join(repo, 'reports/material-source-review-2026-11-20-r135/identity-review.json')
const identity = load(identityFile); seal(identity.plan, 'reviewKey')
const ancestor = pinned(identity.sourceProof).sources.filter((row: any) => GENSHIN_INTAKE_PATHS.includes(row.sourcePath))
for (const row of ancestor) assert.equal(active.find((x: any) => x.sourcePath === row.sourcePath)?.sha256, row.sha256, 'R135 ancestor is stale against R139')
assert.equal(digest(identity.plan.candidate.text), identity.plan.candidate.sha256)
for (const row of recipe.inputSources) assert.equal(row.sha256, row.sourcePath.endsWith('/raw-character-materials.json') ? identity.plan.candidate.sha256 : ancestor.find((x: any) => x.sourcePath === row.sourcePath)?.sha256)
assert.deepEqual(completion.inputSources, recipe.inputSources)
const candidate = r137.candidateOutputs.map((proof: any) => {
  const value = pinned(proof), file = proof.path.split('/').at(-1), sourcePath = 'packages/data/games/genshin/' + file.replace('.candidate', '')
  const row = completion.overlays.find((row: any) => row.sourcePath === sourcePath)
  assert(row && row.sha256 === proof.pin && digest(row.text) === proof.pin)
  assert.equal(canonical(value), canonical(JSON.parse(row.text)))
  return { ...row }
})
const character = candidate.find((row: any) => row.sourcePath === patch.sourcePath)
assert.equal(character.sha256, patch.previousSHA256)
const oldCharacters = JSON.parse(character.text), newCharacters = pinned(patch.candidate)
const expected = structuredClone(oldCharacters)
for (const change of patch.changes) {
  const match = change.pointer.match(/^\/(\d+)\/image$/); assert(match)
  const row = expected[Number(match[1])]; assert.equal(row.id, change.localId); assert.equal(row.image, change.previous); row.image = change.value
}
assert.equal(canonical(expected), canonical(newCharacters), 'Media patch exceeds its two exact images')
character.text = readFileSync(patch.candidate.path, 'utf8'); character.sha256 = patch.candidate.pin
for (const row of patch.unchangedR137Overlays) assert.equal(candidate.find((x: any) => x.sourcePath === row.sourcePath)?.sha256, row.sha256)
const cmsCapture = load(path.join(root, 'cms-capture-proof.json'))
const captureBytes = readFileSync(cmsCapture.proof.path); assert.equal(digest(captureBytes), cmsCapture.proof.pin)
const captured = JSON.parse(gunzipSync(captureBytes).toString('utf8'))
assert.equal(captured.draft.length, cmsCapture.records)
assert.equal(digest(canonical(captured.draft)), cmsCapture.draftSetSHA256)
const input: GenshinIntakeInput = { sourceIndex: reopen.sourceIndex, candidateProof: r138.candidateMediaPatch, cmsProof: cmsCapture.proof,
  active, candidateBase: ancestor, candidate,
  cms: captured.draft.filter((row: any) => GENSHIN_INTAKE_PATHS.includes(row.legacyPath)),
  renames: identity.plan.decisions.filter((row: any) => row.kind === 'character' && row.approved).map((row: any) => ({ from: row.sourceId, to: row.approved.targetId, evidence: bind(identityFile) })) }
const plan = reconcileGenshinIntake(input)
assert(plan.intakeReady, JSON.stringify(plan.conflicts))
const inputProof = save('intake-input.json', input), planProof = save('reconciliation.json', plan)
const batches = []
for (const family of ['materials', 'character-materials', 'characters']) {
  const keys = plan.entries.filter(row => row.family === family).map(row => row.key)
  for (let i = 0; i < keys.length; i += 200) {
    const selection = { keys: keys.slice(i, i + 200) }
    const result = prepareGenshinIntakeBatch(plan, input, selection)
    batches.push({ family, records: result.records.length, changeClasses: result.changeClasses, batchKey: result.batchKey, proof: save(`batch-${family}-${i / 200 + 1}.json`, result) })
  }
}
const localDifferences = active.flatMap((source: any) => digest(readFileSync(path.join(repo, source.sourcePath))) === source.sha256 ? [] : [{ sourcePath: source.sourcePath, publishedSHA256: source.sha256, localSHA256: digest(readFileSync(path.join(repo, source.sourcePath))) }])
const baselineComparisons = plan.entries.filter(row => row.cms).map(row => ({ key: row.key, id: row.cms!.id, importSourceSHA256: row.cms!.sourceRecord.sourceSHA256,
  importRecordSHA256: row.cms!.sourceRecord.originalSHA256, publicChanges: row.publicVsImport.map(x => x.pointer), cmsChanges: row.cmsVsImport.map(x => x.pointer) }))
save('baseline-comparison.json', { comparisons: baselineComparisons, localDifferences, rawWrites: false })
const huTao = input.cms.find(row => row.sourceRecord.locator.identity?.id === 'hu-tao')!
assert(plan.preserved.some(row => row.cmsId === huTao.id && row.cmsWorkPreserved))
assert.equal(canonical(huTao.structuredValue), canonical(JSON.parse(active.find((x: any) => x.sourcePath === prefixCharacter())!.text).find((x: any) => x.id === 'hu-tao')))
function prefixCharacter() { return 'packages/data/games/genshin/raw-characters.json' }
const fixture = { input, expected: { intakeKey: plan.intakeKey, counts: plan.counts, dependency: plan.dependency, batches: batches.map(({ family, records, batchKey }) => ({ family, records, batchKey })) } }
const fixturePath = path.join(repo, 'services/content-cms/reviews/2026-11-20-genshin-intake-r140.json.gz')
writeFileSync(fixturePath, gzipSync(Buffer.from(JSON.stringify(fixture) + '\n'), { level: 9 }), { flag: 'wx' })
const summary = { kind: 'genshin-bounded-intake-summary-r140', observedAt: new Date().toISOString(), sourceIndex: reopen.sourceIndex, input: inputProof, plan: planProof,
  fixture: bind(fixturePath), counts: plan.counts, dependency: plan.dependency, batches, preExistingLocalDifferences: localDifferences.length,
  huTaoPreserved: true, fullSourceCount: active.length, contentWrites: false, productionDeployments: 0, sourceAdvanced: false, hold: true, publishable: false }
save('summary.json', summary)
console.log(JSON.stringify({ counts: summary.counts, dependency: summary.dependency, batchSizes: batches.map(x => x.records), localDifferences: localDifferences.length, fixture: summary.fixture }))
