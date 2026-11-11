import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { assertStructuredEdit, objectValue, structuredEditableLeaves, type JSONValue } from './unified-content'
import type { SourceBytes } from './unified-export'
import { readSourceValue } from './unified-sources'

export const DEDICATED_CHARACTER_TEXT_SOURCES = Object.freeze({
  genshin: 'packages/data/games/genshin/raw-characters.json',
  nte: 'packages/data/games/nte/raw-characters.json',
  'azur-promilia': 'packages/data/games/azur-promilia/raw-characters.json',
  lvmeng: 'apps/game-lvmeng/lib/data.ts',
})
export type CharacterTextGame = keyof typeof DEDICATED_CHARACTER_TEXT_SOURCES
type Locale = 'zh' | 'en' | 'ja'
type TextField = { pointer: string; value: string; locales: Locale[] }
export type CharacterTextExpectation = { owner: string; path: string; status: number; contains?: string[] }

function nteTextLocales(pointer: string, row: Record<string, JSONValue>): Locale[] {
  const keys = pointer.slice(1).split('/'), key = keys.at(-1)!
  const parent = keys.slice(0, -1).reduce((node, part) => (node as Record<string, JSONValue>)[part], row as JSONValue) as Record<string, JSONValue>
  if (key.endsWith('En')) return parent[key.slice(0, -2)] == null ? ['zh', 'en', 'ja'] : ['en', 'ja']
  return parent[`${key}En`] == null ? ['zh', 'en', 'ja'] : ['zh']
}

function fieldLocales(game: CharacterTextGame, pointer: string, row: Record<string, JSONValue>): Locale[] {
  if (game === 'lvmeng') return /^\/(?:name|affiliation|note)$/.test(pointer) ? ['zh'] : []
  if (pointer === '/name') return ['zh']
  if (pointer === '/nameEn') {
    const hasJapaneseName = game === 'nte' ? row.nameJa != null : Boolean(row.nameJa)
    return game === 'azur-promilia' || hasJapaneseName ? ['en'] : ['en', 'ja']
  }
  if (pointer === '/nameJa') return game === 'nte' ? [] : ['ja']
  if (game === 'azur-promilia') return []
  if (/^\/description(?:En)?$/.test(pointer)) return game === 'nte' ? nteTextLocales(pointer, row) : pointer.endsWith('En') ? ['en', 'ja'] : ['zh']
  if (game === 'genshin' && /^(?:\/skills\/(?:normalAttack|elementalSkill|elementalBurst|passive[124])|\/constellations\/\d+)\/(?:name|description)(?:En)?$/.test(pointer)) {
    return pointer.endsWith('En') ? ['en', 'ja'] : ['zh']
  }
  if (game === 'nte' && /^\/skills\/(?:normalAttack|skill|ultimate|qte|passives\/\d+)\/(?:name|description)(?:En)?$/.test(pointer)) {
    return nteTextLocales(pointer, row)
  }
  return []
}

// Only existing text that the dedicated detail page actually reads is covered.
// Numeric/enumerated/reference fields and NTE's unrendered awakening/resonance remain outside this contract.
export function dedicatedCharacterTextFields(game: CharacterTextGame, value: JSONValue): TextField[] {
  assert(objectValue(value), 'Character text requires an existing object')
  if (game === 'genshin' && value.status === 'upcoming') return []
  return structuredEditableLeaves(value).flatMap(({ pointer, value: text }) => {
    const locales = fieldLocales(game, pointer, value)
    return typeof text === 'string' && locales.length ? [{ pointer, value: text, locales }] : []
  })
}

