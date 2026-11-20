import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { GENSHIN_INTAKE_PATHS, reconcileGenshinIntake, resumeGenshinIntake } from '../services/content-cms/src/genshin-bounded-intake.ts'
import { prepareGenshinStructuralStage } from '../services/content-cms/src/genshin-structural-stage.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-structural-intake-2026-11-20-r141')
const previous = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const bind = (file: string) => ({ path: file, pin: digest(readFileSync(file)) })
const pinned = (p: { path: string; pin: string }) => { const b = readFileSync(p.path); assert.equal(digest(b), p.pin); return b }
const save = (name: string, value: unknown) => { const file = path.join(root, name); writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return bind(file) }
const capture = load(path.join(root, 'cms-capture-proof.json'))
const delivery = JSON.parse(pinned(capture.parentDelivery).toString())
const summary = JSON.parse(pinned(delivery.preparation).toString())
const input = JSON.parse(pinned(summary.input).toString())
const after = JSON.parse(gunzipSync(pinned(capture.proof)).toString())
assert(capture.exactR140AfterMatch && capture.replayedContentWrites === 0)
input.cmsProof = capture.proof
input.cms = after.draft.filter((row: any) => GENSHIN_INTAKE_PATHS.includes(row.legacyPath))
const plan = reconcileGenshinIntake(input), resume = resumeGenshinIntake(plan, input)
assert.equal(resume.alreadyApplied.length, 42); assert.equal(resume.pendingCompatible.length, 0); assert.equal(resume.pendingStructural.length, 179)
const stage = prepareGenshinStructuralStage(plan, input)
const classes = { protectedExistingMaterialSources: 0, newMaterials: 0, relations: 0, newCharacters: 0 }
for (const row of stage.records) {
  const entry = JSON.parse(row.candidateText).entry
  if (entry.family === 'materials') classes[entry.action === 'new-entity' ? 'newMaterials' : 'protectedExistingMaterialSources']++
  else if (entry.family === 'character-materials') classes.relations++
  else classes.newCharacters++
}
const { total, ...expectedClasses } = delivery.heldRemainder
assert.equal(total, 179); assert.deepEqual(classes, expectedClasses)
const inputProof = save('intake-input.json', input), planProof = save('reconciliation.json', plan), stageProof = save('structural-stage.json', stage)
const fixturePath = path.join(repo, 'services/content-cms/reviews/2026-11-20-genshin-resume-r141.json.gz')
writeFileSync(fixturePath, gzipSync(Buffer.from(JSON.stringify({ input, expected: { intakeKey: plan.intakeKey, stageKey: stage.stageKey, resume, classes } }) + '\n'), { level: 9 }), { flag: 'wx' })
save('preparation.json', { kind: 'genshin-structural-intake-preparation-r141', parentDelivery: capture.parentDelivery,
  sourceIndex: input.sourceIndex, input: inputProof, plan: planProof, stage: stageProof, fixture: bind(fixturePath),
  resume, classes, counts: plan.counts, dependency: plan.dependency,
  contentRecordWrites: 0, approvalWrites: 0, sourceAdvanced: false, productionDeployments: 0, hold: true, publishable: false })
console.log(JSON.stringify({ alreadyAppliedSkipped: 42, structuralPending: 179, classes, stageKey: stage.stageKey }))
