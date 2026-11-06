import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'
import { unifiedCompletionRequest } from '../src/unified-preview-completion'
import { verifyUnifiedExecutorCI } from '../src/unified-production'

const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
const request = () => ({ schemaVersion: 1, kind: 'unified_observation_stop_completion_request', production: proof, audit: proof,
  stopped: { journal: proof, http: proof, version: proof, module: proof }, network: proof, executorRunID: 12 })

test('completion accepts only the pinned stopped attempt and explicit network selection, never authority flags', () => {
  const value = request(); assert.equal(unifiedCompletionRequest(value), value)
  for (const patch of [null, [], { ...value, executorRunID: 0 }, { ...value, kind: 'retry_upload' }, { ...value, production: { ...proof, path: 'relative' } },
    { ...value, network: { ...proof, pin: 'bad' } }, { ...value, stopped: { ...value.stopped, candidate: proof } }, { ...value, stopped: [] }]) {
    assert.throws(() => unifiedCompletionRequest(patch))
  }
  for (const field of ['transport', 'verify', 'skipCI', 'recoveryUpload', 'originExecutor', 'releaseKey', 'ownerOrder', 'promote', 'parserVersion']) {
    assert.throws(() => unifiedCompletionRequest({ ...value, [field]: true }))
  }
  for (const field of ['production', 'audit', 'network'] as const) assert.throws(() => unifiedCompletionRequest({ ...value, [field]: { ...proof, passed: true } }))
})

test('completion executor renewal requires full exact CI for both the current writer and original release executor', async t => {
  const current = { runID: 100, commit: 'a'.repeat(40) }, origin = { runID: 99, commit: 'b'.repeat(40) }, calls: number[] = []
  const steps = ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
    'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds', 'Test documentation and verification scope gates']
  let wrongCurrent = false, wrongOrigin = false
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    assert.equal(options?.method, 'GET'); assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer isolated-token')
    const url = String(input), runID = Number(url.match(/runs\/(\d+)/)![1]); calls.push(runID)
    if (url.includes('/jobs?')) return Response.json({ total_count: 1, jobs: [{ conclusion: 'success', steps: steps.map(name => ({ name, conclusion: 'success' })) }] })
    return Response.json({ id: runID, repository: { full_name: 'aieasygames-alt/gachia' }, path: '.github/workflows/payload-verify.yml', head_branch: 'codex/payload-unified-maintenance',
      head_sha: runID === current.runID ? (wrongCurrent ? origin.commit : current.commit) : (wrongOrigin ? current.commit : origin.commit),
      status: 'completed', conclusion: 'success', run_attempt: 1 })
  })
  const result = await verifyUnifiedExecutorCI(current, 'isolated-token', origin)
  assert.equal(result.executorCI.commit, current.commit); assert.equal(result.originExecutorCI.commit, origin.commit)
  assert.deepEqual(calls, [100, 100, 99, 99])
  wrongCurrent = true; await assert.rejects(verifyUnifiedExecutorCI(current, 'isolated-token', origin))
  wrongCurrent = false; wrongOrigin = true; await assert.rejects(verifyUnifiedExecutorCI(current, 'isolated-token', origin))
  const count = calls.length
  for (const invalid of [{ ...origin, skipCI: true }, { ...origin, commit: 'bad' }, { ...origin, runID: 0 }]) {
    await assert.rejects(verifyUnifiedExecutorCI(current, 'isolated-token', invalid)); assert.equal(calls.length, count)
  }
  const same = await verifyUnifiedExecutorCI(current, 'isolated-token'); assert.deepEqual(same.executorCI, same.originExecutorCI)
})

test('completion CLI refuses missing pins, retry and promotion flags before any CMS or cloud request', () => {
  for (const args of [[], ['retry'], ['promote'], ['audit'], ['complete-previews', '--request', 'x', '--pin', 'x', '--output', 'x'],
    ['audit', '--request', 'x', '--pin', 'x', '--output', 'x', '--skip-ci', 'true'], ['audit', '--release-key', 'x']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-preview-completion.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-preview-completion|Invalid completion arguments|Require explicit/)
  }
})
