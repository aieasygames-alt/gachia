import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { readUnifiedPromotionSourceSelection } from '../src/unified-promotion-source'

function fixture(t: any) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'promotion-source-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const save = (name: string, value: unknown) => {
    const file = path.join(root, name), raw = JSON.stringify(value)
    writeFileSync(file, raw); return { path: file, pin: digest(raw) }
  }
  const active = save('active.json', [{ sourcePath: 'source.ts', text: 'public A', sha256: digest('public A') }])
  const previous = save('previous.json', { owners: { main: { versionId: 'old-main' } } })
  const original = { schemaVersion: 1, kind: 'unified_next_batch_baseline', status: 'published_A_freshly_observed',
    publication: active, sourceIndex: previous, releaseKey: 'a'.repeat(64), planSHA256: 'b'.repeat(64), active, previous,
    observation: { startedAt: Date.now() - 1000000 } }
  const sourceHandoff = save('old-handoff.json', original)
  const production = { sourceHandoff, active } as any
  const current = structuredClone({ ...original, active: save('new-active.json', JSON.parse(readFileSync(active.path, 'utf8'))),
    previous: save('new-previous.json', JSON.parse(readFileSync(previous.path, 'utf8'))), observation: { startedAt: Date.now() } })
  return { save, production, current, original }
}

test('promotion source refresh preserves source index, full A and all previous artifacts without rewriting history', t => {
  const f = fixture(t), bytes = readFileSync(f.production.sourceHandoff.path), proof = f.save('fresh.json', f.current)
  assert.deepEqual(readUnifiedPromotionSourceSelection(f.production, proof), f.current)
  assert.deepEqual(readFileSync(f.production.sourceHandoff.path), bytes)
})

for (const fault of ['kind', 'status', 'publication', 'index', 'release', 'plan', 'missing-code', 'previous', 'pin']) {
  test(`promotion source selection rejects ${fault}`, t => {
    const f = fixture(t)
    if (fault === 'kind') f.current.kind = 'unified_observed_source_handoff'
    if (fault === 'status') f.current.status = 'caller_approved'
    if (fault === 'publication') f.current.publication = f.current.sourceIndex
    if (fault === 'index') f.current.sourceIndex = f.current.publication
    if (fault === 'release') f.current.releaseKey = 'c'.repeat(64)
    if (fault === 'plan') f.current.planSHA256 = 'c'.repeat(64)
    if (fault === 'missing-code') f.current.active = f.save('missing.json', [])
    if (fault === 'previous') f.current.previous = f.save('wrong-previous.json', { owners: { main: { versionId: 'different-main' } } })
    const proof = f.save('fresh.json', f.current)
    if (fault === 'pin') writeFileSync(proof.path, '{}')
    assert.throws(() => readUnifiedPromotionSourceSelection(f.production, proof))
  })
}

test('fixed promotion entry passes the fresh proof to the real production verifier boundary', () => {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT
  const result = spawnSync(process.execPath, ['--experimental-test-module-mocks', '--import', 'tsx', '--test', '--test-reporter=tap',
    path.join(projectRoot, 'tests/fixtures/unified-promotion-source-entry.mjs')], { cwd: projectRoot, env, encoding: 'utf8', timeout: 60000 })
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /# tests 4\b/); assert.match(result.stdout, /# fail 0/)
})
