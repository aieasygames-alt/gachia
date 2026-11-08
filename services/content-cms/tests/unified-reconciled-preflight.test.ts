import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test, { type TestContext } from 'node:test'
import { digest } from '../src/legacy-intake'
import { readUnifiedPreflightBinding, RECONCILED_PREFLIGHT } from '../src/unified-reconciled-preflight'
import type { UnifiedProductionRequest } from '../src/unified-production'

function fixture(t: TestContext) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'reconciled-preflight-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const save = (name: string, value: unknown) => {
    const file = path.join(root, name), raw = JSON.stringify(value); writeFileSync(file, raw)
    return { path: file, pin: digest(raw) }
  }
  const old = save('old.json', {}), fresh = save('fresh.json', { observed: true })
  const original: UnifiedProductionRequest = { schemaVersion: 1, kind: 'unified_production_preview_request', repo: root,
    localPreview: old, editorial: old, selection: old, active: old, application: old, preservation: old, sourceHandoff: old,
    sourceRunID: 1, executorRunID: 2 }
  const originalProduction = save('original.json', original), production = { ...original, sourceHandoff: fresh }
  const selected = save('renewed.json', production), releaseKey = 'a'.repeat(64), transportPin = 'b'.repeat(64)
  const previews = save('receipt.json', { schemaVersion: 1, kind: 'unified_readonly_uploaded_pair_cloud_previews',
    status: 'all_cloud_previews_accepted_no_promotion', releaseKey, transportPin, cloudWrites: false, productionPromoted: false, activationSupported: false })
  const executorCI = { commit: 'c'.repeat(40), runID: 3, runAttempt: 1, status: 'full_exact_ci_passed' }
  const audit = { schemaVersion: 1, kind: 'unified_uploaded_pair_reconciled_preflight', status: RECONCILED_PREFLIGHT,
    requestPin: selected.pin, executorCI: { ...executorCI, runID: 2 }, releaseKey, transportPin,
    reconciliation: { originalProduction, previews, executorCI }, cloudWrites: false, productionPromoted: false, productionReady: false, activationSupported: false }
  return { root, save, old, fresh, original, production, selected, audit, read: () => readUnifiedPreflightBinding(audit, production, selected) }
}

test('reconciled provenance permits only a new source observation and preserves original executor', t => {
  const f = fixture(t), original = readFileSync(f.audit.reconciliation.originalProduction.path)
  assert.deepEqual(f.read(), f.audit.reconciliation)
  assert.deepEqual(readFileSync(f.audit.reconciliation.originalProduction.path), original)
  assert.equal(f.production.executorRunID, 2); assert.equal(f.read()!.executorCI.runID, 3)
})

test('legacy preflight remains distinct from reconciled provenance', t => {
  const f = fixture(t)
  assert.equal(readUnifiedPreflightBinding({ status: 'production_preview_preflight_passed_no_upload', requestPin: f.selected.pin }, f.production, f.selected), undefined)
})

for (const fault of ['downgrade', 'unknown-status', 'kind', 'request-pin', 'original-pin', 'original-bytes', 'old-source', 'source-run', 'executor-run',
  'candidate', 'complete-A', 'application', 'preservation', 'repo', 'preview-pin', 'preview-kind', 'preview-release', 'preview-transport', 'preview-writes',
  'missing-preview', 'extra-authority', 'ci-status', 'ci-attempt', 'ci-commit', 'origin-executor', 'promotion']) {
  test(`reconciled preflight rejects ${fault}`, t => {
    const f = fixture(t), audit = f.audit as any
    if (fault === 'downgrade') audit.status = 'production_preview_preflight_passed_no_upload'
    if (fault === 'unknown-status') audit.status = 'passed'
    if (fault === 'kind') audit.kind = 'preflight'
    if (fault === 'request-pin') audit.requestPin = '0'.repeat(64)
    if (fault === 'original-pin') audit.reconciliation.originalProduction.pin = '0'.repeat(64)
    if (fault === 'original-bytes') writeFileSync(audit.reconciliation.originalProduction.path, '{}')
    if (fault === 'old-source') writeFileSync(f.old.path, '{"changed":true}')
    if (fault === 'source-run') f.production.sourceRunID = 4
    if (fault === 'executor-run') f.production.executorRunID = 4
    if (fault === 'candidate') f.production.editorial = f.fresh
    if (fault === 'complete-A') f.production.active = f.fresh
    if (fault === 'application') f.production.application = f.fresh
    if (fault === 'preservation') f.production.preservation = f.fresh
    if (fault === 'repo') f.production.repo += '/other'
    if (fault === 'preview-pin') audit.reconciliation.previews.pin = '0'.repeat(64)
    if (fault.startsWith('preview-') && fault !== 'preview-pin') {
      const receipt = JSON.parse(readFileSync(audit.reconciliation.previews.path, 'utf8'))
      if (fault === 'preview-kind') receipt.kind = 'unified_candidate_recovery_cloud_previews'
      if (fault === 'preview-release') receipt.releaseKey = '0'.repeat(64)
      if (fault === 'preview-transport') receipt.transportPin = '0'.repeat(64)
      if (fault === 'preview-writes') receipt.cloudWrites = true
      audit.reconciliation.previews = f.save('receipt.json', receipt)
    }
    if (fault === 'missing-preview') delete audit.reconciliation.previews
    if (fault === 'extra-authority') audit.reconciliation.approved = true
    if (fault === 'ci-status') audit.reconciliation.executorCI.status = 'skipped'
    if (fault === 'ci-attempt') audit.reconciliation.executorCI.runAttempt = 0
    if (fault === 'ci-commit') audit.reconciliation.executorCI.commit = 'HEAD'
    if (fault === 'origin-executor') audit.executorCI.runID = 3
    if (fault === 'promotion') audit.productionPromoted = true
    assert.throws(f.read)
  })
}
