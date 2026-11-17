import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { activeVersion } from '../../../scripts/desktop-cloud-release.mjs'
import { digest, withVerificationPass } from '../../../scripts/desktop-release-assets.mjs'
import { readPinnedSourceCatalog } from '../../../scripts/desktop-source-catalog.mjs'
import { unifiedPageFingerprints } from '../../../scripts/unified-version-preview.mjs'
import { canonical } from './record-mapping'
import { snapshot } from './legacy-intake'
import type { SourceBytes } from './unified-export'
import type { UnifiedPlan } from './unified-plan'
import type { unifiedEditorialScope } from './unified-production-scope'
import { sourceUnits } from './unified-sources'

export type PreservationSelection = { schemaVersion: 1; kind: 'unified_preservation_catalog_selection'; catalogs: Record<string, { path: string; pin: string }> }
export type PreservedRuntime = { policy: 'accepted-published-runtime-v1'; service: string; versionId: string; moduleSHA256: string;
  catalogPin: string; sourceCommit: string; sourcesPin: string; identityPin: string }
type Scope = ReturnType<typeof unifiedEditorialScope>
const SHA = /^[a-f0-9]{64}$/

// This exact reviewed pair changes guide locale readers, not content literals.
// Keep the currently published reader in this pilot; its upgrade belongs to
// the dedicated NTE phase. Never generalize a code difference into a skip flag.
export function preservedNteReaderProjection(sourcePath: string, accepted: string, active: string) {
  assert.equal(sourcePath, 'apps/game-nte/lib/data.ts', 'Unreviewed inline reader difference')
  assert.equal(digest(accepted), 'dc7ee8d1ebb0e3fc5770af1701536227b6f4e36e4c5d81c5741d0039a66ce50c', 'Unreviewed historical reader bytes')
  assert.equal(digest(active), 'e2c049cf024efdd45aef9b9a25d426e22173364e70553e4822d33297cce86eba', 'Unreviewed current reader bytes')
  const projection = (text: string) => {
    const units = sourceUnits(snapshot('nte', sourcePath, 'inline-code', text))
    assert.equal(units.blocked.length, 0, 'Unresolved inline content cannot be omitted')
    return { readers: units.readers, records: units.records.map(record => ({ locator: record.sourceRecord.locator, value: record.structuredValue })) }
  }
  const before = projection(accepted), after = projection(active)
  assert(before.records.length > 0); assert.deepEqual(after, before, 'Preserved inline content differs')
  return digest(canonical(before))
}

export function assertUnifiedPreservedMainResources(html: { html: string; status: number }[], owners: string[]) {
  const fingerprints = unifiedPageFingerprints(html)
  for (const page of fingerprints) for (const [, attrs] of [...page.resources, ...page.media]) for (const [key, value] of attrs) {
    if (value === null || !['href', 'src', 'srcset', 'imagesrcset', 'poster', 'data'].includes(key)) continue
    const decoded = decodeURIComponent(value)
    assert(owners.every(owner => !decoded.includes(`/_games/${owner}/`)), 'Main depends on an omitted game asset; a separate compatibility proof is required')
  }
}

export function verifyUnifiedPreservedMainResources(transport: { directory: string; receipt: any }, owners: string[]) {
  for (const role of ['candidate', 'recovery']) {
    const root = path.join(transport.directory, 'main', role, 'http'), raw = readFileSync(path.join(root, 'references.json'))
    assert.equal(digest(raw), transport.receipt.owners.main[role].referencesPin)
    const rows = JSON.parse(raw.toString()).filter((row: any) => row.headers['content-type']?.startsWith('text/html'))
    const html = rows.map((row: any) => {
      assert(/^[0-9]+\.body$/.test(row.bodyFile)); const body = readFileSync(path.join(root, row.bodyFile))
      assert.equal(digest(body), row.sha256); return { html: body.toString(), status: row.status }
    })
    assertUnifiedPreservedMainResources(html, owners)
  }
}

export function unifiedPreservationSelection(value: unknown, owners: string[]): PreservationSelection {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  const input = value as PreservationSelection
  assert.deepEqual(Object.keys(input).sort(), ['catalogs', 'kind', 'schemaVersion'])
  assert.equal(input.schemaVersion, 1); assert.equal(input.kind, 'unified_preservation_catalog_selection')
  assert(input.catalogs && typeof input.catalogs === 'object' && !Array.isArray(input.catalogs))
  assert.deepEqual(Object.keys(input.catalogs).sort(), [...owners].sort(), 'Every preservation-only owner needs its own accepted source')
  assert(owners.length > 0 && owners.every(owner => ['genshin', 'nte'].includes(owner)), 'Preservation domain is not qualified')
  for (const proof of Object.values(input.catalogs)) {
    assert(proof && typeof proof === 'object'); assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(typeof proof.path === 'string' && proof.path.startsWith('/') && SHA.test(proof.pin), 'Pinned original catalog required')
  }
  return input
}

// Read the completed publication and its transitive build, preview, public
// acceptance and source-advance chain. A historical Main is never asserted live.
export function readUnifiedPreservationCatalogs(input: PreservationSelection, scope: Scope, plan: UnifiedPlan, active: SourceBytes[], repo: string,
  readCatalog: typeof readPinnedSourceCatalog = readPinnedSourceCatalog): ReturnType<typeof readPreservationCatalogs> {
  return withVerificationPass(() => readPreservationCatalogs(input, scope, plan, active, repo, readCatalog))
}

