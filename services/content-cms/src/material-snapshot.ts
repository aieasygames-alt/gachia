import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import { MATERIAL_LINK_POLICY, type buildMaterialLinkPreview } from './material-link-policy'

export const MATERIAL_SNAPSHOT_SCHEMA = 'material-snapshot-v1'
type LinkPreview = ReturnType<typeof buildMaterialLinkPreview>
type Material = { dto: { material: { id: string }; routes: unknown[] }; dtoKey: string; sourceRevision: string }

export type MaterialSnapshot = {
  version: typeof MATERIAL_SNAPSHOT_SCHEMA; game: string; routePolicy: string; linkPolicy: typeof MATERIAL_LINK_POLICY
  materials: Material[]; links: LinkPreview; snapshotKey: string; publishable: false; releaseCompatible: false
}

export function buildMaterialSnapshot(game: string, routePolicy: string, materials: Material[], links: LinkPreview): MaterialSnapshot {
  if (!game || !routePolicy || !materials.length) throw new Error('Incomplete material snapshot input')
  if (links.game !== game || links.schema !== MATERIAL_LINK_POLICY || links.fallback !== 'none') throw new Error('Material link policy mismatch')
  const ids = materials.map(row => row.dto.material.id)
  if (new Set(ids).size !== ids.length || links.pages.length !== materials.length * 3) throw new Error('Material snapshot identity or locale closure mismatch')
  const data = { version: MATERIAL_SNAPSHOT_SCHEMA as 'material-snapshot-v1', game, routePolicy, linkPolicy: MATERIAL_LINK_POLICY as 'material-link-policy-v1',
    materials: [...materials].sort((a, b) => a.dto.material.id.localeCompare(b.dto.material.id)), links,
    publishable: false as const, releaseCompatible: false as const }
  return { ...data, snapshotKey: digest(canonical(data)) }
}

export function verifyMaterialSnapshot(snapshot: MaterialSnapshot): MaterialSnapshot {
  if (!snapshot || snapshot.version !== MATERIAL_SNAPSHOT_SCHEMA || snapshot.publishable || snapshot.releaseCompatible) throw new Error('Material snapshot flags or version invalid')
  if (snapshot.linkPolicy !== MATERIAL_LINK_POLICY || snapshot.links.schema !== MATERIAL_LINK_POLICY || snapshot.links.fallback !== 'none') throw new Error('Material snapshot link policy invalid')
  const rebuilt = buildMaterialSnapshot(snapshot.game, snapshot.routePolicy, snapshot.materials, snapshot.links)
  if (canonical(snapshot) !== canonical(rebuilt)) throw new Error('Material snapshot integrity failure')
  return rebuilt
}
