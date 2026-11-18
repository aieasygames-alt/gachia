import assert from 'node:assert/strict'
import { resolveNteCharacterReference } from '../../../packages/data/games/nte/character-identity'
import { parseMaterial } from './material-contract'
import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import type { SourceBytes } from './unified-export'

export const MATERIAL_RELEASE_DEPENDENCIES = 'material-release-dependencies-v1'
type Row = Record<string, unknown>
type Edge = { characterId: string; materialId: string | null; quantity: number; sourcePointer: string }
type Issue = { code: string; sourcePointer: string; identity: string | null; quantity?: number }
const sourcePath = (game: string, family: string) => `packages/data/games/${game}/raw-${family}.json`
const object = (value: unknown): value is Row => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value)
const formats: Record<string, { groups: Record<string, string | null>; materialKey: string; extra?: string[] }> = {
  genshin: { groups: { ascensionMaterials: 'levelRange', talentMaterials: 'talentLevel' }, materialKey: 'id' },
  starrail: { groups: { ascensionMaterials: 'levelRange', traceMaterials: 'traceLevel' }, materialKey: 'id' },
  nte: { groups: { levelingMaterials: 'levelRange', skillMaterials: null }, materialKey: 'id' },
  guihuan: { groups: { ascensionMaterials: 'levelRange', talentMaterials: 'talentLevel' }, materialKey: 'id' },
  endfield: { groups: { ascensionMaterials: 'level', talentMaterials: 'talentLevel' }, materialKey: 'materialId' },
  wuwa: { groups: { ascensionMaterials: 'levelRange', skillMaterials: 'levelRange' }, materialKey: 'id', extra: ['rarity'] },
}

function index(sources: SourceBytes[]) {
  const result = new Map<string, SourceBytes>()
  for (const row of sources) {
    assert.equal(digest(row.text), row.sha256, `Corrupt material dependency input: ${row.sourcePath}`)
    assert(!result.has(row.sourcePath), 'Duplicate material dependency source')
    result.set(row.sourcePath, row)
  }
  return result
}

