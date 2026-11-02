import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import routes from '../../../packages/core/route-ownership.json'
import { projectRoot } from '../src/local-environment'
import { digest } from '../src/legacy-intake'
import { SHADOW_SCHEMA, type ShadowSnapshot } from '../src/shadow-release'
import { loadShadowConsumer, type ShadowArtifactReader } from '../src/shadow-consumer'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Use CMS_LOCAL_ONLY=1 tsx scripts/shadow-consumer.ts with no arguments')
const reportRoot = path.resolve(projectRoot, '../../reports')
const text = readFileSync(path.join(reportRoot, 'payload-status-audit-2026-10-30/batch17-shadow.json'), 'utf8')
const artifact = JSON.parse(text)
const inventoryText = readFileSync(path.join(reportRoot, 'payload-migration-2026-10-28/inventory.json'), 'utf8')
if (artifact.syntheticOnly !== true || artifact.inventoryDigest !== digest(inventoryText)) throw new Error('Synthetic fixture inventory mismatch')
const scopes: string[] = JSON.parse(inventoryText).scopes.map((row: { id: string }) => row.id)
const owners = ['main', ...Object.keys(routes.games)].sort()
const capabilities = Object.fromEntries(owners.map(owner => [owner, [SHADOW_SCHEMA]]))
const asOf = '2026-10-30T00:00:00.000Z'
const bytes = new Map<string, string>()
for (const snapshot of artifact.snapshots as ShadowSnapshot[]) {
  if (bytes.has(`snapshot:${snapshot.snapshotKey}`)) throw new Error('Duplicate fixture snapshot')
  bytes.set(`snapshot:${snapshot.snapshotKey}`, JSON.stringify(snapshot))
}
for (const release of [artifact.baseline, artifact.next]) bytes.set(`release:${release.releaseKey}`, JSON.stringify(release))
const reads: { kind: string; key: string }[] = []
const read: ShadowArtifactReader = async (kind, key) => {
  reads.push({ kind, key })
  const text = bytes.get(`${kind}:${key}`)
  if (text === undefined) throw new Error('Missing fixture artifact')
  return text
}
const context = { releaseKey: artifact.next.releaseKey, scopes, capabilities, asOf }
const results = []
for (const owner of owners) {
  const consumer = await loadShadowConsumer({ ...context, owner }, read)
  const index = consumer.index()
  const documents = index.entries.map(({ path: pathname }) => {
    const document = consumer.document(pathname)!, metadata = consumer.metadata(pathname)!
    assert.equal(document.title, metadata.title)
    assert.equal(document.releaseKey, index.releaseKey)
    assert.equal(document.cacheKey, metadata.cacheKey)
    return { document, metadata }
  })
  results.push({ owner, index, documents })
}
const main = results.find(r => r.owner === 'main')!, nte = results.find(r => r.owner === 'nte')!
assert.equal(main.documents.find(r => r.document.path === '/zh/nte/items/ore')?.document.title, 'Updated synthetic item')
assert.equal(nte.documents.find(r => r.document.path === '/zh/nte/characters/example')?.document.title, 'Updated synthetic character')
assert.equal(results.reduce((total, row) => total + row.documents.length, 0), 17)
const rollback = await loadShadowConsumer({ ...context, owner: 'main', releaseKey: artifact.baseline.releaseKey }, read)
assert.equal(rollback.document('/zh/nte/items/ore')?.title, 'Synthetic shadow fixture')
await assert.rejects(loadShadowConsumer({ ...context, owner: 'main', capabilities: { ...capabilities, nte: [] } }, read), /Unsupported schema/)
console.log(JSON.stringify({ version: 'shadow-consumer-experiment-v1', syntheticOnly: true, inputDigest: digest(text),
  inventoryDigest: digest(inventoryText), scopes: scopes.length, owners, documents: 17,
  context, results, readCount: reads.length, rollbackReleaseKey: rollback.releaseKey,
  checks: { bodyMetadataIndexParity: true, nteSplitOwners: true, rollbackRevalidated: true, incompatiblePeerRejected: true },
  realWorkerIntegration: false, publicTrafficChanged: false, publishable: false,
}, null, 2))
