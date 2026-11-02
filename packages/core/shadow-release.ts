import { canonical, digest } from './shadow-canonical'
import { getRouteOwner } from './route-ownership'
import routes from './route-ownership.json'

export const SHADOW_SCHEMA = 'shadow-page-v1'
export const ROUTE_POLICY = digest(canonical(routes))
export type ShadowInput = {
  path: string; title: string; body: string; expiresAt: string | null;
  disposition: 'approved-fixture' | 'held' | 'withdrawn';
}
export type PublicPage = { path: string; owner: string; schema: typeof SHADOW_SCHEMA; title: string; body: string; expiresAt: string | null }
export type ShadowSnapshot = { version: 'shadow-snapshot-v1'; game: string; routePolicy: string; pages: PublicPage[]; snapshotKey: string }
export type ShadowRelease = { version: 'shadow-release-v1'; routePolicy: string; scopes: string[]; snapshots: Record<string, string>; shadowOnly: true; publishable: false; releaseKey: string }
export type Capabilities = Record<string, string[]>
const hash = (value: unknown) => digest(canonical(value))
const keyPattern = /^[a-f0-9]{64}$/
function scope(value: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error('Invalid shadow scope')
}
function instant(value: string): number {
  const result = Date.parse(value)
  if (!Number.isFinite(result) || new Date(result).toISOString() !== value) throw new Error('Expected canonical UTC instant')
  return result
}
function page(game: string, input: Pick<ShadowInput, 'path' | 'title' | 'body' | 'expiresAt'>): PublicPage {
  // Narrow fixture contract: no encoded aliases, tools, HTML, assets or inferred URLs.
  const parts = input.path.split('/')
  if (parts.length !== 5 || parts[0] !== '' || !['zh', 'en', 'ja'].includes(parts[1] ?? '') || parts[2] !== game
    || parts.slice(2).some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) throw new Error('Invalid canonical shadow page path')
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 500 || typeof input.body !== 'string' || input.body.length > 100000) throw new Error('Invalid plain-text page')
  if (input.expiresAt !== null) instant(input.expiresAt)
  return { path: input.path, owner: getRouteOwner(input.path), schema: SHADOW_SCHEMA, title: input.title, body: input.body, expiresAt: input.expiresAt }
}

// Synthetic protocol only. No Payload draft/decision is accepted as publication authorization.
export function buildShadowSnapshot(game: string, input: ShadowInput[], sourceComplete: boolean, asOf: string): ShadowSnapshot {
  scope(game)
  const now = instant(asOf)
  if (sourceComplete !== true) throw new Error('Incomplete source cannot create a shadow snapshot')
  const pages = input.map(row => {
    if (row.disposition !== 'approved-fixture') throw new Error('Held or withdrawn fixture cannot enter a snapshot')
    const projected = page(game, row)
    if (projected.expiresAt !== null && instant(projected.expiresAt) <= now) throw new Error('Expired fixture')
    return projected
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  if (new Set(pages.map(p => p.path)).size !== pages.length) throw new Error('Duplicate page path')
  const data = { version: 'shadow-snapshot-v1' as const, game, routePolicy: ROUTE_POLICY, pages }
  return { ...data, snapshotKey: hash(data) }
}

export function verifyShadowSnapshot(snapshot: ShadowSnapshot): ShadowSnapshot {
  if (!snapshot || snapshot.version !== 'shadow-snapshot-v1' || snapshot.routePolicy !== ROUTE_POLICY || !Array.isArray(snapshot.pages)) throw new Error('Snapshot version or route policy mismatch')
  scope(snapshot.game)
  const pages = snapshot.pages.map(row => page(snapshot.game, row))
  pages.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  if (new Set(pages.map(p => p.path)).size !== pages.length) throw new Error('Duplicate page path')
  const data = { version: 'shadow-snapshot-v1' as const, game: snapshot.game, routePolicy: ROUTE_POLICY, pages }
  const verified = { ...data, snapshotKey: hash(data) }
  // Exact shape: reject private fields, forged owner/schema, reordered or modified bytes.
  if (canonical(snapshot) !== canonical(verified)) throw new Error('Snapshot integrity or DTO whitelist failure')
  return verified
}

export function buildShadowRelease(scopes: string[], snapshots: Record<string, string>, store: ReadonlyMap<string, ShadowSnapshot>, capabilities: Capabilities, asOf: string): ShadowRelease {
  const now = instant(asOf)
  if (!scopes.length || new Set(scopes).size !== scopes.length) throw new Error('Empty or duplicate release scope')
  scopes.forEach(scope)
  const sorted = [...scopes].sort()
  if (canonical(Object.keys(snapshots).sort()) !== canonical(sorted)) throw new Error('ReleaseMap must cover every scope exactly')
  for (const game of sorted) {
    const key = snapshots[game]
    if (typeof key !== 'string' || !keyPattern.test(key)) throw new Error('Invalid snapshot reference')
    const stored = store.get(key)
    if (!stored) throw new Error('Missing snapshot; partial release forbidden')
    const snapshot = verifyShadowSnapshot(stored)
    if (snapshot.game !== game || snapshot.snapshotKey !== key) throw new Error('Snapshot reference scope mismatch')
    for (const row of snapshot.pages) {
      if (!Object.hasOwn(capabilities, row.owner) || !capabilities[row.owner]?.includes(row.schema)) throw new Error(`Unsupported schema for owner ${row.owner}`)
      if (row.expiresAt !== null && instant(row.expiresAt) <= now) throw new Error('Expired snapshot page')
    }
  }
  const data = { version: 'shadow-release-v1' as const, routePolicy: ROUTE_POLICY, scopes: sorted, snapshots: Object.fromEntries(sorted.map(game => [game, snapshots[game]!])), shadowOnly: true as const, publishable: false as const }
  return { ...data, releaseKey: hash(data) }
}

export function openShadowView(release: ShadowRelease, expectedScopes: string[], store: ReadonlyMap<string, ShadowSnapshot>, capabilities: Capabilities, asOf: string) {
  // Validate all owners before exposing any page, then pin independent copies for the request.
  const verified = buildShadowRelease(expectedScopes, release.snapshots, store, capabilities, asOf)
  if (canonical(release) !== canonical(verified)) throw new Error('Release integrity failure')
  const pages = verified.scopes.flatMap(game => verifyShadowSnapshot(store.get(verified.snapshots[game]!)!).pages)
  const byPath = new Map(pages.map(row => [row.path, row]))
  return {
    releaseKey: verified.releaseKey,
    read(owner: string, pathname: string): PublicPage | null {
      const row = byPath.get(pathname)
      if (!row) return null
      if (row.owner !== owner) throw new Error('Wrong consumer owner')
      return structuredClone(row)
    },
    index(owner: string) { return pages.filter(row => row.owner === owner).map(({ path, title }) => ({ path, title })) },
    cacheKey(owner: string, pathname: string) { return `shadow:${verified.releaseKey}:${hash({ owner, pathname })}` },
  }
}
