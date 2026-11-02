import { canonical, LOCALES, type Candidate } from './record-mapping'
import { digest } from './legacy-intake'

export const MATERIAL_CONTRACT = 'material-contract-v1'
const scalarFields = ['name', 'source', 'description', 'notes'] as const
const listFields = ['acquisition', 'uses', 'conversions'] as const
type Scalar = typeof scalarFields[number]
type List = typeof listFields[number]
type Locale = typeof LOCALES[number]
type MaterialTranslation = { locale: Locale } & Partial<Record<Scalar, string | null>> & Partial<Record<List, string[] | null>>
export type Material = {
  id: string; type: string; rarity: number; typeLabelZh?: string | null;
  stackLimit?: string | null; translations: MaterialTranslation[];
}
const suffix = (locale: Locale) => locale === 'zh' ? '' : locale === 'en' ? 'En' : 'Ja'
const allowed = new Set(['id', 'type', 'rarity', 'typeZh', 'stackLimit', ...LOCALES.flatMap(locale => [...scalarFields, ...listFields].map(field => field + suffix(locale)))])
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim())

// No fallback, trimming, date inference or numeric coercion: missing/null/empty remain distinct.
export function parseMaterial(raw: unknown): Material {
  if (!object(raw)) throw new Error('material: expected object')
  const unknown = Object.keys(raw).filter(key => !allowed.has(key)).sort()
  if (unknown.length) throw new Error(`material: unclassified fields: ${unknown.join(', ')}`)
  for (const key of ['id', 'type', 'name']) if (!nonempty(raw[key])) throw new Error(`material: ${key} must be nonempty text`)
  if (!Number.isInteger(raw.rarity) || Number(raw.rarity) < 1 || Number(raw.rarity) > 5) throw new Error('material: rarity must be an integer from 1 to 5')
  const result: Material = { id: raw.id as string, type: raw.type as string, rarity: raw.rarity as number, translations: [] }
  for (const [input, output] of [['typeZh', 'typeLabelZh'], ['stackLimit', 'stackLimit']] as const) {
    if (!Object.hasOwn(raw, input)) continue
    const value = raw[input]
    if (value !== null && typeof value !== 'string') throw new Error(`material: ${input} must be text or null`)
    result[output] = value
  }
  for (const locale of LOCALES) {
    const row: MaterialTranslation = { locale }
    for (const field of scalarFields) {
      const key = field + suffix(locale)
      if (!Object.hasOwn(raw, key)) continue
      const value = raw[key]
      if (value !== null && typeof value !== 'string') throw new Error(`material: ${key} must be text or null`)
      row[field] = value
    }
    for (const field of listFields) {
      const key = field + suffix(locale)
      if (!Object.hasOwn(raw, key)) continue
      const value = raw[key]
      if (value !== null && (!Array.isArray(value) || value.some(item => typeof item !== 'string'))) throw new Error(`material: ${key} must be an ordered text list or null`)
      row[field] = value === null ? null : [...value as string[]]
    }
    if (Object.keys(row).length > 1) result.translations.push(row)
  }
  return result
}

export function materialSource(material: Material): Record<string, unknown> {
  if (!object(material) || Object.keys(material).some(key => !['id', 'type', 'rarity', 'typeLabelZh', 'stackLimit', 'translations'].includes(key)) || !Array.isArray(material.translations)) throw new Error('material: invalid typed fields')
  const raw: Record<string, unknown> = { id: material.id, type: material.type, rarity: material.rarity }
  if (Object.hasOwn(material, 'typeLabelZh')) raw.typeZh = material.typeLabelZh
  if (Object.hasOwn(material, 'stackLimit')) raw.stackLimit = material.stackLimit
  const seen = new Set<string>()
  for (const row of material.translations) {
    if (!object(row) || Object.keys(row).some(key => !['locale', ...scalarFields, ...listFields].includes(key))) throw new Error('material: invalid translation fields')
    if (!LOCALES.includes(row.locale) || seen.has(row.locale)) throw new Error('material: invalid or duplicate locale')
    seen.add(row.locale)
    for (const field of [...scalarFields, ...listFields]) if (Object.hasOwn(row, field)) raw[field + suffix(row.locale)] = row[field]
  }
  // Validate the reverse projection as well, rather than trusting TypeScript at runtime.
  parseMaterial(raw)
  return raw
}

export function previewMaterial(candidate: Candidate) {
  const { revisionKey, ...content } = candidate
  if (digest(canonical(content)) !== revisionKey) throw new Error('Candidate integrity failure')
  if (candidate.hold !== true || candidate.mapperVersion !== 'legacy-records-v2' || candidate.family !== 'materials'
    || candidate.sourcePath !== `packages/data/games/${candidate.gameKey}/raw-materials.json`) throw new Error('Unsupported material source contract')
  const raw: unknown = JSON.parse(candidate.rawRecord)
  const material = parseMaterial(raw)
  if (material.id !== candidate.legacyId || candidate.stableKey !== `${candidate.gameKey}/materials/${encodeURIComponent(canonical([material.id]))}`) throw new Error('Material identity mismatch')
  if (canonical(materialSource(material)) !== canonical(raw)) throw new Error('Material projection lost source fields')
  return { contract: MATERIAL_CONTRACT, revisionKey, stableKey: candidate.stableKey, gameKey: candidate.gameKey,
    material, hold: true as const, publishable: false as const, draftIntakeEnabled: false as const }
}
