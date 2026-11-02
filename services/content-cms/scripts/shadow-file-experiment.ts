import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { shadowArtifactFiles } from '../src/shadow-artifact-files'
import { SHADOW_SCHEMA, type ShadowRelease, type ShadowSnapshot } from '../src/shadow-release'
import { digest } from '../src/legacy-intake'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local synthetic experiment only; no arguments')
const exec = promisify(execFile)
const local = fileURLToPath(new URL('../.local/', import.meta.url))
await mkdir(local, { recursive: true })
const root = await realpath(await mkdtemp(path.join(local, 'shadow-files-')))
try {
  const text = await readFile(new URL('../../../reports/payload-status-audit-2026-10-30/batch17-shadow.json', import.meta.url), 'utf8')
  const artifact = JSON.parse(text) as { syntheticOnly: boolean; inventoryDigest: string; baseline: ShadowRelease; next: ShadowRelease; snapshots: ShadowSnapshot[] }
  assert.equal(artifact.syntheticOnly, true)
  const inventoryText = await readFile(new URL('../../../reports/payload-migration-2026-10-28/inventory.json', import.meta.url), 'utf8')
  assert.equal(artifact.inventoryDigest, digest(inventoryText))
  assert.deepEqual([...artifact.next.scopes].sort(), JSON.parse(inventoryText).scopes.map((row: { id: string }) => row.id).sort())
  const files = await shadowArtifactFiles(root)
  for (const snapshot of artifact.snapshots) await files.write('snapshot', snapshot.snapshotKey, JSON.stringify(snapshot))
  for (const release of [artifact.baseline, artifact.next]) await files.write('release', release.releaseKey, JSON.stringify(release))
  const owners = ['main', 'nte', 'genshin', 'azur-promilia', 'lvmeng']
  const context = { scopes: artifact.next.scopes, capabilities: Object.fromEntries(owners.map(owner => [owner, [SHADOW_SCHEMA]])), asOf: '2026-10-30T00:00:00.000Z' }
  async function consume(owner: string, releaseKey: string) {
    const result = await exec(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./shadow-file-consumer.ts', import.meta.url)), root, JSON.stringify({ ...context, owner, releaseKey })],
      { env: { ...process.env, CMS_LOCAL_ONLY: '1' }, timeout: 30000, maxBuffer: 1024 * 1024 })
    return JSON.parse(result.stdout)
  }
  // Wait for every child before deleting the shared fixture, even if one child fails.
  const settled = await Promise.allSettled(owners.map(owner => consume(owner, artifact.next.releaseKey)))
  const results = settled.map(result => { if (result.status === 'rejected') throw result.reason; return result.value })
  assert.equal(new Set(results.map(result => result.pid)).size, owners.length)
  assert.equal(results.reduce((n, result) => n + result.documents.length, 0), 17)
  for (const result of results) {
    assert.equal(result.index.releaseKey, artifact.next.releaseKey)
    for (const row of result.documents) {
      assert.equal(row.document.releaseKey, result.index.releaseKey)
      assert.equal(row.document.cacheKey, row.metadata.cacheKey)
      assert.equal(row.document.title, row.metadata.title)
    }
  }
  const rollback = await consume('main', artifact.baseline.releaseKey)
  assert.equal(rollback.index.releaseKey, artifact.baseline.releaseKey)
  console.log(JSON.stringify({ version: 'shadow-file-experiment-v1', syntheticOnly: true, inputDigest: digest(text),
    inventoryDigest: digest(inventoryText), scopes: context.scopes.length, owners, processIDs: results.map(result => result.pid), snapshots: artifact.snapshots.length,
    documents: 17, releaseKey: artifact.next.releaseKey, rollbackReleaseKey: rollback.index.releaseKey,
    checks: { distinctProcesses: true, fixedRelease: true, bodyMetadataParity: true, rollbackRevalidated: true },
    realWorkerIntegration: false, publishable: false, publicTrafficChanged: false,
  }, null, 2))
} finally { await rm(root, { recursive: true, force: true }) }
