import { getRouteOwner } from '../../../packages/core/route-ownership'
import { canonical, LOCALES } from './record-mapping'
import { digest } from './legacy-intake'

export const MATERIAL_LINK_POLICY = 'material-link-policy-v1'
type CharacterPreview = { dto: { id: string; routes: { locale: string; path: string; owner: string }[] }; eligible: boolean }
type MaterialSummary = { dto: { material: { id: string }; routes: { locale: string; path: string; owner: string; collectionPath: string; collectionOwner: string }[] } }

// A link is usable only when its target was explicitly emitted for the same locale.
export function buildMaterialLinkPreview(game: string, materials: MaterialSummary[], characters: CharacterPreview[]) {
  if (!materials.length) throw new Error('Material link preview requires materials')
  const byMaterial = new Map(materials.map(row => [row.dto.material.id, row]))
  if (byMaterial.size !== materials.length) throw new Error('Duplicate material link identity')
  const byCharacter = new Map(characters.map(row => [row.dto.id, row]))
  if (byCharacter.size !== characters.length) throw new Error('Duplicate character link identity')
  const pages = materials.flatMap(material => material.dto.routes.map(route => {
    const links = {
      collection: { path: route.collectionPath, owner: route.collectionOwner },
      locales: LOCALES.map(locale => ({ locale, path: `/${locale}/${game}/items/${material.dto.material.id}`, owner: getRouteOwner(`/${locale}/${game}/items/${material.dto.material.id}`) })),
    }
    if (links.locales.some(link => link.owner !== route.owner && game !== 'nte')) throw new Error('Material owner drift')
    return { locale: route.locale, path: route.path, owner: route.owner, links }
  }))
  const missingLocaleLinks = pages.flatMap(page => page.links.locales.filter(link => !link.path || !link.owner).map(link => ({ page: page.path, locale: link.locale })))
  const excludedTargets = characters.filter(row => !row.eligible).map(row => row.dto.id).sort()
  const data = { schema: MATERIAL_LINK_POLICY, game, pages, excludedTargets,
    fallback: 'none' as const, localePathsExplicit: true, missingLocaleLinks,
    blockers: ['character-detail-content-unverified', 'media-bytes-and-rights-unverified', 'derived-copy-and-search-links-unverified',
      ...(missingLocaleLinks.length ? ['missing-locale-links'] : [])], publishable: false, releaseCompatible: false }
  return { ...data, linkKey: digest(canonical(data)) }
}
