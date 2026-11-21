import assert from 'node:assert/strict'
import type { Payload, PayloadRequest } from 'payload'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import type { GenshinCollectionReview } from './genshin-collection-review'
const GENSHIN_INTAKE_PATHS = ['materials', 'character-materials', 'characters'].map(family => `packages/data/games/genshin/raw-${family}.json`)
export const GENSHIN_COLLECTION_REVIEW = 'genshin-collection-review-v1'
export const cmsKey = (rows: { id: string | number }[]) => digest(canonical([...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)))))
export async function assertGenshinReviewCMS(payload: Payload, expected: string, req?: Partial<PayloadRequest>) {
  const rows = (await payload.find({ collection: 'content-records', req, overrideAccess: true, draft: true,
    locale: 'all', fallbackLocale: false, depth: 0, pagination: false, where: { legacyPath: { in: GENSHIN_INTAKE_PATHS } } })).docs
  assert.equal(cmsKey(rows), expected, 'CMS drift invalidates the collection review; recapture and re-review')
}

function exact(row: object, expected: object) {
  assert.equal(canonical(Object.fromEntries(Object.keys(expected).map(key => [key, row[key as keyof typeof row]]))), canonical(expected), 'Stored collection review projection mismatch')
}
// Used by the reviewer-only decision hook. The manifest and all display fields
// are immutable projections, not client supplied approvals or trusted JSON.
export async function verifiedGenshinCollectionItem(payload: Payload, runKey: string, id: number, req: Partial<PayloadRequest>) {
  const batch = (await payload.find({ collection: 'migration-batches', req, overrideAccess: true, depth: 0,
    limit: 2, where: { batchKey: { equals: runKey } } })).docs
  assert.equal(batch.length, 1, 'Complete collection review required')
  const manifest: GenshinCollectionReview['manifest'] = JSON.parse(batch[0].manifest)
  assert.equal(manifest.kind, GENSHIN_COLLECTION_REVIEW); assert.equal(digest(canonical(manifest)), runKey)
  assert.equal(batch[0].recordCount, manifest.items.length)
  assert.equal(batch[0].mapperVersion, GENSHIN_COLLECTION_REVIEW)
  assert.equal(batch[0].policyDigest, digest(GENSHIN_COLLECTION_REVIEW))
  assert(new Set(manifest.items.map(item => item.revisionKey)).size === manifest.items.length)
  const all = (await payload.find({ collection: 'migration-records', req, overrideAccess: true, depth: 0, pagination: false,
    where: { revisionKey: { in: manifest.items.map(item => item.revisionKey) } } })).docs
  assert.equal(all.length, manifest.items.length, 'Incomplete collection review')
  for (const row of all) {
    assert.equal(digest(row.candidateText), row.revisionKey, 'Review revision corrupted')
    const ref = manifest.items.find(item => item.revisionKey === row.revisionKey); assert(ref && ref.stableKey === row.stableKey)
    const envelope = JSON.parse(row.candidateText), entry = envelope.entry
    assert.equal(envelope.kind, GENSHIN_COLLECTION_REVIEW); assert.equal(envelope.inputKey, manifest.inputKey)
    assert.equal(envelope.stageKey, manifest.stageKey); assert.equal(row.rawRecord, canonical(entry.draft))
    const expected = { stableKey: `genshin-review:${entry.key}`, gameKey: 'genshin', family: `collection-review/${entry.family}`,
      legacyId: entry.to, sourcePath: entry.sourcePath, mappingLevel: 'structured-fields', hold: true,
      translations: [], faqs: [], assetReference: { category: null, legacyId: null, url: null },
      reviewText: canonical({ key: entry.key, action: entry.action, from: entry.from, to: entry.to,
        changeClasses: entry.changeClasses, changes: entry.changes, cmsVsImport: entry.cmsVsImport,
        publicVsImport: entry.publicVsImport, evidence: envelope.candidateProof, identityEvidence: envelope.renames }) }
    exact(row, expected)
  }
  const item = all.find(row => row.id === id); assert(item, 'Review item is outside this complete run')
  await assertGenshinReviewCMS(payload, manifest.cmsKey, req)
  return { item, manifest }
}

