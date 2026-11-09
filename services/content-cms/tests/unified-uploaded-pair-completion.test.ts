import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'
import { unifiedUploadedPairRequest, type UnifiedUploadedPairRequest } from '../src/unified-uploaded-pair-completion'

const proof = { path: '/sealed/evidence.json', pin: 'a'.repeat(64) }
const request = (): UnifiedUploadedPairRequest => structuredClone({ schemaVersion: 1, kind: 'unified_uploaded_pair_completion_request',
  production: proof, sourceHandoff: proof, network: proof, originExecutorCommit: 'b'.repeat(40), executorRunID: 5,
  stopped: { journal: proof, recovery: { http: proof, module: proof, version: proof }, candidate: { http: proof, module: proof, version: proof } } })

test('fixed uploaded pair entry retains original release inputs while selecting fresh observations', () => {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT
  const result = spawnSync(process.execPath, ['--experimental-test-module-mocks', '--import', 'tsx', '--test', '--test-reporter=tap',
    path.join(projectRoot, 'tests/fixtures/unified-uploaded-pair-entry.mjs')], { cwd: projectRoot, encoding: 'utf8', env, timeout: 60000 })
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /# tests 4\b/); assert.match(result.stdout, /# fail 0/)
})

test('uploaded pair request explicitly separates original production, fresh source and current executor', () => {
  const value = request(); assert.deepEqual(unifiedUploadedPairRequest(value), value)
})

test('continuation requires three explicit pinned proofs and cannot supply retry options', () => {
  const value = { ...request(), completionStop: { journal: proof, recovery: proof, candidate: proof } }
  assert.deepEqual(unifiedUploadedPairRequest(value), value)
  for (const completionStop of [undefined, null, {}, { ...value.completionStop, retry: true },
    { ...value.completionStop, candidate: { path: 'relative', pin: proof.pin } },
    { ...value.completionStop, journal: { ...proof, pin: 'invalid' } }]) {
    assert.throws(() => unifiedUploadedPairRequest({ ...value, completionStop }))
  }
})

for (const fault of ['audit', 'writer', 'missing-source', 'old-kind', 'bad-commit', 'bad-run', 'relative', 'bad-pin', 'missing-module', 'extra-proof']) {
  test(`uploaded pair request rejects ${fault}`, () => {
    const value = request() as any
    if (fault === 'audit') value.audit = proof
    if (fault === 'writer') value.upload = true
    if (fault === 'missing-source') delete value.sourceHandoff
    if (fault === 'old-kind') value.kind = 'unified_observation_stop_completion_request'
    if (fault === 'bad-commit') value.originExecutorCommit = 'HEAD'
    if (fault === 'bad-run') value.executorRunID = -1
    if (fault === 'relative') value.sourceHandoff.path = 'relative.json'
    if (fault === 'bad-pin') value.stopped.candidate.http.pin = 'wrong'
    if (fault === 'missing-module') delete value.stopped.candidate.module
    if (fault === 'extra-proof') value.stopped.recovery.module.versionId = 'caller-selected'
    assert.throws(() => unifiedUploadedPairRequest(value))
  })
}
