import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { objectValue } from '../src/unified-content'
import { exportUnifiedContent } from '../src/unified-export'
import { genshinProductionOwnerScope, GENSHIN_PRODUCTION_SCOPE } from '../src/unified-genshin-production-scope'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'
import { freezeUnifiedContent, verifyUnifiedFrozenSource } from '../src/unified-build'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((row: { id: string }) => row.id))
const original = plan.sources.map(row => {
  const text = readFileSync(path.join(repo, row.sourcePath), 'utf8'); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
})
const record = (game = 'genshin', field = 'nameEn') => {
  const row = structuredClone(plan.sources.find(row => row.sourcePath === `packages/data/games/${game}/raw-characters.json`)!.records[0])
  assert(objectValue(row.structuredValue)); row.structuredValue[field] = field === 'rarity' ? 7 : 'Reviewed production name'
  row._status = 'published'; row.hold = false; return row
}
const scope = (records = [record()], active = original, preview = false) => {
  const candidate = exportUnifiedContent(records, original, active, preview)
  return genshinProductionOwnerScope(candidate.manifest, active, candidate.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 })))
}
test('formal single Genshin character scope preserves public increments without rebuilding Main', () => {
  const active = structuredClone(original)
  for (const game of ['ananta', 'genshin', 'hi3', 'nte', 'sea']) {
    const source = active.find(row => row.sourcePath === `packages/data/games/${game}/raw-guides.json`)!
    const rows = JSON.parse(source.text); rows[0].content += '\nPreserved public text'
    source.text = JSON.stringify(rows, null, 2) + '\n'; source.sha256 = digest(source.text)
  }
  assert.deepEqual(scope([record()], active), { games: ['genshin'], owners: ['genshin'], services: ['gachia-game-genshin'], productionScope: GENSHIN_PRODUCTION_SCOPE })
})
test('formal scope refuses rehearsal, partial A, nonrendered fields and cross-game edits', () => {
  assert.throws(() => scope([record()], original, true), /Rehearsal/)
  assert.throws(() => scope([record()], original.slice(1)))
  assert.throws(() => scope([record('genshin', 'rarity')]))
  assert.throws(() => scope([record('nte')]))
  assert.throws(() => scope([record(), record('nte')]))
})
test('the real compiler independently reopens an explicit formal Genshin-only freeze with complete A', () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'genshin-formal-freeze-')))
  try {
    const frozen = freezeUnifiedContent({ repo, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
      directory: path.join(root, 'freeze'), plan, records: [record()], activeSources: original, preview: false, productionScope: GENSHIN_PRODUCTION_SCOPE })
    const reopened = verifyUnifiedFrozenSource(frozen.directory, frozen.manifestPin)
    assert.equal(reopened.productionScope, GENSHIN_PRODUCTION_SCOPE); assert.equal(reopened.localScope, undefined)
    assert.deepEqual(reopened.owners, ['genshin']); assert.equal(reopened.candidate.preview, false); assert.equal(reopened.candidate.baselines.length, 115)
    assert.equal(reopened.productionReady, false); assert.equal(reopened.cloudWrites, false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
