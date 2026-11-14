import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { assertStructuredEdit, objectValue, type JSONValue } from './unified-content'
import type { SourceBytes } from './unified-export'
import { locateValue, readSourceValue } from './unified-sources'

export const AZUR_PROMILIA_GUIDE_SOURCE = 'apps/game-azur-promilia/lib/data.ts'
export const AZUR_PROMILIA_GUIDE_ID = 'kibo-battle-and-ecology'
const AZUR_PROMILIA_GUIDE_LOCATOR = { symbol: 'guides', identity: { id: AZUR_PROMILIA_GUIDE_ID } }

type TextField = { pointer: '/content/en'; value: string; locales: ['en'] }
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

function field(value: JSONValue, pointer: '/content/en') {
  assert(objectValue(value) && objectValue(value.content) && typeof value.content.en === 'string', 'Azur guide content.en is required')
  return value.content.en
}

function contract(changes: Change[]): AzurPromiliaTextContract {
  return {
    policy: 'azur-promilia-existing-guide-text-v1',
    changes,
    expectations: changes.flatMap(change => change.fields.map(item => ({
      owner: 'azur-promilia' as const,
      path: `/en/azur-promilia/guides/${change.id}`,
      status: 200 as const,
      contains: [item.value],
    }))),
    productionReady: false,
  }
}

export function azurPromiliaGuideContract(active: SourceBytes[], overlays: SourceBytes[]): AzurPromiliaTextContract {
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length, 'Duplicate Azur overlay')
  const sourcePath = AZUR_PROMILIA_GUIDE_SOURCE
  const candidate = overlays.find(row => row.sourcePath === sourcePath)
  const changedSources = overlays.filter(row => row.sha256 !== active.find(item => item.sourcePath === row.sourcePath)?.sha256)
  assert.deepEqual(changedSources.map(row => row.sourcePath), [sourcePath], 'Only the Azur guide source may change')
  assert(candidate, 'Azur guide source is missing')
  const baseline = active.filter(row => row.sourcePath === sourcePath)
  assert.equal(baseline.length, 1, 'Azur guide baseline must be unique')
  const before = locateValue(readSourceValue(baseline[0].text, sourcePath, { symbol: 'guides' }), { identity: { id: AZUR_PROMILIA_GUIDE_ID } })
  const after = locateValue(readSourceValue(candidate.text, sourcePath, { symbol: 'guides' }), { identity: { id: AZUR_PROMILIA_GUIDE_ID } })
  assert(objectValue(before) && objectValue(after), 'Azur guide must remain an object')
  assertStructuredEdit(before, after)
  const previous = field(before, '/content/en'), edited = field(after, '/content/en')
  const oldLead = 'In Travel Trace, Kibo connect exploration, combat, homestead play, and duels.'
  const newLead = 'In Travel Trace, Kibo connects exploration, combat, homestead play, and duels.'
  assert(previous.startsWith(oldLead), 'Azur guide baseline text changed; explicit rebase required')
  assert(edited.startsWith(newLead) && edited !== previous, 'Azur guide must contain a genuine English text edit')
  const unchanged = structuredClone(after)
  assert(objectValue(unchanged.content))
  unchanged.content.en = previous
  assert.deepEqual(unchanged, before, 'Only Azur guide content.en is production-qualified')
  assert.equal(edited.replace(newLead, oldLead), previous)
  return contract([{ game: 'azur-promilia', id: AZUR_PROMILIA_GUIDE_ID, sourcePath,
    activeSHA256: baseline[0].sha256, candidateSHA256: candidate.sha256,
    fields: [{ pointer: '/content/en', value: edited, locales: ['en'] }] }])
}

export function azurPromiliaGuidePairContract(active: SourceBytes[], overlays: SourceBytes[]) {
  const candidate = azurPromiliaGuideContract(active, overlays)
  const baseline = active.find(row => row.sourcePath === AZUR_PROMILIA_GUIDE_SOURCE)!
  const old = field(locateValue(readSourceValue(baseline.text, AZUR_PROMILIA_GUIDE_SOURCE, { symbol: 'guides' }), { identity: { id: AZUR_PROMILIA_GUIDE_ID } }), '/content/en')
  const recovery = contract(candidate.changes.map(change => ({ ...change, activeSHA256: change.candidateSHA256, candidateSHA256: change.activeSHA256,
    fields: [{ pointer: '/content/en', value: old, locales: ['en'] }] })))
  assert(isDeepStrictEqual(recovery.changes[0].fields[0].value, old))
  return { policy: 'azur-promilia-existing-guide-text-pair-v1' as const, candidate, recovery, productionReady: false as const }
}

export function isAzurPromiliaGuideSource(sourcePath: string) {
  return sourcePath === AZUR_PROMILIA_GUIDE_SOURCE
}

