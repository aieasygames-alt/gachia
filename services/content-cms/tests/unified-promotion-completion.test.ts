import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'

test('completion CLI has no deployment, retry or injected authority arguments', () => {
  for (const args of [[], ['promote'], ['recover'], ['retry'], ['complete'],
    ['complete', '--request', 'missing', '--pin', 'a'.repeat(64), '--release-key', 'a'.repeat(64)],
    ['complete', '--request', 'missing', '--pin', 'a'.repeat(64), '--force', 'true']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-promotion-completion.ts'), ...args],
      { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage: unified-promotion-completion|Invalid completion arguments|Require explicit completion/)
  }
})
