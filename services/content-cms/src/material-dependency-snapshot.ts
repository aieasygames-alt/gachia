import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import { materialDependencyPreview } from './material-public-preview'
import type { Candidate } from './record-mapping'

export const MATERIAL_DEPENDENCY_SNAPSHOT = 'material-dependency-snapshot-v1'

type MaterialPreview = ReturnType<typeof materialDependencyPreview>['previews'][number]
type Relation = Record<string, unknown> & { characterId: string }
type Character = Record<string, unknown> & { id: string }

export type MaterialDependencySnapshot = {
  version: typeof MATERIAL_DEPENDENCY_SNAPSHOT
  game: string
  materials: MaterialPreview[]
  characters: Character[]
  relations: Relation[]
  edges: ReturnType<typeof materialDependencyPreview>['edges']
  characterIdentityResolutions: ReturnType<typeof materialDependencyPreview>['characterIdentityResolutions']
  missingMaterials: string[]
  missingCharacters: string[]
  dependencyKey: string
  orderDigest: string
  hold: true
  executable: false
  publishable: false
  releaseCompatible: false
  snapshotKey: string
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function assertRows(value: unknown, label: string): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error(`${label} must be an array of objects`)
  }
}

/**
 * Captures the typed material graph without repairing source IDs. The source
 * order and every stage/quantity are intentionally retained for review and
 * later source-bound regeneration.
 */
export function buildMaterialDependencySnapshot(
  game: string,
  candidates: Candidate[],
  rawRelations: unknown,
  rawCharacters: unknown,
): MaterialDependencySnapshot {
  assertRows(rawRelations, 'relations')
  assertRows(rawCharacters, 'characters')
  const graph = materialDependencyPreview(game, candidates, rawRelations, rawCharacters)
  const relations = clone(rawRelations) as Relation[]
  const characters = clone(rawCharacters) as Character[]
  const data = {
    version: MATERIAL_DEPENDENCY_SNAPSHOT as typeof MATERIAL_DEPENDENCY_SNAPSHOT,
    game,
    // Do not sort this list: source array order is part of the review input.
    materials: clone(graph.previews),
    characters,
    relations,
    edges: clone(graph.edges),
    characterIdentityResolutions: clone(graph.characterIdentityResolutions),
    missingMaterials: [...graph.missingMaterials],
    missingCharacters: [...graph.missingCharacters],
    dependencyKey: graph.previewKey,
    orderDigest: digest(canonical({ materials: graph.previews.map(row => row.dto.material.id), characters: characters.map(row => row.id), relations })),
    hold: true as const,
    executable: false as const,
    publishable: false as const,
    releaseCompatible: false as const,
  }
  return { ...data, snapshotKey: digest(canonical(data)) }
}

export function verifyMaterialDependencySnapshot(snapshot: MaterialDependencySnapshot): MaterialDependencySnapshot {
  if (!snapshot || snapshot.version !== MATERIAL_DEPENDENCY_SNAPSHOT || snapshot.hold !== true
    || snapshot.executable || snapshot.publishable || snapshot.releaseCompatible) {
    throw new Error('Material dependency snapshot flags or version invalid')
  }
  // Verification is intentionally limited to the content-addressed payload;
  // source approval still requires rebuilding from the current raw inputs.
  const rebuiltData = {
    version: snapshot.version,
    game: snapshot.game,
    materials: snapshot.materials,
    characters: snapshot.characters,
    relations: snapshot.relations,
    edges: snapshot.edges,
    characterIdentityResolutions: snapshot.characterIdentityResolutions,
    missingMaterials: snapshot.missingMaterials,
    missingCharacters: snapshot.missingCharacters,
    dependencyKey: snapshot.dependencyKey,
    orderDigest: snapshot.orderDigest,
    hold: true as const,
    executable: false as const,
    publishable: false as const,
    releaseCompatible: false as const,
  }
  if (snapshot.snapshotKey !== digest(canonical(rebuiltData))) throw new Error('Material dependency snapshot integrity failure')
  return snapshot
}
