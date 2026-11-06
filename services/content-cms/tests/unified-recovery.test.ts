import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'
import { createUnifiedExecutorVerifier } from '../src/unified-production'
import { unifiedRecoveryRequest } from '../src/unified-recovery'

const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
const request = () => ({ schemaVersion: 1, kind: 'unified_main_compatible_recovery_request', history: proof, promotionJournal: proof, network: proof, executorRunID: 123 })
test('fixed recovery binds historical publication, stopped journal, network and exact current executor without a CMS/source override', () => {
  const value = request(); assert.equal(unifiedRecoveryRequest(value), value)
  for (const key of ['verify', 'transport', 'sourceState', 'skipCI', 'candidate', 'recovery', 'versionId', 'baseline', 'approved', 'cmsToken', 'force']) {
    assert.throws(() => unifiedRecoveryRequest({ ...value, [key]: true }))
  }
  for (const invalid of [null, [], { ...value, executorRunID: 0 }, { ...value, kind: 'raw-uuid-rollback' }]) assert.throws(() => unifiedRecoveryRequest(invalid))
  for (const key of ['history', 'promotionJournal', 'network']) {
    assert.throws(() => unifiedRecoveryRequest({ ...value, [key]: { ...proof, pin: 'bad' } }))
    assert.throws(() => unifiedRecoveryRequest({ ...value, [key]: { ...proof, path: 'relative' } }))
    assert.throws(() => unifiedRecoveryRequest({ ...value, [key]: { ...proof, accepted: true } }))
  }
})

test('shared executor guard refuses CI before any desktop credentials or files are read', async () => {
  const old = process.env.CI; process.env.CI = 'true'
  try { await assert.rejects(createUnifiedExecutorVerifier(1, 'isolated-token'), /single-Mac desktop/) }
  finally { if (old === undefined) delete process.env.CI; else process.env.CI = old }
})

test('fixed recovery CLI remains audit-only and refuses write, retry and injection before reading credentials', () => {
  for (const args of [[], ['recover'], ['promote'], ['retry'], ['audit'], ['audit', '--request', 'x', '--pin', 'x', '--output', 'x', '--source-state', 'candidate']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-recovery.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-recovery|Invalid recovery audit arguments|Require explicit/)
  }
})
