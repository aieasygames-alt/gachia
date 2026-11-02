import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { projectRoot } from '../src/local-environment'
import { digest } from '../src/legacy-intake'
import { buildShadowSnapshot, buildShadowRelease, openShadowView, SHADOW_SCHEMA, ROUTE_POLICY, type ShadowInput } from '../src/shadow-release'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Use CMS_LOCAL_ONLY=1 tsx scripts/shadow-release.ts with no arguments')
const inventoryPath = path.resolve(projectRoot, '../../reports/payload-migration-2026-10-28/inventory.json')
const inventoryText = readFileSync(inventoryPath, 'utf8')
const inventory = JSON.parse(inventoryText)
const scopes: string[] = inventory.scopes.map((row: { id: string }) => row.id)
const asOf = '2026-10-30T00:00:00.000Z'
const page = (pathname: string, title = 'Synthetic shadow fixture'): ShadowInput => ({ path: pathname, title, body: 'Synthetic text only; not migrated or approved content.', expiresAt: null, disposition: 'approved-fixture' })
const snapshots = scopes.map(game => buildShadowSnapshot(game, [page(`/zh/${game}/characters/example`), ...(game === 'nte' ? [page('/zh/nte/items/ore')] : [])], true, asOf))
const store = new Map(snapshots.map(s => [s.snapshotKey, s]))
const refs = Object.fromEntries(snapshots.map(s => [s.game, s.snapshotKey]))
const owners = [...new Set(snapshots.flatMap(s => s.pages.map(p => p.owner)))].sort()
const capabilities = Object.fromEntries(owners.map(owner => [owner, [SHADOW_SCHEMA]]))
const baseline = buildShadowRelease(scopes, refs, store, capabilities, asOf)
const old = openShadowView(baseline, scopes, store, capabilities, asOf)
const changed = buildShadowSnapshot('nte', [page('/zh/nte/characters/example', 'Updated synthetic character'), page('/zh/nte/items/ore', 'Updated synthetic item')], true, asOf)
store.set(changed.snapshotKey, changed)
const next = buildShadowRelease(scopes, { ...refs, nte: changed.snapshotKey }, store, capabilities, asOf)
// Round-trip the artifacts: callers must not depend on object identity or process-local state.
const restoredStore = new Map(JSON.parse(JSON.stringify([...store]))) as typeof store
const view = openShadowView(JSON.parse(JSON.stringify(next)), scopes, restoredStore, capabilities, asOf)
assert.equal(view.read('main', '/zh/nte/items/ore')?.title, 'Updated synthetic item')
assert.equal(view.read('nte', '/zh/nte/characters/example')?.title, 'Updated synthetic character')
assert.equal(old.read('main', '/zh/nte/items/ore')?.title, 'Synthetic shadow fixture')
const reused = scopes.filter(game => baseline.snapshots[game] === next.snapshots[game])
assert.equal(reused.length, scopes.length - 1)
assert.throws(() => openShadowView(next, scopes, restoredStore, { ...capabilities, main: [] }, asOf), /Unsupported/)
assert.throws(() => openShadowView(next, scopes, restoredStore, { ...capabilities, nte: [] }, asOf), /Unsupported/)
const missing = new Map(restoredStore); missing.delete(refs.genshin)
assert.throws(() => openShadowView(next, scopes, missing, capabilities, asOf), /Missing snapshot/)
assert.equal(openShadowView(baseline, scopes, restoredStore, capabilities, asOf).releaseKey, baseline.releaseKey)
console.log(JSON.stringify({
  version: 'shadow-experiment-v1', syntheticOnly: true, publicTrafficChanged: false, productionActivationImplemented: false,
  inventoryDigest: digest(inventoryText), routePolicy: ROUTE_POLICY, asOf, scopes, owners,
  snapshotCount: store.size, reusedScopes: reused, capabilitiesAreSynthetic: true,
  checks: { serializedRoundTrip: true, nteSplitOwners: true, pinnedOldView: true, incompatibleMainRejected: true, incompatibleNteRejected: true, missingOwnerSnapshotRejected: true, rollbackRevalidated: true },
  baseline, next, snapshots: [...store.values()],
}, null, 2))
