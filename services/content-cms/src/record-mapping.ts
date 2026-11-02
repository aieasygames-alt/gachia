import { digest, type SourceSnapshot } from './legacy-intake'
import { literalModule } from './literal-module'
import { INLINE_CONTRACT } from './inline-contract'

export const MAPPER_VERSION = 'legacy-records-v2'
export const LOCALES = ['zh', 'en', 'ja'] as const
type Locale = typeof LOCALES[number]
type Row = Record<string, unknown>
export type RouteContract = { games: Record<string, { locales: string[]; details: string[] }> }
export type MappingPolicy = { digest: string; routes: RouteContract }
export type Translation = { locale: Locale; title: string | null; body: string | null; summary: string | null }
export type FAQ = { locale: Locale; sourcePointer: string; question: string | null; answer: string | null }
export type AssetReference = { category: string; legacyId: string; url: string }
export type Candidate = {
  stableKey: string; gameKey: string; family: string; legacyId: string; sourcePath: string;
  mappingLevel: 'common-fields' | 'identity-only' | 'structured-fields'; translations: Translation[];
  faqs?: FAQ[]; assetReference?: AssetReference | null;
  origin?: { symbol: string; kind: 'record' | 'section' };
  routeCandidates: { locale: Locale; path: string; owner: string; indexable: false }[];
  rawRecord: string; reviewText: string; unmappedFields: string[]; hold: true;
  mapperVersion: string; policyDigest: string; revisionKey: string
}
export type MappedSource = {
  sourcePath: string; gameKey: string; sourceSnapshotKey: string;
  state: 'mapped' | 'deferred' | 'context'; reason: string | null; records: Candidate[]
  units?: { name: string; line: number; state: 'rows' | 'section' | 'reader-code'; records: number }[]
}
export type RecordBatch = { mapperVersion: string; policyDigest: string; batchKey: string; sources: MappedSource[] }

const ID_FAMILIES = new Set(['artifacts', 'character-summaries', 'characters', 'guides', 'materials', 'regions', 'weapons', 'light-cones', 'relics', 'echoes', 'anomalies', 'disk-sets', 'drive-discs', 'astral-ops', 'stigma-sets', 'gear-sets'])
export function canonical(value: unknown): string {
  const sort = (input: unknown): unknown => Array.isArray(input) ? input.map(sort) : input && typeof input === 'object' ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort((input as Row)[key])])) : input
  return JSON.stringify(sort(value))
}
const rowObject = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value)
function requiredID(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`Invalid identity: ${label}`)
  return value
}
function text(row: Row, field: string) {
  const value = row[field]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new Error(`Expected text: ${field}`)
  return value
}

export function mapFAQ(value: unknown, mode: 'legacy' | 'zh', pointer: string): FAQ[] {
  if (!Array.isArray(value)) throw new Error('Expected FAQ array')
  return value.flatMap((row, index) => {
    if (!rowObject(row)) throw new Error('Expected FAQ object')
    const allowed = mode === 'zh' ? ['question', 'answer'] : ['question', 'answer', 'questionZh', 'answerZh', 'questionJa', 'answerJa']
    if (Object.keys(row).some(key => !allowed.includes(key))) throw new Error('Unmapped FAQ field; explicit adapter required')
    return (mode === 'zh' ? ['zh'] as const : LOCALES).flatMap(locale => {
      // Legacy FAQ uses unsuffixed English, unlike the surrounding guide's Chinese fields.
      const suffix = mode === 'zh' || locale === 'en' ? '' : locale === 'zh' ? 'Zh' : 'Ja'
      const question = text(row, `question${suffix}`), answer = text(row, `answer${suffix}`)
      return question === null && answer === null ? [] : [{ locale, sourcePointer: `${pointer}/${index}`, question, answer }]
    })
  })
}

type CandidateInput = {
  family: string; legacyId: string; parts?: unknown[]; raw: Row; consumed?: string[];
  translations?: Translation[]; faqs?: FAQ[]; assetReference?: AssetReference;
  origin?: Candidate['origin']; detailRoute?: boolean;
}
function candidateFor(source: SourceSnapshot, policy: MappingPolicy, input: CandidateInput): Candidate {
  requiredID(input.legacyId, source.sourcePath)
  const translations = input.translations ?? []
  const routes = input.detailRoute && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.legacyId) ? LOCALES.map(locale => {
    const contract = policy.routes.games[source.gameKey]
    const dedicated = contract?.locales.includes(locale) && contract.details.includes(input.family)
    return { locale, path: `/${locale}/${source.gameKey}/${input.family}/${input.legacyId}`, owner: dedicated ? source.gameKey : 'main', indexable: false as const }
  }) : []
  const data = {
    stableKey: `${source.gameKey}/${input.family}/${encodeURIComponent(canonical(input.parts ?? [input.legacyId]))}`,
    gameKey: source.gameKey, family: input.family, legacyId: input.legacyId, sourcePath: source.sourcePath,
    mappingLevel: translations.length ? 'common-fields' as const : input.faqs || input.assetReference ? 'structured-fields' as const : 'identity-only' as const,
    translations, faqs: input.faqs ?? [], assetReference: input.assetReference ?? null,
    ...(input.origin ? { origin: input.origin } : {}), routeCandidates: routes,
    rawRecord: canonical(input.raw), reviewText: canonical({ contentReview: input.raw.contentReview ?? null, sourceReview: input.raw.sourceReview ?? null, source: input.raw.source ?? null }),
    unmappedFields: Object.keys(input.raw).filter(key => !input.consumed?.includes(key)).sort(), hold: true as const,
    mapperVersion: MAPPER_VERSION, policyDigest: policy.digest,
  }
  return { ...data, revisionKey: digest(canonical(data)) }
}

