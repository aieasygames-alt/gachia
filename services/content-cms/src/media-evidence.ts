import { canonical } from './record-mapping'
import { digest } from './legacy-intake'

export const MEDIA_EVIDENCE_SCHEMA = 'media-evidence-v1'
type Summary = { dto: { id: string; image: { pathname: string; url: string } }; eligible: boolean }
export type MediaEvidence = { pathname: string; sha256: string | null; bytes: number | null; mime: string | null; rights: 'unverified' | 'verified'; sourcePointer: string }

function validPath(pathname: unknown) {
  return typeof pathname === 'string' && pathname.startsWith('/') && !pathname.includes('..') && !pathname.includes('\\') && !/[\u0000-\u001f]/.test(pathname)
}
function validateEvidence(row: MediaEvidence) {
  if (!validPath(row.pathname) || typeof row.sourcePointer !== 'string' || !row.sourcePointer) throw new Error('Invalid media evidence identity')
  if (row.sha256 !== null && !/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error('Invalid media digest')
  if (row.bytes !== null && (!Number.isSafeInteger(row.bytes) || row.bytes < 0)) throw new Error('Invalid media size')
  if (row.mime !== null && !/^image\/(?:webp|png|jpeg)$/.test(row.mime)) throw new Error('Unsupported media MIME')
  if (!['unverified', 'verified'].includes(row.rights)) throw new Error('Invalid media rights status')
}

// Evidence describes an external dependency; it never fetches bytes or grants rights.
export function buildMediaEvidence(summaries: Summary[], evidence: MediaEvidence[]) {
  const eligible = summaries.filter(row => row.eligible)
  const expected = eligible.map(row => row.dto.image.pathname)
  const byPath = new Map(evidence.map(row => [row.pathname, row]))
  if (byPath.size !== evidence.length) throw new Error('Duplicate media evidence identity')
  evidence.forEach(validateEvidence)
  const missing = [...new Set(expected.filter(pathname => !byPath.has(pathname)))].sort()
  const unexpected = [...byPath.keys()].filter(pathname => !expected.includes(pathname)).sort()
  const entries = expected.map(pathname => {
    const row = byPath.get(pathname)
    return { pathname, evidence: row ?? null, bytesVerified: Boolean(row?.sha256 && row.bytes !== null), rightsVerified: row?.rights === 'verified' }
  })
  const data = { schema: MEDIA_EVIDENCE_SCHEMA, entries, missing, unexpected,
    blockers: ['media-fetch-not-performed', 'rights-receipt-not-authenticated', ...(missing.length ? ['missing-media-evidence'] : []), ...(unexpected.length ? ['unexpected-media-evidence'] : [])],
    complete: missing.length === 0 && unexpected.length === 0 && entries.every(row => row.bytesVerified && row.rightsVerified), publishable: false }
  return { ...data, evidenceKey: digest(canonical(data)) }
}
