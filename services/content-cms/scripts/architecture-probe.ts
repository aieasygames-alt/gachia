import assert from 'node:assert/strict'
import { mkdtemp, realpath, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { buildShadowSnapshot, buildShadowRelease, SHADOW_SCHEMA } from '../src/shadow-release'
import { shadowArtifactFiles } from '../src/shadow-artifact-files'
import { loadShadowConsumer } from '../src/shadow-consumer'
import { projectRoot } from '../src/local-environment'
const root = path.resolve(projectRoot, '../..'), require = createRequire(import.meta.url)
const output = path.resolve(root, process.argv[2] ?? 'reports/payload-next-phase-2026-11-01/architecture-probe.json')
if (!output.startsWith(root + path.sep)) throw new Error('Evidence must stay in repository')
const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'cms-adr-')))
const evidence: Record<string, unknown> = { schema: 'local-architecture-probe-v1', date: '2026-11-01', productionVerified: false, databaseAccess: false, cloudAccess: false, networkAccess: false }
try {
  const files = await shadowArtifactFiles(directory)
  const capabilities = { main: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA] }, scopes = ['nte'], asOf = '2026-11-01T00:00:00.000Z'
  const versions = []
  for (const title of ['Retained old fixture', 'Next fixture']) {
    const snapshot = buildShadowSnapshot('nte', [{ path: '/zh/nte/items/ore', title, body: 'Synthetic retention experiment only', expiresAt: null, disposition: 'approved-fixture' }], true, asOf)
    const release = buildShadowRelease(scopes, { nte: snapshot.snapshotKey }, new Map([[snapshot.snapshotKey, snapshot]]), capabilities, asOf)
    await files.write('snapshot', snapshot.snapshotKey, JSON.stringify(snapshot))
    await files.write('release', release.releaseKey, JSON.stringify(release))
    versions.push({ release, snapshot })
  }
  const old = await loadShadowConsumer({ owner: 'main', releaseKey: versions[0].release.releaseKey, scopes, capabilities, asOf }, files.read)
  const next = await loadShadowConsumer({ owner: 'main', releaseKey: versions[1].release.releaseKey, scopes, capabilities, asOf }, files.read)
  assert.equal(old.document('/zh/nte/items/ore')?.title, 'Retained old fixture')
  assert.equal(next.document('/zh/nte/items/ore')?.title, 'Next fixture')
  assert.notEqual(old.document('/zh/nte/items/ore')?.cacheKey, next.document('/zh/nte/items/ore')?.cacheKey)
  await assert.rejects(files.write('release', versions[0].release.releaseKey, JSON.stringify(versions[0].release)), /EEXIST/)
  const reopened = await shadowArtifactFiles(directory)
  const retained = await loadShadowConsumer({ owner: 'main', releaseKey: old.releaseKey, scopes, capabilities, asOf }, reopened.read)
  assert.equal(retained.document('/zh/nte/items/ore')?.title, 'Retained old fixture')
  evidence.fileArtifactExperiment = { passed: true, oldRelease: old.releaseKey, nextRelease: next.releaseKey, immutableOverwriteRejected: true,
    oldVersionReopenedWithoutCMS: true, cacheIdentityChanges: true, limitations: 'local file store only; no R2, retention TTL/GC, activation CAS, restart durability guarantees, revocation or app integration' }
  evidence.adapters = Object.fromEntries(['@payloadcms/db-sqlite', '@payloadcms/db-d1-sqlite', '@payloadcms/db-postgres', '@payloadcms/storage-r2'].map(name => {
    try { return [name, { installed: true, entry: path.relative(root, require.resolve(name)) }] } catch { return [name, { installed: false, runtimeVerified: false }] }
  }))
  const cmsPackage = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
  evidence.localRuntime = { node: process.version, payload: cmsPackage.dependencies.payload, next: cmsPackage.dependencies.next, database: 'local SQLite only; no production adapter comparison executed' }
  await writeFile(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify(evidence, null, 2))
} finally { await rm(directory, { recursive: true, force: true }) }
