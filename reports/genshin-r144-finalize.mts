import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { planGenshinEditingSync, verifyEditingSyncRows } from '../services/content-cms/src/genshin-editing-sync.ts'
import { exportUnifiedContent } from '../services/content-cms/src/unified-export.ts'
import { GENSHIN_INTAKE_PATHS } from '../services/content-cms/src/genshin-bounded-intake.ts'

const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-editing-source-sync-2026-11-21-r144')
const load = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const bound = (file: string) => ({ path: path.join(root, file), pin: sha(readFileSync(path.join(root, file))) })
const pinned = (proof: { path: string; pin: string }, zip = false) => {
  const bytes = readFileSync(proof.path); assert.equal(sha(bytes), proof.pin)
  return JSON.parse((zip ? gunzipSync(bytes) : bytes).toString())
}
const preparation = load('preparation.json'), d = pinned(preparation.delivery)
const q = pinned(d.qualification), input = pinned(q.input), exported = pinned(q.export, true).result
const before = pinned(d.cmsAfter, true), after = pinned(load('cms-final-proof.json'), true)
const plan = planGenshinEditingSync({ delivery: d, input, exported, before })
assert.equal(plan.syncKey, preparation.syncKey)
verifyEditingSyncRows(plan, before.draft, after.draft)
verifyEditingSyncRows(plan, before.published, after.published)
assert.equal(after.draft.length, 2966)
const applied = load('installed-apply.json'), repeated = load('installed-repeat.json')
assert.equal(applied.result.created, 86); assert.equal(applied.result.updated, 390)
assert.equal(repeated.result.created, 0); assert.equal(repeated.result.updated, 0); assert.equal(repeated.result.reused, 476)
assert.deepEqual(applied.beforeDeployments, applied.afterDeployments)
assert.deepEqual(applied.afterDeployments, repeated.beforeDeployments)
assert.deepEqual(repeated.beforeDeployments, repeated.afterDeployments)
const scope = after.draft.filter((r: any) => GENSHIN_INTAKE_PATHS.includes(r.legacyPath))
const noOp = exportUnifiedContent(scope, input.active, exported.sources, true)
assert.equal(noOp.manifest.changed.length, 0, 'Synced content would repeat an already published delta')
const counts = Object.fromEntries(['materials', 'characters', 'character-materials'].map(f => [f, scope.filter((r: any) => r.kind === f).length]))
assert.deepEqual(counts, { materials: 269, characters: 117, 'character-materials': 90 })
const dbBefore = load('database-after-install.json'), dbAfter = load('database-after-stage.json')
const changedTables = Object.keys(dbBefore).filter(table => canonical(dbBefore[table]) !== canonical(dbAfter[table]))
assert(changedTables.every(table => table === 'migration_batches' || table.startsWith('content_records') || table.startsWith('_content_records_v')), 'Unrelated database tables changed')
assert.equal(dbAfter.migration_batches.rows, dbBefore.migration_batches.rows + 1)
assert.equal(dbAfter.content_records.rows, dbBefore.content_records.rows + 86)
const evidence = ['preparation.json', 'application-installed-final.json', 'packaging-02/runtime-dependencies.json', 'packaging-02/cold-backup.json', 'database-before-install.json', 'database-after-install.json',
  'database-after-stage.json', 'installed-apply.json', 'installed-repeat.json', 'cms-final.json.gz', 'cms-final-proof.json', 'regression-02.log', 'postgres-probe-01.log'].map(bound)
const value = { kind: 'genshin-editing-source-sync-delivery-r144', status: 'cms_editing_sources_synchronized_without_republication',
  sourceCommit: applied.sourceCommit, sourceIndex: d.sourceIndex, publishedVersion: d.candidateVersion,
  syncKey: plan.syncKey, cmsAfter: bound('cms-final.json.gz'), application: load('application-installed-final.json'),
  counts: { before: before.draft.length, after: after.draft.length, ...counts, updatedExisting: 390, created: 86,
    realImportPreserved: 390, unrelatedContentsPreserved: before.draft.length - 390, reusedOnRepeat: 476, identityMigrations: applied.result.identityMigrations },
  noOpExport: { changedRecords: noOp.manifest.changed.length, sourceCandidateSHA256: noOp.manifest.candidateSHA256 },
  changedTables, otherDatabaseTablesPreserved: true, reviewWrites: 0, workerUploads: 0, productionDeployments: 0,
  deployments: repeated.afterDeployments, evidence,
  next: 'Continue from the unchanged R143 public source index and this CMS AFTER snapshot. Do not replay R140 drafts, R141 staging, R142 decisions, R143 deployment or R144 sync. Existing holds/status and real import O remain; any new editorial change requires its own review.' }
writeFileSync(path.join(root, 'delivery.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ complete: true, sourceIndex: d.sourceIndex, cmsAfter: value.cmsAfter, counts: value.counts, workerUploads: 0, productionDeployments: 0 }))
