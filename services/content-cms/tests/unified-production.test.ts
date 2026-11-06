import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { canonical } from '../src/record-mapping'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'
import { verifyUnifiedPublishedDocuments } from '../src/unified-desktop'
import { exportUnifiedContent } from '../src/unified-export'
import { assertUnifiedProductionOwnerClosure, unifiedEditorialScope, unifiedPilotQualification } from '../src/unified-production-scope'
import { unifiedProductionRequest, verifyUnifiedCI } from '../src/unified-production'

const repo = path.resolve(projectRoot, '../..'), inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const originals = plan.sources.map(source => { const text = readFileSync(path.join(repo, source.sourcePath), 'utf8'); return { sourcePath: source.sourcePath, text, sha256: digest(text) } })
const ownership = JSON.parse(readFileSync(path.join(repo, 'packages/core/route-ownership.json'), 'utf8'))
function fixture() {
  const record = structuredClone(plan.sources.find(source => source.sourcePath === 'packages/data/games/ananta/raw-guides.json')!.records[0])
  record._status = 'published'; record.hold = false
  record.structuredValue = { ...(record.structuredValue as object), title: 'Isolated production verifier fixture' }
  const active = structuredClone(originals)
  for (const game of ['genshin', 'nte']) {
    const row = active.find(source => source.sourcePath === `packages/data/games/${game}/raw-guides.json`)!, list = JSON.parse(row.text)
    list.push({ ...list[0], id: 'public-only-isolated-fixture' }); row.text = JSON.stringify(list, null, 2) + '\n'; row.sha256 = digest(row.text)
  }
  const candidate = exportUnifiedContent([record], originals, active, false).manifest
  const doc = { ...record, id: 1, updatedAt: '2026-11-05T00:00:00.000Z', game: 1, bodyFormat: 'plain' }
  return { record, candidate, doc, games: [{ id: 1, key: 'ananta' }] }
}

test('real A -> B editorial owners stay distinct from O -> B preservation overlays without authorizing omission', () => {
  const { candidate } = fixture(), scope = unifiedEditorialScope(candidate, plan, ownership)
  assert.deepEqual(scope.editorial.games, ['ananta']); assert.deepEqual(scope.editorial.owners, ['main'])
  assert.deepEqual(scope.preservationOnlyOwners, ['genshin', 'nte'])
  assert.deepEqual(scope.uploadOwners, ['genshin', 'nte', 'main']); assert.equal(scope.preservationOwnerOmissionAuthorized, false)
})

for (const fault of ['fixture', 'unknown-key', 'duplicate-key', 'unreported-edit', 'missing-edit', 'missing-preservation', 'missing-baseline', 'wrong-baseline', 'duplicate-file']) test(`scope rejects ${fault}`, () => {
  const { candidate } = fixture()
  if (fault === 'fixture') candidate.preview = true
  if (fault === 'unknown-key') candidate.changed = ['foreign']
  if (fault === 'duplicate-key') candidate.changed.push(candidate.changed[0])
  if (fault === 'unreported-edit') candidate.files.find(row => row.sourcePath.includes('/genshin/'))!.candidateSHA256 = '0'.repeat(64)
  if (fault === 'missing-edit') candidate.files = candidate.files.filter(row => !row.sourcePath.includes('/ananta/'))
  if (fault === 'missing-preservation') candidate.files = candidate.files.filter(row => !row.sourcePath.includes('/nte/'))
  if (fault === 'missing-baseline') candidate.baselines.pop()
  if (fault === 'wrong-baseline') candidate.files[0].activeSHA256 = '0'.repeat(64)
  if (fault === 'duplicate-file') candidate.files.push(candidate.files[0])
  assert.throws(() => unifiedEditorialScope(candidate, plan, ownership))
})

test('all 16 editorial scopes retain their declared dedicated owner plus Main', () => {
  for (const game of plan.games) {
    const source = plan.sources.find(source => source.game === game && source.records.length)!, candidate = fixture().candidate
    candidate.changed = [source.records[0].stableKey]
    candidate.baselines = originals.map(row => ({ sourcePath: row.sourcePath, originalSHA256: row.sha256, activeSHA256: row.sha256 }))
    candidate.files = [{ sourcePath: source.sourcePath, originalSHA256: source.sourceSHA256, activeSHA256: source.sourceSHA256, candidateSHA256: '1'.repeat(64) }]
    const scope = unifiedEditorialScope(candidate, plan, ownership)
    assert.deepEqual(scope.editorial.owners, Object.hasOwn(ownership.games, game) ? [game, 'main'] : ['main'])
    assert.deepEqual(scope.uploadOwners, scope.editorial.owners)
  }
})

test('live formal documents reproduce the desktop review pin and reject stale/foreign/held data', () => {
  const f = fixture(), key = f.record.stableKey
  const result = verifyUnifiedPublishedDocuments(plan, [key], [f.doc], f.games)
  assert.equal(result.reviewPin, digest(canonical(result.reviews)))
  for (const patch of [{ hold: true }, { _status: 'draft' }, { game: 2 }, { stableKey: 'foreign' }, { sourceRecord: {} }, { updatedAt: null }]) {
    assert.throws(() => verifyUnifiedPublishedDocuments(plan, [key], [{ ...f.doc, ...patch }], f.games))
  }
  assert.throws(() => verifyUnifiedPublishedDocuments(plan, [key], [], f.games))
  assert.throws(() => verifyUnifiedPublishedDocuments(plan, [key], [f.doc, f.doc], f.games))
})

