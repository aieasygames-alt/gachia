import { isDeepStrictEqual } from 'node:util'
import { newGuideSource, readNewGuideSource } from './desktop-guide-contract.mjs'

export function desktopNewGuideDraft(game: string, gameId: number, input: { id: string; title: string; summary: string; body: string }) {
  return { stableKey: `${game}:guides:${input.id}`, game: gameId, kind: 'guides', legacyId: input.id,
    legacyPath: `/${game}/guides/${input.id}`, bodyFormat: 'markdown' as const,
    sourceRecord: newGuideSource(game, input), title: input.title, body: input.body, hold: true, _status: 'draft' as const }
}

type Identity = { stableKey?: unknown; game?: unknown; kind?: unknown; legacyId?: unknown; legacyPath?: unknown; bodyFormat?: unknown; sourceRecord?: unknown }
export function isDesktopNewGuide(record: Identity) {
  return Boolean(record.sourceRecord && typeof record.sourceRecord === 'object' && 'desktopGuide' in record.sourceRecord)
}

export function validateDesktopNewGuideIdentity(record: Identity, previous?: Identity) {
  if (previous) for (const key of ['stableKey', 'game', 'kind', 'legacyId', 'legacyPath', 'bodyFormat', 'sourceRecord'] as const) {
    if (!isDeepStrictEqual(record[key], previous[key])) throw new Error('New guide identity and source template are immutable')
  }
  if (typeof record.legacyId !== 'string') throw new Error('New guide identity required')
  readNewGuideSource(record.sourceRecord, 'genshin', record.legacyId)
  if (record.stableKey !== `genshin:guides:${record.legacyId}` || record.kind !== 'guides'
    || record.legacyPath !== `/genshin/guides/${record.legacyId}` || record.bodyFormat !== 'markdown') throw new Error('New guide identity mismatch')
}
