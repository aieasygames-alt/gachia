import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test, { type TestContext } from 'node:test'
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

const baselineFile = 'services/content-cms/src/inventory-baseline.ts'
function inventoryFixture(t: TestContext) {
  const repo = mkdtempSync(path.join(tmpdir(), 'unified-historical-inventory-'))
  t.after(() => rmSync(repo, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', ...args], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  const write = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); writeFileSync(path.join(repo, file), text)
  }
  const commit = () => { git('add', '.'); git('commit', '-m', 'historical inventory fixture'); return git('rev-parse', 'HEAD') }
  git('init', '--quiet')
  return { repo, write, commit }
}

test('historical inventory follows each Git commit despite a newer pointer and corrupted working-tree inventories', t => {
  const f = inventoryFixture(t), oldDirectory = 'services/content-cms/inventory/2026-11-02', newDirectory = 'services/content-cms/inventory/2026-11-05'
  f.write(baselineFile, `export const baselineDirectory = '${oldDirectory}'\n`)
  f.write(`${oldDirectory}/inventory.json`, JSON.stringify({ scopes: [{ id: 'genshin' }] }))
  const oldCommit = f.commit(), oldPlan = unifiedPlan([], ['genshin'])
  f.write(baselineFile, `export const baselineDirectory = '${newDirectory}'\n`)
  f.write(`${newDirectory}/inventory.json`, JSON.stringify({ scopes: [{ id: 'genshin' }, { id: 'nte' }] }))
  const newCommit = f.commit(), newPlan = unifiedPlan([], ['genshin', 'nte'])
  f.write(baselineFile, "export const baselineDirectory = 'services/content-cms/inventory/2099-01-01'\n")
  for (const directory of [oldDirectory, newDirectory]) f.write(`${directory}/inventory.json`, 'not JSON')
  assert.deepEqual(readUnifiedHistoricalPlan(f.repo, oldCommit, oldPlan.planSHA256, []).plan, oldPlan)
  assert.deepEqual(readUnifiedHistoricalPlan(f.repo, newCommit, newPlan.planSHA256, []).plan, newPlan)
  assert.throws(() => readUnifiedHistoricalPlan(f.repo, oldCommit, newPlan.planSHA256, []), /original pin/)
})

test('same-day inventory revisions remain pinned to their own Git commit', t => {
  const f = inventoryFixture(t), base = 'services/content-cms/inventory/2026-11-10'
  const plans = [unifiedPlan([], ['genshin']), unifiedPlan([], ['genshin', 'nte'])]
  const commits = plans.map((plan, index) => {
    const directory = `${base}-r${index + 102}`
    f.write(baselineFile, `export const baselineDirectory = '${directory}'\n`)
    f.write(`${directory}/inventory.json`, JSON.stringify({ scopes: plan.scopeCoverage.map(row => ({ id: row.game })) }))
    return f.commit()
  })
  f.write(baselineFile, "export const baselineDirectory = 'reports/untrusted'\n")
  for (const revision of ['r102', 'r103']) f.write(`${base}-${revision}/inventory.json`, 'not JSON')
  for (const [index, commit] of commits.entries()) {
    assert.deepEqual(readUnifiedHistoricalPlan(f.repo, commit, plans[index].planSHA256, []).plan, plans[index])
  }
})

for (const [fault, source] of Object.entries({
  'missing-export': 'export const other = 1',
  'private-binding': "const baselineDirectory = 'services/content-cms/inventory/2026-11-05'",
  'duplicate-binding': "export const baselineDirectory = 'services/content-cms/inventory/2026-11-05'; export const baselineDirectory = 'elsewhere'",
  'dynamic-expression': "export const baselineDirectory = (() => { throw new Error('Historical code must not execute') })()",
  'indirect-binding': "const directory = 'services/content-cms/inventory/2026-11-05'; export const baselineDirectory = directory",
  'path-escape': "export const baselineDirectory = 'services/content-cms/inventory/../2026-11-05'",
  'absolute-path': "export const baselineDirectory = '/services/content-cms/inventory/2026-11-05'",
  'foreign-path': "export const baselineDirectory = 'reports/2026-11-05'",
  'invalid-date': "export const baselineDirectory = 'services/content-cms/inventory/2026-02-30'",
  'invalid-revision-date': "export const baselineDirectory = 'services/content-cms/inventory/2026-02-30-r102'",
  'zero-revision': "export const baselineDirectory = 'services/content-cms/inventory/2026-11-10-r0'",
  'leading-zero-revision': "export const baselineDirectory = 'services/content-cms/inventory/2026-11-10-r0102'",
  'revision-path-escape': "export const baselineDirectory = 'services/content-cms/inventory/2026-11-10-r102/../../other'",
  'non-string': 'export const baselineDirectory = 20261105',
  'missing-inventory': "export const baselineDirectory = 'services/content-cms/inventory/2026-11-06'",
  'invalid-syntax': 'export const baselineDirectory = ',
})) {
  test(`historical inventory refuses ${fault} without falling back to the current baseline`, t => {
    const f = inventoryFixture(t)
    f.write(baselineFile, source)
    f.write('services/content-cms/inventory/2026-11-05/inventory.json', JSON.stringify({ scopes: [{ id: 'genshin' }] }))
    const commit = f.commit(), plan = unifiedPlan([], ['genshin'])
    assert.throws(() => readUnifiedHistoricalPlan(f.repo, commit, plan.planSHA256, []), error => {
      assert(error instanceof Error); assert.notEqual(error.message, 'Historical code must not execute')
      if (['invalid-revision-date', 'zero-revision', 'leading-zero-revision', 'revision-path-escape'].includes(fault)) {
        assert.match(error.message, /Unregistered historical inventory path|Invalid historical inventory date/)
      }
      return true
    })
  })
}

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
