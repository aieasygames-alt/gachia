import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { canonical, mapBatch, type Candidate } from './record-mapping'
import { digest, readLegacySources } from './legacy-intake'
import { projectRoot } from './local-environment'
import { baselineDirectory } from './inventory-baseline'
import { getRouteOwner } from '../../../packages/core/route-ownership'
export const root = path.resolve(projectRoot, '../..')
function registryConstants() {
  const file = 'packages/core/constants/index.ts'
  const literal = (node: ts.Expression): unknown => {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression)
    if (ts.isStringLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) throw new Error('Unsupported registry property')
      return [property.name.text, literal(property.initializer)]
    }))
    throw new Error('Non-literal registry requires explicit review')
  }
  const result: Record<string, unknown> = {}
  for (const statement of ts.createSourceFile(file, readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true).statements) {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && ['GAME_IDS', 'GAMES'].includes(declaration.name.text) && declaration.initializer) result[declaration.name.text] = literal(declaration.initializer)
    }
  }
  return result
}
export function presence(value: unknown) { return value === undefined ? 'absent' : value === null ? 'null' : value === '' ? 'empty' : 'value' }
export function mediaReferences(value: unknown, pointer = ''): { pointer: string; value: string }[] {
  if (Array.isArray(value)) return value.flatMap((entry, i) => mediaReferences(entry, `${pointer}/${i}`))
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, entry]) => mediaReferences(entry, `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`))
  return typeof value === 'string' && (/\.(?:webp|png|jpe?g|gif|svg|avif)(?:[?#].*)?$/i.test(value) || /\/(?:image|icon|portrait|avatar|imageUrl)$/i.test(pointer) && /^(?:https?:\/\/|\/images\/)/.test(value)) ? [{ pointer, value }] : []
}
function walk(directory: string): string[] {
  if (!existsSync(path.join(root, directory))) return []
  return readdirSync(path.join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    if (entry.isSymbolicLink() || ['node_modules', '.next', '.git', '.open-next', 'reports', '.local', '.wrangler'].includes(entry.name)) return []
    const relative = `${directory}/${entry.name}`
    return entry.isDirectory() ? walk(relative) : [relative]
  })
}
export function candidateLedger(row: Candidate) {
  return { stableKey: row.stableKey, revisionKey: row.revisionKey, scope: row.gameKey, family: row.family, legacyId: row.legacyId,
    sourcePath: row.sourcePath, origin: row.origin ?? null, mappingLevel: row.mappingLevel,
    mappedTopLevelFields: Object.keys(JSON.parse(row.rawRecord)).filter(key => !row.unmappedFields.includes(key)).sort(), unmappedFields: row.unmappedFields,
    locales: ['zh', 'en', 'ja'].map(locale => { const text = row.translations.find(entry => entry.locale === locale)
      return { locale, title: presence(text?.title), body: presence(text?.body), summary: presence(text?.summary), faqEntries: row.faqs?.filter(entry => entry.locale === locale).length ?? 0, indexability: 'not-verified' } }),
    candidateURLs: row.routeCandidates.map(route => ({ ...route, actualSourceOwner: getRouteOwner(route.path), liveVerified: false })),
    owners: [...new Set(row.routeCandidates.map(route => getRouteOwner(route.path)))].sort(), aliasStatus: 'unverified', authority: 'legacy', hold: true,
    editorialDecision: 'not-read-from-db', publishable: false, mediaReferences: mediaReferences(JSON.parse(row.rawRecord)),
    dependencyStatus: 'requires-type-specific-review', blockers: ['editorial-acceptance', 'url-alias-locale-audit', 'dependency-closure',
      ...(row.unmappedFields.length ? ['unmapped-fields'] : []), ...(!row.routeCandidates.length ? ['no-candidate-url'] : [])] }
}
export function buildContentLedger() {
  const readJSON = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
  const inventory = readJSON(baselineDirectory + '/inventory.json')
  const registry = registryConstants()
  if (canonical(registry.GAME_IDS) !== canonical(inventory.scopes.map((scope: { id: string }) => scope.id)) ||
    canonical(registry.GAMES) !== canonical(Object.fromEntries(inventory.scopes.map((scope: { id: string; registry: unknown }) => [scope.id, scope.registry])))) {
    throw new Error('Registry drift: rebuild and review the inventory before claiming complete scope coverage')
  }
  const baseline = readJSON('reports/payload-migration-2026-10-28/record-plan-v2.json')
  const { sources } = readLegacySources()
  const policyEvidence = baseline.policyEvidence.map((entry: { path: string; digest: string }) => ({ path: entry.path, digest: digest(readFileSync(path.join(root, entry.path), 'utf8')), previousDigest: entry.digest }))
  const policy = { digest: digest(canonical(policyEvidence.map(({ path, digest }: { path: string; digest: string }) => ({ path, digest })))), routes: readJSON('packages/core/route-ownership.json') }
  const batch = mapBatch(sources, policy)
  const candidates = batch.sources.flatMap(source => source.records.map(candidateLedger))
  const knownSources = new Set(sources.map(source => source.sourcePath))
  const codeFiles = [...walk('apps'), ...walk('packages')].filter(file => /\.(?:ts|tsx|mjs)$/.test(file) && !/\.test\.|\/__tests__\/|\/tests\/|\/scripts\//.test(file))
  const codeSet = new Set(codeFiles), inputEvidence: { path: string; sha256: string }[] = []
  function resolveImport(file: string, specifier: string) {
    const app = file.match(/^apps\/[^/]+/)?.[0]
    const base = specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))
      : specifier.startsWith('@/') && app ? `${app}/${specifier.slice(2)}` : specifier.startsWith('@gachia/') ? specifier.replace('@gachia/', 'packages/') : null
    if (!base || base.startsWith('../')) return null
    return [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`, `${base}/index.tsx`].find(candidate => codeSet.has(candidate) || knownSources.has(candidate)) ?? null
  }
  const graph: { importer: string; specifier: string; target: string | null }[] = [], inlineReview: { path: string; sha256: string; status: string }[] = []
  for (const file of codeFiles.sort()) {
    const text = readFileSync(path.join(root, file), 'utf8'), sha256 = digest(text); inputEvidence.push({ path: file, sha256 })
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) graph.push({ importer: file, specifier: node.moduleSpecifier.text, target: resolveImport(file, node.moduleSpecifier.text) })
      ts.forEachChild(node, visit)
    }
    visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true))
    if (/\/app\/.*(?:page|layout)\.tsx$/.test(file) && !file.includes('/shadow/')) inlineReview.push({ path: file, sha256, status: 'inline-facts-and-derived-semantics-unreviewed' })
  }
  const reverse = new Map<string, Set<string>>()
  for (const edge of graph) if (edge.target) { const set = reverse.get(edge.target) ?? new Set<string>(); set.add(edge.importer); reverse.set(edge.target, set) }
  function consumers(source: string) {
    const found = new Set<string>(), queue = [source]
    while (queue.length) for (const importer of reverse.get(queue.shift()!) ?? []) if (!found.has(importer)) { found.add(importer); queue.push(importer) }
    return [...found].sort()
  }
  const sourceLedger = batch.sources.map(source => ({ ...source, records: source.records.length, sourceDigest: sources.find(entry => entry.sourcePath === source.sourcePath)!.sourceDigest,
    consumers: consumers(source.sourcePath), consumerEvidence: 'static imports/re-exports only; dynamic/runtime/semantic edges unverified' }))
  const manifest = readJSON('reports/owner-media-manifest-2026-10-31.json'), runtime = readJSON('reports/owner-media-runtime-audit-2026-10-31.json')
  const mediaFiles = ['web', 'game-genshin', 'game-nte', 'game-lvmeng', 'game-azur-promilia'].flatMap(app => walk(`apps/${app}/public`).filter(file => /\.(?:webp|png|jpe?g|gif|svg|avif)$/i.test(file)))
  const media = mediaFiles.sort().map(file => {
    const bytes = readFileSync(path.join(root, file)), sha256 = createHash('sha256').update(bytes).digest('hex')
    // Media hashing must use original bytes, not the text-only source digest helper.
    const app = file.split('/')[1], owner = app === 'web' ? 'main' : app.replace('game-', ''), pathname = file.slice(`apps/${app}/public`.length)
    const prior = manifest.entries.find((entry: { sourcePointer: string }) => entry.sourcePointer === file)
    const http = runtime.results.find((entry: { owner: string; pathname: string }) => entry.owner === owner && entry.pathname === pathname)
    return { owner, pathname, file, bytes: bytes.length, sha256, localExists: true, previousManifestMatches: prior ? prior.sha256 === sha256 && prior.bytes === bytes.length : null,
      historicalHTTPMatches: http ? http.digest === sha256 && http.bytes === bytes.length && http.status === 200 && http.matches === true : null,
      httpEvidence: http ? 'reports/owner-media-runtime-audit-2026-10-31.json' : null, httpRecheckedThisRun: false,
      mimeEvidence: prior?.mime ?? 'not-verified', originURL: null, sourcePointer: prior?.sourcePointer ?? file, rights: 'unverified', rightsReceipt: null, publishable: false }
  })
  const families = [...new Set(candidates.map(row => `${row.scope}/${row.family}`))].sort().map(key => {
    const rows = candidates.filter(row => `${row.scope}/${row.family}` === key)
    return { key, records: rows.length, sourceFiles: [...new Set(rows.map(row => row.sourcePath))].sort(), owners: [...new Set(rows.flatMap(row => row.owners))].sort(), identityOnly: rows.filter(row => row.mappingLevel === 'identity-only').length,
      sections: rows.filter(row => row.origin?.kind === 'section').length, unmappedFields: [...new Set(rows.flatMap(row => row.unmappedFields))].sort(), candidateURLs: rows.reduce((sum, row) => sum + row.candidateURLs.length, 0), publishable: false }
  })
  return { schema: 'content-ledger-v1', sourceCommit: inventory.sourceCommit, batchKey: batch.batchKey, historicalBatchKey: baseline.batchKey, historicalBatchMatches: batch.batchKey === baseline.batchKey,
    policyEvidence, authority: 'legacy', publishable: false, scope: 'All v2 candidate families plus static-code/local-media gaps; not semantic acceptance',
    counts: { scopes: inventory.scopes.length, sources: sources.length, candidates: candidates.length, families: families.length, sections: candidates.filter(row => row.origin?.kind === 'section').length,
      identityOnly: candidates.filter(row => row.mappingLevel === 'identity-only').length, localMedia: media.length, rightsVerified: 0, historicalHTTPMatches: media.filter(row => row.historicalHTTPMatches).length, inlineFilesPending: inlineReview.length },
    scopes: inventory.scopes.map((scope: { id: string; region: string }) => ({ id: scope.id, region: scope.region, accountableEditor: null, freezeWindow: null, authority: 'legacy' })),
    sourceLedger, families, candidates, media, inputEvidence, staticImportGraph: graph, inlineReview,
    gaps: { rawFilesOutsideBaseline: walk('packages/data/games').filter(file => /\/raw-[^/]+\.json$/.test(file) && !knownSources.has(file)),
      missingManifestFiles: manifest.entries.filter((entry: { sourcePointer: string }) => !mediaFiles.includes(entry.sourcePointer)),
      dynamicImportsAndRuntimeBindings: 'unverified', aliasLedger: 'unverified', realDecisions: 'database not read', externalMediaRights: 'no approval',
      externalMediaScan: 'candidate raw fields only; CSS/prose/dynamic paths/remote inventories require separate audit' } }
}
