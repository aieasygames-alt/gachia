import { isDeepStrictEqual } from 'node:util'
import { digest, MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { canonical } from './record-mapping'

export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue }
export type Locator = { symbol?: string; identity?: Record<string, string> }
export type UnifiedSource = {
  unifiedContent: 1; game: string; family: string; sourcePath: string; sourceSHA256: string;
  locator: Locator; original: JSONValue; originalSHA256: string;
}
export type UnifiedRecord = {
  stableKey: string; kind: string; legacyId: string; legacyPath: string; sourceRecord: UnifiedSource;
  structuredValue: JSONValue; hold?: boolean | null; _status?: 'draft' | 'published' | null;
  reviewEvidence?: JSONValue;
}

export const objectValue = (value: unknown): value is Record<string, JSONValue> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const forbidden = new Set(['__proto__', 'prototype', 'constructor'])
const identityFields = new Set(['id', 'slug', 'code', 'characterId', 'gameId', 'region', 'cmsOrigin'])
const protectedField = (key: string) => identityFields.has(key)
  || /^(?:source|contentReview|review|evidence|rights|license|hold|publish|indexable|verified|_comment)/i.test(key)
  || /^(?:image|icon|portrait|splash|thumbnail|avatar|media|asset|logo|url)(?:$|[A-Z_])/.test(key)

