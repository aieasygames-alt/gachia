import { getRouteOwner } from '../../../packages/core/route-ownership'
import { digest } from './legacy-intake'
import { canonical, LOCALES, type Candidate } from './record-mapping'
import { materialDependencyPreview } from './material-public-preview'

// Reviewed reader code, not authorization. Drift requires explicit adapter review.
export const CHARACTER_READER_SOURCES = {
  'packages/data/games/starrail/characters.ts': '60a655d636d04a98e7384da02c6413f4f2cdb0c032cac6d4330b73c6c0092f3f',
  // R139: reviewed R138 specialJump/passive3 aggregation; summary identity and eligibility stay intact.
  'packages/data/games/genshin/characters.ts': '4d96c8c5d824857a0f64c9a14b93ace26673c04536314ed58041cc3deb7ae30d',
  'packages/data/games/nte/characters.ts': '3ed63bffe5fcdf7d7089de3bf921c3d7b41a2f0a49d4a0377ce45b737f189e29',
  'packages/data/image-base.ts': 'd10531db0ad4a4fd16c98ef1818f6d34a71175687a4ccec23ef34d40fd1a84ac',
}
export function verifyCharacterReaderSources(actual: Record<string, string>) {
  if (canonical(actual) !== canonical(CHARACTER_READER_SOURCES)) throw new Error('Character reader policy drift; review adapter before reuse')
}

export function characterDependencyPreview(game: string, candidates: Candidate[], relations: unknown, characters: unknown, readerHashes: Record<string, string>) {
  verifyCharacterReaderSources(readerHashes)
  const graph = materialDependencyPreview(game, candidates, relations, characters)
  const records = characters as Record<string, unknown>[]
  const summaries = records.map(row => {
    const id = row.id as string // Identity shape and uniqueness checked by the dependency graph.
    const names: { locale: typeof LOCALES[number]; value: string | null }[] = []
    for (const [locale, key] of [['zh', 'name'], ['en', 'nameEn'], ['ja', 'nameJa']] as const) {
      if (!Object.hasOwn(row, key)) continue
      if (row[key] !== null && typeof row[key] !== 'string') throw new Error('Invalid character name')
      names.push({ locale, value: row[key] as string | null })
    }
    if (typeof row.name !== 'string' || !row.name.trim()) throw new Error('Missing character name')
    const element = row[game === 'nte' ? 'attribute' : 'element']
    if (typeof element !== 'string' || !element.trim()) throw new Error('Invalid character element')
    if (Object.hasOwn(row, 'status') && typeof row.status !== 'string') throw new Error('Invalid character status')
    if (Object.hasOwn(row, 'availableAtLaunch') && typeof row.availableAtLaunch !== 'boolean') throw new Error('Invalid launch eligibility')
    const eligible = row.status !== 'upcoming' && (game !== 'nte' || row.availableAtLaunch !== false)
    const pathname = game === 'nte' ? `/images/characters/${id}.webp` : `/images/${game}/characters/${id}.webp`
    const dto = { schema: 'material-character-summary-v1', game, id, element, names,
      routes: LOCALES.map(locale => { const path = `/${locale}/${game}/characters/${id}`; return { locale, path, owner: getRouteOwner(path) } }),
      image: { url: `https://img.gachia.com${pathname}`, pathname, role: 'related-character-thumbnail' } }
    return { dto, dtoKey: digest(canonical(dto)), sourceDigest: digest(canonical(row)), eligible,
      media: { bytesVerified: false, rightsVerified: false }, publishable: false }
  })
  const byId = new Map(summaries.map(summary => [summary.dto.id, summary]))
  const links = graph.related.map(row => ({ materialId: row.materialId,
    characters: row.characterIds.map(id => {
      const summary = byId.get(id)
      return { id, state: !summary ? 'missing' : summary.eligible ? 'eligible-preview' : 'excluded-by-reader-policy',
        dtoKey: summary?.dtoKey ?? null, paths: summary?.eligible ? summary.dto.routes : [] }
    }) }))
  const data = { version: 'character-dependency-preview-v1', game, dependencyKey: graph.previewKey,
    readerPolicy: digest(canonical(readerHashes)), summaries, links,
    characterIdentityResolutions: graph.characterIdentityResolutions,
    missingMaterials: graph.missingMaterials, missingCharacters: graph.missingCharacters,
    blockers: ['media-bytes-and-rights-unverified', 'character-detail-content-unverified', 'page-links-and-derived-copy-incomplete',
      'locale-fallback-policy-unapproved', 'collection-order-unmapped', 'content-approval-absent',
      ...(graph.missingMaterials.length ? ['missing-material-references'] : []), ...(graph.missingCharacters.length ? ['missing-character-references'] : [])],
    dependencyClosureComplete: false, publishable: false, releaseCompatible: false }
  return { ...data, previewKey: digest(canonical(data)) }
}
