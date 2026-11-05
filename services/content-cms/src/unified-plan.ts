import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'
import { digest, type SourceSnapshot } from './legacy-intake'
import { canonical } from './record-mapping'
import { sourceUnits } from './unified-sources'
import { validateUnifiedRecord, type UnifiedRecord } from './unified-content'

export function unifiedPlan(sources: SourceSnapshot[], games: string[]) {
  if (new Set(games).size !== games.length || new Set(sources.map(source => source.sourcePath)).size !== sources.length) throw new Error('Duplicate source/scope')
  const rows = sources.filter(source => ['raw-json', 'inline-code'].includes(source.sourceKind)).map(source => {
    if (!games.includes(source.gameKey)) throw new Error('Unregistered unified content scope')
    // These files are generated from characters and must never acquire a second editing authority.
    if (source.sourcePath.endsWith('/raw-character-summaries.json')) return { sourcePath: source.sourcePath, game: source.gameKey,
      sourceSHA256: source.sourceDigest, records: [] as UnifiedRecord[], readers: [] as string[], blocked: [] as { symbol: string; reason: string }[], delegated: 'character-summary-generator' }
    const units = sourceUnits(source)
    return { sourcePath: source.sourcePath, game: source.gameKey, sourceSHA256: source.sourceDigest, ...units }
  }).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  const keys = rows.flatMap(row => row.records.map(record => record.stableKey))
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate unified content identity')
  const manifest = { contract: 'unified-existing-content-v1', games: [...games].sort(), sources: rows,
    scopeCoverage: [...games].sort().map(game => ({ game, sourceCount: rows.filter(row => row.game === game).length,
      recordCount: rows.filter(row => row.game === game).reduce((sum, row) => sum + row.records.length, 0),
      delegated: rows.filter(row => row.game === game && row.delegated).map(row => row.sourcePath) })),
    productionReady: false, websiteChanged: false }
  return { ...manifest, planSHA256: digest(canonical(manifest)) }
}

export type UnifiedPlan = ReturnType<typeof unifiedPlan>
export function verifyUnifiedPlan(plan: UnifiedPlan) {
  const { planSHA256, ...manifest } = plan
  if (digest(canonical(manifest)) !== planSHA256) throw new Error('Unified plan integrity failure')
  for (const source of plan.sources) for (const record of source.records) {
    validateUnifiedRecord({ ...record, bodyFormat: 'plain' })
    if (record.sourceRecord.sourceSHA256 !== source.sourceSHA256 || record.sourceRecord.sourcePath !== source.sourcePath
      || record.sourceRecord.game !== source.game) throw new Error('Unified plan source mismatch')
  }
}

export async function importUnifiedPlan(payload: Payload, plan: UnifiedPlan, games = plan.games) {
  verifyUnifiedPlan(plan)
  if (!games.length || new Set(games).size !== games.length || games.some(game => !plan.games.includes(game))) {
    throw new Error('Explicit registered import scopes required')
  }
  let created = 0, unchanged = 0
  // Each game commits atomically; a rerun verifies and resumes completed games without replacing edits.
  for (const game of games) {
    const records = plan.sources.filter(row => row.game === game).flatMap(row => row.records)
    if (!records.length) continue
    const transactionID = await payload.db.beginTransaction()
    if (!transactionID) throw new Error('Unified import requires transactions')
    const req = { transactionID }
    try {
      let gameDoc = (await payload.find({ collection: 'games', overrideAccess: true, req, limit: 1, where: { key: { equals: game } } })).docs[0]
      if (!gameDoc) gameDoc = await payload.create({ collection: 'games', overrideAccess: true, req,
        data: { key: game, name: game, region: game === 'roco-cn' ? 'cn' : 'unverified', legacyRegistry: { unifiedPlan: plan.planSHA256 } } })
      const existing = await payload.find({ collection: 'content-records', overrideAccess: true, req, draft: true, locale: 'all', depth: 0,
        pagination: false, where: { game: { equals: gameDoc.id } } })
      const byKey = new Map(existing.docs.map(doc => [doc.stableKey, doc]))
      let added = 0, skipped = 0
      for (const record of records) {
        const current = byKey.get(record.stableKey)
        if (current) {
          if (!isDeepStrictEqual(current.sourceRecord, record.sourceRecord) || current.kind !== record.kind || current.legacyId !== record.legacyId
            || current.legacyPath !== record.legacyPath) throw new Error(`Source revision changed; explicit rebase required: ${record.stableKey}`)
          skipped++
          continue
        }
        await payload.create({ collection: 'content-records', overrideAccess: true, req, draft: true,
          context: { unifiedContentImport: true }, data: { ...record, game: gameDoc.id, bodyFormat: 'plain',
            reviewEvidence: { planSHA256: plan.planSHA256, editorialOnly: true, websiteChanged: false } } })
        added++
      }
      await payload.db.commitTransaction(transactionID)
      created += added; unchanged += skipped
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  }
  return { created, unchanged, total: created + unchanged, websiteChanged: false, productionReady: false }
}
