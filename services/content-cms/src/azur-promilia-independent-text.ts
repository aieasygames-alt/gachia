import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { assertStructuredEdit, objectValue, type JSONValue } from './unified-content'
import type { SourceBytes } from './unified-export'
import { locateValue, readSourceValue, replaceSourceSymbol } from './unified-sources'
import { escapeCharacterText } from './unified-character-text'

export const AZUR_PROMILIA_GUIDE_SOURCE = 'apps/game-azur-promilia/lib/data.ts'
export const AZUR_PROMILIA_GUIDE_ID = 'kibo-battle-and-ecology'

type Locale = 'zh' | 'en' | 'ja'
type TextField = { pointer: `/content/${Locale}`; value: string; locales: [Locale] }
const locales: Locale[] = ['zh', 'en', 'ja']
type Change = { game: 'azur-promilia'; id: string; sourcePath: string; activeSHA256: string; candidateSHA256: string; fields: TextField[] }
export type AzurPromiliaTextContract = {
  policy: 'azur-promilia-existing-guide-text-v1'
  changes: Change[]
  expectations: { owner: 'azur-promilia'; path: string; status: 200; contains: string[] }[]
  productionReady: false
}

function rows(source: SourceBytes) {
  const value = readSourceValue(source.text, source.sourcePath, { symbol: 'guides' })
  assert(Array.isArray(value), 'Azur guides source must remain an array')
  return value
}

function field(value: JSONValue, pointer: TextField['pointer']) {
  const locale = pointer.slice('/content/'.length) as Locale
  assert(locales.includes(locale), 'Unsupported Azur guide locale')
  assert(objectValue(value) && objectValue(value.content) && typeof value.content[locale] === 'string', `Azur guide content.${locale} is required`)
  return value.content[locale] as string
}

function contract(changes: Change[]): AzurPromiliaTextContract {
  return {
    policy: 'azur-promilia-existing-guide-text-v1',
    changes,
    expectations: changes.flatMap(change => change.fields.map(item => ({
      owner: 'azur-promilia' as const,
      path: `/${item.locales[0]}/azur-promilia/guides/${change.id}`,
      status: 200 as const,
      contains: [escapeCharacterText(item.value)],
    }))),
    productionReady: false,
  }
}

export function azurPromiliaGuideContract(active: SourceBytes[], overlays: SourceBytes[]): AzurPromiliaTextContract {
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length, 'Duplicate Azur overlay')
  const sourcePath = AZUR_PROMILIA_GUIDE_SOURCE
  const candidate = overlays.find(row => row.sourcePath === sourcePath)
  for (const row of overlays) {
    assert.equal(digest(row.text), row.sha256, 'Corrupt Azur overlay')
    assert.equal(active.filter(source => source.sourcePath === row.sourcePath).length, 1, 'Unregistered or duplicate Azur baseline')
  }
  const changedSources = overlays.filter(row => row.sha256 !== active.find(item => item.sourcePath === row.sourcePath)?.sha256)
  assert.deepEqual(changedSources.map(row => row.sourcePath), [sourcePath], 'Only the Azur guide source may change')
  assert(candidate, 'Azur guide source is missing')
  const baseline = active.filter(row => row.sourcePath === sourcePath)
  assert.equal(baseline.length, 1, 'Azur guide baseline must be unique')
  assert.equal(digest(baseline[0].text), baseline[0].sha256, 'Corrupt Azur baseline')
  const before = rows(baseline[0]), after = rows(candidate)
  const ids = (values: JSONValue[]) => values.map(value => {
    assert(objectValue(value) && typeof value.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id), 'Invalid Azur guide identity')
    return value.id
  })
  const oldIds = ids(before)
  assert.equal(new Set(oldIds).size, oldIds.length, 'Duplicate Azur guide identity')
  assert.deepEqual(ids(after), oldIds, 'Azur guide membership/order changed; lifecycle contract required')
  // Preserve all imports, other literals and executable readers around guides.
  assert.equal(replaceSourceSymbol(candidate.text, sourcePath, 'guides', []),
    replaceSourceSymbol(baseline[0].text, sourcePath, 'guides', []), 'Non-guide Azur source changed')
  const changes: Change[] = []
  for (const [index, previousRecord] of before.entries()) {
    const editedRecord = after[index]
    if (isDeepStrictEqual(previousRecord, editedRecord)) continue
    assertStructuredEdit(previousRecord, editedRecord)
    assert(objectValue(previousRecord) && objectValue(editedRecord), 'Azur guide must remain an object')
    assert(objectValue(previousRecord.content) && objectValue(editedRecord.content), 'Azur guide content is required')
    const previousContent = previousRecord.content, editedContent = editedRecord.content
    const changedLocales = locales.filter(locale => previousContent[locale] !== editedContent[locale])
    assert.equal(changedLocales.length, 1, 'One existing Azur guide body locale per release')
    const locale = changedLocales[0], pointer = `/content/${locale}` as const
    const previous = field(previousRecord, pointer), edited = field(editedRecord, pointer)
    assert(edited.trim() && edited.length <= 32768 && edited !== previous, 'Azur guide requires a bounded nonempty text edit')
    const unchanged = structuredClone(editedRecord)
    assert(objectValue(unchanged.content)); unchanged.content[locale] = previous
    assert.deepEqual(unchanged, previousRecord, 'Only one existing Azur guide body is production-qualified')
    changes.push({ game: 'azur-promilia', id: oldIds[index], sourcePath,
      activeSHA256: baseline[0].sha256, candidateSHA256: candidate.sha256,
      fields: [{ pointer, value: edited, locales: [locale] }] })
  }
  assert.equal(changes.length, 1, 'One existing Azur guide per release')
  return contract(changes)
}

export function azurPromiliaGuidePairContract(active: SourceBytes[], overlays: SourceBytes[]) {
  const candidate = azurPromiliaGuideContract(active, overlays)
  const baseline = active.find(row => row.sourcePath === AZUR_PROMILIA_GUIDE_SOURCE)!
  const selected = candidate.changes[0].fields[0]
  const old = field(locateValue(readSourceValue(baseline.text, AZUR_PROMILIA_GUIDE_SOURCE, { symbol: 'guides' }), { identity: { id: candidate.changes[0].id } }), selected.pointer)
  const recovery = contract(candidate.changes.map(change => ({ ...change, activeSHA256: change.candidateSHA256, candidateSHA256: change.activeSHA256,
    fields: [{ pointer: selected.pointer, value: old, locales: selected.locales }] })))
  assert(isDeepStrictEqual(recovery.changes[0].fields[0].value, old))
  return { policy: 'azur-promilia-existing-guide-text-pair-v1' as const, candidate, recovery, productionReady: false as const }
}

export function isAzurPromiliaGuideSource(sourcePath: string) {
  return sourcePath === AZUR_PROMILIA_GUIDE_SOURCE
}

