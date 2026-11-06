import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { unifiedSourceFixture } from '../../../scripts/fixtures/unified-source-fixture.mjs'
import { advanceUnifiedSourceIndex, captureUnifiedNextBaseline, readUnifiedNextBaseline } from '../../../scripts/unified-source-advance.mjs'
import { digest, snapshot } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { exportUnifiedContent } from '../src/unified-export'
import { sourceUnits } from '../src/unified-sources'
import { unifiedSourceRequest } from '../src/unified-source-advance'

const proof = { path: '/tmp/proof.json', pin: 'a'.repeat(64) }
test('fixed source requests accept only completed-publication pins, exact executor and pinned next inputs', () => {
  const requests = [
    { schemaVersion: 1, kind: 'unified_source_advance_request', publication: proof, executorRunID: 123 },
    { schemaVersion: 1, kind: 'unified_next_source_request', publication: proof, sourceIndex: proof, executorRunID: 123 },
    { schemaVersion: 1, kind: 'unified_next_publication_request', publication: proof, handoff: proof, build: proof, expectations: proof, executorRunID: 123 },
  ]
  for (const value of requests) {
    assert.equal(unifiedSourceRequest(value), value)
    for (const key of ['verify', 'transport', 'snapshot', 'owners', 'sourceState', 'skipCI', 'force', 'approved', 'freshnessRenewed', 'newPublicationAuthorized']) {
      assert.throws(() => unifiedSourceRequest({ ...value, [key]: true }))
    }
    for (const invalid of [{ ...value, executorRunID: 0 }, { ...value, publication: { ...proof, pin: 'bad' } },
      { ...value, publication: { ...proof, path: 'relative' } }, { ...value, publication: { ...proof, accepted: true } }]) {
      assert.throws(() => unifiedSourceRequest(invalid))
    }
  }
  for (const invalid of [null, [], { ...requests[0], kind: 'raw-uuid-source' }, { ...requests[1], sourceIndex: { ...proof, pin: 'bad' } }]) assert.throws(() => unifiedSourceRequest(invalid))
})

test('fixed source CLI rejects writes, missing pins and dependency injection before credentials or cloud access', () => {
  for (const args of [[], ['promote'], ['recover'], ['upload'], ['advance'], ['baseline'], ['prepare'],
    ['advance', '--request', 'x', '--pin', 'x', '--output', 'x', '--skip-ci', 'true']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-source.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-source|Invalid source arguments|Require explicit/)
  }
})

test('the actual next-batch compiler preserves prior Main editorial and all code A while updating a different game', async t => {
  const f = await unifiedSourceFixture(t), index = await advanceUnifiedSourceIndex({ ...f, directory: path.join(f.root, 'advance') })
  const handoff = await captureUnifiedNextBaseline({ ...f, proof: index.proof, directory: path.join(f.root, 'next') })
  const next = await readUnifiedNextBaseline({ handoff: handoff.proof, spec: f.spec, fresh: true })
  const selectedPath = 'packages/data/games/fixture-0/raw-characters.json'
  const originals = next.sources.map((source: { sourcePath: string; text: string; sha256: string }) => {
    const text = source.sourcePath === selectedPath ? source.text : source.sourcePath.endsWith('.json') ? JSON.stringify([{ id: 'existing', title: 'original O' }]) : 'export const ranks = 0\n'
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  const selected = originals.find((source: { sourcePath: string }) => source.sourcePath === selectedPath)!
  const record = sourceUnits(snapshot('fixture-0', selected.sourcePath, 'raw-json', selected.text)).records[0]
  record.structuredValue = { id: 'existing', title: 'second game editorial' }; record.hold = false; record._status = 'published'
  const result = exportUnifiedContent([record], originals, next.sources, false)
  assert.deepEqual(result.manifest.changed, [record.stableKey])
  assert.match(result.files.find(row => row.sourcePath === 'packages/data/games/ananta/raw-guides.json')!.content, /published editorial increment/)
  for (const source of next.sources.filter((row: { sourcePath: string }) => row.sourcePath.endsWith('.ts'))) {
    assert.equal(result.files.find(row => row.sourcePath === source.sourcePath)!.content, source.text)
  }
  assert.match(result.files.find(row => row.sourcePath === selected.sourcePath)!.content, /second game editorial/)
  assert.equal(result.manifest.baselines.length, 115); assert.equal(result.manifest.activationSupported, false)
})
