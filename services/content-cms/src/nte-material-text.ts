import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { assertStructuredEdit, objectValue } from './unified-content'
import { materialConsumerContract, mergeMaterialConsumerExpectations } from './material-consumer-contract'
import type { SourceBytes } from './unified-export'
import { escapeCharacterText } from './unified-character-text'

export const NTE_MATERIAL_TEXT_SOURCE = 'packages/data/games/nte/raw-materials.json'

// Existing display names only. Source/provenance, media, quantities, categories,
// relationships and membership remain under their separate contracts.
export function nteMaterialTextPairContract(active: SourceBytes[], overlays: SourceBytes[]) {
  assert.equal(new Set(overlays.map(row => row.sourcePath)).size, overlays.length)
  for (const row of overlays) {
    const baseline = active.find(source => source.sourcePath === row.sourcePath)
    assert(baseline && digest(row.text) === row.sha256 && (row.sourcePath === NTE_MATERIAL_TEXT_SOURCE || row.sha256 === baseline.sha256),
      'Only the NTE material source may change')
  }
  const a = active.find(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)
  const b = overlays.find(row => row.sourcePath === NTE_MATERIAL_TEXT_SOURCE)
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
    assertStructuredEdit(previous, next)
    assert(objectValue(previous) && objectValue(next), 'Material records must remain objects')
    const remaining = structuredClone(next), fields: { pointer: string; before: string; value: string }[] = []
    for (const key of ['name', 'nameEn']) {
      if (isDeepStrictEqual(previous[key], next[key])) continue
      assert(typeof previous[key] === 'string' && typeof next[key] === 'string' && next[key].trim()
        && next[key].length <= 256, 'Existing nonempty bounded material name required')
      remaining[key] = previous[key]
      fields.push({ pointer: '/' + key, before: previous[key], value: next[key] })
    }
    assert.deepEqual(remaining, previous, 'Unqualified material field changed')
    assert(fields.length, 'No material display text change')
    return [{ game: 'nte' as const, id: oldIds[index], sourcePath: a.sourcePath, fields }]
  })
  assert.equal(changes.length, 1, 'One existing NTE material per release')
  // Preservation overlays from other games must never contaminate the NTE pair.
  const candidateSources = active.map(row => row.sourcePath === b.sourcePath ? b : row)
  const candidate = materialConsumerContract('nte', candidateSources), recovery = materialConsumerContract('nte', active)
  assert(candidate.dependencyClosureComplete && recovery.dependencyClosureComplete, 'Complete NTE material dependencies required')
  const expectations = (contract: typeof candidate, rows: typeof after) => {
    const result = mergeMaterialConsumerExpectations([], [contract])
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const collection = result.find(row => row.path === `/${locale}/nte/items`)!
      collection.contains!.push(...contract.pages.filter(page => page.locale === locale && page.name !== undefined).map(page => `>${escapeCharacterText(page.name!)}<`))
    }
    // The Chinese detail also renders the existing English alternate name.
    for (const change of changes) if (change.fields.some(field => field.pointer === '/nameEn')) {
      const row = rows.find(row => row.id === change.id)!
      result.find(page => page.path === `/zh/nte/items/${change.id}`)!.contains!.push(`>${escapeCharacterText(row.nameEn)}<`)
    }
    return result
  }
  return { policy: 'nte-existing-material-text-pair-v1',
    candidate: { changes, expectations: expectations(candidate, after) },
    recovery: { changes: changes.map(change => ({ ...change, fields: change.fields.map(field => ({ ...field, before: field.value, value: field.before })) })),
      expectations: expectations(recovery, before) } }
}
