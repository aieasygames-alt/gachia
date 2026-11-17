import assert from 'node:assert/strict'
import test from 'node:test'
import { SERVICES } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertCheckpointVersions, assertReconstructedSources } from '../src/nte-source-checkpoint'

test('reconstruction retains every pinned source, rejecting omitted, duplicate and rehashed replacement content', () => {
  const sources = Array.from({ length: 115 }, (_, i) => ({ sourcePath: `packages/data/games/fixture/raw-${i}.json`, text: `${i}\n`, sha256: digest(`${i}\n`) }))
  const expected = sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 }))
  assertReconstructedSources(sources, expected)
  assert.throws(() => assertReconstructedSources(sources.slice(1), expected), /Complete/)
  const duplicate = structuredClone(sources); duplicate[1] = duplicate[0]
  assert.throws(() => assertReconstructedSources(duplicate, expected))
  const changed = structuredClone(sources); changed[0].text = 'replaced'; changed[0].sha256 = digest(changed[0].text)
  assert.throws(() => assertReconstructedSources(changed, expected), /inventory changed/)
  const corrupt = structuredClone(sources); corrupt[0].text = 'replaced'
  assert.throws(() => assertReconstructedSources(corrupt, expected), /bytes changed/)
})

test('a source checkpoint must identify all five currently active owners and the current Router deployment', () => {
  const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
  const baseline: any = { services: {}, settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] }
  for (const [index, service] of SERVICES.entries()) baseline.services[service] = { id: uuid(index + 1), versions: [{ version_id: uuid(index + 20), percentage: 100 }] }
  const owners = Object.fromEntries(['azur-promilia', 'genshin', 'lvmeng', 'main', 'nte'].map(owner => {
    const service = owner === 'main' ? 'gachia' : `gachia-game-${owner}`
    return [owner, { owner, service, versionId: baseline.services[service].versions[0].version_id }]
  }))
  const router = { versionId: baseline.services['gachia-router'].versions[0].version_id, deploymentId: baseline.services['gachia-router'].id }
  assertCheckpointVersions(baseline, owners, router)
  for (const owner of Object.keys(owners)) {
    const stale = structuredClone(owners); stale[owner].versionId = uuid(999)
    assert.throws(() => assertCheckpointVersions(baseline, stale, router), /inactive source/)
  }
  assert.throws(() => assertCheckpointVersions(baseline, owners, { ...router, deploymentId: uuid(999) }))
  const missing = structuredClone(owners); delete missing.main
  assert.throws(() => assertCheckpointVersions(baseline, missing, router))
})
