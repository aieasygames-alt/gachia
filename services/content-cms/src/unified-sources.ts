import ts from 'typescript'
import { isDeepStrictEqual } from 'node:util'
import { digest, readLegacySources, snapshot, type SourceSnapshot } from './legacy-intake'
import { literalModule } from './literal-module'
import { INLINE_CONTRACT } from './inline-contract'
import { readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { projectRoot } from './local-environment'
import { baselineDirectory } from './inventory-baseline'
import { contentUnit, assertJSON, objectValue, type JSONValue, type UnifiedRecord, type Locator } from './unified-content'

export function readUnifiedSources(repository = path.resolve(projectRoot, '../..')) {
  const root = realpathSync(repository)
  const inventory = JSON.parse(readFileSync(path.join(root, baselineDirectory, 'inventory.json'), 'utf8'))
  const legacy = readLegacySources(root)
  for (const scope of inventory.scopes) for (const file of scope.sourceFiles as { path: string; sha256: string }[]) {
    if (!/\/(?:tier-lists|progression)\.ts$/.test(file.path)) continue
    const resolved = realpathSync(path.join(root, file.path))
    if (!resolved.startsWith(root + path.sep)) throw new Error('Unified source escaped the repository')
    const bytes = readFileSync(resolved), text = bytes.toString('utf8')
    if (!Buffer.from(text).equals(bytes) || digest(text) !== file.sha256) throw new Error(`Unified source drift: ${file.path}`)
    legacy.sources.push(snapshot(scope.id, file.path, 'inline-code', text))
  }
  return legacy
}

export function sourceUnits(source: SourceSnapshot) {
  if (source.sourceDigest !== digest(source.rawText)) throw new Error('Source bytes changed')
  const records: UnifiedRecord[] = [], readers: string[] = [], blocked: { symbol: string; reason: string }[] = []
  // Existing CMS-first guides keep their single editorial authority and current release path.
  if (['genshin', 'nte'].includes(source.gameKey) && source.sourcePath === `packages/data/games/${source.gameKey}/raw-guides.json`) {
    return { records, readers, blocked, delegated: 'desktop-guides-v1' }
  }
  const add = (family: string, value: unknown, symbol?: string, splitRows = true) => {
    assertJSON(value)
    if (splitRows && Array.isArray(value) && value.length && value.every(objectValue)) {
      const identity = ['id', 'characterId', 'slug', 'code'].find(key => value.every(row => typeof row[key] === 'string' && row[key]))
      if (identity) {
        const identities = new Set<string>()
        for (const row of value) {
          const selector = { [identity]: row[identity] as string, ...(identity === 'code' && typeof row.region === 'string' && row.region ? { region: row.region } : {}) }
          const key = JSON.stringify(selector)
          if (identities.has(key)) throw new Error(`Duplicate source identity: ${source.sourcePath}/${symbol ?? ''}/${key}`)
          identities.add(key)
          records.push(contentUnit({ game: source.gameKey, family, sourcePath: source.sourcePath, sourceSHA256: source.sourceDigest,
            locator: { ...(symbol ? { symbol } : {}), identity: selector }, original: row }))
        }
        return
      }
    }
    records.push(contentUnit({ game: source.gameKey, family, sourcePath: source.sourcePath, sourceSHA256: source.sourceDigest,
      locator: symbol ? { symbol } : {}, original: value }))
  }
  if (source.sourceKind === 'raw-json') {
    const match = source.sourcePath.match(/\/raw-([a-z-]+)\.json$/)
    if (!match) throw new Error('Unknown raw source')
    add(match[1], JSON.parse(source.rawText))
  } else if (source.sourceKind === 'inline-code') {
    const module = literalModule(source.rawText, source.sourcePath)
    if (/^packages\/data\/games\/[^/]+\/(?:tier-lists|progression)\.ts$/.test(source.sourcePath)) {
      // Edit independent literal inputs, never the derived readers that map or share them across locales.
      for (const binding of module.bindings) {
        if (binding.independent) add(`inline-${binding.name.replaceAll('_', '-')}`, module.read(binding.name), binding.name, false)
        else readers.push(binding.name)
      }
      return { records, readers, blocked, delegated: null }
    }
    for (const unit of module.units) {
      if (unit.kind !== 'constant' || INLINE_CONTRACT[source.gameKey]?.[unit.name]?.mode === 'reader') { readers.push(unit.name); continue }
      let value: unknown
      try { value = module.read(unit.name) }
      catch (error) { blocked.push({ symbol: unit.name, reason: error instanceof Error ? error.message : String(error) }); continue }
      add(`inline-${unit.name.replaceAll('_', '-')}`, value, unit.name)
    }
  } else throw new Error('Not an editable source')
  return { records, readers, blocked, delegated: null }
}

export function locateValue(root: JSONValue, locator: Locator): JSONValue {
  if (!locator.identity) return root
  if (!Array.isArray(root)) throw new Error('Record source is no longer an array')
  const found = root.filter(row => objectValue(row) && Object.entries(locator.identity!).every(([key, value]) => row[key] === value))
  if (found.length !== 1) throw new Error('Public/source record missing or duplicated; explicit rebase required')
  return found[0]
}

export function replaceValue(root: JSONValue, locator: Locator, value: JSONValue): JSONValue {
  const original = locateValue(root, locator)
  if (!locator.identity) return structuredClone(value)
  return (root as JSONValue[]).map(row => row === original ? structuredClone(value) : row)
}

export function readSourceValue(text: string, sourcePath: string, locator: Locator): JSONValue {
  const value: unknown = sourcePath.endsWith('.json') ? JSON.parse(text) : literalModule(text, sourcePath).read(locator.symbol!)
  assertJSON(value)
  return value
}

export function replaceSourceSymbol(text: string, sourcePath: string, symbol: string, value: JSONValue): string {
  const tree = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let expression: ts.Expression | undefined
  for (const statement of tree.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === symbol) expression = declaration.initializer
    }
  }
  if (!expression) throw new Error('Missing literal export')
  // Keep type assertions/satisfies and surrounding imports/readers byte-identical.
  while (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isParenthesizedExpression(expression)) expression = expression.expression
  const encoded = JSON.stringify(value, null, 2).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')
  const output = text.slice(0, expression.getStart(tree)) + encoded + text.slice(expression.end)
  if (!isDeepStrictEqual(literalModule(output, sourcePath).read(symbol), value)) throw new Error('Literal round-trip mismatch')
  return output
}
