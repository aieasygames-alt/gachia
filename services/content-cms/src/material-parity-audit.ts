import { canonical } from './record-mapping'
import { digest } from './legacy-intake'

export const MATERIAL_PARITY_SCHEMA = 'material-page-parity-v1'
type Expected = { path: string; owner: string; locale: string; kind: 'collection' | 'detail' }
type Observed = Expected & { metadata?: boolean; search?: boolean; sitemap?: boolean }

function identity(row: { path: string; owner: string; locale: string; kind: string }) {
  if (!row.path.startsWith('/') || row.path.includes('..') || !row.owner || !row.locale || !['collection', 'detail'].includes(row.kind)) throw new Error('Invalid parity route')
}
export function auditMaterialParity(expected: Expected[], observed: Observed[]) {
  expected.forEach(identity); observed.forEach(identity)
  const expectedMap = new Map(expected.map(row => [row.path, row]))
  const observedMap = new Map(observed.map(row => [row.path, row]))
  if (expectedMap.size !== expected.length || observedMap.size !== observed.length) throw new Error('Duplicate parity route')
  const missing = [...expectedMap.keys()].filter(path => !observedMap.has(path)).sort()
  const extra = [...observedMap.keys()].filter(path => !expectedMap.has(path)).sort()
  const ownerMismatch = [...expectedMap.keys()].filter(path => observedMap.has(path) && expectedMap.get(path)!.owner !== observedMap.get(path)!.owner)
    .map(path => ({ path, expected: expectedMap.get(path)!.owner, observed: observedMap.get(path)!.owner })).sort((a, b) => a.path.localeCompare(b.path))
  const seo = expected.filter(row => observedMap.has(row.path)).map(row => {
    const actual = observedMap.get(row.path)!
    return { path: row.path, metadata: actual.metadata === true, search: actual.search === true, sitemap: actual.sitemap === true }
  })
  const data = { schema: MATERIAL_PARITY_SCHEMA, expectedCount: expected.length, observedCount: observed.length, missing, extra, ownerMismatch, seo,
    pageSetComplete: missing.length === 0 && extra.length === 0 && ownerMismatch.length === 0,
    metadataSearchSitemapComplete: seo.length === expected.length && seo.every(row => row.metadata && row.search && row.sitemap),
    blockers: ['page-content-not-rendered', 'media-and-rights-not-verified', ...(missing.length ? ['missing-pages'] : []), ...(extra.length ? ['unexpected-pages'] : []), ...(ownerMismatch.length ? ['owner-mismatch'] : []),
      ...(seo.some(row => !row.metadata) ? ['metadata-unverified'] : []), ...(seo.some(row => !row.search) ? ['search-unverified'] : []), ...(seo.some(row => !row.sitemap) ? ['sitemap-unverified'] : [])],
    publishable: false, releaseCompatible: false }
  return { ...data, parityKey: digest(canonical(data)) }
}
