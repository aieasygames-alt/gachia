import { digest } from './legacy-intake'
import { canonical, type RecordBatch } from './record-mapping'
import { draftKind } from './review-plan'
import { MATERIAL_CONTRACT, previewMaterial } from './material-contract'

export function contractCoverage(batch: RecordBatch) {
  const rows = batch.sources.flatMap(source => source.records).map(candidate => {
    const existing = draftKind(candidate)
    let status = existing ? 'existing-draft-path' : 'no-contract'
    let reason: string | null = null
    let projection: ReturnType<typeof previewMaterial> | null = null
    if (!existing && candidate.family === 'materials') {
      try { projection = previewMaterial(candidate); status = 'contract-preview' }
      catch (error) { status = 'contract-blocked'; reason = error instanceof Error ? error.message : String(error) }
    }
    return { gameKey: candidate.gameKey, family: candidate.family, stableKey: candidate.stableKey, revisionKey: candidate.revisionKey,
      status, reason, existingDraftKind: existing, projection }
  }).sort((a, b) => a.stableKey.localeCompare(b.stableKey))
  if (new Set(rows.map(row => row.stableKey)).size !== rows.length) throw new Error('Duplicate coverage identity')
  const scopes = [...new Set(batch.sources.map(s => s.gameKey))].sort().map(gameKey => {
    const records = rows.filter(r => r.gameKey === gameKey)
    return { gameKey, total: records.length, families: [...new Set(records.map(r => r.family))].sort().map(family => {
      const matching = records.filter(r => r.family === family)
      return { family, total: matching.length, counts: counts(matching), blockers: [...new Set(matching.flatMap(r => r.reason ? [r.reason] : []))].sort() }
    }) }
  })
  const data = { version: 'contract-coverage-v1', contract: MATERIAL_CONTRACT, batchKey: batch.batchKey, total: rows.length,
    counts: counts(rows), scopes, rows, sourceBacklog: batch.sources.filter(s => s.state !== 'mapped').map(s => ({ sourcePath: s.sourcePath, state: s.state, reason: s.reason })),
    authority: 'legacy', publishable: false, draftPolicyChanged: false }
  return { ...data, coverageKey: digest(canonical(data)) }
}
function counts(rows: { status: string }[]) {
  return Object.fromEntries(['existing-draft-path', 'contract-preview', 'contract-blocked', 'no-contract'].map(status => [status, rows.filter(row => row.status === status).length]))
}
