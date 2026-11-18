import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { SERVICES } from '../../../scripts/desktop-cloud-release.mjs'
import { verifiedInPass } from '../../../scripts/desktop-release-assets.mjs'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'
import { exportUnifiedContent } from '../src/unified-export'
import { assertUnifiedProductionOwnerClosure, closeUnifiedProductionOwnerScope, unifiedEditorialScope } from '../src/unified-production-scope'
import { assertUnifiedPreservedMainResources, bindUnifiedPreservedRuntime, preservedNteReaderProjection, readUnifiedPreservationCatalogs, unifiedPreservationSelection } from '../src/unified-preservation'

const repo = path.resolve(projectRoot, '../..'), sha = 'a'.repeat(64), uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const originals = plan.sources.map(source => { const text = readFileSync(path.join(repo, source.sourcePath), 'utf8'); return { sourcePath: source.sourcePath, text, sha256: digest(text) } })
const ownership = JSON.parse(readFileSync(path.join(repo, 'packages/core/route-ownership.json'), 'utf8'))
function fixture() {
  const active = structuredClone(originals)
  for (const owner of ['genshin', 'nte']) {
    const row = active.find(row => row.sourcePath === `packages/data/games/${owner}/raw-guides.json`)!
    row.text += '\n'; row.sha256 = digest(row.text)
  }
  const record = structuredClone(plan.sources.find(source => source.sourcePath === 'packages/data/games/ananta/raw-guides.json')!.records[0])
  record._status = 'published'; record.hold = false; record.structuredValue = { ...record.structuredValue as object, title: 'Isolated fixture' }
  const scope = unifiedEditorialScope(exportUnifiedContent([record], originals, active, false).manifest, plan, ownership)
  const input = { schemaVersion: 1 as const, kind: 'unified_preservation_catalog_selection' as const,
    catalogs: Object.fromEntries(['genshin', 'nte'].map(owner => [owner, { path: `/isolated/${owner}/manifest.json`, pin: sha }])) }
  const baseline: any = { services: Object.fromEntries(SERVICES.map((service: string, i: number) => [service, { id: uuid(i + 20), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: Object.fromEntries(SERVICES.map((service: string) => [service, { annotations: { 'workers/message': 'original' }, compatibility_date: '2026-01-01' }])),
    bindings: Object.fromEntries(SERVICES.map((service: string) => [service, []])), subdomains: Object.fromEntries(SERVICES.map((service: string) => [service, { previews_enabled: true }])) }
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
  const catalogs: any = Object.fromEntries(['genshin', 'nte'].map(owner => {
    const service = `gachia-game-${owner}`, versionId = baseline.services[service].versions[0].version_id
    const content = active.find(row => row.sourcePath === `packages/data/games/${owner}/raw-guides.json`)!.sha256
    return [owner, { manifest: { game: owner, origin: { kind: 'published_candidate_source', plan: { preview: false, owners: [owner, 'main'], sourceCommit: commit, candidateSHA256: content } },
      versions: { [owner]: versionId, main: uuid(999) }, before: baseline, current: { modules: { [owner]: sha } } },
      sources: { baseline: { contentSHA256: content }, profile: { owners: { [owner]: { versionId } } }, evidence: { owners: { [owner]: { runtimeModuleSHA256: sha } } } } }]
  }))
  const calls: string[] = []
  const read = (observe: () => void = () => {}) => readUnifiedPreservationCatalogs(input, scope, plan, active, repo, (proof: { path: string; pin: string }) => {
    observe()
    const owner = Object.keys(input.catalogs).find(owner => input.catalogs[owner].path === proof.path)!
    assert.equal(proof.pin, sha); calls.push(owner); return catalogs[owner]
  })
  return { input, scope, active, baseline, catalogs, read, calls }
}

test('accepted original publications bind every preserved game source, without asserting their historical Main is current', () => {
  const f = fixture(), result = f.read()
  assert.deepEqual(f.calls, ['genshin', 'nte'])
  for (const owner of ['genshin', 'nte']) {
    assert.equal(result[owner].catalogPin, sha); assert.match(result[owner].sourcesPin, /^[a-f0-9]{64}$/)
    assert.equal(result[owner].service, `gachia-game-${owner}`)
  }
})

test('preserved catalogs share only a synchronous traversal pass and failures do not retain it', () => {
  const f = fixture()
  let reads = 0
  const shared = () => verifiedInPass(shared, 'shared-ancestor', () => ++reads)
  f.read(shared); assert.equal(reads, 1)
  f.read(shared); assert.equal(reads, 2)
  assert.equal(shared(), 3)
  f.catalogs.nte.manifest.game = 'wrong'
  assert.throws(() => f.read(shared)); assert.equal(reads, 4)
  f.catalogs.nte.manifest.game = 'nte'
  f.read(shared); assert.equal(reads, 5)
  assert.deepEqual(f.calls, ['genshin', 'nte', 'genshin', 'nte', 'genshin', 'nte', 'genshin', 'nte'])
})

for (const fault of ['missing-owner', 'foreign-owner', 'injected-status', 'unqualified-domain', 'bad-pin', 'wrong-kind']) test(`catalog selection rejects ${fault}`, () => {
  const f = fixture(), value: any = structuredClone(f.input)
  if (fault === 'missing-owner') delete value.catalogs.nte
  if (fault === 'foreign-owner') value.catalogs.main = value.catalogs.nte
  if (fault === 'injected-status') value.productionReady = true
  if (fault === 'unqualified-domain') { value.catalogs = { lvmeng: value.catalogs.nte }; assert.throws(() => unifiedPreservationSelection(value, ['lvmeng'])); return }
  if (fault === 'bad-pin') value.catalogs.nte.pin = 'bad'
  if (fault === 'wrong-kind') value.kind = 'accepted'
  assert.throws(() => unifiedPreservationSelection(value, f.scope.preservationOnlyOwners))
})

for (const fault of ['wrong-game', 'unpublished', 'fixture', 'wrong-owner', 'wrong-content', 'missing-source', 'changed-other-source', 'extra-overlay', 'changed-module']) test(`preserved source rejects ${fault}`, () => {
  const f = fixture(), catalog = f.catalogs.nte
  if (fault === 'wrong-game') catalog.manifest.game = 'genshin'
  if (fault === 'unpublished') catalog.manifest.origin.kind = 'historical_local_recovery'
  if (fault === 'fixture') catalog.manifest.origin.plan.preview = true
  if (fault === 'wrong-owner') catalog.manifest.origin.plan.owners = ['main']
  if (fault === 'wrong-content') catalog.manifest.origin.plan.candidateSHA256 = 'b'.repeat(64)
  if (fault === 'missing-source') f.active.splice(f.active.findIndex(row => row.sourcePath === 'packages/data/games/nte/raw-characters.json'), 1)
  if (fault === 'changed-other-source') { const row = f.active.find(row => row.sourcePath === 'packages/data/games/nte/raw-characters.json')!; row.text += '\n'; row.sha256 = digest(row.text) }
  if (fault === 'extra-overlay') f.scope.preservationPaths.push('packages/data/games/nte/raw-characters.json')
  if (fault === 'changed-module') catalog.manifest.current.modules.nte = 'b'.repeat(64)
  assert.throws(f.read)
})

test('only fresh matching runtime identity and unchanged service semantics close Main-only upload scope', () => {
  const f = fixture(), sources = f.read()
  const current = (owner: string) => ({ service: sources[owner].service, sourceVersionId: sources[owner].versionId, moduleSHA256: sha, sourceIdentityPin: sha })
  const proofs = Object.fromEntries(Object.keys(sources).map(owner => [owner, bindUnifiedPreservedRuntime(sources[owner], current(owner), f.baseline)]))
  const closed = closeUnifiedProductionOwnerScope(f.scope, proofs)
  assert.deepEqual(closed.uploadOwners, ['main']); assert.deepEqual(closed.build.owners, ['genshin', 'nte', 'main'])
  assert.equal(closed.preservationOwnerOmissionAuthorized, true); assert.doesNotThrow(() => assertUnifiedProductionOwnerClosure(closed))
  assert.throws(() => closeUnifiedProductionOwnerScope(f.scope, { genshin: proofs.genshin }), /incomplete/)
  assert.throws(() => bindUnifiedPreservedRuntime(sources.nte, { ...current('nte'), moduleSHA256: 'b'.repeat(64) }, f.baseline))
  assert.throws(() => bindUnifiedPreservedRuntime(sources.nte, { ...current('nte'), sourceVersionId: uuid(777) }, f.baseline))
  const drift = structuredClone(f.baseline); drift.settings['gachia-game-nte'].compatibility_date = '2026-02-01'
  assert.throws(() => bindUnifiedPreservedRuntime(sources.nte, current('nte'), drift), /service drift/)
  const latest = structuredClone(f.baseline); latest.settings['gachia-game-nte'].annotations['workers/message'] = 'uploaded-only message'
  assert.doesNotThrow(() => bindUnifiedPreservedRuntime(sources.nte, current('nte'), latest))
})

test('Main candidate and recovery must not require omitted game asset namespaces', () => {
  const html = (url: string) => [{ status: 200, html: `<html><head><title>Fixture</title><meta name="description" content="Fixture"><link rel="canonical" href="https://gachia.com/zh/ananta/guides/fixture"><script src="${url}"></script></head><body><h1>Fixture</h1></body></html>` }]
  assert.doesNotThrow(() => assertUnifiedPreservedMainResources(html('/_next/static/fixture.js'), ['genshin', 'nte']))
  for (const url of ['/_games/genshin/_next/static/fixture.js', 'https://gachia.com/_games/nte/_next/static/fixture.js', '/%5Fgames/nte/_next/static/fixture.js']) {
    assert.throws(() => assertUnifiedPreservedMainResources(html(url), ['genshin', 'nte']), /omitted game asset/)
  }
})

test('exact historical and current NTE readers preserve the same literals while other bytes stay blocked', () => {
  const file = 'apps/game-nte/lib/data.ts'
  const accepted = execFileSync('git', ['show', `710673f0e7a57c0584cbc42e464b9acff13ce43d:${file}`], { cwd: repo, encoding: 'utf8' })
  const active = readFileSync(path.join(repo, file), 'utf8')
  const historical = execFileSync('git', ['show', `00eaf2c:${file}`], { cwd: repo, encoding: 'utf8' })
  const currentPin = preservedNteReaderProjection(file, accepted, active)
  assert.match(currentPin, /^[a-f0-9]{64}$/)
  assert.equal(preservedNteReaderProjection(file, accepted, historical), currentPin)
  assert.throws(() => preservedNteReaderProjection(file, accepted + '\n', active), /historical reader bytes/)
  assert.throws(() => preservedNteReaderProjection(file, accepted, active + '\n'), /current reader bytes/)
  assert.throws(() => preservedNteReaderProjection(file, accepted, historical + '\n'), /current reader bytes/)
  assert.throws(() => preservedNteReaderProjection('apps/game-genshin/lib/data.ts', accepted, active), /Unreviewed inline/)
})