function inlineRecords(source: SourceSnapshot, policy: MappingPolicy) {
  if (source.sourcePath !== `apps/game-${source.gameKey}/lib/data.ts` || !INLINE_CONTRACT[source.gameKey]) throw new Error('Unknown inline source contract')
  const module = literalModule(source.rawText, source.sourcePath)
  const rules = INLINE_CONTRACT[source.gameKey]
  const records: Candidate[] = []
  const units: NonNullable<MappedSource['units']> = []
  for (const unit of module.units) {
    const rule = rules[unit.name]
    if (unit.kind !== 'constant' || rule?.mode === 'reader') {
      if (rule && rule.mode !== 'reader') throw new Error(`Data export became code: ${unit.name}`)
      units.push({ name: unit.name, line: unit.line, state: 'reader-code', records: 0 })
      continue
    }
    if (!rule) throw new Error(`Unclassified inline export: ${source.gameKey}.${unit.name}`)
    const value = module.read(unit.name)
    const origin = { symbol: unit.name, kind: rule.mode === 'rows' ? 'record' as const : 'section' as const }
    if (rule.mode === 'section') {
      records.push(candidateFor(source, policy, { family: 'inline-section', legacyId: unit.name, raw: { value }, origin, ...(rule.faq ? { faqs: mapFAQ(value, rule.faq, unit.name), consumed: ['value'] } : {}) }))
      units.push({ name: unit.name, line: unit.line, state: 'section', records: 1 })
      continue
    }
    if (!Array.isArray(value)) throw new Error(`Expected inline array: ${unit.name}`)
    for (const row of value) {
      if (!rowObject(row)) throw new Error(`Expected inline record: ${unit.name}`)
      const id = requiredID(row[rule.id!], unit.name)
      const field = (name: string | undefined, locale: Locale) => {
        if (!name) return null
        if (!rule.localized) return locale === 'zh' ? text(row, name) : null
        if (row[name] === undefined || row[name] === null) return null
        if (!rowObject(row[name]) || Object.keys(row[name]).some(key => !LOCALES.includes(key as Locale))) throw new Error(`Invalid localized field: ${unit.name}.${name}`)
        return text(row[name], locale)
      }
      records.push(candidateFor(source, policy, {
        family: rule.family ?? `inline-${unit.name}`, legacyId: id, raw: row, origin,
        consumed: [rule.id!, ...[rule.title, rule.body, rule.summary].filter((key): key is string => Boolean(key))],
        translations: LOCALES.map(locale => ({ locale, title: field(rule.title, locale), body: field(rule.body, locale), summary: field(rule.summary, locale) })),
        detailRoute: rule.family === 'guides' || rule.family === 'characters',
      }))
    }
    units.push({ name: unit.name, line: unit.line, state: 'rows', records: value.length })
  }
  // Known data disappearing is an adapter review, not an implicit wholesale withdrawal.
  for (const [name, rule] of Object.entries(rules)) if (rule.mode !== 'reader' && !module.units.some(unit => unit.name === name)) throw new Error(`Missing inline export: ${name}`)
  return { records, units }
}

