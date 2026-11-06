import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const executorPaths = ['scripts', 'services/content-cms', '.github/workflows', 'pnpm-lock.yaml', 'package.json']
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export function captureUnifiedExecutorSource(repo: string) {
  const git = (args: string[]) => execFileSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024 })
  const commit = git(['rev-parse', 'HEAD']).toString().trim()
  const files = git(['ls-tree', '-r', '--name-only', '-z', commit, '--', ...executorPaths]).toString().split('\0').filter(Boolean).sort()
  assert(files.length > 0, 'Missing committed production executor files')
  const assertInventory = () => {
    assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', ...executorPaths]).length, 0, 'Uncommitted production executor files')
    assert.deepEqual(git(['ls-files', '-z', '--', ...executorPaths]).toString().split('\0').filter(Boolean).sort(), files,
      'Production executor file inventory changed')
  }
  assertInventory()
  const pins = files.map(file => digest(git(['show', `${commit}:${file}`])))
  const verify = () => {
    assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), commit, 'Production executor commit changed')
    assertInventory()
    assert.deepEqual(files.map(file => digest(readFileSync(path.join(repo, file)))), pins, 'Production executor has unverified source edits')
  }
  verify()
  return { commit, verify }
}
