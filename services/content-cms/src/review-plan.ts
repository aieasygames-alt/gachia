import { digest } from './legacy-intake'
import { canonical, diffBatches, type Candidate, type RecordBatch } from './record-mapping'

import { previewMaterial, materialSource } from './material-contract'

export type ReviewVersion = 'review-v1' | 'review-v2-material'
export function reviewVersion(manifest: string): ReviewVersion {
  try {
    const version = JSON.parse(manifest).version
    if (['review-v1', 'review-v2-material'].includes(version)) return version
  } catch { /* Invalid JSON is also a corrupt review manifest. */ }
  throw new Error('Review run integrity failure: unsupported review policy version')
}
export const REVIEW_VERSION = 'review-v1'
export type DraftKind = 'guide' | 'character' | 'faq-section' | 'asset-reference' | 'material'
export type ReviewItem = {
  reviewKey: string; runKey: string; gameKey: string; stableKey: string; sourcePath: string;
  change: string; beforeRevision: string | null; afterRevision: string | null;
  draftKind: DraftKind | null; blockers: string[]; warnings: string[];
  fields: { field: string; before: string; after: string }[];
}
export type ReviewPlan = { runKey: string; baseBatch: string | null; targetBatch: string; version: string; items: ReviewItem[] }

export function draftKind(candidate: Candidate, version: ReviewVersion = REVIEW_VERSION): DraftKind | null {
  if (version === 'review-v2-material' && candidate.family === 'materials') {
    try { previewMaterial(candidate); return 'material' } catch { return null }
  }
  if (candidate.mapperVersion !== 'legacy-records-v2') return null
  if (candidate.family === 'guides' && candidate.mappingLevel === 'common-fields') return 'guide'
  if (candidate.family === 'characters' && candidate.mappingLevel === 'common-fields') return 'character'
  if (candidate.assetReference && candidate.family === 'asset-references') return 'asset-reference'
  if ((candidate.family === 'gacha-faq' || (candidate.gameKey === 'lvmeng' && candidate.origin?.symbol === 'launchFaq')) && candidate.faqs?.length) return 'faq-section'
  return null
}

function projection(candidate: Candidate | undefined, version: ReviewVersion) {
  if (!candidate) return {}
  const fields: Record<string, unknown> = {
    rawRecord: candidate.rawRecord, reviewEvidence: candidate.reviewText,
    unmappedFields: candidate.unmappedFields, routeCandidates: candidate.routeCandidates,
    assetReference: candidate.assetReference ?? null,
  }
  for (const locale of ['zh', 'en', 'ja']) {
    const text = candidate.translations.find(item => item.locale === locale)
    for (const field of ['title', 'body', 'summary'] as const) fields[`${locale}.${field}`] = text?.[field] ?? null
    fields[`${locale}.faqs`] = (candidate.faqs ?? []).filter(item => item.locale === locale)
  }
  if (version === 'review-v2-material' && draftKind(candidate, version) === 'material') {
    for (const [key, value] of Object.entries(materialSource(previewMaterial(candidate).material))) fields[`material.${key}`] = value
  }
  return fields
}

export function buildReviewPlan(target: RecordBatch, base?: RecordBatch, version: ReviewVersion = REVIEW_VERSION): ReviewPlan {
  if (!['review-v1', 'review-v2-material'].includes(version)) throw new Error('Unsupported review policy version')
  const runKey = digest(canonical({ version, base: base?.batchKey ?? null, target: target.batchKey }))
  const after = new Map(target.sources.flatMap(source => source.records).map(item => [item.stableKey, item]))
  const before = new Map((base?.sources ?? []).flatMap(source => source.records).map(item => [item.stableKey, item]))
  const changes = base ? diffBatches(base, target).changes : [...after.values()].map(item => ({ kind: 'baseline', sourcePath: item.sourcePath, stableKey: item.stableKey, translationReview: [] as string[] }))
  const items = changes.map(change => {
    const old = change.stableKey ? before.get(change.stableKey) : undefined
    const next = change.stableKey ? after.get(change.stableKey) : undefined
    const kind = next ? draftKind(next, version) : null
    const blockers = !next ? ['Source review or withdrawal requires a separate workflow; no draft or website deletion.'] : !kind ? ['No typed draft adapter for this candidate.'] : []
    const warnings = ['Legacy remains authoritative. Acceptance only creates a held local draft.']
    if (kind === 'material') warnings.push('Material contract v1 preserves source fields; source descriptions are not verified evidence.')
    else if (next?.unmappedFields.length) warnings.push(`Unmapped fields remain: ${next.unmappedFields.join(', ')}`)
    if (change.translationReview?.length) warnings.push(`Translation review required: ${change.translationReview.join(', ')}`)
    const left = projection(old, version), right = projection(next, version)
    const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort().filter(field => canonical(left[field]) !== canonical(right[field])).map(field => ({ field, before: Object.hasOwn(left, field) ? canonical(left[field]) : '(absent)', after: Object.hasOwn(right, field) ? canonical(right[field]) : '(absent)' }))
    if (!next && !old) fields.push({ field: 'sourceSnapshot', before: canonical(base?.sources.find(x => x.sourcePath === change.sourcePath)?.sourceSnapshotKey ?? null), after: canonical(target.sources.find(x => x.sourcePath === change.sourcePath)?.sourceSnapshotKey ?? null) })
    const data = {
      runKey, gameKey: next?.gameKey ?? old?.gameKey ?? target.sources.find(x => x.sourcePath === change.sourcePath)?.gameKey ?? base?.sources.find(x => x.sourcePath === change.sourcePath)?.gameKey ?? '_platform',
      stableKey: change.stableKey ?? `source:${change.sourcePath}`, sourcePath: change.sourcePath,
      change: change.kind, beforeRevision: old?.revisionKey ?? null, afterRevision: next?.revisionKey ?? null,
      draftKind: kind, blockers, warnings, fields,
    }
    return { ...data, reviewKey: digest(canonical(data)) }
  }).sort((a, b) => a.reviewKey.localeCompare(b.reviewKey))
  if (new Set(items.map(item => item.reviewKey)).size !== items.length) throw new Error('Duplicate review item')
  return { version, runKey, baseBatch: base?.batchKey ?? null, targetBatch: target.batchKey, items }
}

export function reviewManifest(plan: ReviewPlan) {
  return canonical({ version: plan.version, runKey: plan.runKey, baseBatch: plan.baseBatch, targetBatch: plan.targetBatch, reviewKeys: plan.items.map(item => item.reviewKey) })
}
