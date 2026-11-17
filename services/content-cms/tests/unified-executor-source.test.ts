import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import test, { type TestContext } from 'node:test'
import { assertUnifiedExecutorRuntime, captureUnifiedExecutorSource } from '../src/unified-executor-source'

function fixture(t: TestContext) {
  const repo = mkdtempSync(path.join(tmpdir(), 'unified-executor-'))
  t.after(() => rmSync(repo, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', ...args], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] })
  const write = (file: string, text: string) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), text) }
  git('init'); write('scripts/executor.mjs', 'export const value = 1\n'); write('package.json', '{}\n')
  git('add', '.'); git('commit', '-m', 'fixture')
  return { repo, git, write }
}

test('executor source guard uses real Git bytes and permits unrelated report files', t => {
  const f = fixture(t), source = captureUnifiedExecutorSource(f.repo)
  assert.equal(source.commit, f.git('rev-parse', 'HEAD').toString().trim())
  f.write('reports/result.json', '{}'); source.verify()
})

for (const timing of ['initial', 'after-capture']) for (const fault of ['edit', 'untracked', 'staged-add', 'staged-delete', 'rename']) {
  test(`executor source rejects ${fault} ${timing} against real Git`, t => {
    const f = fixture(t), source = timing === 'after-capture' ? captureUnifiedExecutorSource(f.repo) : undefined
    if (fault === 'edit') f.write('scripts/executor.mjs', 'export const value = 2\n')
    if (fault === 'untracked' || fault === 'staged-add') f.write('scripts/new.mjs', 'export {}\n')
    if (fault === 'staged-add') f.git('add', 'scripts/new.mjs')
    if (fault === 'staged-delete') f.git('rm', 'scripts/executor.mjs')
    if (fault === 'rename') f.git('mv', 'scripts/executor.mjs', 'scripts/renamed.mjs')
    assert.throws(() => source ? source.verify() : captureUnifiedExecutorSource(f.repo),
      /unverified source edits|Uncommitted production executor files|file inventory changed/)
  })
}

test('executor source rejects a changed HEAD even when executor bytes are unchanged', t => {
  const f = fixture(t), source = captureUnifiedExecutorSource(f.repo)
  f.git('commit', '--allow-empty', '-m', 'changed head')
  assert.throws(() => source.verify(), /commit changed/)
})

for (const timing of ['initial', 'after-capture']) test(`executor rejects Git replacement refs ${timing}`, t => {
  const f = fixture(t), source = timing === 'after-capture' ? captureUnifiedExecutorSource(f.repo) : undefined
  const original = f.git('rev-parse', 'HEAD:scripts/executor.mjs').toString().trim()
  f.write('replacement', 'export const value = 2\n')
  const replacement = f.git('hash-object', '-w', 'replacement').toString().trim()
  // Only this disposable fixture contains the simulated attack ref.
  f.git('update-ref', `refs/replace/${original}`, replacement)
  f.write('scripts/executor.mjs', 'export const value = 2\n')
  assert.throws(() => source ? source.verify() : captureUnifiedExecutorSource(f.repo), /replacement refs/)
})

test('executor rejects Git grafts and unreviewed runtime instrumentation', t => {
  const f = fixture(t)
  f.write('.git/info/grafts', f.git('rev-parse', 'HEAD').toString())
  assert.throws(() => captureUnifiedExecutorSource(f.repo), /grafts/)
  assert.throws(() => assertUnifiedExecutorRuntime({ NODE_OPTIONS: '--require ./preview-throttle.cjs' }, []), /NODE_OPTIONS/)
  assert.throws(() => assertUnifiedExecutorRuntime({ GIT_REPLACE_REF_BASE: 'refs/unreviewed' }, []), /GIT_REPLACE_REF_BASE/)
  for (const args of [['--require', './proxy-fetch.cjs'], ['--import=./patch.mjs'], ['--loader', './patch.mjs']]) {
    assert.throws(() => assertUnifiedExecutorRuntime({}, args), /preloads|loaders/)
  }
  assertUnifiedExecutorRuntime({}, ['--import', 'tsx'])
})

test('executor permits the installed tsx CLI file URL loader and rejects other URL preloads', () => {
  const tsx = path.dirname(createRequire(import.meta.url).resolve('tsx'))
  const loader = pathToFileURL(path.join(tsx, 'loader.mjs')).href
  assertUnifiedExecutorRuntime({}, ['--require', path.join(tsx, 'preflight.cjs'), '--import', loader])
  assertUnifiedExecutorRuntime({}, [`--import=${loader}`])
  for (const value of [loader + '?patch=1', pathToFileURL(path.join(tsx, 'unverified.mjs')).href, 'https://example.invalid/loader.mjs']) {
    assert.throws(() => assertUnifiedExecutorRuntime({}, ['--import', value]), /unverified runtime preloads/)
  }
})
