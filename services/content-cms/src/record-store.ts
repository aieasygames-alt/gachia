import type { Payload, PayloadRequest } from 'payload'
import { digest } from './legacy-intake'
import { batchManifest, canonical, mapSource, type Candidate, type RecordBatch, type MappingPolicy } from './record-mapping'

export function recordData(record: Candidate) {
  return {
    stableKey: record.stableKey, revisionKey: record.revisionKey, gameKey: record.gameKey,
    family: record.family, legacyId: record.legacyId, sourcePath: record.sourcePath,
    mappingLevel: record.mappingLevel, hold: true,
    faqs: record.faqs ?? [], assetReference: record.assetReference ?? { category: null, legacyId: null, url: null },
    translations: record.translations, rawRecord: record.rawRecord, reviewText: record.reviewText,
    candidateText: canonical(record),
  }
}

export async function importRecordBatch(payload: Payload, batch: RecordBatch, policy: MappingPolicy) {
  const manifest = canonical(batchManifest(batch))
  if (policy.digest !== batch.policyDigest || digest(manifest) !== batch.batchKey) throw new Error('Batch integrity failure')
  const seen = new Set<string>()
  for (const source of batch.sources) {
    const snapshots = await payload.find({ collection: 'migration-sources', overrideAccess: true, limit: 1, where: { snapshotKey: { equals: source.sourceSnapshotKey } } })
    const snapshot = snapshots.docs[0]
    if (!snapshot || snapshot.sourcePath !== source.sourcePath || snapshot.gameKey !== source.gameKey || digest(snapshot.rawText) !== snapshot.sourceDigest) throw new Error(`Missing or corrupt source snapshot: ${source.sourcePath}`)
    const expected = mapSource(snapshot, policy)
    expected.records.sort((a, b) => a.stableKey.localeCompare(b.stableKey))
    if (canonical(expected) !== canonical(source)) throw new Error(`Mapping does not match stored source: ${source.sourcePath}`)
    for (const record of source.records) {
      const { revisionKey, ...data } = record
      if (record.sourcePath !== source.sourcePath || record.gameKey !== source.gameKey || record.policyDigest !== batch.policyDigest || record.mapperVersion !== batch.mapperVersion || !record.hold || digest(canonical(data)) !== revisionKey) throw new Error('Record integrity failure')
      if (seen.has(record.stableKey)) throw new Error('Duplicate batch identity')
      seen.add(record.stableKey)
    }
  }
  let created = 0
  let reused = 0
  for (const record of batch.sources.flatMap(source => source.records)) {
    const data = recordData(record)
    const result = await payload.find({ collection: 'migration-records', overrideAccess: true, limit: 1, where: { revisionKey: { equals: record.revisionKey } } })
    const existing = result.docs[0]
    if (existing) {
      const asset = existing.assetReference
      const projection = {
        ...Object.fromEntries(Object.keys(data).filter(key => !['translations', 'faqs', 'assetReference'].includes(key)).map(key => [key, existing[key as keyof typeof existing]])),
        translations: (existing.translations ?? []).map(({ locale, title, body, summary }) => ({ locale, title: title ?? null, body: body ?? null, summary: summary ?? null })),
        faqs: (existing.faqs ?? []).map(({ locale, sourcePointer, question, answer }) => ({ locale, sourcePointer, question: question ?? null, answer: answer ?? null })),
        assetReference: { category: asset?.category ?? null, legacyId: asset?.legacyId ?? null, url: asset?.url ?? null },
      }
      if (canonical(projection) !== canonical(data)) throw new Error(`Stored record mismatch: ${record.stableKey}`)
      reused++
    } else {
      await payload.create({ collection: 'migration-records', overrideAccess: true, data })
      created++
    }
  }
  const previous = await payload.find({ collection: 'migration-batches', overrideAccess: true, limit: 1, where: { batchKey: { equals: batch.batchKey } } })
  if (previous.docs[0]) {
    if (previous.docs[0].manifest !== manifest || previous.docs[0].recordCount !== seen.size) throw new Error('Stored batch mismatch')
  } else {
    // A batch is visible as complete only after every immutable revision has been verified.
    await payload.create({ collection: 'migration-batches', overrideAccess: true, data: { batchKey: batch.batchKey, mapperVersion: batch.mapperVersion, policyDigest: batch.policyDigest, recordCount: seen.size, manifest } })
  }
  return { batchKey: batch.batchKey, created, reused, total: seen.size, publishable: false }
}

