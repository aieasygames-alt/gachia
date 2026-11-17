import { getRouteOwner } from '../../../packages/core/route-ownership'
import { previewMaterial } from './material-contract'
import { canonical, LOCALES, type Candidate } from './record-mapping'
import { digest } from './legacy-intake'
import { ROUTE_POLICY } from './shadow-release'
import { resolveNteCharacterReference, type NteCharacterIdentityResolution } from '../../../packages/data/games/nte/character-identity'

export const MATERIAL_PUBLIC_SCHEMA = 'material-public-preview-v1'
export const MATERIAL_PILOT_SCOPES = ['starrail', 'genshin', 'nte'] as const
type Game = typeof MATERIAL_PILOT_SCOPES[number]
function game(value: string): asserts value is Game {
  if (!(MATERIAL_PILOT_SCOPES as readonly string[]).includes(value)) throw new Error('Unsupported material public pilot scope')
}
function id(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Unsafe public identity; explicit URL mapping required')
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected dependency object')
  return value as Record<string, unknown>
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected complete dependency array')
  return value
}
function keys(row: Record<string, unknown>, expected: string[]) {
  if (canonical(Object.keys(row).sort()) !== canonical([...expected].sort())) throw new Error('Unclassified dependency fields')
}

// Preview only: source fidelity and route identity are not content approval or page parity.
export function materialPublicPreview(candidate: Candidate) {
  const preview = previewMaterial(candidate)
  if (candidate.policyDigest !== ROUTE_POLICY) throw new Error('Material route policy mismatch; remapping required')
  game(preview.gameKey)
  id(preview.material.id)
  const dto = {
    schema: MATERIAL_PUBLIC_SCHEMA, game: preview.gameKey, material: preview.material,
    routes: LOCALES.map(locale => {
      const collectionPath = `/${locale}/${preview.gameKey}/items`
      const path = `${collectionPath}/${preview.material.id}`
      return { locale, path, owner: getRouteOwner(path), collectionPath, collectionOwner: getRouteOwner(collectionPath) }
    }),
  }
  // No rawRecord, reviewer data or synthetic title/body escapes into this projection.
  return { dto, dtoKey: digest(canonical(dto)), sourceRevision: preview.revisionKey, routePolicy: ROUTE_POLICY,
    hold: true as const, publishable: false as const, releaseCompatible: false as const }
}

export function materialDependencyPreview(gameKey: string, candidates: Candidate[], rawRelations: unknown, rawCharacters: unknown) {
  game(gameKey)
  if (candidates.some(c => c.gameKey !== gameKey)) throw new Error('Mixed dependency scope')
  const previews = candidates.map(materialPublicPreview)
  const materialIDs = new Set(previews.map(p => p.dto.material.id))
  if (materialIDs.size !== previews.length) throw new Error('Duplicate material identity')
  const characters = array(rawCharacters).map(value => { const row = object(value); id(row.id); return row.id })
  if (new Set(characters).size !== characters.length) throw new Error('Duplicate character identity')
  const characterIDs = new Set(characters)
  const resolveCharacter = (sourceId: string): NteCharacterIdentityResolution | null => {
    if (gameKey !== 'nte') return characterIDs.has(sourceId)
      ? { sourceId, canonicalId: sourceId, displayVariantIds: [sourceId], resolution: 'direct-character-id' }
      : null
    return resolveNteCharacterReference(sourceId, characterIDs)
  }
  const edges: { characterId: string; materialId: string; quantity: number; sourcePointer: string }[] = []
  const seen = new Set<string>()
  array(rawRelations).forEach((value, index) => {
    const row = object(value)
    const groups = gameKey === 'nte' ? ['levelingMaterials', 'skillMaterials']
      : gameKey === 'genshin' ? ['ascensionMaterials', 'talentMaterials'] : ['ascensionMaterials', 'traceMaterials']
    keys(row, ['characterId', ...groups])
    id(row.characterId)
    const characterId = row.characterId
    if (seen.has(characterId)) throw new Error('Duplicate character dependency row')
    seen.add(characterId)
    const add = (value: unknown, sourcePointer: string) => {
      const entry = object(value)
      keys(entry, ['id', 'quantity']); id(entry.id)
      if (!Number.isSafeInteger(entry.quantity) || Number(entry.quantity) <= 0) throw new Error('Invalid material quantity')
      edges.push({ characterId, materialId: entry.id, quantity: entry.quantity as number, sourcePointer })
    }
    for (const group of groups) array(row[group]).forEach((value, position) => {
      const pointer = `/${index}/${group}/${position}`
      if (group === 'skillMaterials') { add(value, pointer); return }
      const section = object(value)
      const label = group === 'talentMaterials' ? 'talentLevel' : group === 'traceMaterials' ? 'traceLevel' : 'levelRange'
      keys(section, [label, 'materials'])
      if (typeof section[label] !== 'string' || !section[label]) throw new Error('Invalid dependency stage')
      array(section.materials).forEach((entry, i) => add(entry, `${pointer}/materials/${i}`))
    })
  })
  const missingMaterials = [...new Set(edges.filter(e => !materialIDs.has(e.materialId)).map(e => e.materialId))].sort()
  const characterIdentityResolutions = [...seen].sort().map(sourceId => resolveCharacter(sourceId)).filter((resolution): resolution is NteCharacterIdentityResolution => resolution !== null && resolution.resolution !== 'direct-character-id')
  const missingCharacters = [...seen].filter(key => resolveCharacter(key) === null).sort()
  const related = previews.map(preview => ({ materialId: preview.dto.material.id,
    characterIds: [...new Set(edges.filter(e => e.materialId === preview.dto.material.id).flatMap(e => {
      const resolution = resolveCharacter(e.characterId)
      return resolution?.displayVariantIds ?? [e.characterId]
    }))].sort() }))
  const data = { schema: 'material-dependency-preview-v1', game: gameKey, routePolicy: ROUTE_POLICY,
    dtoKeys: previews.map(p => p.dtoKey), sourceRevisions: previews.map(p => p.sourceRevision),
    relationDigest: digest(canonical(rawRelations)), characterDigest: digest(canonical(rawCharacters)),
    edges, related, characterIdentityResolutions, missingMaterials, missingCharacters,
    blockers: ['character-public-dto-and-media-unverified', 'page-links-and-derived-copy-unmapped', 'locale-fallback-policy-unapproved', 'collection-order-unmapped', 'content-approval-absent',
      ...(missingMaterials.length ? ['missing-material-references'] : []), ...(missingCharacters.length ? ['missing-character-references'] : [])],
    dependencyClosureComplete: false, publishable: false }
  return { ...data, previewKey: digest(canonical(data)), previews }
}