function readPreservationCatalogs(input: PreservationSelection, scope: Scope, plan: UnifiedPlan, active: SourceBytes[], repo: string,
  readCatalog: typeof readPinnedSourceCatalog = readPinnedSourceCatalog) {
  unifiedPreservationSelection(input, scope.preservationOnlyOwners)
  assert.deepEqual(scope.editorial.owners, ['main'], 'Only the Main-only pilot can omit preservation owners')
  return Object.fromEntries(scope.preservationOnlyOwners.map(owner => {
    const proof = input.catalogs[owner], { manifest, sources } = readCatalog(proof)
    assert.equal(manifest.game, owner); assert.equal(manifest.origin.kind, 'published_candidate_source')
    const published = manifest.origin.plan
    assert.equal(published.preview, false); assert.deepEqual(published.owners, [owner, 'main'])
    assert(/^[a-f0-9]{40}$/.test(published.sourceCommit))
    assert.equal(published.candidateSHA256, sources.baseline.contentSHA256)
    const guidePath = `packages/data/games/${owner}/raw-guides.json`
    assert.deepEqual(scope.preservationPaths.filter(file => plan.sources.find(source => source.sourcePath === file)?.game === owner), [guidePath],
      'Only the accepted guide overlay can use this preservation proof')
    const content = plan.sources.filter(source => source.game === owner).map(source => {
      const row = active.find(row => row.sourcePath === source.sourcePath)
      assert(row && digest(row.text) === row.sha256, 'Complete public A required for preserved game')
      const acceptedBytes = source.sourcePath === guidePath ? undefined
        : execFileSync('git', ['show', `${published.sourceCommit}:${source.sourcePath}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 })
      const acceptedSHA256 = acceptedBytes ? digest(acceptedBytes) : published.candidateSHA256
      if (acceptedSHA256 !== row.sha256) {
        assert.equal(owner, 'nte', `Preserved runtime contains different content: ${source.sourcePath}`)
        assert(acceptedBytes)
        const contentPin = preservedNteReaderProjection(source.sourcePath, acceptedBytes.toString('utf8'), row.text)
        return { sourcePath: source.sourcePath, sha256: row.sha256, acceptedSHA256, mode: 'exact_nte_reader_pair_content_unchanged', contentPin }
      }
      return { sourcePath: source.sourcePath, sha256: row.sha256, acceptedSHA256,
        mode: source.sourcePath === guidePath ? 'accepted_release_candidate' : 'byte_identical' }
    })
    assert(content.length > 1 && content.some(row => row.sourcePath === guidePath), 'Incomplete preserved game domain')
    const service = `gachia-game-${owner}`, versionId = manifest.versions[owner]
    assert.equal(sources.profile.owners[owner].versionId, versionId)
    assert.equal(activeVersion(manifest.before, service), versionId)
    const moduleSHA256 = sources.evidence.owners[owner].runtimeModuleSHA256
    assert(SHA.test(moduleSHA256)); assert.equal(manifest.current.modules[owner], moduleSHA256)
    return [owner, { catalogPin: proof.pin, sourceCommit: published.sourceCommit, service, versionId, moduleSHA256,
      sourcesPin: digest(canonical(content)), topology: Object.fromEntries(['services', 'settings', 'bindings', 'subdomains'].map(key => [key, manifest.before[key][service]])) }]
  })) as Record<string, { catalogPin: string; sourceCommit: string; service: string; versionId: string; moduleSHA256: string; sourcesPin: string; topology: Record<string, unknown> }>
}

// Called only after the fixed cloud verifier has revalidated the immutable
// UUID/module receipt. Neither a selection JSON nor a status flag closes scope.
export function bindUnifiedPreservedRuntime(source: ReturnType<typeof readUnifiedPreservationCatalogs>[string], current: {
  service: string; sourceVersionId: string; moduleSHA256: string; sourceIdentityPin: string
}, baseline: any): PreservedRuntime {
  assert.equal(current.service, source.service); assert.equal(current.sourceVersionId, source.versionId)
  assert.equal(current.moduleSHA256, source.moduleSHA256); assert(SHA.test(current.sourceIdentityPin))
  assert.equal(activeVersion(baseline, source.service), source.versionId)
  for (const key of ['services', 'settings', 'bindings', 'subdomains']) {
    const identity = (value: any) => {
      if (key !== 'settings' || !Object.hasOwn(value.annotations ?? {}, 'workers/message')) return value
      const { 'workers/message': message, ...annotations } = value.annotations
      assert.equal(typeof message, 'string'); return { ...value, annotations }
    }
    assert.deepEqual(identity(baseline[key][source.service]), identity(source.topology[key]), `Preserved service drift: ${key}`)
  }
  return { policy: 'accepted-published-runtime-v1', service: source.service, versionId: source.versionId, moduleSHA256: source.moduleSHA256,
    catalogPin: source.catalogPin, sourceCommit: source.sourceCommit, sourcesPin: source.sourcesPin, identityPin: current.sourceIdentityPin }
}
