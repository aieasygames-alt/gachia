import { isDeepStrictEqual } from 'node:util'
import { editedGuide, parseGuides, sha256 } from './desktop-guides'

type RecordInput = { legacyId: string; stableKey: string; sourceRecord?: unknown; hold?: boolean | null; _status?: string | null; title?: unknown; body?: unknown }

export function exportDesktopGuides(originalText: string, game: string, records: RecordInput[], preview: boolean) {
  if (!['genshin', 'nte'].includes(game) || typeof preview !== 'boolean') throw new Error('Invalid export scope')
  const originals = parseGuides(originalText), output = structuredClone(originals), changed: string[] = [], seen = new Set<string>()
  for (const record of records) {
    if (seen.has(record.legacyId)) throw new Error('Duplicate editorial record')
    seen.add(record.legacyId)
    if (!preview && (record.hold || record._status !== 'published')) throw new Error('Unapproved editorial record')
    const index = output.findIndex(row => row.id === record.legacyId)
    if (index < 0 || record.stableKey !== `${game}:guides:${record.legacyId}`
      || !isDeepStrictEqual(record.sourceRecord, originals[index])) throw new Error('Source changed or identity mismatch; rebase before exporting')
    output[index] = editedGuide(originals[index], record)
    if (JSON.stringify(output[index]) !== JSON.stringify(originals[index])) changed.push(record.legacyId)
  }
  if (!records.length) throw new Error('No eligible records; publish and clear hold locally, or explicitly use --preview')
  const content = changed.length ? JSON.stringify(output, null, 2) + '\n' : originalText
  const releaseKey = sha256(JSON.stringify({ game, source: sha256(originalText), candidate: sha256(content), preview }))
  const manifest = { releaseKey, game, owner: game, sourcePath: `packages/data/games/${game}/raw-guides.json`, sourceSHA256: sha256(originalText), candidateSHA256: sha256(content),
    changed, preview, preparedOn: 'desktop', cloudWrites: false, productionReady: false,
    pending: ['sealed Worker build', 'target preview acceptance', 'current deployment and rollback check', 'local promotion executor'] }
  return { content, manifest }
}
