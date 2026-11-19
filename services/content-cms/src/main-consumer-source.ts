import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { unifiedTree } from './unified-build'

type Proof = { path: string; pin: string }
const derived = (file: string) => /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(file)

// Unlike the reconstruction checkpoint, this workspace starts from a complete,
// verified published index. All content is A; only committed consumer code changes.
export function freezeMainConsumerSource(repo: string, commit: string, sources: any[], directory: string) {
  assert(/^[a-f0-9]{40}$/.test(commit)); assert.equal(sources.length, 115)
  mkdirSync(directory, { mode: 0o700 }); const workspace = path.join(directory, 'source'), archive = path.join(directory, 'source.tar')
  mkdirSync(workspace)
  execFileSync('git', ['--no-replace-objects', 'archive', '--format=tar', `--output=${archive}`, commit], { cwd: repo })
  execFileSync('tar', ['-xf', archive, '-C', workspace]); unlinkSync(archive)
  const pairs = JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8')).pairs
  assert.equal(new Set(sources.map(row => row.sourcePath)).size, 115)
  for (const row of sources) {
    assert.equal(digest(row.text), row.sha256)
    assert(/^(?:packages\/data\/games\/|apps\/game-[a-z-]+\/lib\/data\.ts$)/.test(row.sourcePath))
    assert(!row.sourcePath.split('/').some((part: string) => part === '..' || part === '.'))
    writeFileSync(path.join(workspace, row.sourcePath), row.text)
    const pair = row.sourcePath.slice('packages/data/games/'.length)
    if (row.sourcePath.startsWith('packages/data/games/') && pairs.includes(pair)) writeFileSync(path.join(workspace, 'apps/web/public/data', pair), row.text)
  }
  for (const script of ['generate-character-summaries.mjs', 'generate-manifests.mjs', 'verify-manifests.mjs']) {
    const output = execFileSync(process.execPath, [path.join(workspace, 'packages/data/scripts', script)], { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'] })
    writeFileSync(path.join(directory, script + '.log'), output, { flag: 'wx', mode: 0o600 })
  }
  const proof = migrationSave(directory, 'workspace.json', { kind: 'main_consumer_preserved_workspace_v1', sourceCommit: commit, workspace,
    files: migrationSave(directory, 'files.json', unifiedTree(workspace)), sourceHashes: sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })) })
  verifyMainConsumerSource(repo, proof, sources); return proof
}

export function verifyMainConsumerSource(repo: string, proof: Proof, sources: any[]) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(value.kind, 'main_consumer_preserved_workspace_v1'); assert.equal(proof.path, path.join(directory, 'workspace.json'))
  assert.equal(value.workspace, path.join(directory, 'source')); assert.equal(value.files.path, path.join(directory, 'files.json'))
  assert(/^[a-f0-9]{40}$/.test(value.sourceCommit)); assert.equal(sources.length, 115)
  assert.deepEqual(value.sourceHashes, sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })))
  const tree = execFileSync('git', ['--no-replace-objects', 'ls-tree', '-r', '-z', value.sourceCommit], { cwd: repo, maxBuffer: 16 * 1024 ** 2 }).toString().split('\0').filter(Boolean)
    .map(line => { const [metadata, file] = line.split('\t'); return { metadata: metadata.split(' '), file } })
  const files = unifiedTree(value.workspace, '', true)
  assert.deepEqual(files, migrationPinned(value.files), 'Main consumer frozen workspace changed')
  assert.deepEqual(files.map(row => row.path).sort(), tree.map(row => row.file).sort(), 'Main consumer Git inventory changed')
  const overlays = new Map(sources.map(row => [row.sourcePath, row]))
  assert.equal(overlays.size, 115)
  for (const row of sources) {
    assert.equal(digest(row.text), row.sha256)
    assert.equal(digest(readFileSync(path.join(value.workspace, row.sourcePath))), row.sha256, 'Main migration changed preserved content')
  }
  for (const { metadata, file } of tree) {
    assert.equal(metadata[1], 'blob'); assert(['100644', '100755'].includes(metadata[0]))
    if (overlays.has(file) || derived(file)) continue
    const bytes = readFileSync(path.join(value.workspace, file))
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), metadata[2], `Main consumer differs from exact Git: ${file}`)
  }
  execFileSync(process.execPath, [path.join(value.workspace, 'packages/data/scripts/verify-manifests.mjs')], { cwd: value.workspace, stdio: ['ignore', 'pipe', 'pipe'] })
  return value
}
