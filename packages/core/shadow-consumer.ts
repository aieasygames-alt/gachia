import { openShadowView, SHADOW_SCHEMA, type Capabilities, type ShadowRelease, type ShadowSnapshot } from './shadow-release'

export type ShadowArtifactReader = (kind: 'release' | 'snapshot', key: string) => Promise<string>
export type ShadowConsumerContext = {
  owner: string; releaseKey: string; scopes: string[]; capabilities: Capabilities; asOf: string;
}
const validKey = (key: unknown): key is string => typeof key === 'string' && /^[a-f0-9]{64}$/.test(key)
function parse(text: string, maxBytes: number): unknown {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('Invalid or oversized shadow artifact')
  return JSON.parse(text)
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// All external bytes are verified before returning an owner-bound, request-scoped reader.
export async function loadShadowConsumer(context: ShadowConsumerContext, readArtifact: ShadowArtifactReader) {
  const pinned = structuredClone(context)
  if (!validKey(pinned.releaseKey) || !pinned.scopes.length || pinned.scopes.length > 256) throw new Error('Invalid shadow consumer context')
  if (!Object.hasOwn(pinned.capabilities, pinned.owner) || !pinned.capabilities[pinned.owner]?.includes(SHADOW_SCHEMA)) throw new Error('Unsupported consumer owner')
  const raw = parse(await readArtifact('release', pinned.releaseKey), 1024 * 1024)
  if (!object(raw) || raw.releaseKey !== pinned.releaseKey || !object(raw.snapshots)) throw new Error('Pinned release mismatch')
  const refs = raw.snapshots
  if (Object.keys(refs).length !== pinned.scopes.length || new Set(pinned.scopes).size !== pinned.scopes.length
    || pinned.scopes.some(game => !Object.hasOwn(refs, game) || !validKey(refs[game]))) throw new Error('Incomplete or invalid snapshot references')
  const store = new Map<string, ShadowSnapshot>()
  let totalBytes = 0
  for (const game of [...pinned.scopes].sort()) {
    const key = refs[game] as string
    const text = await readArtifact('snapshot', key)
    const snapshot = parse(text, 2 * 1024 * 1024)
    totalBytes += Buffer.byteLength(text, 'utf8')
    if (totalBytes > 32 * 1024 * 1024) throw new Error('Shadow artifact budget exceeded')
    if (!object(snapshot) || snapshot.snapshotKey !== key) throw new Error('Pinned snapshot mismatch')
    store.set(key, snapshot as ShadowSnapshot)
  }
  const view = openShadowView(raw as ShadowRelease, pinned.scopes, store, pinned.capabilities, pinned.asOf)
  const stamp = { releaseKey: view.releaseKey, owner: pinned.owner, shadowOnly: true as const, publishable: false as const }
  return {
    ...stamp,
    document(pathname: string) {
      const page = view.read(pinned.owner, pathname)
      if (!page) return null
      return { ...stamp, path: page.path, title: page.title, body: page.body, format: 'plain-text' as const, cacheKey: view.cacheKey(pinned.owner, pathname) }
    },
    metadata(pathname: string) {
      const page = view.read(pinned.owner, pathname)
      if (!page) return null
      // Relative canonical identity only; never manufacture a production origin or index permission.
      return { ...stamp, title: page.title, canonicalPath: page.path, robots: { index: false, follow: false }, cacheKey: view.cacheKey(pinned.owner, pathname) }
    },
    index() { return { ...stamp, entries: view.index(pinned.owner) } },
  }
}