export function dedicatedCharacterTextContract(active: SourceBytes[], overlays: SourceBytes[]) {
  const changes: { game: CharacterTextGame; id: string; sourcePath: string; activeSHA256: string; candidateSHA256: string; fields: TextField[] }[] = []
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length, 'Duplicate character overlay')
  for (const [key, sourcePath] of Object.entries(DEDICATED_CHARACTER_TEXT_SOURCES)) {
    const game = key as CharacterTextGame, b = overlays.find(row => row.sourcePath === sourcePath)
    if (!b) continue
    const matches = active.filter(row => row.sourcePath === sourcePath), a = matches[0]
    assert(matches.length === 1 && a && digest(a.text) === a.sha256 && digest(b.text) === b.sha256, 'Missing/corrupt character baseline')
    if (a.sha256 === b.sha256) continue
    const locator = game === 'lvmeng' ? { symbol: 'playableCharacters' } : {}
    const before = readSourceValue(a.text, sourcePath, locator), after = readSourceValue(b.text, sourcePath, locator)
    assert(Array.isArray(before) && Array.isArray(after), 'Character source must remain an array')
    const identity = game === 'lvmeng' ? 'slug' : 'id'
    const ids = (rows: JSONValue[]) => rows.map(row => {
      assert(objectValue(row) && typeof row[identity] === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row[identity]), 'Invalid character route identity')
      return row[identity] as string
    })
    const oldIds = ids(before), newIds = ids(after)
    assert.equal(new Set(oldIds).size, oldIds.length, 'Duplicate character identity')
    assert.deepEqual(newIds, oldIds, 'Character membership/order changed; lifecycle contract required')
    for (const [index, previous] of before.entries()) {
      const next: JSONValue = after[index]
      if (isDeepStrictEqual(previous, next)) continue
      assertStructuredEdit(previous, next)
      assert(objectValue(previous) && objectValue(next))
      const allowed = dedicatedCharacterTextFields(game, next), fields: TextField[] = []
      const unchanged: Record<string, JSONValue> = structuredClone(next)
      for (const field of allowed) {
        const keys = field.pointer.slice(1).split('/')
        const at = (row: JSONValue) => keys.reduce((node, key) => (node as Record<string, JSONValue>)[key], row)
        if (isDeepStrictEqual(at(previous), field.value)) continue
        assert(field.value.trim() && field.value.length <= 16384, `Character text must be nonempty and bounded: ${field.pointer}`)
        const parent = keys.slice(0, -1).reduce((node, key) => (node as Record<string, JSONValue>)[key], unchanged as JSONValue) as Record<string, JSONValue>
        parent[keys.at(-1)!] = at(previous)
        fields.push(field)
      }
      assert.deepEqual(unchanged, previous, `Unqualified character field changed: ${game}/${oldIds[index]}`)
      assert(fields.length, 'No rendered character text edit')
      changes.push({ game, id: oldIds[index], sourcePath, activeSHA256: a.sha256, candidateSHA256: b.sha256, fields })
    }
  }
  return characterTextContract(changes)
}

function characterTextContract(changes: { game: CharacterTextGame; id: string; sourcePath: string; activeSHA256: string; candidateSHA256: string; fields: TextField[] }[]) {
  const expectations: Required<CharacterTextExpectation>[] = []
  for (const change of changes) for (const locale of ['zh', 'en', 'ja'] as const) {
    // The reviewed pages render these fields as complete text nodes. Boundaries
    // keep a matching JSON-LD string or an attribute from satisfying acceptance.
    const values = change.fields.filter(field => field.locales.includes(locale)).map(field => `>${escapeCharacterText(field.value)}<`)
    if (values.length) expectations.push({ owner: change.game, path: `/${locale}/${change.game}/characters/${change.id}`,
      status: 200, contains: [...new Set(values)] })
  }
  return { policy: 'dedicated-existing-character-text-v1', changes, expectations, productionReady: false as const }
}

// Recovery is the exact public A, not a new edit from B. Old empty text is
// legitimate even though a new empty editorial value cannot be qualified.
export function dedicatedCharacterTextPairContract(active: SourceBytes[], overlays: SourceBytes[]) {
  const candidate = dedicatedCharacterTextContract(active, overlays)
  const recovery = characterTextContract(candidate.changes.map(change => {
    const source = active.find(row => row.sourcePath === change.sourcePath)!
    const rows = readSourceValue(source.text, source.sourcePath, change.game === 'lvmeng' ? { symbol: 'playableCharacters' } : {})
    assert(Array.isArray(rows))
    const identity = change.game === 'lvmeng' ? 'slug' : 'id'
    const previous = rows.find(row => objectValue(row) && row[identity] === change.id)
    assert(objectValue(previous), 'Recovery character missing from public A')
    const fields = dedicatedCharacterTextFields(change.game, previous)
    return { ...change, activeSHA256: change.candidateSHA256, candidateSHA256: change.activeSHA256,
      fields: change.fields.map(field => {
        const old = fields.find(row => row.pointer === field.pointer)
        assert(old, 'Recovery text field missing from public A'); return old
      }) }
  }))
  return { policy: 'dedicated-character-text-pair-v1', candidate, recovery, productionReady: false as const }
}

export function escapeCharacterText(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]!)
}

export function mergeCharacterTextExpectations(provided: CharacterTextExpectation[], contract: ReturnType<typeof dedicatedCharacterTextContract>) {
  const result = structuredClone(provided)
  assert.equal(new Set(result.map(row => `${row.owner}:${row.path}`)).size, result.length, 'Duplicate consumer expectation')
  for (const required of contract.expectations) {
    const existing = result.find(row => row.owner === required.owner && row.path === required.path)
    if (existing) {
      assert(existing.status === required.status && Array.isArray(existing.contains), 'Character consumer assertion cannot be replaced')
      existing.contains = [...new Set([...existing.contains, ...required.contains])]
    } else result.push(structuredClone(required))
  }
  return result
}
