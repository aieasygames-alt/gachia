import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { literalModule } from '../src/literal-module'
import { auditNteItems, locales, type ItemObservation } from '../src/nte-item-audit'
import { projectRoot } from '../src/local-environment'
import { readLegacySources, digest } from '../src/legacy-intake'

// Public apps are CommonJS package scopes; use their actual exports under the tsx loader.
const require = createRequire(import.meta.url)
const { getItemData, getItemListData, getCharactersNeedingMaterial } = require('../../../apps/web/lib/game-data/items.ts') as typeof import('../../../apps/web/lib/game-data/items')
const { materials, getNteMaterialName, materialType, materialSource } = require('../../../apps/game-nte/lib/data.ts') as typeof import('../../../apps/game-nte/lib/data')

const root = path.resolve(projectRoot, '../..')
const output = path.resolve(root, process.argv[2] ?? 'reports/payload-real-slice-2026-11-01/semantics.json')
if (!output.startsWith(root + '/reports/')) throw new Error('New report path required')
const source = readLegacySources().sources.find(row => row.sourcePath === 'packages/data/games/nte/raw-materials.json')!
const raw = JSON.parse(source.rawText)
const detailSource = readFileSync(path.join(root, 'apps/web/app/[lang]/[game]/items/[id]/page.tsx'), 'utf8')
const parsed = ts.createSourceFile('page.tsx', detailSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const labels = parsed.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
  .find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'TYPE_LABELS')
assert.ok(labels?.initializer, 'Explicit type-label contract missing')
const typeLabels = literalModule(`const labels = ${labels.initializer.getText(parsed)}`, 'labels.ts').read('labels') as Record<string, Record<string, string>>
const observations: ItemObservation[] = []
for (const locale of locales) {
  const list = await getItemListData('nte', locale)
  for (const row of list) {
    const detail = await getItemData('nte', row.id, locale)
    assert.ok(detail)
    assert.deepEqual({ id: detail.id, name: detail.name, type: detail.type, source: detail.source, rarity: detail.rarity }, row)
  }
  observations.push({ locale, main: list.map(row => ({ ...row, displayType: typeLabels[row.type]?.[locale] ?? row.type })), nte: materials.map(row => ({ id: row.id, name: getNteMaterialName(row, locale),
    type: materialType(row, locale), displayType: materialType(row, locale), source: materialSource(row, locale), rarity: row.rarity! })) })
}
const audit = auditNteItems(raw, observations)
const dependencies = await Promise.all(audit.materials.map(async row => ({ id: row.id, characters: await getCharactersNeedingMaterial('nte', row.id) })))
const inputs = ['packages/data/games/nte/raw-materials.json', 'packages/data/games/nte/raw-character-materials.json', 'packages/data/games/nte/raw-characters.json',
  'packages/data/games/nte/items.ts', 'packages/data/games/nte/extras.ts', 'packages/data/games/nte/characters.ts', 'packages/data/games/nte/types.ts',
  'apps/web/lib/game-data/items.ts', 'apps/game-nte/lib/data.ts', 'apps/game-nte/app/[lang]/nte/items/page.tsx',
  'apps/web/app/[lang]/[game]/items/[id]/page.tsx', 'packages/core/route-ownership.json']
const result = { ...audit, dependencies, inputs: inputs.map(file => ({ path: file, sha256: digest(readFileSync(path.join(root, file), 'utf8')) })),
  execution: 'Known inspected repository readers executed read-only; no DB/network; all NTE material records and three locale projections compared',
  notCovered: ['full rendered derived copy', 'search', 'aliases', 'real rights and editorial decisions'] }
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ output, auditKey: audit.auditKey, ...audit.counts, publishable: false }, null, 2))
