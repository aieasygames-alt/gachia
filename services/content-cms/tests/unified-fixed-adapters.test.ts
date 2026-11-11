import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { projectRoot } from '../src/local-environment'

test('fixed adapters compose completed publication, recovery and next-batch evidence in isolated shards', async () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const results = await Promise.all(['0/2', '1/2'].map(async shard => {
    const result = await promisify(execFile)(process.execPath, ['--experimental-test-module-mocks', '--import', 'tsx', '--test', '--test-reporter=tap',
      path.join(projectRoot, 'tests/fixtures/unified-fixed-adapters.mjs')], { cwd: projectRoot, encoding: 'utf8',
      env: { ...env, GACHIA_FIXED_ADAPTER_TEST_SHARD: shard }, timeout: 900000, maxBuffer: 4 * 1024 * 1024 })
      .catch(error => assert.fail([`Fixed-adapter shard ${shard}`, error.message, error.stdout, error.stderr].join('\n')))
    assert.match(result.stdout, /# tests 78\b/)
    for (const count of ['fail', 'cancelled', 'skipped']) assert.match(result.stdout, new RegExp(`# ${count} 0\\b`))
    return result
  }))
  const names = results.flatMap(result => [...result.stdout.matchAll(/^# Subtest: (.+)$/gm)].map(match => match[1]))
  assert.equal(names.length, 156)
  assert.equal(new Set(names).size, 156, 'Every fixed-adapter case must run exactly once')
})
