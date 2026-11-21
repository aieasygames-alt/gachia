import { isDeepStrictEqual } from 'node:util'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { assertJSON, assertUnifiedSource, editingSource, validateUnifiedRecord, mergePublishedContent, type UnifiedRecord } from './unified-content'
import { locateValue, readSourceValue, replaceSourceSymbol, replaceValue } from './unified-sources'
import { COMMUNITY_PUBLICATION_POLICY } from './unified-baseline'

export type SourceBytes = { sourcePath: string; text: string; sha256: string }

// Community editorial policy does not require source attestation; this compiler still cannot authorize activation.
export function exportUnifiedContent(records: UnifiedRecord[], originalSources: SourceBytes[], activeSources: SourceBytes[], preview: boolean) {
  if (typeof preview !== 'boolean') throw new Error('Explicit export intent required')
  const index = (sources: SourceBytes[]) => {
    const result = new Map<string, SourceBytes>()
    for (const source of sources) {
      if (result.has(source.sourcePath) || digest(source.text) !== source.sha256) throw new Error('Duplicate or corrupt source bytes')
      result.set(source.sourcePath, source)
    }
    return result
  }
  const originals = index(originalSources), active = index(activeSources), seen = new Set<string>()
  if (!isDeepStrictEqual([...originals.keys()].sort(), [...active.keys()].sort())) throw new Error('Complete public baseline required for every original source, including delegated and unedited games')
  // A frozen build starts from O, not A. Carry every public-only delta into the overlay even when this batch edits another game.
  const output = new Map<string, string>([...active].filter(([key, value]) => value.text !== originals.get(key)!.text).map(([key, value]) => [key, value.text]))
  const changed: string[] = []
  for (const record of [...records].sort((a, b) => a.stableKey.localeCompare(b.stableKey))) {
    if (seen.has(record.stableKey)) throw new Error('Duplicate editorial record')
    seen.add(record.stableKey)
    assertUnifiedSource(record.sourceRecord)
    validateUnifiedRecord({ ...record, bodyFormat: 'plain' })
    if (!preview && (record._status !== 'published' || record.hold !== false)) throw new Error('Unapproved structured content')
    const source = editingSource(record), a = active.get(source.sourcePath)
    const original = originals.get(source.sourcePath)
    const o = (record.reviewEvidence as any)?.publishedBaseline && original?.sha256 !== source.sourceSHA256 ? a : original
    if (!o || !a || o.sha256 !== source.sourceSHA256) throw new Error('Missing or stale source/public baseline')
    const originalRoot = readSourceValue(o.text, source.sourcePath, source.locator)
    if (!isDeepStrictEqual(locateValue(originalRoot, source.locator), source.original)) throw new Error('Editorial original differs from source bytes')
    const text = output.get(source.sourcePath) ?? a.text
    const currentRoot = readSourceValue(text, source.sourcePath, source.locator)
    const current = locateValue(currentRoot, source.locator)
    const merged = mergePublishedContent(source.original, current, record.structuredValue)
    assertJSON(merged)
    if (isDeepStrictEqual(current, merged)) continue
    const next = replaceValue(currentRoot, source.locator, merged)
    output.set(source.sourcePath, source.sourcePath.endsWith('.json') ? JSON.stringify(next, null, 2) + '\n'
      : replaceSourceSymbol(text, source.sourcePath, source.locator.symbol!, next))
    changed.push(record.stableKey)
  }
  if (!records.length) throw new Error('No eligible structured content')
  const files = [...output].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, content]) => ({ sourcePath, content,
    originalSHA256: originals.get(sourcePath)!.sha256, activeSHA256: active.get(sourcePath)!.sha256, candidateSHA256: digest(content) }))
  const manifest = { contract: 'unified-existing-content-v1', preview, changed, status: changed.length ? 'editorial_candidate' : 'no_changes',
    baselines: [...originals].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, source]) => ({ sourcePath, originalSHA256: source.sha256, activeSHA256: active.get(sourcePath)!.sha256 })),
    files: files.map(({ content, ...row }) => row),
    publicationPolicy: COMMUNITY_PUBLICATION_POLICY, productionReady: false, cloudWrites: false, activationSupported: false,
    pending: ['mirror and derived-data generation', 'domain and reference validation',
      'exact owner builds and consumer acceptance', 'compatible recovery', 'controlled multi-owner activation'] }
  return { manifest: { ...manifest, candidateSHA256: digest(canonical(manifest)) }, files }
}