// Uses the same field policy as validation; nulls and empty containers need a structural contract.
export function structuredEditableLeaves(value: JSONValue): { pointer: string; value: string | number | boolean }[] {
  assertJSON(value)
  const leaves: { pointer: string; value: string | number | boolean }[] = []
  const visit = (node: JSONValue, pointer: string) => {
    if (node === null) return
    if (Array.isArray(node)) node.forEach((child, index) => visit(child, `${pointer}/${index}`))
    else if (objectValue(node)) {
      for (const [key, child] of Object.entries(node)) if (!protectedField(key)) {
        visit(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`)
      }
    } else leaves.push({ pointer, value: node })
  }
  visit(value, '')
  return leaves
}

export function assertJSON(value: unknown): asserts value is JSONValue {
  let nodes = 0
  const visit = (node: unknown, depth: number) => {
    if (++nodes > 100000 || depth > 64) throw new Error('Content structure budget exceeded')
    if (node === null || typeof node === 'boolean' || typeof node === 'string') return
    if (typeof node === 'number' && Number.isFinite(node)) return
    if (Array.isArray(node)) { for (const item of node) visit(item, depth + 1); return }
    if (!objectValue(node) || ![Object.prototype, null].includes(Object.getPrototypeOf(node))) throw new Error('Expected JSON content')
    for (const [key, child] of Object.entries(node)) {
      if (forbidden.has(key)) throw new Error('Unsafe content property')
      visit(child, depth + 1)
    }
  }
  visit(value, 0)
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_SNAPSHOT_BYTES) throw new Error('Content byte budget exceeded')
}

export function unifiedKey(source: Pick<UnifiedSource, 'game' | 'sourcePath' | 'locator'>) {
  return `unified:${source.game}:${digest(canonical({ path: source.sourcePath, locator: source.locator }))}`
}

export function assertUnifiedSource(value: unknown): asserts value is UnifiedSource {
  assertJSON(value)
  if (!objectValue(value) || value.unifiedContent !== 1
    || !isDeepStrictEqual(Object.keys(value).sort(), ['unifiedContent', 'game', 'family', 'sourcePath', 'sourceSHA256', 'locator', 'original', 'originalSHA256'].sort())
    || typeof value.game !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.game)
    || typeof value.family !== 'string' || !/^[a-zA-Z0-9-]+$/.test(value.family)
    || typeof value.sourcePath !== 'string' || !new RegExp(`^(?:packages/data/games/${value.game}/[a-zA-Z0-9-]+\\.(?:json|ts)|apps/game-${value.game}/lib/data\\.ts)$`).test(value.sourcePath)
    || typeof value.sourceSHA256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sourceSHA256)
    || value.originalSHA256 !== digest(canonical(value.original)) || !objectValue(value.locator)) throw new Error('Invalid unified content provenance')
  const locator = value.locator
  if (Object.keys(locator).some(key => !['symbol', 'identity'].includes(key))
    || (locator.symbol !== undefined && (typeof locator.symbol !== 'string' || !/^[a-zA-Z_$][\w$]*$/.test(locator.symbol)))
    || (value.sourcePath.endsWith('.ts') !== (typeof locator.symbol === 'string'))) throw new Error('Invalid source locator')
  if (locator.identity !== undefined) {
    if (!objectValue(locator.identity) || !Object.keys(locator.identity).length || Object.entries(locator.identity).some(([key, item]) =>
      !identityFields.has(key) || typeof item !== 'string' || !item || item.length > 256)) throw new Error('Invalid record identity')
    const original = value.original
    if (!objectValue(original) || Object.entries(locator.identity).some(([key, item]) => original[key] !== item)) throw new Error('Source identity mismatch')
  }
}

export function isUnifiedRecord(value: unknown) {
  return objectValue(value) && (typeof value.stableKey === 'string' && value.stableKey.startsWith('unified:')
    || objectValue(value.sourceRecord) && value.sourceRecord.unifiedContent === 1)
}

// This first contract edits existing leaves only. Structural changes and media approvals need explicit contracts.
export function assertStructuredEdit(original: JSONValue, edited: unknown, pointer = ''): asserts edited is JSONValue {
  assertJSON(edited)
  const compare = (before: JSONValue, after: JSONValue, path: string) => {
    if (isDeepStrictEqual(before, after)) return
    if (before === null || after === null || typeof before !== typeof after || Array.isArray(before) !== Array.isArray(after)) throw new Error(`Content type changed: ${path}`)
    if (Array.isArray(before)) {
      if (!Array.isArray(after) || before.length !== after.length) throw new Error(`Array membership changed: ${path}`)
      before.forEach((item, index) => compare(item, after[index], `${path}/${index}`))
    } else if (objectValue(before)) {
      if (!objectValue(after) || !isDeepStrictEqual(Object.keys(before).sort(), Object.keys(after).sort())) throw new Error(`Content fields changed: ${path}`)
      for (const [key, item] of Object.entries(before)) {
        const next = `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
        if (protectedField(key) && !isDeepStrictEqual(item, after[key])) throw new Error(`Protected source, identity or media field: ${next}`)
        compare(item, after[key], next)
      }
    } else if (typeof after === 'string' && (after.includes('<') || /(?:javascript|vbscript|data)\s*:/i.test(after) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(after))) {
      throw new Error(`Unsafe edited text: ${path}`)
    }
  }
  compare(original, edited, pointer)
}

export function validateUnifiedRecord(record: Record<string, unknown>, original?: Record<string, unknown>) {
  assertUnifiedSource(record.sourceRecord)
  const source = editingSource(record)
  if (record.stableKey !== unifiedKey(source) || record.kind !== source.family || record.legacyPath !== source.sourcePath
    || record.legacyId !== (source.locator.identity ? canonical(source.locator.identity) : source.locator.symbol ?? source.family)) throw new Error('Unified record identity mismatch')
  if (original) for (const key of ['stableKey', 'kind', 'legacyId', 'legacyPath', 'sourceRecord', 'game', 'bodyFormat']) {
    const id = (value: unknown) => key === 'game' && objectValue(value) ? value.id : value
    if (!isDeepStrictEqual(id(record[key]), id(original[key]))) throw new Error(`Immutable unified identity: ${key}`)
  }
  if (original && canonical((record.reviewEvidence as any)?.publishedBaseline ?? null) !== canonical((original.reviewEvidence as any)?.publishedBaseline ?? null)) throw new Error('Published editing baseline is maintenance-only')
  const emptyLocalized = (value: unknown) => value == null || objectValue(value)
    && Object.keys(value).every(key => ['zh', 'en', 'ja'].includes(key)) && Object.values(value).every(item => item == null)
  if (record.bodyFormat !== 'plain' || !emptyLocalized(record.title) || !emptyLocalized(record.body)) throw new Error('Unified content must use the structured editor, not localized guide fields')
  assertStructuredEdit(source.original, record.structuredValue)
}

// Retain the real import O in sourceRecord. A separately controlled, published
// baseline supplies the canonical editing identity and structural reference A.
export function editingSource(record: { sourceRecord?: unknown; reviewEvidence?: unknown }): UnifiedSource {
  assertUnifiedSource(record.sourceRecord)
  const imported = record.sourceRecord, raw = (record.reviewEvidence as any)?.publishedBaseline
  if (raw == null) return imported
  assertJSON(raw)
  if (!objectValue(raw)) throw new Error('Invalid published editing baseline')
  const baseline = raw as Record<string, any>
  const genshin = baseline.kind === 'genshin-published-editing-baseline-v1' && imported.game === 'genshin'
    && ['materials', 'characters', 'character-materials'].includes(imported.family)
    && imported.sourcePath === `packages/data/games/genshin/raw-${imported.family}.json`
  const azur = baseline.kind === 'azur-published-guide-editing-baseline-v1' && imported.game === 'azur-promilia'
    && imported.family === 'inline-guides' && imported.sourcePath === 'apps/game-azur-promilia/lib/data.ts'
    && imported.locator.symbol === 'guides'
  if ((!genshin && !azur) || baseline.importOriginalSHA256 !== imported.originalSHA256
    || !/^[a-f0-9]{64}$/.test(baseline.syncKey) || !/^[a-f0-9]{64}$/.test(baseline.exportKey)
    || !/^[a-f0-9]{64}$/.test(baseline.sourceIndex?.pin) || typeof baseline.sourceIndex?.path !== 'string'
    || !baseline.sourceIndex.path.startsWith('/') || typeof baseline.versionId !== 'string') throw new Error('Invalid published editing baseline')
  assertUnifiedSource(baseline.source)
  const source = baseline.source
  if (source.game !== imported.game || source.family !== imported.family || source.sourcePath !== imported.sourcePath) throw new Error('Published editing scope mismatch')
  if (!isDeepStrictEqual(source.locator, imported.locator)) {
    if (azur) throw new Error('Unapproved published identity migration')
    const from = imported.locator.identity?.characterId, to = source.locator.identity?.characterId
    if (source.family !== 'character-materials' || !((from === 'sara' && to === 'kujou-sara') || (from === 'shinobu' && to === 'kuki-shinobu'))) throw new Error('Unapproved published identity migration')
  }
  return source
}

export function contentUnit(source: Omit<UnifiedSource, 'unifiedContent' | 'originalSHA256'>): UnifiedRecord {
  const sourceRecord: UnifiedSource = { unifiedContent: 1, ...source, originalSHA256: digest(canonical(source.original)) }
  assertUnifiedSource(sourceRecord)
  return { stableKey: unifiedKey(sourceRecord), kind: source.family,
    legacyId: source.locator.identity ? canonical(source.locator.identity) : source.locator.symbol ?? source.family,
    legacyPath: source.sourcePath, sourceRecord, structuredValue: structuredClone(source.original), hold: true, _status: 'draft' }
}

const missing = Symbol('missing')
type MergeValue = JSONValue | typeof missing
export function mergePublishedContent(original: JSONValue, active: JSONValue, edited: JSONValue): JSONValue {
  const merge = (o: MergeValue, a: MergeValue, b: MergeValue, pointer: string): MergeValue => {
    if (isDeepStrictEqual(o, b) || isDeepStrictEqual(a, b)) return a
    if (isDeepStrictEqual(o, a)) return b
    if (o !== missing && a !== missing && b !== missing && objectValue(o) && objectValue(a) && objectValue(b)) {
      const result: Record<string, JSONValue> = {}
      for (const key of new Set([...Object.keys(o), ...Object.keys(a), ...Object.keys(b)])) {
        const value = merge(Object.hasOwn(o, key) ? o[key] : missing, Object.hasOwn(a, key) ? a[key] : missing,
          Object.hasOwn(b, key) ? b[key] : missing, `${pointer}/${key}`)
        if (value !== missing) result[key] = value
      }
      return result
    }
    // Lists are atomic: index-wise merging can silently combine unrelated entries after a reorder.
    throw new Error(`Public/editorial conflict requires rebase: ${pointer || '/'}`)
  }
  const value = merge(original, active, edited, '')
  if (value === missing) throw new Error('Implicit content withdrawal rejected')
  return structuredClone(value)
}
