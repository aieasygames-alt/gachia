import assert from 'node:assert/strict'
import { canonical } from './record-mapping'

// A JSON request cannot manufacture this process-local capability. Only the
// installed maintenance transaction receives one after opening published proof.
const authority = Symbol('published editing-source transaction')
export const isPublishedEditingOperation = (context: any) => Boolean(context?.[authority])
const fields = ['stableKey', 'game', 'kind', 'legacyId', 'legacyPath', 'bodyFormat', 'sourceRecord',
  'structuredValue', 'reviewEvidence', 'hold', '_status'] as const
export const editingProjection = (row: any) => Object.fromEntries(fields.map(key => [key,
  key === 'game' && typeof row[key] === 'object' ? row[key]?.id : row[key]]))

export function publishedEditingContext(before: any, after: any) {
  return { [authority]: { before: before && { id: before.id, updatedAt: before.updatedAt, ...editingProjection(before) }, after: editingProjection(after) } }
}

export function guardPublishedEditingWrite(next: any, original: any, context: any) {
  const beforeBaseline = original?.reviewEvidence?.publishedBaseline
  const afterBaseline = next.reviewEvidence?.publishedBaseline
  const grant = context?.[authority]
  if (!grant) {
    assert.equal(canonical(afterBaseline ?? null), canonical(beforeBaseline ?? null), 'Published editing baseline is maintenance-only')
    return false
  }
  assert.equal(canonical(grant.before), canonical(original?.id != null ? { id: original.id, updatedAt: original.updatedAt, ...editingProjection(original) } : null), 'Editing-source pre-state changed')
  assert.equal(canonical(editingProjection(next)), canonical(grant.after), 'Editing-source write differs from verified publication')
  return true
}
