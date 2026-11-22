import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { assertStructuredEdit, objectValue } from './unified-content'
import { materialConsumerContract, mergeMaterialConsumerExpectations } from './material-consumer-contract'
import { escapeCharacterText } from './unified-character-text'
import type { SourceBytes } from './unified-export'

export const GENSHIN_MATERIAL_TEXT_SOURCE = 'packages/data/games/genshin/raw-materials.json'

// These are existing public display leaves. `source`/`sourceEn` describe how to
// acquire an item; they are not the immutable CMS sourceRecord provenance.
const displayFields = ['name', 'nameEn', 'source', 'sourceEn'] as const
export function genshinMaterialTextPairContract(active: SourceBytes[], overlays: SourceBytes[]) {
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length)
  for (const row of overlays) {
    const baseline = active.find(source => source.sourcePath === row.sourcePath)
    assert(baseline && digest(row.text) === row.sha256 && (row.sourcePath === GENSHIN_MATERIAL_TEXT_SOURCE || row.sha256 === baseline.sha256),
      'Only the Genshin material source may change')
  }
  const a = active.find(row => row.sourcePath === GENSHIN_MATERIAL_TEXT_SOURCE)
  const b = overlays.find(row => row.sourcePath === GENSHIN_MATERIAL_TEXT_SOURCE)
  assert(a && b && digest(a.text) === a.sha256 && digest(b.text) === b.sha256, 'Pinned material A/B required')
  const before = JSON.parse(a.text), after = JSON.parse(b.text)
  assert(Array.isArray(before) && Array.isArray(after), 'Material source must remain an array')
  const ids = (rows: unknown[]) => rows.map(row => {
    assert(objectValue(row) && typeof row.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id), 'Invalid material identity')
    return row.id
  })
  const oldIds = ids(before)
  assert.equal(new Set(oldIds).size, oldIds.length, 'Duplicate material identity')
  assert.deepEqual(ids(after), oldIds, 'Material membership/order changed')
  const changes = before.flatMap((previous, index) => {
    const next = after[index]
    if (isDeepStrictEqual(previous, next)) return []
    assertStructuredEdit(previous, next, '', { game: 'genshin', family: 'materials', sourcePath: GENSHIN_MATERIAL_TEXT_SOURCE })
    assert(objectValue(previous) && objectValue(next))
    const remaining = structuredClone(next), fields: { pointer: string; before: string; value: string }[] = []
    for (const key of displayFields) {
      if (isDeepStrictEqual(previous[key], next[key])) continue
      assert(typeof previous[key] === 'string' && previous[key].trim() && typeof next[key] === 'string' && next[key].trim()
        && next[key].length <= (key.startsWith('name') ? 256 : 16384), 'Existing nonempty bounded material text required')
      remaining[key] = previous[key]
      fields.push({ pointer: '/' + key, before: previous[key], value: next[key] })
    }
    assert.deepEqual(remaining, previous, 'Unqualified material field changed')
    assert.equal(fields.length, 1, 'One existing display leaf per material release')
    return [{ game: 'genshin' as const, id: oldIds[index], sourcePath: a.sourcePath, fields }]
  })
  assert.equal(changes.length, 1, 'One existing Genshin material per release')
  const candidateSources = active.map(row => row.sourcePath === b.sourcePath ? b : row)
  const candidate = materialConsumerContract('genshin', candidateSources), recovery = materialConsumerContract('genshin', active)
  assert(candidate.dependencyClosureComplete && recovery.dependencyClosureComplete, 'Complete Genshin material dependencies required')
  const expectations = (contract: typeof candidate, rows: typeof after) => {
    const result = mergeMaterialConsumerExpectations([], [contract])
    for (const locale of ['zh', 'en', 'ja'] as const) {
      result.find(row => row.path === `/${locale}/genshin/items`)!.contains!.push(
        ...contract.pages.filter(page => page.locale === locale && page.name !== undefined).map(page => `>${escapeCharacterText(page.name!)}<`))
      const row = rows.find(row => row.id === changes[0].id)!
      // Match the current public page's exact acquisition-text fallback, including Japanese.
      const text = locale === 'zh' ? row.source : row.sourceEn || row.source
      assert(typeof text === 'string' && text.trim(), 'Rendered acquisition text required')
      result.find(page => page.path === `/${locale}/genshin/items/${row.id}`)!.contains!.push(`>${escapeCharacterText(text)}<`)
    }
    return result
  }
  return { policy: 'genshin-existing-material-text-pair-v1',
    candidate: { changes, expectations: expectations(candidate, after) },
    recovery: { changes: changes.map(change => ({ ...change, fields: change.fields.map(field => ({ ...field, before: field.value, value: field.before })) })),
      expectations: expectations(recovery, before) } }
}
