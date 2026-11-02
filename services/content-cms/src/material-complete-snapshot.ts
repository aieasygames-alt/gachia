import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import { MATERIAL_LINK_POLICY, type buildMaterialLinkPreview } from './material-link-policy'
import { MEDIA_EVIDENCE_SCHEMA, type buildMediaEvidence } from './media-evidence'

export const MATERIAL_COMPLETE_SNAPSHOT = 'material-complete-snapshot-v1'
type LinkPreview = ReturnType<typeof buildMaterialLinkPreview>
type MediaReport = ReturnType<typeof buildMediaEvidence>
type Character = { dto: { id: string }; eligible: boolean; dtoKey: string; media: { bytesVerified: boolean; rightsVerified: boolean } }
type Material = { dto: { material: { id: string } }; dtoKey: string; sourceRevision: string }
export type CompleteMaterialSnapshot = {
  version: typeof MATERIAL_COMPLETE_SNAPSHOT; game: string; routePolicy: string; linkPolicy: typeof MATERIAL_LINK_POLICY
  mediaSchema: typeof MEDIA_EVIDENCE_SCHEMA; materials: Material[]; characters: Character[]; links: LinkPreview; media: MediaReport
  snapshotKey: string; publishable: false; releaseCompatible: false
}

export function buildCompleteMaterialSnapshot(game: string, routePolicy: string, materials: Material[], characters: Character[], links: LinkPreview, media: MediaReport): CompleteMaterialSnapshot {
  if (!materials.length || !characters.length) throw new Error('Incomplete complete snapshot input')
  if (links.game !== game || links.schema !== MATERIAL_LINK_POLICY || links.fallback !== 'none') throw new Error('Complete snapshot link policy mismatch')
  if (media.schema !== MEDIA_EVIDENCE_SCHEMA || !media.complete) throw new Error('Complete snapshot media evidence incomplete')
  if (media.entries.some(entry => !entry.bytesVerified || !entry.rightsVerified)) throw new Error('Complete snapshot media verification missing')
  const characterIDs = characters.filter(row => row.eligible).map(row => row.dto.id)
  if (new Set(characterIDs).size !== characterIDs.length) throw new Error('Duplicate complete character identity')
  if (links.pages.length !== materials.length * 3) throw new Error('Complete snapshot locale closure mismatch')
  const data = { version: MATERIAL_COMPLETE_SNAPSHOT as 'material-complete-snapshot-v1', game, routePolicy,
    linkPolicy: MATERIAL_LINK_POLICY as 'material-link-policy-v1', mediaSchema: MEDIA_EVIDENCE_SCHEMA as 'media-evidence-v1',
    materials: [...materials].sort((a, b) => a.dto.material.id.localeCompare(b.dto.material.id)), characters: [...characters].sort((a, b) => a.dto.id.localeCompare(b.dto.id)), links, media,
    publishable: false as const, releaseCompatible: false as const }
  return { ...data, snapshotKey: digest(canonical(data)) }
}

export function verifyCompleteMaterialSnapshot(snapshot: CompleteMaterialSnapshot): CompleteMaterialSnapshot {
  if (!snapshot || snapshot.version !== MATERIAL_COMPLETE_SNAPSHOT || snapshot.publishable || snapshot.releaseCompatible) throw new Error('Complete snapshot flags or version invalid')
  const rebuilt = buildCompleteMaterialSnapshot(snapshot.game, snapshot.routePolicy, snapshot.materials, snapshot.characters, snapshot.links, snapshot.media)
  if (canonical(snapshot) !== canonical(rebuilt)) throw new Error('Complete snapshot integrity failure')
  return rebuilt
}
