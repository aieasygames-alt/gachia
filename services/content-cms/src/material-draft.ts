import type { EditorialDraft } from './payload-types'
import type { Field } from 'payload'
import { LOCALES, type Candidate } from './record-mapping'
import { parseMaterial, materialSource, previewMaterial } from './material-contract'

const scalars = ['name', 'source', 'description', 'notes']
const lists = ['acquisition', 'uses', 'conversions']
export const MATERIAL_PATHS = ['type', 'rarity', 'typeZh', 'stackLimit', ...LOCALES.flatMap(locale => [...scalars, ...lists].map(field => field + (locale === 'zh' ? '' : locale === 'en' ? 'En' : 'Ja')))]
export type MaterialCell = NonNullable<EditorialDraft['materialFields']>[number]
const isList = (field: string) => lists.some(key => field === key || field === `${key}En` || field === `${key}Ja`)
export function materialCells(raw: Record<string, unknown>): MaterialCell[] {
  parseMaterial(raw)
  return MATERIAL_PATHS.map(field => {
    const value = raw[field]
    return { field: field as MaterialCell['field'], state: !Object.hasOwn(raw, field) ? 'absent' : value === null ? 'null' : 'value',
      ...(value == null ? {} : field === 'rarity' ? { number: value as number } : isList(field) ? { entries: (value as string[]).map(value => ({ value })) } : { text: value as string }) }
  })
}
export function candidateMaterialCells(candidate: Candidate) { return materialCells(materialSource(previewMaterial(candidate).material)) }
export function materialRaw(id: string, cells: MaterialCell[] | null | undefined) {
  if (!Array.isArray(cells) || cells.length !== MATERIAL_PATHS.length || new Set(cells.map(c => c.field)).size !== MATERIAL_PATHS.length) throw new Error('Material fields must contain every contract field exactly once')
  const raw: Record<string, unknown> = { id }
  for (const cell of cells) {
    if (!MATERIAL_PATHS.includes(cell.field) || !['absent', 'null', 'value'].includes(cell.state)) throw new Error('Invalid material field/state')
    const hasText = cell.text != null, hasNumber = cell.number != null, hasEntries = Boolean(cell.entries?.length)
    if (cell.state !== 'value') {
      if (hasText || hasNumber || hasEntries) throw new Error('Non-value material field cannot carry a value')
      if (cell.state === 'null') raw[cell.field] = null
    } else if (cell.field === 'rarity') {
      if (hasText || hasEntries || !hasNumber) throw new Error('Material rarity requires number only')
      raw[cell.field] = cell.number
    } else if (isList(cell.field)) {
      if (hasText || hasNumber || (cell.entries != null && !Array.isArray(cell.entries)) || cell.entries?.some(row => typeof row.value !== 'string')) throw new Error('Material list requires text entries only')
      raw[cell.field] = (cell.entries ?? []).map(row => row.value)
    } else {
      if (hasNumber || hasEntries || (hasText && typeof cell.text !== 'string')) throw new Error('Material text field requires text only')
      // Presence is selected explicitly. Payload represents an untouched blank textarea as null.
      // In value state only, a blank text slot means the empty string, never semantic null.
      raw[cell.field] = cell.text ?? ''
    }
  }
  parseMaterial(raw)
  return raw
}
export const materialFields = {
  name: 'materialFields', type: 'array', maxRows: MATERIAL_PATHS.length,
  admin: { condition: data => data.kind === 'material', description: 'Material contract v1: keep all rows. Select absent/null/value explicitly. Lists preserve order; empty list uses value with no entries; empty text uses value with a blank Text slot.' },
  fields: [
    { name: 'field', type: 'select', options: MATERIAL_PATHS, required: true },
    { name: 'state', type: 'select', options: ['absent', 'null', 'value'], required: true },
    { name: 'text', type: 'textarea' }, { name: 'number', type: 'number' },
    { name: 'entries', type: 'array', fields: [{ name: 'value', type: 'textarea' }] },
  ],
} satisfies Field
