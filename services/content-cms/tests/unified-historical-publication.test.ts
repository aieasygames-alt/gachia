import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { readUnifiedHistoricalPlan, unifiedHistoricalPublicationRequest } from '../src/unified-historical-publication'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedHistoricalMainRequest, unifiedPublishedMainRequest } from '../src/unified-published-main'

const repo = path.resolve(projectRoot, '../..'), inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
const baselines = plan.sources.map(source => ({ sourcePath: source.sourcePath, originalSHA256: source.sourceSHA256 }))

test('historical plan reopens exact Git O and inventory without consulting mutable working-tree content', () => {
  const result = readUnifiedHistoricalPlan(repo, commit, plan.planSHA256, baselines)
  assert.deepEqual(result.plan, plan)
  for (const row of result.originals) assert.equal(digest(row.text), row.sha256)
})

for (const fault of ['missing-source', 'duplicate-source', 'wrong-O', 'wrong-plan', 'unknown-commit', 'path-escape', 'foreign-source']) {
  test(`historical plan refuses ${fault}`, () => {
    const rows = structuredClone(baselines)
    if (fault === 'missing-source') rows.pop()
    if (fault === 'duplicate-source') rows.push(rows[0])
    if (fault === 'wrong-O') rows[0].originalSHA256 = '0'.repeat(64)
    if (fault === 'path-escape') rows[0].sourcePath = '../package.json'
    if (fault === 'foreign-source') {
      const text = execFileSync('git', ['show', `${commit}:package.json`], { cwd: repo, encoding: 'utf8' })
      rows[0] = { sourcePath: 'package.json', originalSHA256: digest(text) }
    }
    assert.throws(() => readUnifiedHistoricalPlan(repo, fault === 'unknown-commit' ? 'f'.repeat(40) : commit,
      fault === 'wrong-plan' ? '0'.repeat(64) : plan.planSHA256, rows))
  })
}

test('historical request cannot inject CMS, live baseline, skip gates or write authority', () => {
  const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
  const value = { schemaVersion: 1, kind: 'unified_historical_publication_request', production: proof, audit: proof }
  assert.equal(unifiedHistoricalPublicationRequest(value), value)
  for (const key of ['cmsToken', 'current', 'sourceState', 'skipCI', 'verify', 'transport', 'productionReady', 'freshnessRenewed',
    'qualification', 'publicPolicy', 'skipPublic']) {
    assert.throws(() => unifiedHistoricalPublicationRequest({ ...value, [key]: true }))
  }
  for (const invalid of [null, [], { ...value, kind: 'renewal' }, { ...value, audit: { ...proof, pin: 'bad' } },
    { ...value, production: { ...proof, path: 'relative' } }, { ...value, audit: { ...proof, accepted: true } }]) {
    assert.throws(() => unifiedHistoricalPublicationRequest(invalid))
  }
})

test('historical CLI has no activation or freshness capability and rejects unpinned input before reads', () => {
  for (const args of [[], ['promote'], ['renew'], ['recover'], ['audit'], ['previews'], ['published'], ['audit', '--request', 'x', '--pin', 'x', '--output', 'x', '--skip-ci', 'true']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-history.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-history|Invalid historical audit arguments|Require explicit/)
  }
})

test('sealed-history local qualification requires explicit pinned evidence rather than silently skipping', () => {
  const env = { ...process.env }
  delete env.UNIFIED_SEALED_HISTORY_REQUEST
  delete env.UNIFIED_SEALED_HISTORY_PIN
  delete env.NODE_TEST_CONTEXT
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', path.join(projectRoot, 'tests/fixtures/unified-sealed-history.mjs')],
    { cwd: projectRoot, encoding: 'utf8', env, timeout: 30000 })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 1)
  assert.match(result.stdout + result.stderr, /Require UNIFIED_SEALED_HISTORY_REQUEST/)
})

test('fixed published-source reader separates exact preview completion from accepted production without injected authority', () => {
  const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
  const previews = { schemaVersion: 1, kind: 'unified_historical_main_previews_request', history: proof, previews: proof, previewExecution: proof }
  const published = { ...previews, kind: 'unified_published_main_request', promotion: proof }
  assert.equal(unifiedHistoricalMainRequest(previews), previews); assert.equal(unifiedPublishedMainRequest(published), published)
  assert.throws(() => unifiedPublishedMainRequest(previews)); assert.throws(() => unifiedHistoricalMainRequest(published))
  for (const parse of [unifiedHistoricalMainRequest, unifiedPublishedMainRequest]) {
    const value = parse === unifiedHistoricalMainRequest ? previews : published
    for (const field of ['sourceState', 'currentCMS', 'transport', 'verify', 'skipCI', 'accepted', 'freshnessRenewed', 'sourceAdvanced']) {
      assert.throws(() => parse({ ...value, [field]: true }))
    }
    assert.throws(() => parse({ ...value, previewExecution: { ...proof, pin: 'bad' } }))
    assert.throws(() => parse({ ...value, history: { ...proof, path: 'relative' } }))
  }
})