export function mapSource(source: SourceSnapshot, policy: MappingPolicy): MappedSource {
  if (source.sourceDigest !== digest(source.rawText) || source.snapshotKey !== digest(`${source.sourcePath}\0${source.sourceDigest}`)) throw new Error('Source integrity failure')
  const base = { sourcePath: source.sourcePath, gameKey: source.gameKey, sourceSnapshotKey: source.snapshotKey, records: [] as Candidate[] }
  if (source.sourceKind === 'registry' || source.sourceKind === 'review-contract') return { ...base, state: 'context', reason: 'Context preserved in batch source snapshot; not an editorial record.' }
  if (source.sourceKind === 'inline-code') {
    const mapped = inlineRecords(source, policy)
    if (new Set(mapped.records.map(record => record.stableKey)).size !== mapped.records.length) throw new Error('Duplicate inline identity')
    return { ...base, ...mapped, state: 'mapped', reason: null }
  }
  const match = source.sourcePath.match(/\/raw-([a-z-]+)\.json$/)
  const family = match?.[1] ?? ''
  if (source.gameKey === 'nte' && ['gacha-system', 'image-sources'].includes(family)) {
    const value: unknown = JSON.parse(source.rawText)
    if (!rowObject(value)) throw new Error('Expected singleton object')
    const records: Candidate[] = []
    if (family === 'gacha-system') {
      if (Object.keys(value).some(key => !['banners', 'faqs'].includes(key)) || !Array.isArray(value.banners)) throw new Error('Unknown gacha structure')
      for (const row of value.banners) {
        if (!rowObject(row)) throw new Error('Expected banner')
        records.push(candidateFor(source, policy, { family: 'gacha-banners', legacyId: requiredID(row.id, 'banner'), raw: row, consumed: ['id', 'nameZh', 'nameEn', 'nameJa', 'descZh', 'descEn', 'descJa'], translations: LOCALES.map(locale => { const suffix = locale === 'zh' ? 'Zh' : locale === 'en' ? 'En' : 'Ja'; return { locale, title: text(row, `name${suffix}`), body: text(row, `desc${suffix}`), summary: null } }) }))
      }
      records.push(candidateFor(source, policy, { family: 'gacha-faq', legacyId: 'faqs', raw: { faqs: value.faqs }, consumed: ['faqs'], faqs: mapFAQ(value.faqs, 'legacy', 'faqs'), origin: { symbol: 'faqs', kind: 'section' } }))
    } else {
      if (Object.keys(value).some(key => !['_comment', 'characters', 'weapons', 'vehicles'].includes(key))) throw new Error('Unknown asset category')
      if (value._comment !== undefined && typeof value._comment !== 'string') throw new Error('Invalid asset comment')
      for (const category of ['characters', 'weapons', 'vehicles']) {
        const entries = value[category]
        if (!rowObject(entries)) throw new Error(`Expected asset map: ${category}`)
        for (const [id, url] of Object.entries(entries)) {
          requiredID(id, category)
          if (typeof url !== 'string') throw new Error('Expected asset URL string')
          if (url && !/^https?:\/\//.test(url)) throw new Error('Unsupported asset URL protocol')
          if (url) { const parsed = new URL(url); if (!parsed.hostname || parsed.username || parsed.password) throw new Error('Invalid asset URL') }
          records.push(candidateFor(source, policy, { family: 'asset-references', legacyId: id, parts: [category, id], raw: { category, legacyId: id, url }, consumed: ['category', 'legacyId', 'url'], assetReference: { category, legacyId: id, url } }))
        }
      }
      records.push(candidateFor(source, policy, { family: 'asset-reference-context', legacyId: 'metadata', raw: { comment: value._comment ?? null, categories: ['characters', 'weapons', 'vehicles'] } }))
    }
    if (new Set(records.map(record => record.stableKey)).size !== records.length) throw new Error('Duplicate singleton identity')
    return { ...base, records, state: 'mapped', reason: null }
  }
  const supported = ID_FAMILIES.has(family) || ['character-materials', 'builds', 'redeem-codes'].includes(family)
  if (!supported) return { ...base, state: 'deferred', reason: `No approved identity adapter for ${family || source.sourcePath}` }
  const input: unknown = JSON.parse(source.rawText)
  if (!Array.isArray(input)) throw new Error(`Expected an array: ${source.sourcePath}`)
  const seen = new Set<string>()
  const records = input.map((value): Candidate => {
    if (!rowObject(value)) throw new Error(`Expected a record: ${source.sourcePath}`)
    const identityField = ['character-materials', 'builds'].includes(family) ? 'characterId' : family === 'redeem-codes' ? 'code' : 'id'
    const legacyId = requiredID(value[identityField], `${source.sourcePath}:${identityField}`)
    const parts = family === 'redeem-codes' ? [legacyId, text(value, 'region')] : [legacyId]
    const stableKey = `${source.gameKey}/${family}/${encodeURIComponent(canonical(parts))}`
    if (seen.has(stableKey)) throw new Error(`Duplicate identity: ${stableKey}`)
    seen.add(stableKey)
    // Roco international character entries are correction records, not an asserted roster.
    const common = family === 'guides' || (family === 'characters' && source.gameKey !== 'roco')
    const consumed = new Set([identityField, ...(family === 'redeem-codes' ? ['region'] : [])])
    const translations: Translation[] = common ? LOCALES.map(locale => {
      const suffix = locale === 'zh' ? '' : locale === 'en' ? 'En' : 'Ja'
      const titleField = `${family === 'guides' ? 'title' : 'name'}${suffix}`
      const bodyField = `${family === 'guides' ? 'content' : 'description'}${suffix}`
      const summaryField = `summary${suffix}`
      consumed.add(titleField); consumed.add(bodyField)
      if (family === 'guides') consumed.add(summaryField)
      return { locale, title: text(value, titleField), body: text(value, bodyField), summary: family === 'guides' ? text(value, summaryField) : null }
    }) : []
    const faqs = family === 'guides' && value.faq !== undefined ? mapFAQ(value.faq, 'legacy', 'faq') : []
    if (family === 'guides' && value.faq !== undefined) consumed.add('faq')
    return candidateFor(source, policy, { family, legacyId, parts, raw: value, translations, consumed: [...consumed], ...(faqs.length ? { faqs } : {}), detailRoute: common })
  })
  return { ...base, state: 'mapped', reason: null, records }
}

export function batchManifest(batch: Pick<RecordBatch, 'mapperVersion' | 'policyDigest' | 'sources'>) {
  return { mapperVersion: batch.mapperVersion, policyDigest: batch.policyDigest, sources: batch.sources.map(({ records, ...source }) => ({ ...source, records: records.map(record => ({ stableKey: record.stableKey, revisionKey: record.revisionKey })) })) }
}
export function mapBatch(sources: SourceSnapshot[], policy: MappingPolicy): RecordBatch {
  if (new Set(sources.map(source => source.sourcePath)).size !== sources.length) throw new Error('Duplicate source paths')
  const mapped = sources.map(source => mapSource(source, policy)).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
  for (const source of mapped) source.records.sort((a, b) => a.stableKey.localeCompare(b.stableKey))
  const keys = mapped.flatMap(source => source.records.map(record => record.stableKey))
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate cross-source identity')
  const batch = { mapperVersion: MAPPER_VERSION, policyDigest: policy.digest, sources: mapped }
  return { ...batch, batchKey: digest(canonical(batchManifest(batch))) }
}

export function diffBatches(before: RecordBatch, after: RecordBatch) {
  if (before.mapperVersion !== after.mapperVersion || before.policyDigest !== after.policyDigest) throw new Error('Mapping/policy changed; compare only after explicit re-baselining')
  const changes: { kind: string; sourcePath: string; stableKey?: string; translationReview?: string[] }[] = []
  const next = new Map(after.sources.map(source => [source.sourcePath, source]))
  for (const old of before.sources) {
    const current = next.get(old.sourcePath)
    if (!current || old.state !== 'mapped' || current.state !== 'mapped') {
      if (!current || current.sourceSnapshotKey !== old.sourceSnapshotKey || current.state !== old.state) changes.push({ kind: 'source-review-required', sourcePath: old.sourcePath })
      next.delete(old.sourcePath)
      continue
    }
    // Inline modules also contain imports/helpers/derived readers that are not record projections.
    if ((old.units || current.units) && old.sourceSnapshotKey !== current.sourceSnapshotKey) changes.push({ kind: 'source-review-required', sourcePath: old.sourcePath })
    const records = new Map(current.records.map(record => [record.stableKey, record]))
    for (const prior of old.records) {
      const updated = records.get(prior.stableKey)
      if (!updated) changes.push({ kind: 'withdrawal-review-required', sourcePath: old.sourcePath, stableKey: prior.stableKey })
      else if (updated.revisionKey !== prior.revisionKey) {
        const translationReview = LOCALES.filter(locale => {
          if (locale === 'zh') return false
          const translation = updated.translations.find(item => item.locale === locale)
          const unchangedText = translation && (translation.title?.trim() || translation.body?.trim() || translation.summary?.trim()) && canonical(translation) === canonical(prior.translations.find(item => item.locale === locale))
          const faqs = (updated.faqs ?? []).filter(item => item.locale === locale)
          const unchangedFAQ = faqs.length > 0 && canonical(faqs) === canonical((prior.faqs ?? []).filter(item => item.locale === locale))
          return unchangedText || unchangedFAQ
        })
        changes.push({ kind: 'changed', sourcePath: old.sourcePath, stableKey: prior.stableKey, translationReview })
      }
      records.delete(prior.stableKey)
    }
    for (const record of records.values()) changes.push({ kind: 'added', sourcePath: current.sourcePath, stableKey: record.stableKey })
    next.delete(old.sourcePath)
  }
  for (const source of next.values()) {
    if (source.state === 'mapped') for (const record of source.records) changes.push({ kind: 'added', sourcePath: source.sourcePath, stableKey: record.stableKey })
    else changes.push({ kind: 'source-review-required', sourcePath: source.sourcePath })
  }
  return { changes, automaticallyDeleted: 0, publishable: false }
}
