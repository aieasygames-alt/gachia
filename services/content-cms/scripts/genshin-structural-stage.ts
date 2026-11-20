import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import { canonical } from '../src/record-mapping'
import { projectRoot } from '../src/local-environment'
import { assertUnifiedDesktopEnvironment, readPinnedUnifiedInput } from '../src/unified-desktop'
import { verifyUnifiedInstalledApplication } from '../src/unified-installed-application'
import { GENSHIN_INTAKE_PATHS, reconcileGenshinIntake, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
import { importGenshinStructuralStage, prepareGenshinStructuralStage, readGenshinStructuralStage } from '../src/genshin-structural-stage'

const [action, ...args] = process.argv.slice(2)
assert(['apply', 'verify'].includes(action), 'Expected apply or verify')
const allowed = ['--input', '--input-pin', '--application', '--application-pin', '--commit', '--repo', '--output']
const options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  const key = args[index], value = args[index + 1]
  assert(allowed.includes(key) && !options.has(key) && value && !value.startsWith('--'), 'Invalid stage arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Explicit pinned input, application, commit, repository and output required')
const { root } = assertUnifiedDesktopEnvironment()
const application = { path: options.get('--application')!, pin: options.get('--application-pin')! }
verifyUnifiedInstalledApplication(root, options.get('--repo')!, options.get('--commit')!, application)
assert.equal(JSON.parse(readFileSync(path.join(root, 'settings.json'), 'utf8')).app, projectRoot)
const input = readPinnedUnifiedInput(options.get('--input')!, options.get('--input-pin')!) as GenshinIntakeInput
for (const proof of [input.sourceIndex, input.candidateProof]) readPinnedUnifiedInput(proof.path, proof.pin)
const snapshotBytes = readFileSync(input.cmsProof.path)
assert.equal(createHash('sha256').update(snapshotBytes).digest('hex'), input.cmsProof.pin, 'CMS snapshot pin mismatch')
const snapshot = JSON.parse(gunzipSync(snapshotBytes).toString('utf8'))
assert.equal(canonical(snapshot.draft.filter((row: { legacyPath: string }) => GENSHIN_INTAKE_PATHS.includes(row.legacyPath))), canonical(input.cms), 'Input differs from captured CMS')
const plan = reconcileGenshinIntake(input), stage = prepareGenshinStructuralStage(plan, input)
const output = options.get('--output')!
assert(path.isAbsolute(output), 'Absolute new receipt path required')
if (action === 'apply') writeFileSync(output + '.intent.json', JSON.stringify({ action, application, sourceCommit: options.get('--commit'),
  input: { path: options.get('--input'), pin: options.get('--input-pin') }, stageKey: stage.stageKey,
  structuralRecords: stage.records.length, skippedAppliedDrafts: stage.manifest.alreadyApplied.length,
  contentRecordWrites: 0, hold: true, at: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const result = action === 'apply' ? await importGenshinStructuralStage(payload, plan, input) : await readGenshinStructuralStage(payload, stage)
  const receipt = { action, application, sourceCommit: options.get('--commit'), ...result, observedAt: new Date().toISOString() }
  writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify(result))
} finally { await payload.destroy() }
