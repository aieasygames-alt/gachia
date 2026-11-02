import { createHash } from 'node:crypto'

export const guideFields = { zh: { title: 'title', body: 'content' }, en: { title: 'titleEn', body: 'contentEn' }, ja: { title: 'titleJa', body: 'contentJa' } } as const
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export type LegacyGuide = { id: string; [key: string]: unknown }
export function parseGuides(text: string): LegacyGuide[] {
  const rows: unknown = JSON.parse(text)
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[a-z0-9-]+$/.test(row.id))
    || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Invalid guide identities')
  return rows
}
export function editedGuide(original: LegacyGuide, edited: { title?: unknown; body?: unknown }) {
  const result = { ...original }
  for (const [locale, fields] of Object.entries(guideFields)) {
    for (const [field, legacy] of Object.entries(fields)) {
      const localized = edited[field as 'title' | 'body']
      const value = localized && typeof localized === 'object' ? (localized as Record<string, unknown>)[locale] : undefined
      if (value === undefined) continue
      if (value !== undefined && value !== null && typeof value !== 'string') throw new Error('Invalid localized text')
      // Preserve missing/empty original fields when Payload normalizes them to null.
      if ((value ?? '') === (original[legacy] ?? '')) continue
      result[legacy] = value ?? ''
    }
  }
  return result
}
