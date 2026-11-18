import assert from 'node:assert/strict'
import { getRouteOwner } from '../../../packages/core/route-ownership'
import { searchProjection } from '../../../packages/data/scripts/game-public-projections.mjs'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import { escapeCharacterText } from './unified-character-text'
import type { SourceBytes } from './unified-export'

type Locale = 'zh' | 'en' | 'ja'
type MaterialRow = { id: string; name: string; nameEn?: string | null; nameJa?: string | null }
export type MaterialPageExpectation = { path: string; owner: string; locale: Locale; indexable: boolean; id?: string; name?: string; links: string[] }

// Consumer assertions are source-derived, rather than booleans supplied by a reviewer.
export function materialConsumerContract(game: string, sources: SourceBytes[]) {
  const graph = auditMaterialReleaseDependencies(game, sources)
  const source = sources.find(row => row.sourcePath === `packages/data/games/${game}/raw-materials.json`)!
  const materials = JSON.parse(source.text) as MaterialRow[]
  const pages: MaterialPageExpectation[] = []
  for (const locale of ['zh', 'en', 'ja'] as const) {
    const collection = `/${locale}/${game}/items`
    if (!materials.length) continue
    // Preserve the existing NTE Japanese hub policy; material DETAILS remained
    // indexable in all locales during the R120 owner migration.
    pages.push({ path: collection, owner: getRouteOwner(collection), locale, indexable: game !== 'nte' || locale !== 'ja',
      links: materials.map(row => `${collection}/${row.id}`) })
    for (const row of materials) {
      const name = locale === 'zh' ? row.name : locale === 'ja' ? row.nameJa ?? row.nameEn ?? row.name : row.nameEn ?? row.name
      const route = `${collection}/${row.id}`
      // Reverse relation consumers are independently implemented in these applications.
      // WuWa uses inline character fields instead of raw-character-materials; it needs a separate adapter.
      const reverseLinks = ['nte', 'starrail', 'guihuan', 'endfield'].includes(game)
        ? [...new Set(graph.edges.filter(edge => edge.materialId === row.id).flatMap(edge =>
          graph.characterResolutions.find(resolution => resolution.sourceId === edge.characterId)?.displayVariantIds ?? []))]
          .map(id => `/${locale}/${game}/characters/${id}`) : []
      pages.push({ path: route, owner: getRouteOwner(route), locale, indexable: true, id: row.id, name, links: [collection, ...reverseLinks] })
    }
  }
  return { policy: 'material-consumer-contract-v1', game, dependencyAuditKey: graph.auditKey,
    raw: graph.sources.filter(row => /raw-(?:materials|character-materials)\.json$/.test(row.sourcePath)).map(row => ({
      path: row.sourcePath.replace('packages/data/games/', '/data/'), value: JSON.parse(sources.find(source => source.sourcePath === row.sourcePath)!.text),
    })),
    search: Object.fromEntries((['zh', 'en', 'ja'] as const).map(locale => [locale, searchProjection(materials, locale)])),
    pages, materialCount: materials.length, dependencyClosureComplete: graph.dependencyClosureComplete,
    productionQualified: false as const }
}

export function assertMaterialPageConsumer(expected: MaterialPageExpectation, status: number, html: string) {
  assert.equal(status, 200, `Material consumer status: ${expected.path}`)
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]
  assert(main, `Missing material page main content: ${expected.path}`)
  const noindex = /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html)
  assert.equal(noindex, !expected.indexable, `Material robots policy drift (noindex): ${expected.path}`)
  const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)]
  assert.equal(canonical.length, 1, `Material canonical missing/duplicated: ${expected.path}`)
  assert.equal(canonical[0][1], 'https://gachia.com' + expected.path, `Material canonical drift: ${expected.path}`)
  if (expected.name !== undefined) {
    const h1 = main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    assert.equal(h1?.replace(/<[^>]*>/g, ''), escapeCharacterText(expected.name), `Material rendered name drift: ${expected.path}`)
  }
  for (const link of expected.links) assert(main.includes(`href="${link}"`), `Missing material consumer link: ${expected.path} -> ${link}`)
}

export function assertMaterialSearchConsumer(contract: ReturnType<typeof materialConsumerContract>, locale: Locale, value: unknown) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Invalid aggregate search JSON')
  const scope = (value as Record<string, { items?: unknown }>)[contract.game]
  // A missing scope is an explicit consumer gap, never evidence of successful parity.
  assert(scope && Object.hasOwn(scope, 'items'), `Missing material search consumer: ${contract.game}/${locale}`)
  assert.deepEqual(scope.items, contract.search[locale], `Material search projection drift: ${contract.game}/${locale}`)
}

type Expectation = { owner: string; path: string; status: number; contains?: string[]; materialPage?: MaterialPageExpectation }
export function mergeMaterialConsumerExpectations(provided: Expectation[], contracts: ReturnType<typeof materialConsumerContract>[]) {
  const result = structuredClone(provided)
  for (const page of contracts.flatMap(contract => contract.pages)) {
    const contains = [...(page.name === undefined ? [] : [`>${escapeCharacterText(page.name)}<`]), ...page.links.map(link => `href="${link}"`)]
    const existing = result.find(row => row.owner === page.owner && row.path === page.path)
    if (existing) {
      assert.equal(existing.status, 200, 'Cannot replace material consumer status')
      assert(existing.contains, 'Cannot remove material consumer assertions')
      if (existing.materialPage) assert.deepEqual(existing.materialPage, page, 'Cannot replace source-derived material consumer')
      existing.contains = [...new Set([...existing.contains, ...contains])]
      existing.materialPage = structuredClone(page)
    } else result.push({ owner: page.owner, path: page.path, status: 200, contains, materialPage: structuredClone(page) })
  }
  return result
}
