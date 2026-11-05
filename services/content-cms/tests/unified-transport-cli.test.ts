import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'

test('unified transport CLI rejects ambiguous, credential-bearing and incomplete arguments before opening inputs', () => {
  for (const args of [[], ['upload'], ['prepare', '--publication', '/not-opened'],
    ['verify', '--directory', '/not-opened', '--directory', '/duplicate', '--pin', '0'.repeat(64)],
    ['verify', '--directory', '/not-opened', '--pin', '0'.repeat(64), '--token', 'not-a-credential'],
    ['verify', '--directory', '/not-opened', '--pin'], ['prepare', '--all']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-transport.ts'), ...args],
      { cwd: projectRoot, env: { PATH: process.env.PATH, NODE_ENV: 'test' }, timeout: 15000, maxBuffer: 128 * 1024, encoding: 'utf8' })
    assert.equal(result.error, undefined); assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage: unified-transport|Invalid transport arguments|Require --/)
    assert(!result.stderr.includes('ENOENT'), 'Invalid CLI must fail before opening evidence')
  }
})
