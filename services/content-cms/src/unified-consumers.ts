import assert from 'node:assert/strict'
import ts from 'typescript'
import { digest } from './legacy-intake'

export const AZUR_NAME_CONSUMER = 'packages/data/games/azur-promilia/characters.ts'
const reviewedConsumerSHA256 = '8446d4d86eb6f7d19bb2cdc414710b573f125a3dddb93587705096b9e780c2cf'

// This is an explicit build projection for the existing source-only name table,
// not permission to execute arbitrary source modules or replace character profiles.
export function projectAzurRawNames(consumer: string, raw: string) {
  assert.equal(digest(consumer), reviewedConsumerSHA256, 'Azur name consumer changed; review the adapter before building')
  const tree = ts.createSourceFile(AZUR_NAME_CONSUMER, consumer, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declaration = tree.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
    .find(row => ts.isIdentifier(row.name) && row.name.text === 'characters')
  assert(declaration?.initializer && ts.isArrayLiteralExpression(declaration.initializer), 'Expected reviewed Azur profile list')
  const ids = declaration.initializer.elements.map(expression => {
    assert(ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && expression.expression.text === 'profile'
      && expression.arguments[0] && ts.isStringLiteral(expression.arguments[0]), 'Unexpected Azur profile identity')
    return expression.arguments[0].text
  })
  const names = JSON.parse(raw) as Record<string, unknown>[]
  assert(Array.isArray(names) && names.length === ids.length && new Set(ids).size === ids.length, 'Azur name table membership changed')
  for (const row of names) assert(row && Object.keys(row).sort().join(',') === 'id,name,nameEn,nameJa'
    && ['id', 'name', 'nameEn', 'nameJa'].every(key => typeof row[key] === 'string') && ids.includes(row.id as string), 'Invalid Azur name table')
  assert.equal(new Set(names.map(row => row.id)).size, ids.length, 'Duplicate Azur name identity')
  return `import cmsRawNames from './raw-characters.json';\n${consumer}\n`
    + `const cmsNamesById = new Map(cmsRawNames.map((row) => [row.id, row]));\n`
    + `for (const character of characters) {\n`
    + `  const row = cmsNamesById.get(character.id);\n`
    + `  if (!row) throw new Error('Missing reviewed Azur character name');\n`
    + `  character.name = { zh: row.name, en: row.nameEn, ja: row.nameJa };\n`
    + `}\n`
}
