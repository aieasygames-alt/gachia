import { parseMaterial, materialSource } from './material-contract'
import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import { getRouteOwner } from '../../../packages/core/route-ownership'

export const locales = ['zh', 'en', 'ja'] as const
type Locale = typeof locales[number]
type View = { id: string; name: string; type: string; source: string; rarity: number; displayType?: string }
export type ItemObservation = { locale: Locale; main: View[]; nte: View[] }

// This compares inspected legacy readers; it does not approve their fallback or copy policy.
export function auditNteItems(raw: unknown[], observations: ItemObservation[]) {
  if (!raw.length) throw new Error('Empty source')
  const materials = raw.map(parseMaterial)
  const ids = materials.map(row => row.id)
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-zA-Z0-9_-]+$/.test(id))) throw new Error('Duplicate or unsafe identity')
  materials.forEach((row, index) => {
    if (canonical(materialSource(row)) !== canonical(raw[index])) throw new Error('Lossy material projection')
  })
  if (canonical(observations.map(row => row.locale).sort()) !== canonical([...locales].sort())) throw new Error('Incomplete or duplicate locale observations')
  const pages = observations.flatMap(observation => {
    for (const reader of [observation.main, observation.nte]) {
      if (canonical(reader.map(row => row.id)) !== canonical(ids)) throw new Error('Legacy reader identity/order drift')
    }
    return materials.map((material, index) => {
      const translation = material.translations.find(row => row.locale === observation.locale)
      const main = observation.main[index], nte = observation.nte[index]
      if (main.rarity !== material.rarity || nte.rarity !== material.rarity || main.type !== material.type) throw new Error('Legacy reader scalar drift')
      const path = `/${observation.locale}/nte/items/${material.id}`
      const collectionPath = `/${observation.locale}/nte/items`
      const differences = (['name', 'type', 'source'] as const).filter(field => main[field] !== nte[field])
        .map(field => ({ field, main: main[field], nte: nte[field] }))
      const renderedTypeDifference = main.displayType !== undefined && nte.displayType !== undefined && main.displayType !== nte.displayType
        ? { main: main.displayType, nte: nte.displayType } : null
      const fallbacks = (['name', 'source'] as const).flatMap(field => {
        const original = translation?.[field]
        return (['main', 'nte'] as const).flatMap(owner => {
          const value = observation[owner][index][field]
          return value !== (original ?? '') ? [{ owner, field, explicitValue: original ?? null, explicitPresence: original === undefined ? 'absent' : original === null ? 'null' : original === '' ? 'empty' : 'value', rendered: value }] : []
        })
      })
      return { id: material.id, locale: observation.locale, path, owner: getRouteOwner(path), collectionPath,
        collectionOwner: getRouteOwner(collectionPath), main, nte, differences, renderedTypeDifference, fallbacks, aliasStatus: 'unverified', indexability: 'not-approved' }
    })
  })
  const data = { schema: 'nte-item-semantic-audit-v1', sourceSHA256: digest(canonical(raw)), materials, pages,
    counts: { materials: materials.length, detailLocaleViews: pages.length, differingViews: pages.filter(row => row.differences.length).length,
      fallbackViews: pages.filter(row => row.fallbacks.length).length, renderedTypeDifferences: pages.filter(row => row.renderedTypeDifference).length },
    roundTripComplete: true, collectionOrderPreserved: true, publicAuthority: 'legacy', publishable: false,
    blockers: ['locale-fallback-policy-unapproved', 'aliases-unverified', 'derived-copy-metadata-jsonld-unmapped', 'dependency-and-media-rights-closure', 'editorial-responsibility-unassigned'] }
  return { ...data, auditKey: digest(canonical(data)) }
}

export function publicationReadiness(input: Partial<{ semanticApproved: boolean; rightsReceiptsAuthenticated: boolean; editorAssigned: boolean; freezeApproved: boolean }>) {
  const gates = ['semanticApproved', 'rightsReceiptsAuthenticated', 'editorAssigned', 'freezeApproved'] as const
  const blockers = gates.filter(key => !Object.hasOwn(input, key) || input[key] !== true)
  return { blockers, ready: blockers.length === 0, publishable: false as const }
}
