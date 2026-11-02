import { digest } from './legacy-intake'
import { canonical, LOCALES, type Candidate } from './record-mapping'
import type { EditorialDraft } from './payload-types'

import { MATERIAL_PATHS, candidateMaterialCells, materialCells, materialRaw, type MaterialCell } from './material-draft'

export const mergeWriteToken = Object.freeze({})
export const MERGE_FIELDS = [...LOCALES.flatMap(locale => ['title', 'body', 'summary'].map(field => `${locale}.${field}`)), 'faqs', 'assetReference', ...MATERIAL_PATHS.map(field => `material.${field}`)]
export type MergeCell = { field: string; base: string; current: string; incoming: string; status: 'unchanged' | 'editor-only' | 'source-only' | 'converged' | 'conflict'; suggested: 'current' | 'incoming' | null }
export type MergePlan = { version: string; draftID: number; sourceReviewKey: string; targetReviewKey: string; draftFingerprint: string; cells: MergeCell[]; proposalKey: string; reconsideredFrom?: string }

export const reconsiderationToken = Object.freeze({})
export function reconsideredPlan(plan: MergePlan, parentKey?: string | null): MergePlan {
  if (!parentKey) return plan
  const { proposalKey: _key, ...original } = plan
  const data = { ...original, reconsideredFrom: parentKey }
  return { ...data, proposalKey: digest(canonical(data)) }
}

function values(input: Pick<EditorialDraft, 'translations' | 'faqs' | 'assetReference'> | Candidate) {
  const result: Record<string, unknown> = {}
  for (const locale of LOCALES) {
    const row = input.translations?.find(row => row.locale === locale)
    for (const field of ['title', 'body', 'summary'] as const) result[`${locale}.${field}`] = row?.[field] ?? null
  }
  // Legacy FAQ positions are not stable identities. Merge the ordered list as one unit.
  result.faqs = (input.faqs ?? []).map(row => ({ locale: row.locale, question: row.question ?? null, answer: row.answer ?? null }))
  result.assetReference = Object.fromEntries(['category', 'legacyId', 'url'].map(key => [key, input.assetReference?.[key as 'category' | 'legacyId' | 'url'] ?? null]))
  return result
}

export function buildMergePlan(draft: EditorialDraft, base: Candidate, incoming: Candidate, targetReviewKey: string): MergePlan {
  const materialValues = (cells: MaterialCell[]) => Object.fromEntries(cells.map(cell => [`material.${cell.field}`, cell]))
  const material = draft.kind === 'material'
  const left = material ? materialValues(candidateMaterialCells(base)) : values(base)
  const current = material ? materialValues(materialCells(materialRaw(draft.legacyId, draft.materialFields))) : values(draft)
  const right = material ? materialValues(candidateMaterialCells(incoming)) : values(incoming)
  const cells: MergeCell[] = Object.keys(left).map(field => {
    const b = canonical(left[field]), c = canonical(current[field]), n = canonical(right[field])
    const status = c === b && n === b ? 'unchanged' : c === n ? 'converged' : n === b ? 'editor-only' : c === b ? 'source-only' : 'conflict'
    return { field, base: b, current: c, incoming: n, status, suggested: status === 'conflict' ? null : status === 'source-only' ? 'incoming' : 'current' }
  })
  const data = {
    version: material ? 'draft-merge-material-v1' : 'draft-merge-v1', draftID: draft.id, sourceReviewKey: draft.sourceReviewKey || draft.reviewKey, targetReviewKey,
    draftFingerprint: digest(canonical({ id: draft.id, kind: draft.kind, stableKey: draft.stableKey, sourceReviewKey: draft.sourceReviewKey ?? null, mergeHead: draft.mergeHead ?? null, updatedAt: draft.updatedAt, values: current, bodyFormat: draft.bodyFormat, editorNote: draft.editorNote ?? null })), cells,
  }
  return { ...data, proposalKey: digest(canonical(data)) }
}

export function resolveMerge(plan: MergePlan, draft: EditorialDraft, incoming: Candidate, choices: { field: string; choice: 'current' | 'incoming' }[]) {
  const conflicts = plan.cells.filter(cell => cell.status === 'conflict')
  if (choices.length !== conflicts.length || new Set(choices.map(row => row.field)).size !== choices.length || choices.some(row => !conflicts.some(cell => cell.field === row.field) || !['current', 'incoming'].includes(row.choice))) throw new Error('Choose current or incoming exactly once for every conflict; extra choices are forbidden.')
  const selected = (field: string) => {
    const cell = plan.cells.find(cell => cell.field === field)!
    return choices.find(row => row.field === field)?.choice ?? cell.suggested!
  }
  const value = (field: string) => {
    const cell = plan.cells.find(cell => cell.field === field)!
    return JSON.parse(cell[selected(field)]) as string | null
  }
  if (draft.kind === 'material') {
    if (plan.version !== 'draft-merge-material-v1') throw new Error('Material merge version mismatch')
    const cells = plan.cells.map(cell => JSON.parse(cell[selected(cell.field)]) as MaterialCell)
    materialRaw(draft.legacyId, cells)
    return { materialFields: cells, translations: [], faqs: [], bodyFormat: 'unclassified' as const, sourceReviewKey: plan.targetReviewKey, mergeHead: plan.proposalKey }
  }
  const translations = draft.kind === 'asset-reference' || draft.kind === 'faq-section' ? [] : LOCALES.map(locale => ({
    locale, title: value(`${locale}.title`), body: value(`${locale}.body`), summary: value(`${locale}.summary`),
  }))
  const faqs = selected('faqs') === 'current' ? (draft.faqs ?? []).map(({ locale, question, answer, entryKey }) => ({ locale, question, answer, entryKey })) : (incoming.faqs ?? []).map(({ sourcePointer, ...row }) => ({ ...row, entryKey: digest(`${incoming.revisionKey}\0${sourcePointer}`) }))
  const bodyChanged = plan.cells.some(cell => cell.field.endsWith('.body') && selected(cell.field) === 'incoming' && cell.current !== cell.incoming)
  return {
    translations, faqs,
    assetReference: selected('assetReference') === 'current' ? draft.assetReference : incoming.assetReference ?? { category: null, legacyId: null, url: null },
    bodyFormat: bodyChanged ? 'unclassified' as const : draft.bodyFormat,
    sourceReviewKey: plan.targetReviewKey, mergeHead: plan.proposalKey,
  }
}
