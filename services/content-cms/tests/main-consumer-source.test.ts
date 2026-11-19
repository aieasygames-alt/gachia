import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { freezeMainConsumerSource, verifyMainConsumerSource } from '../src/main-consumer-source'
import { unifiedTree } from '../src/unified-build'

test('Main consumer freeze preserves all A and rejects rehashed code/content substitutions', t => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'main-consumer-'))); t.after(() => rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'repo'); mkdirSync(repo)
  const put = (file: string, text: string) => { mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), text) }
  put('consumer.ts', 'export const consumer = "committed"\n')
  put('packages/data/raw-content-review.json', '{"pairs":[]}')
  for (const name of ['generate-character-summaries', 'generate-manifests', 'verify-manifests']) put(`packages/data/scripts/${name}.mjs`, '// fixture generator\n')
  const sources = Array.from({ length: 115 }, (_, index) => {
    const sourcePath = `packages/data/games/fixture/raw-${index}.json`, text = `{"published":${index}}\n`
    put(sourcePath, '{"import":"old"}\n'); return { sourcePath, text, sha256: digest(text) }
  })
  const git = (args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  git(['init']); git(['add', '.']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', 'commit', '-m', 'fixture'])
  const proof = freezeMainConsumerSource(repo, git(['rev-parse', 'HEAD']), sources, path.join(root, 'freeze'))
  const value = verifyMainConsumerSource(repo, proof, sources)
  assert.equal(readFileSync(path.join(value.workspace, sources[0].sourcePath), 'utf8'), sources[0].text)
  const rehash = (name: string) => migrationSave(root, name, { ...value, files: migrationSave(root, name + '.files', unifiedTree(value.workspace)) })
  // Keep the mandated proof locations, while simulating an attacker recomputing pins.
  let attempt = 0
  const repin = () => {
    const next = rehash(`tampered-${++attempt}.json`), body = migrationPinned(next)
    writeFileSync(value.files.path, readFileSync(body.files.path)); body.files = { path: value.files.path, pin: digest(readFileSync(value.files.path)) }
    writeFileSync(proof.path, JSON.stringify(body, null, 2) + '\n'); return { path: proof.path, pin: digest(readFileSync(proof.path)) }
  }
  writeFileSync(path.join(value.workspace, 'consumer.ts'), 'export const consumer = "unreviewed"\n')
  assert.throws(() => verifyMainConsumerSource(repo, repin(), sources), /exact Git/)
  writeFileSync(path.join(value.workspace, 'consumer.ts'), 'export const consumer = "committed"\n')
  writeFileSync(path.join(value.workspace, sources[0].sourcePath), '{"published":"lost"}\n')
  assert.throws(() => verifyMainConsumerSource(repo, repin(), sources), /preserved content/)
})
