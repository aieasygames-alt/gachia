import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-structural-intake-2026-11-20-r141')
const load = (name: string) => JSON.parse(readFileSync(path.join(root, name), 'utf8'))
const bind = (file: string) => ({ path: file, pin: digest(readFileSync(file)) })
const pinned = (proof: { path: string; pin: string }) => { const bytes = readFileSync(proof.path); assert.equal(digest(bytes), proof.pin); return bytes }
const save = (name: string, data: unknown) => { const file = path.join(root, name); writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); return bind(file) }
const preparation = load('preparation.json'), input = JSON.parse(pinned(preparation.input).toString())
const stage = JSON.parse(pinned(preparation.stage).toString())
assert.equal(input.active.length, 115)
pinned(input.sourceIndex)
const capture = load('cms-capture-proof.json'), afterProof = load('cms-after-proof.json')
const before = JSON.parse(gunzipSync(pinned(capture.proof)).toString()), after = JSON.parse(gunzipSync(pinned(afterProof.proof)).toString())
assert.equal(canonical(before.draft), canonical(after.draft)); assert.equal(canonical(before.published), canonical(after.published))
assert.equal(after.draft.length, 2880)
const result = load('installed-apply-02.json'), verify = load('installed-verify.json'), repeat = load('installed-repeat.json'), rest = load('rest-stage-readback.json')
for (const value of [result, verify, repeat, rest]) assert.equal(value.stageKey, stage.stageKey)
assert.equal(result.created, 179); assert.equal(result.reused, 0); assert.equal(result.alreadyAppliedSkipped, 42); assert.equal(result.contentRecordWrites, 0)
assert.equal(repeat.created, 0); assert.equal(repeat.reused, 179); assert.equal(repeat.contentRecordWrites, 0)
assert.equal(rest.total, 179); assert.equal(rest.exactR140AfterMatch, true)
const dbBefore = load('database-before-install.json'), dbInstalled = load('database-after-install.json'), dbAfter = load('database-after-stage.json')
assert.equal(canonical(dbBefore), canonical(dbInstalled))
const changed = Object.keys(dbBefore).filter(name => canonical(dbBefore[name]) !== canonical(dbAfter[name])).sort()
assert.deepEqual(changed, ['migration_batches', 'migration_records'])
assert.equal(dbAfter.migration_records.rows - dbBefore.migration_records.rows, 179)
assert.equal(dbAfter.migration_batches.rows - dbBefore.migration_batches.rows, 1)
const tableDelta = save('database-delta.json', { tables: Object.keys(dbBefore).length, unchangedTables: Object.keys(dbBefore).length - changed.length,
  changed: changed.map(name => ({ table: name, before: dbBefore[name], after: dbAfter[name] })), contentAndVersionsUnchanged: true, schemaMigration: false })
const previous = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const baseline = JSON.parse(readFileSync(path.join(previous, 'baseline-comparison.json'), 'utf8'))
const localDifferences = input.active.flatMap((source: any) => digest(readFileSync(path.join(repo, source.sourcePath))) === source.sha256 ? [] :
  [{ sourcePath: source.sourcePath, publishedSHA256: source.sha256, localSHA256: digest(readFileSync(path.join(repo, source.sourcePath))) }])
assert.equal(canonical(localDifferences), canonical(baseline.localDifferences))
const parentDelivery = JSON.parse(pinned(capture.parentDelivery).toString()), parentPreparation = JSON.parse(pinned(parentDelivery.preparation).toString())
const originalInput = JSON.parse(pinned(parentPreparation.input).toString())
assert.equal(canonical(input.active), canonical(originalInput.active))
const preservation = save('preservation.json', { sourceIndex: input.sourceIndex, fullSources: 115, sourcesExactlyPreserved: true,
  localDifferences, unchangedContentRecords: 2880, alreadyAppliedDrafts: 42, replayedDraftWrites: 0, publishedContentPreserved: true,
  immutableOriginsPreserved: true, sourceAdvanced: false, productionDeployments: 0 })
const installed = load('application-installed-02.json'); pinned(installed.application)
for (const [name, tests] of [['focused-tests.log', 70], ['sqlite-tests.log', 7], ['postgres-tests.log', 7], ['docs-scope-tests.log', 41]] as const) {
  const text = readFileSync(path.join(root, name), 'utf8')
  assert(text.includes(`ℹ tests ${tests}`) && text.includes('ℹ fail 0') && text.includes('ℹ skipped 0'), `Missing passing ${name}`)
}
assert.equal(readFileSync(path.join(root, 'types.log'), 'utf8'), '')
const cleanup = load('build-cleanup.json')
const delivery = { kind: 'genshin-structural-intake-delivery-r141', status: 'installed-and-179-held-revisions-staged',
  parentDelivery: capture.parentDelivery, sourceIndex: input.sourceIndex, sourceCommit: installed.sourceCommit,
  stageKey: stage.stageKey, batchId: rest.batchId,
  execution: bind(path.join(root, 'EXECUTION.md')), contract: bind(path.join(repo, 'services/content-cms/docs/genshin-structural-stage.md')),
  preparation: bind(path.join(root, 'preparation.json')), input: preparation.input, stage: preparation.stage,
  cmsBefore: capture.proof, cmsAfter: afterProof.proof,
  installedApplication: bind(path.join(root, 'application-installed-02.json')), installedIntake: bind(path.join(root, 'installed-apply-02.json')),
  independentReadback: bind(path.join(root, 'installed-verify.json')), repeatReadback: bind(path.join(root, 'installed-repeat.json')),
  restReadback: bind(path.join(root, 'rest-stage-readback.json')), tableDelta, preservation,
  checks: { focused: 70, sqlite: 7, postgres: 7, docsAndScope: 41, types: true, standardCMSBuild: true, coldRestore: true,
    allInstalledFilePins: true, independentCLIVerification: true, independentRESTVerification: true, skipped: 0 },
  staged: preparation.classes, stagedRevisions: 179, createdManifests: 1, alreadyAppliedDraftsSkipped: 42,
  contentRecordWrites: 0, approvalWrites: 0, productionDeployments: 0, sourceAdvanced: false, hold: true, publishable: false,
  freeGiB: cleanup.freeAfterGiB,
  followup: ['Independent bound reviews for source/numeric/classification/relation/identity/new-entity changes',
    'Complete collection exporter, all consumers and compatible recovery qualification', 'Next.js 16.4.2 security advisory remediation'],
  next: 'Resume this installed stage and cmsAfter snapshot. Keep the 42 saved drafts and 179 staged revisions; do not replay either intake. R139 remains the published source.',
  evidence: Object.fromEntries(['cms-capture-proof.json', 'cms-after-proof.json', 'cold-backup.json', 'application-installed.json',
    'application-manifest-initial.json', 'database-before-install.json', 'database-after-install.json', 'database-after-stage.json',
    'focused-tests.log', 'sqlite-tests.log', 'postgres-tests.log', 'docs-scope-tests.log', 'types.log',
    'cms-build.log', 'cms-build-webpack.log', 'cms-build-hermetic.log', 'cms-build-hermetic-02.log',
    'application-install.log', 'installed-apply.log', 'installed-apply-02.log', 'installed-apply-02.json.intent.json',
    'installed-repeat.json.intent.json', 'installed-repeat.log', 'installed-verify.log', 'build-cleanup.json']
    .map(name => [name, bind(path.join(root, name))])) }
const proof = save('delivery.json', delivery)
console.log(JSON.stringify({ delivery: proof, staged: 179, skippedDrafts: 42, unchangedContentRecords: 2880, unchangedTables: 40, productionDeployments: 0 }))
