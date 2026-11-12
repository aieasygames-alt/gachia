import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { readGenshinIndependentSourceIndex } from './genshin-independent-history'
import { unifiedTree } from './unified-build'

type Proof = { path: string; pin: string }
// Unchanged published A only. This receipt cannot authorize an upload or a CMS edit.
export async function prepareNteMigrationSource(input: { repo: string; commit: string; sourceIndex: Proof; directory: string }) {
  const repo = realpathSync(input.repo), directory = path.resolve(input.directory), commit = input.commit
  assert(/^[a-f0-9]{40}$/.test(commit)); assert(!existsSync(directory)); assert.equal(realpathSync(path.dirname(directory)), path.dirname(directory))
  assert(directory !== repo && !repo.startsWith(directory + '/'))
  const current = await readGenshinIndependentSourceIndex(input.sourceIndex)
  assert.equal(current.sources.length, 115)
  const git = (args: string[]) => execFileSync('git', args, { cwd: repo, maxBuffer: 64 * 1024 * 1024 })
  assert.equal(git(['rev-parse', `${commit}^{commit}`]).toString().trim(), commit)
  const tracked = git(['ls-tree', '-rlz', commit]).toString().split('\0').filter(Boolean).map(row => {
    const match = row.match(/^(100644|100755) blob [a-f0-9]{40}\s+(\d+)\t(.+)$/s)
    assert(match && !match[3].split('/').some(part => ['.env', '.env.local', '.git', 'node_modules'].includes(part)))
    return { path: match[3], bytes: Number(match[2]) }
  })
  assertDiskBudget({ path: directory, operation: 'NTE complete published A source', estimatedBytes: tracked.reduce((sum, row) => sum + row.bytes, 0) * 2 + GiB })
  mkdirSync(directory, { mode: 0o700 }); const workspace = path.join(directory, 'source'), archive = path.join(directory, 'source.tar')
  mkdirSync(workspace, { mode: 0o700 }); const stages: string[] = []
  try {
    git(['archive', '--format=tar', `--output=${archive}`, commit]); execFileSync('tar', ['-xf', archive, '-C', workspace]); unlinkSync(archive)
    const original = unifiedTree(workspace), ledger = JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8'))
    assert.equal(ledger.pairs.length, 90)
    for (const row of current.sources) {
      assert.equal(digest(row.text), row.sha256)
      assert(tracked.some(file => file.path === row.sourcePath)); const target = path.join(workspace, row.sourcePath)
      assert.equal(realpathSync(target), target); writeFileSync(target, row.text)
      const relative = row.sourcePath.replace(/^packages\/data\/games\//, '')
      if (ledger.pairs.includes(relative)) writeFileSync(path.join(workspace, 'apps/web/public/data', relative), row.text)
    }
    for (const script of ['generate-character-summaries.mjs', 'generate-manifests.mjs', 'verify-manifests.mjs', 'raw-inventory-contract.mjs']) {
      const file = `packages/data/scripts/${script}`
      const bytes = execFileSync(process.execPath, [path.join(workspace, file), ...(script === 'raw-inventory-contract.mjs' ? ['--release'] : [])], {
        cwd: workspace, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH, HOME: directory, LANG: 'en_US.UTF-8', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
      })
      writeFileSync(path.join(directory, `${stages.length}.log`), bytes, { flag: 'wx', mode: 0o600 }); stages.push(file)
    }
    for (const row of current.sources) assert.equal(digest(readFileSync(path.join(workspace, row.sourcePath))), row.sha256)
    const files = unifiedTree(workspace), sources = new Set(current.sources.map((row: any) => row.sourcePath)), previous = new Map(original.map(row => [row.path, row.sha256]))
    assert.deepEqual(files.map(row => row.path), original.map(row => row.path))
    for (const row of files) if (row.sha256 !== previous.get(row.path)) assert(sources.has(row.path) || /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path))
    const filesProof = migrationSave(directory, 'files.json', files), active = migrationSave(directory, 'active.json', current.sources)
    const value = { schemaVersion: 1, kind: 'nte_complete_published_A_source', sourceCommit: commit, sourceIndex: input.sourceIndex,
      files: filesProof, active, stages, editorialChanges: [], cloudWrites: false, productionReady: false }
    return { proof: migrationSave(directory, 'source.json', value), workspace, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, stages, cloudWrites: false }); throw error }
  finally { if (existsSync(archive)) unlinkSync(archive) }
}
export function verifyNteMigrationSource(proof: Proof) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path), workspace = path.join(directory, 'source')
  assert.equal(proof.path, path.join(directory, 'source.json')); assert(!existsSync(path.join(directory, 'failure.json')))
  assert.equal(value.kind, 'nte_complete_published_A_source'); assert.deepEqual(value.editorialChanges, [])
  assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  assert.deepEqual(unifiedTree(workspace, '', true), migrationPinned(value.files))
  const active = migrationPinned(value.active); assert.equal(active.length, 115)
  for (const row of active) assert.equal(digest(readFileSync(path.join(workspace, row.sourcePath))), row.sha256)
  return { value, workspace, active }
}