test('production request accepts only pinned inputs, never authorization or dependency injection', () => {
  const proof = { path: '/tmp/pinned.json', pin: 'a'.repeat(64) }
  const value = { schemaVersion: 1, kind: 'unified_production_preview_request', repo, localPreview: proof, editorial: proof,
    selection: proof, active: proof, application: proof, sourceHandoff: proof, sourceRunID: 1, executorRunID: 2 }
  assert.equal(unifiedProductionRequest(value), value)
  for (const key of ['verify', 'transport', 'productionReady', 'skipCI', 'ownerOrder', 'promote']) assert.throws(() => unifiedProductionRequest({ ...value, [key]: true }))
  assert.throws(() => unifiedProductionRequest({ ...value, localPreview: { ...proof, pin: 'bad' } }))
  assert.throws(() => unifiedProductionRequest({ ...value, sourceRunID: 0 }))
})

test('only the accepted real-domain pilot qualifies; generic published JSON cannot authorize other fields or games', () => {
  const source = plan.sources.find(source => source.sourcePath === 'packages/data/games/ananta/raw-guides.json')!
  const record = structuredClone(source.records.find(row => row.sourceRecord.locator.identity?.id === 'download-install-guide')!)
  record._status = 'published'; record.hold = false
  const value = record.structuredValue as Record<string, string>
  record.structuredValue = { ...value, content: value.content + '\nIsolated content fixture.' }
  const candidate = exportUnifiedContent([record], originals, originals, false)
  assert.equal(unifiedPilotQualification([record], originals, candidate).policy, 'ananta-existing-installation-content-v1')
  const otherField = structuredClone(record); otherField.structuredValue = { ...otherField.structuredValue as object, title: 'Unqualified title edit' }
  assert.throws(() => unifiedPilotQualification([otherField], originals, exportUnifiedContent([otherField], originals, originals, false)), /Chinese content/)
  const other = fixture(); assert.throws(() => unifiedPilotQualification([other.record], originals, { manifest: other.candidate, files: [] }), /Consumer/)
  assert.throws(() => unifiedPilotQualification([record], originals, { ...candidate, manifest: { ...candidate.manifest, changed: [...candidate.manifest.changed, 'extra'] } }), /single-record/)
})

test('preservation-only owners block the production upload instead of silently authorizing a larger batch', () => {
  const { candidate } = fixture(), scope = unifiedEditorialScope(candidate, plan, ownership)
  assert.throws(() => assertUnifiedProductionOwnerClosure(scope), /no broader cloud upload/)
  const main = structuredClone(scope); main.uploadOwners = ['main']; main.preservationOnlyOwners = []
  assert.doesNotThrow(() => assertUnifiedProductionOwnerClosure(main))
  main.uploadOwners = ['genshin', 'main']; assert.throws(() => assertUnifiedProductionOwnerClosure(main), /not closed/)
})

test('CI verification requires exact source, full non-skipped tests and the fixed workflow', async t => {
  const commit = 'a'.repeat(40), steps = ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
    'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds', 'Test documentation and verification scope gates']
  const run = { id: 123, repository: { full_name: 'aieasygames-alt/gachia' }, path: '.github/workflows/payload-verify.yml', head_branch: 'codex/payload-unified-maintenance',
    head_sha: commit, status: 'completed', conclusion: 'success', run_attempt: 1 }
  const jobs = { total_count: 1, jobs: [{ conclusion: 'success', steps: steps.map(name => ({ name, conclusion: 'success' })) }] }
  const mock = t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(options?.method, 'GET'); assert(String(url).startsWith('https://api.github.com/repos/aieasygames-alt/gachia/actions/runs/123'))
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer isolated-test-token')
    return new Response(JSON.stringify(String(url).includes('/jobs?') ? jobs : run))
  })
  await assert.rejects(verifyUnifiedCI(123, commit, ''), /authenticated GitHub read/); assert.equal(mock.mock.callCount(), 0)
  assert.equal((await verifyUnifiedCI(123, commit, 'isolated-test-token')).status, 'full_exact_ci_passed')
  jobs.jobs[0].steps[0].conclusion = 'skipped'; await assert.rejects(verifyUnifiedCI(123, commit, 'isolated-test-token'), /Full exact-CI/)
  jobs.jobs[0].steps[0].conclusion = 'success'; run.head_sha = 'b'.repeat(40); await assert.rejects(verifyUnifiedCI(123, commit, 'isolated-test-token'))
  assert.equal(mock.mock.callCount(), 5)
})

test('production CLI refuses unpinned input and injection before reading CMS or cloud', () => {
  for (const args of [[], ['promote'], ['audit'], ['audit', '--request', 'x', '--pin', 'x', '--output', 'x', '--skip-ci', 'true'], ['audit', '--release-key', 'x']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-production.ts'), ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-production|Invalid production arguments|Require explicit/)
  }
})
