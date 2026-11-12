import { buildShadowSnapshot, buildShadowRelease, SHADOW_SCHEMA, type ShadowSnapshot } from '../src/shadow-release'

// Keep archived receipts immutable. Tests of today's reader rebuild only their
// synthetic page inputs under the current route contract and obtain new keys.
export function currentShadowFixture<T extends Record<string, any>>(archived: T): T {
  const asOf = archived.asOf ?? '2026-10-30T00:00:00.000Z', data = structuredClone(archived)
  const originals = Array.isArray(archived.snapshots) ? archived.snapshots : Object.values(archived.snapshots)
  const store = new Map<string, ShadowSnapshot>(), keys = new Map<string, string>()
  for (const old of originals as any[]) {
    const snapshot = buildShadowSnapshot(old.game, old.pages.map((row: any) => ({ path: row.path, title: row.title, body: row.body, expiresAt: row.expiresAt, disposition: 'approved-fixture' })), true, asOf)
    keys.set(old.snapshotKey, snapshot.snapshotKey); store.set(snapshot.snapshotKey, snapshot)
  }
  const capabilities = Object.fromEntries(['main', 'nte', 'genshin', 'azur-promilia', 'lvmeng'].map(owner => [owner, [SHADOW_SCHEMA]]))
  for (const name of ['release', 'baseline', 'next']) if (archived[name]) {
    const old = archived[name], refs = Object.fromEntries(Object.entries(old.snapshots).map(([game, key]) => [game, keys.get(key as string)!]))
    ;(data as any)[name] = buildShadowRelease(old.scopes, refs, store, capabilities, asOf)
  }
  ;(data as any).snapshots = Array.isArray(archived.snapshots) ? originals.map((row: any) => store.get(keys.get(row.snapshotKey)!)) : Object.fromEntries(store)
  return data
}
