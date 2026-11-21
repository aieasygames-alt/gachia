import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { openGenshinEditingSync, planGenshinEditingSync } from '../services/content-cms/src/genshin-editing-sync.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-editing-source-sync-2026-11-21-r144')
const delivery = { path: path.join(repo, 'reports/genshin-collection-production-2026-11-21-r143/delivery.json'), pin: 'ca30afc84398fe370c551d63e7c96b747fa413037db4864b1275be166b808e9f' }
assert.equal(createHash('sha256').update(readFileSync(delivery.path)).digest('hex'), delivery.pin)
const opened = await openGenshinEditingSync(delivery), plan = planGenshinEditingSync(opened)
mkdirSync(root, { recursive: true, mode: 0o700 })
writeFileSync(path.join(root, 'preparation.json'), JSON.stringify({ kind: 'genshin-editing-sync-preparation-r144', delivery,
  sourceIndex: opened.delivery.sourceIndex, syncKey: plan.syncKey, manifest: plan.manifest,
  changes: plan.changes.map(c => ({ cmsId: c.before?.id ?? null, family: c.family, from: c.from, to: c.to,
    oldStableKey: c.before?.stableKey ?? null, stableKey: c.after.stableKey, originalSHA256: c.after.sourceRecord.originalSHA256,
    hold: c.after.hold, status: c.after._status })), sourceReaderReopened: true, sources: opened.sources.sources.length,
  counts: { before: opened.before.draft.length, after: opened.before.draft.length + plan.changes.filter(c => !c.before).length,
    scope: plan.changes.length, existing: plan.changes.filter(c => c.before).length, added: plan.changes.filter(c => !c.before).length },
  productionDeployments: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ syncKey: plan.syncKey, sourceReaderReopened: true, sources: opened.sources.sources.length,
  scope: plan.changes.length, existing: plan.changes.filter(c => c.before).length, added: plan.changes.filter(c => !c.before).length }))