// Every occurrence is retained, including entries that have a quantity but no ID.
// Structural closure is separate from fact checking and public consumer acceptance.
export function auditMaterialReleaseDependencies(game: string, sources: SourceBytes[]) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game), 'Invalid material game')
  const inputs = index(sources), provenance: { sourcePath: string; sha256: string }[] = []
  const read = (family: string, required: boolean): unknown[] => {
    const key = sourcePath(game, family), source = inputs.get(key)
    assert(source || !required, `Missing material dependency source: ${key}`)
    if (!source) return []
    provenance.push({ sourcePath: key, sha256: source.sha256 })
    const value: unknown = JSON.parse(source.text)
    assert(Array.isArray(value), `Material dependency source must be an array: ${key}`)
    return value
  }
  const materials = read('materials', true), relations = read('character-materials', Boolean(formats[game]))
  const characters = read('characters', relations.length > 0)
  const issues: Issue[] = [], edges: Edge[] = [], identities = new Set<string>(), characterIds = new Set<string>()
  for (const [i, raw] of materials.entries()) {
    const material = parseMaterial(raw)
    assert(safeId(material.id), 'Unsafe material identity')
    assert(!identities.has(material.id), 'Duplicate material identity')
    identities.add(material.id)
  }
  for (const raw of characters) {
    assert(object(raw) && safeId(raw.id), 'Invalid dependency character identity')
    assert(!characterIds.has(raw.id), 'Duplicate dependency character identity')
    characterIds.add(raw.id)
  }
  const characterResolutions: { sourceId: string; displayVariantIds: string[] }[] = []
  const seen = new Set<string>(), format = formats[game]
  assert(format || relations.length === 0, `Unreviewed material relationship format: ${game}`)
  const keys = (raw: Row, expected: string[]) => assert.deepEqual(Object.keys(raw).sort(), [...expected].sort(), `Unclassified ${game} material relation fields`)
  for (const [i, raw] of relations.entries()) {
    assert(object(raw) && safeId(raw.characterId), 'Invalid material relation character identity')
    keys(raw, ['characterId', ...Object.keys(format.groups), ...(format.extra ?? [])])
    assert(!seen.has(raw.characterId), 'Duplicate character material relation')
    seen.add(raw.characterId)
    if (game === 'wuwa') assert(Number.isInteger(raw.rarity) && Number(raw.rarity) >= 1 && Number(raw.rarity) <= 5, 'Invalid relation rarity')
    const characterId = raw.characterId
    const resolved = game === 'nte' ? resolveNteCharacterReference(characterId, characterIds)?.displayVariantIds
      : characterIds.has(characterId) ? [characterId] : undefined
    if (resolved) characterResolutions.push({ sourceId: characterId, displayVariantIds: resolved })
    else issues.push({ code: 'missing-character', sourcePointer: `/${i}/characterId`, identity: characterId })
    const add = (entry: unknown, pointer: string) => {
      assert(object(entry), 'Invalid material dependency entry')
      // Some legacy guihuan rows omit the identity entirely. Report them, never skip them.
      assert(Object.keys(entry).every(key => [format.materialKey, 'quantity'].includes(key)), 'Unclassified material entry fields')
      assert(Number.isSafeInteger(entry.quantity) && Number(entry.quantity) > 0, 'Material quantity must be a positive safe integer')
      const materialId = entry[format.materialKey]
      if (materialId !== undefined && materialId !== null) assert(safeId(materialId), 'Invalid material reference identity')
      edges.push({ characterId, materialId: typeof materialId === 'string' ? materialId : null,
        quantity: entry.quantity as number, sourcePointer: pointer })
      if (materialId == null || !identities.has(materialId as string)) issues.push({
        code: materialId == null ? 'missing-material-id' : 'missing-material-definition', sourcePointer: pointer,
        identity: typeof materialId === 'string' ? materialId : null, quantity: entry.quantity as number,
      })
    }
    for (const [group, label] of Object.entries(format.groups)) {
      const stages = raw[group]; assert(Array.isArray(stages), `Missing material group: ${group}`)
      for (const [j, stage] of stages.entries()) {
        const pointer = `/${i}/${group}/${j}`
        if (label === null) { add(stage, pointer); continue }
        assert(object(stage), 'Invalid material stage'); keys(stage, [label, 'materials'])
        assert(label === 'level' ? Number.isSafeInteger(stage[label]) && Number(stage[label]) > 0
          : typeof stage[label] === 'string' && Boolean(stage[label]), 'Invalid material stage label')
        assert(Array.isArray(stage.materials), 'Invalid stage materials')
        stage.materials.forEach((entry, k) => add(entry, `${pointer}/materials/${k}`))
      }
    }
  }
  const data = { policy: MATERIAL_RELEASE_DEPENDENCIES, game, sources: provenance, materialDefinitions: materials.length,
    characterMaterialRelations: relations.length, materialReferences: edges.length, edges, characterResolutions, issues,
    missingMaterialIds: [...new Set(issues.filter(row => row.code === 'missing-material-definition').map(row => row.identity!))].sort(),
    missingCharacterIds: [...new Set(issues.filter(row => row.code === 'missing-character').map(row => row.identity!))].sort(),
    anonymousMaterialReferences: issues.filter(row => row.code === 'missing-material-id').length,
    dependencyClosureComplete: issues.length === 0,
    status: issues.length ? 'blocked-by-dependencies' : materials.length ? 'ready-for-consumer-review' : 'empty-material-domain',
    publishable: false as const, releaseCompatible: false as const }
  return { ...data, auditKey: digest(canonical(data)) }
}

// Called before a NEW source freeze. Preservation overlays are compared against
// published A, not Git O. Historical freezes without this receipt remain readable.
export function assertMaterialCandidateDependencies(active: SourceBytes[], overlays: SourceBytes[]) {
  const baseline = index(active), candidate = new Map(baseline), changed = new Map<string, Set<string>>()
  for (const row of index(overlays).values()) {
    const previous = baseline.get(row.sourcePath)
    assert(previous, 'Material dependency overlay is outside published A')
    candidate.set(row.sourcePath, row)
    if (previous.sha256 === row.sha256) continue
    const match = row.sourcePath.match(/^packages\/data\/games\/([a-z0-9-]+)\/raw-(materials|character-materials|characters)\.json$/)
    if (!match) continue
    const game = match[1]
    if (!baseline.has(sourcePath(game, 'materials'))) continue
    if (!changed.has(game)) changed.set(game, new Set())
    changed.get(game)!.add(match[2])
  }
  const games = [...changed].sort(([a], [b]) => a.localeCompare(b)).map(([game, families]) => {
    const before = auditMaterialReleaseDependencies(game, [...baseline.values()]), after = auditMaterialReleaseDependencies(game, [...candidate.values()])
    const mode = families.has('materials') || families.has('character-materials') ? 'complete-material-closure' : 'no-dependency-regression'
    if (mode === 'complete-material-closure') assert.equal(after.issues.length, 0, `Material publication blocked by dependencies: ${game}: ${after.missingMaterialIds.join(',')} ${after.missingCharacterIds.join(',')} anonymous=${after.anonymousMaterialReferences}`)
    else {
      const oldIssues = new Set(before.issues.map(row => canonical(row)))
      assert(after.issues.every(row => oldIssues.has(canonical(row))), `Character edit introduces material dependency regressions: ${game}`)
    }
    return { game, mode, before: before.auditKey, after: after.auditKey, remainingIssues: after.issues.length }
  })
  return { policy: MATERIAL_RELEASE_DEPENDENCIES, games }
}
