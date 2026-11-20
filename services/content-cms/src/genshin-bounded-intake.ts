import assert from 'node:assert/strict'
import { isDeepStrictEqual as equal } from 'node:util'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { assertJSON, mergePublishedContent, objectValue, validateUnifiedRecord, type JSONValue, type UnifiedRecord } from './unified-content'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import type { SourceBytes } from './unified-export'

const prefix = 'packages/data/games/genshin/raw-'
export const GENSHIN_INTAKE_PATHS = ['materials', 'character-materials', 'characters'].map(family => `${prefix}${family}.json`)
type Proof = { path: string; pin: string }
export type IntakeCMSRecord = UnifiedRecord & { id: number | string; updatedAt: string; bodyFormat: string }
export type GenshinIntakeInput = {
  sourceIndex: Proof; candidateProof: Proof; cmsProof: Proof
  // The candidate's earliest reviewed ancestor, before the R135 identity patch.
  // Never substitute the checkout or R137's already-patched intermediate input.
  candidateBase: SourceBytes[]; active: SourceBytes[]; candidate: SourceBytes[]
  cms: IntakeCMSRecord[]
  renames: { from: string; to: string; evidence: Proof }[]
}
type Cell = { present: boolean; value: JSONValue | null }
type Difference = { pointer: string; before: Cell; after: Cell }
const cell = (node: JSONValue | undefined): Cell => ({ present: node !== undefined, value: node ?? null })
function differences(before: JSONValue, after: JSONValue, pointer = ''): Difference[] {
  if (equal(before, after)) return []
  if (objectValue(before) && objectValue(after)) return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => {
    const next = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`
    return Object.hasOwn(before, key) && Object.hasOwn(after, key) ? differences(before[key], after[key], next)
      : [{ pointer: next, before: cell(before[key]), after: cell(after[key]) }]
  })
  // Arrays are atomic; never pair ingredients by list index after a reorder.
  return [{ pointer: pointer || '/', before: cell(before), after: cell(after) }]
}
function sources(input: SourceBytes[], bounded: boolean) {
  const index = new Map<string, SourceBytes>()
  for (const row of input) {
    assert.equal(digest(row.text), row.sha256, 'Corrupt intake source')
    assert(!index.has(row.sourcePath), 'Duplicate intake source')
    if (bounded) assert(GENSHIN_INTAKE_PATHS.includes(row.sourcePath), 'Unbounded intake source')
    index.set(row.sourcePath, row)
  }
  if (bounded) assert.deepEqual([...index.keys()].sort(), [...GENSHIN_INTAKE_PATHS].sort(), 'All three Genshin sources required')
  return index
}
function identities(source: SourceBytes, key: string) {
  const rows: unknown = JSON.parse(source.text); assertJSON(rows); assert(Array.isArray(rows), 'Expected intake entity array')
  const result = new Map<string, Record<string, JSONValue>>()
  for (const row of rows) {
    assert(objectValue(row) && typeof row[key] === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row[key]), 'Unsafe intake identity')
    assert(!result.has(row[key]), 'Duplicate intake identity'); result.set(row[key], row)
  }
  return result
}
function proof(value: Proof) {
  assert(typeof value.path === 'string' && value.path.startsWith('/') && /^[a-f0-9]{64}$/.test(value.pin), 'Pinned intake provenance required')
}
function classes(family: string, delta: Difference[], added: boolean, renamed: boolean) {
  const result = new Set<string>()
  if (added) result.add('new-entity')
  if (family === 'character-materials') { result.add('relation'); result.add('numeric') }
  if (renamed) result.add('identity-migration')
  if (added && family === 'characters') result.add('media')
  for (const row of delta) {
    if (typeof row.before.value === 'number' || typeof row.after.value === 'number') result.add('numeric')
    if (/^\/source(?:En)?$/.test(row.pointer)) result.add('source-text')
    if (row.pointer === '/type') result.add('classification')
    if (row.pointer.startsWith('/name')) result.add('text')
  }
  return [...result].sort()
}
const encode = (sourcePath: string, rows: JSONValue[]): SourceBytes => {
  const text = JSON.stringify(rows, null, 2) + '\n'; return { sourcePath, text, sha256: digest(text) }
}

// This is an intake/review contract, not a relaxation of the existing-content
// editor or its production exporter. Every proposed draft remains held.
export function reconcileGenshinIntake(input: GenshinIntakeInput) {
  for (const row of [input.sourceIndex, input.candidateProof, input.cmsProof]) proof(row)
  const active = sources(input.active, false), base = sources(input.candidateBase, true), proposed = sources(input.candidate, true)
  for (const [key, row] of base) assert.equal(active.get(key)?.sha256, row.sha256, 'Candidate ancestor differs from published A; rebase required')
  const renames = new Map<string, string>(), renameTargets = new Set<string>()
  for (const row of input.renames) {
    proof(row.evidence)
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.from) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.to) && row.from !== row.to, 'Invalid identity migration')
    assert(!renames.has(row.from) && !renameTargets.has(row.to), 'Ambiguous identity migration')
    renames.set(row.from, row.to); renameTargets.add(row.to)
  }
  assert([...renameTargets].every(id => !renames.has(id)), 'Chained identity migration rejected')
  const cms = new Map<string, IntakeCMSRecord>(), cmsIds = new Set<string>()
  for (const row of input.cms) {
    assert(GENSHIN_INTAKE_PATHS.includes(row.legacyPath), 'Unbounded CMS record')
    validateUnifiedRecord(row as unknown as Record<string, unknown>)
    assert.equal(row.sourceRecord.game, 'genshin')
    assert((typeof row.id === 'number' && Number.isSafeInteger(row.id) && row.id > 0) || (typeof row.id === 'string' && row.id.length > 0), 'CMS identity required')
    assert(Number.isFinite(Date.parse(row.updatedAt)), 'CMS timestamp required')
    assert(!cms.has(row.stableKey) && !cmsIds.has(String(row.id)), 'Duplicate CMS record')
    cms.set(row.stableKey, row); cmsIds.add(String(row.id))
  }
  const entries: { key: string; sourcePath: string; family: string; from: string | null; to: string;
    action: 'new-entity' | 'identity-migration' | 'update'; cms: IntakeCMSRecord | null; active: JSONValue | null;
    candidate: JSONValue; draft: JSONValue | null; changeClasses: string[]; changes: Difference[];
    cmsVsImport: Difference[]; publicVsImport: Difference[]; conflict: string | null; existingEditorCompatible: boolean;
    hold: true; _status: 'draft' }[] = []
  const preserved: { stableKey: string; cmsId: number | string; valueSHA256: string; publishedSHA256: string; cmsWorkPreserved: boolean }[] = []
  const overlays: SourceBytes[] = [], usedCMS = new Set<string>(), usedRenames = new Set<string>()
  for (const sourcePath of GENSHIN_INTAKE_PATHS) {
    const family = sourcePath.slice(prefix.length, -5), key = family === 'character-materials' ? 'characterId' : 'id'
    const a = identities(active.get(sourcePath)!, key), b = identities(proposed.get(sourcePath)!, key)
    const remaining = new Set(b.keys()), merged = new Map<string, JSONValue>()
    const relevantCMS = input.cms.filter(row => row.legacyPath === sourcePath)
    const byId = new Map(relevantCMS.map(row => [row.sourceRecord.locator.identity?.[key], row]))
    assert.equal(byId.size, relevantCMS.length, 'Duplicate CMS locator')
    for (const [id, value] of a) {
      const target = family === 'character-materials' ? renames.get(id) ?? id : id
      if (target !== id) { assert(!a.has(target) && !b.has(id), 'Identity migration collides'); usedRenames.add(id) }
      const incoming = b.get(target); assert(incoming, 'Implicit withdrawal rejected')
      const current = byId.get(id); assert(current, `Missing CMS import baseline: ${family}/${id}`)
      assert.deepEqual(current.sourceRecord.locator, { identity: { [key]: id } }, 'Unbounded CMS locator')
      usedCMS.add(current.stableKey); remaining.delete(target)
      const original = current.sourceRecord.original, edited = current.structuredValue
      let draft: JSONValue | null = null, conflict: string | null = null
      try {
        const rebasedCMS = mergePublishedContent(original, value, edited)
        draft = mergePublishedContent(value, rebasedCMS, incoming)
      } catch (error) { conflict = (error as Error).message }
      if (draft !== null) merged.set(target, draft)
      const delta = differences(value, incoming)
      if (!delta.length && !conflict) {
        preserved.push({ stableKey: current.stableKey, cmsId: current.id, valueSHA256: digest(canonical(edited)),
          publishedSHA256: digest(canonical(value)), cmsWorkPreserved: equal(draft, mergePublishedContent(original, value, edited)) })
        continue
      }
      let existingEditorCompatible = false
      if (!conflict && draft !== null) try {
        validateUnifiedRecord({ ...current, structuredValue: draft, hold: true, _status: 'draft' }, current as unknown as Record<string, unknown>)
        existingEditorCompatible = true
      } catch { /* Requires a new source/structure/identity contract. */ }
      entries.push({ key: `${family}:${id}`, sourcePath, family, from: id, to: target,
        action: target === id ? 'update' : 'identity-migration', cms: current, active: value, candidate: incoming, draft,
        changeClasses: classes(family, delta, false, target !== id), changes: delta,
        cmsVsImport: differences(original, edited), publicVsImport: differences(original, value), conflict, existingEditorCompatible, hold: true, _status: 'draft' })
    }
    for (const id of remaining) {
      assert(!byId.has(id), 'New candidate collides with CMS work')
      const incoming = b.get(id)!
      assert(family !== 'character-materials', 'Unreviewed relation membership addition')
      const delta = differences({}, incoming); merged.set(id, incoming)
      entries.push({ key: `${family}:${id}`, sourcePath, family, from: null, to: id, action: 'new-entity', cms: null,
        active: null, candidate: incoming, draft: incoming, changeClasses: classes(family, delta, true, false), changes: delta,
        cmsVsImport: [], publicVsImport: [], conflict: null, existingEditorCompatible: false, hold: true, _status: 'draft' })
    }
    // Preserve the candidate's evidenced order, including explicit renamed rows.
    if (merged.size === b.size) overlays.push(encode(sourcePath, [...b.keys()].map(id => merged.get(id)!)))
  }
  assert.equal(usedCMS.size, cms.size, 'Orphan CMS record; explicit rebase/withdrawal required')
  assert.deepEqual([...usedRenames].sort(), [...renames.keys()].sort(), 'Unused identity migration')
  entries.sort((a, b) => a.key.localeCompare(b.key)); preserved.sort((a, b) => a.stableKey.localeCompare(b.stableKey))
  const conflicts = entries.filter(row => row.conflict).map(row => ({ key: row.key, message: row.conflict }))
  const next = new Map(active)
  if (!conflicts.length) for (const overlay of overlays) next.set(overlay.sourcePath, overlay)
  const dependency = conflicts.length ? null : auditMaterialReleaseDependencies('genshin', [...next.values()])
  const data = { kind: 'genshin-bounded-intake-v1', sourceIndex: input.sourceIndex, candidateProof: input.candidateProof, cmsProof: input.cmsProof,
    inputKey: digest(canonical(input)), renames: input.renames, entries, preserved, conflicts,
    sourcePins: input.active.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    candidatePins: input.candidate.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })).sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    counts: { cmsRecords: cms.size, changedRecords: entries.length, preservedRecords: preserved.length,
      existingUpdates: entries.filter(row => row.action === 'update').length, newEntities: entries.filter(row => row.action === 'new-entity').length,
      identityMigrations: usedRenames.size, conflicts: conflicts.length },
    dependency: dependency ? { auditKey: dependency.auditKey, complete: dependency.dependencyClosureComplete,
      materialDefinitions: dependency.materialDefinitions, materialReferences: dependency.materialReferences, issues: dependency.issues } : null,
    // These overlays include preserved CMS draft work and are for held intake only.
    draftOverlays: conflicts.length ? [] : overlays, intakeReady: !conflicts.length && dependency?.dependencyClosureComplete === true,
    hold: true, publishable: false, cmsWrites: false, sourceAdvanced: false,
    requiredReleaseContracts: ['numeric-and-classification-review', 'relation-and-identity-migration-review', 'new-entity-review',
      'controlled-installed-cms-intake-with-provenance', 'all-consumers-and-derived-data', 'compatible-recovery-with-legacy-dependencies'] }
  return { ...data, intakeKey: digest(canonical(data)) }
}
export type GenshinIntakePlan = ReturnType<typeof reconcileGenshinIntake>
export function verifyGenshinIntake(plan: GenshinIntakePlan, input: GenshinIntakeInput) {
  const rebuilt = reconcileGenshinIntake(input)
  assert.equal(canonical(plan), canonical(rebuilt), 'Stale or altered bounded intake; recapture CMS and regenerate')
  return rebuilt
}

// A selected batch is a transportable, reviewable package. It grants no database
// or production authority, including when it has no merge conflicts.
export function prepareGenshinIntakeBatch(plan: GenshinIntakePlan, input: GenshinIntakeInput, selection: { keys: string[] }) {
  verifyGenshinIntake(plan, input)
  assert(plan.intakeReady, 'Intake conflicts/dependencies unresolved')
  assert.deepEqual(Object.keys(selection), ['keys'], 'Selection cannot supply approval, values or activation flags')
  assert(Array.isArray(selection.keys) && selection.keys.length > 0 && selection.keys.length <= 200 && new Set(selection.keys).size === selection.keys.length, 'Select 1-200 unique intake keys')
  const index = new Map(plan.entries.map(row => [row.key, row]))
  assert(selection.keys.every(key => index.has(key)), 'Unknown intake selection')
  const records = [...selection.keys].sort().map(key => index.get(key)!)
  const data = { kind: 'genshin-held-intake-batch-v1', intakeKey: plan.intakeKey, sourceIndex: input.sourceIndex,
    candidateProof: input.candidateProof, cmsProof: input.cmsProof, records,
    // Keep original CMS provenance and state in full; no synthetic O=A rebase.
    recovery: records.map(row => ({ key: row.key, action: row.action === 'new-entity' ? 'remove-unpublished-staged-entity' : 'restore-exact-cms-record',
      previous: row.cms, active: row.active })),
    changeClasses: [...new Set(records.flatMap(row => row.changeClasses))].sort(),
    hold: true, _status: 'draft', publishable: false, productionQualified: false, cmsWrites: false, sourceAdvanced: false }
  return { ...data, batchKey: digest(canonical(data)) }
}

// The first installed intake is limited to existing material leaves accepted by
// today's CMS hook. No protected source, relation, identity or new-entity bypass.
export function prepareGenshinExistingMaterialDrafts(plan: GenshinIntakePlan, input: GenshinIntakeInput, selection: { keys: string[] }) {
  const batch = prepareGenshinIntakeBatch(plan, input, selection)
  for (const row of batch.records) {
    assert(row.family === 'materials' && row.action === 'update' && row.existingEditorCompatible && row.cms && row.draft,
      'Installed draft intake only accepts compatible existing material fields')
    validateUnifiedRecord({ ...row.cms, structuredValue: row.draft, hold: true, _status: 'draft' }, row.cms as unknown as Record<string, unknown>)
  }
  return batch
}
