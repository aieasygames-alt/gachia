import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'
import { auditUnifiedMainPreviewRenewal, unifiedPromotionRequest } from '../src/unified-promotion'

const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
const request = () => ({ schemaVersion: 1, kind: 'unified_main_promotion_request', production: proof, audit: proof,
  previews: proof, network: proof, executorRunID: 12 })

test('Main promotion accepts only pins and the exact executor CI, never caller authority', () => {
  const value = request(); assert.equal(unifiedPromotionRequest(value), value)
  for (const invalid of [null, [], { ...value, executorRunID: 0 }, { ...value, kind: 'retry' },
    { ...value, production: { ...proof, path: 'relative' } }, { ...value, previews: { ...proof, pin: 'bad' } }]) {
    assert.throws(() => unifiedPromotionRequest(invalid))
  }
  for (const key of ['verify', 'transport', 'ownerOrder', 'skipCI', 'originExecutor', 'sourceState', 'recovery', 'releaseKey',
    'qualification', 'publicReferences', 'publicPolicy', 'skipPublic']) {
    assert.throws(() => unifiedPromotionRequest({ ...value, [key]: true }))
  }
  for (const key of ['production', 'audit', 'previews', 'network'] as const) {
    assert.throws(() => unifiedPromotionRequest({ ...value, [key]: { ...proof, passed: true } }))
  }
})

test('fresh promotion source is an explicit pin and rejects malformed overrides', () => {
  const value = { ...request(), sourceHandoff: proof }
  assert.equal(unifiedPromotionRequest(value), value)
  for (const sourceHandoff of [undefined, null, 'latest', { ...proof, path: 'relative' }, { ...proof, pin: 'bad' }, { ...proof, approved: true }]) {
    assert.throws(() => unifiedPromotionRequest({ ...value, sourceHandoff }))
  }
})

test('fixed CLI refuses incomplete writes and injected authority before reading inputs', () => {
  for (const args of [[], ['promote'], ['recover'], ['audit'], ['renew'], ['renew', '--release-key', 'x'], ['audit', '--request', 'x', '--pin', 'x', '--output', 'x', '--skip-ci', 'true'],
    ['audit', '--release-key', 'x'],
    ['promote', '--request', 'missing', '--pin', 'a'.repeat(64), '--output', 'missing-output'],
    ['promote', '--request', 'missing', '--pin', 'a'.repeat(64), '--output', 'missing-output', '--release-key', 'bad'],
    ['promote', '--request', 'missing', '--pin', 'a'.repeat(64), '--output', 'missing-output', '--release-key', 'a'.repeat(64), '--force', 'true']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-promotion.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-promotion|Invalid promotion arguments|Require explicit/)
  }
})

test('read-only renewal rejects unsafe output paths before opening any credentials or network', async () => {
  for (const directory of ['relative', projectRoot]) {
    await assert.rejects(auditUnifiedMainPreviewRenewal({ request: request() as any, directory, cmsToken: '', cloudToken: '' }),
      /absolute new directory|already exists/)
  }
})
