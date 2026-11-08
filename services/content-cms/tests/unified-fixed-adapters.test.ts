import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'

test('fixed adapters compose completed publication, recovery and next-batch evidence in an isolated process', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const result = spawnSync(process.execPath, ['--experimental-test-module-mocks', '--import', 'tsx', '--test', '--test-reporter=tap',
    path.join(projectRoot, 'tests/fixtures/unified-fixed-adapters.mjs')], { cwd: projectRoot, encoding: 'utf8', env,
    // Real Git, builds and Worker checks take about five minutes even locally.
    timeout: 900000, maxBuffer: 4 * 1024 * 1024 })
  assert.equal(result.error, undefined, [result.error?.message, result.stdout, result.stderr].join('\n'))
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr)
  assert.match(result.stdout, /# tests 120\b/)
  assert.match(result.stdout, /# fail 0/)
  assert.match(result.stdout, /# cancelled 0/)
  assert.match(result.stdout, /# skipped 0/)
})