export async function loadRecordBatch(payload: Payload, batchKey: string, req?: Partial<PayloadRequest>): Promise<RecordBatch> {
  if (!/^[a-f0-9]{64}$/.test(batchKey)) throw new Error('Invalid batch key')
  const found = await payload.find({ collection: 'migration-batches', overrideAccess: true, req, limit: 1, where: { batchKey: { equals: batchKey } } })
  const stored = found.docs[0]
  if (!stored || digest(stored.manifest) !== batchKey) throw new Error('Complete batch not found or corrupt')
  const manifest: ReturnType<typeof batchManifest> = JSON.parse(stored.manifest)
  if (manifest.mapperVersion !== stored.mapperVersion || manifest.policyDigest !== stored.policyDigest) throw new Error('Batch metadata mismatch')
  // Bounded IN queries avoid per-record round trips; every referenced row is still verified below.
  // No cross-request cache: subsequent operations always observe current database contents.
  const references = manifest.sources.flatMap(source => source.records.map(ref => ref.revisionKey))
  const rows = new Map<string, { candidateText: string }>()
  for (let offset = 0; offset < references.length; offset += 100) {
    const keys = references.slice(offset, offset + 100)
    const result = await payload.find({ collection: 'migration-records', overrideAccess: true, req, depth: 0,
      limit: 100, pagination: false, where: { revisionKey: { in: keys } } })
    for (const row of result.docs) {
      if (rows.has(row.revisionKey)) throw new Error('Duplicate batch revision')
      rows.set(row.revisionKey, row)
    }
  }
  const sources: RecordBatch['sources'] = []
  const identities = new Set<string>()
  for (const source of manifest.sources) {
    const snapshot = (await payload.find({ collection: 'migration-sources', overrideAccess: true, req, limit: 1, where: { snapshotKey: { equals: source.sourceSnapshotKey } } })).docs[0]
    if (!snapshot || snapshot.sourcePath !== source.sourcePath || snapshot.gameKey !== source.gameKey || digest(snapshot.rawText) !== snapshot.sourceDigest || digest(`${snapshot.sourcePath}\0${snapshot.sourceDigest}`) !== source.sourceSnapshotKey) throw new Error('Batch source unavailable or corrupt')
    const records: Candidate[] = []
    for (const ref of source.records) {
      const row = rows.get(ref.revisionKey)
      if (!row) throw new Error('Batch record unavailable')
      const candidate: Candidate = JSON.parse(row.candidateText)
      const { revisionKey, ...data } = candidate
      if (digest(canonical(data)) !== revisionKey || revisionKey !== ref.revisionKey || candidate.stableKey !== ref.stableKey || candidate.sourcePath !== source.sourcePath || candidate.policyDigest !== stored.policyDigest || candidate.mapperVersion !== stored.mapperVersion || candidate.hold !== true) throw new Error('Batch record corrupt')
      if (identities.has(candidate.stableKey)) throw new Error('Duplicate batch identity')
      identities.add(candidate.stableKey)
      records.push(candidate)
    }
    sources.push({ ...source, records })
  }
  if (identities.size !== stored.recordCount) throw new Error('Batch record count mismatch')
  return { mapperVersion: manifest.mapperVersion, policyDigest: manifest.policyDigest, sources, batchKey }
}
