import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const executorPaths = ['scripts', 'services/content-cms', '.github/workflows', 'pnpm-lock.yaml', 'package.json']
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const require = createRequire(import.meta.url)

export function assertUnifiedExecutorRuntime(env: Record<string, string | undefined> = process.env, args = process.execArgv) {
  assert(!env.NODE_OPTIONS?.trim(), 'Production executor forbids NODE_OPTIONS preloads')
  for (const key of ['GIT_REPLACE_REF_BASE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_CONFIG_COUNT']) {
    assert(!env[key]?.trim(), `Production executor forbids ${key} overrides`)
  }
  const tsx = path.dirname(require.resolve('tsx'))
  const allowed = new Set(['tsx', path.join(tsx, 'loader.mjs'), path.join(tsx, 'preflight.cjs')])
  for (let index = 0; index < args.length; index++) {
    const match = /^(--import|--require|-r)(?:=(.*))?$/.exec(args[index])
    if (match) assert(allowed.has(match[2] ?? args[++index]), 'Production executor forbids unverified runtime preloads')
    assert(!/^--(experimental-loader|loader)(?:=|$)/.test(args[index]), 'Production executor forbids custom loaders')
  }
}

export function captureUnifiedExecutorSource(repo: string) {
  const git = (args: string[]) => execFileSync('git', ['--no-replace-objects', ...args], { cwd: repo, maxBuffer: 32 * 1024 * 1024 })
  const assertRuntime = () => {
    assertUnifiedExecutorRuntime()
    assert.equal(git(['for-each-ref', '--format=%(refname)', 'refs/replace']).length, 0, 'Production executor forbids Git replacement refs')
    const grafts = git(['rev-parse', '--git-path', 'info/grafts']).toString().trim()
    assert(!existsSync(path.resolve(repo, grafts)) || !readFileSync(path.resolve(repo, grafts), 'utf8').trim(), 'Production executor forbids Git grafts')
  }
  assertRuntime()
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
    assertRuntime()
    assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), commit, 'Production executor commit changed')
    assertInventory()
    assert.deepEqual(files.map(file => digest(readFileSync(path.join(repo, file)))), pins, 'Production executor has unverified source edits')
  }
  verify()
  return { commit, verify }
}
