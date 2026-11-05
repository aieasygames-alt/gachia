import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { projectRoot } from '../src/local-environment'
import { AZUR_NAME_CONSUMER, projectAzurRawNames } from '../src/unified-consumers'

const repo = path.resolve(projectRoot, '../..')
const consumer = readFileSync(path.join(repo, AZUR_NAME_CONSUMER), 'utf8')
const raw = readFileSync(path.join(repo, 'packages/data/games/azur-promilia/raw-characters.json'), 'utf8')

test('Azur raw name projection preserves the reviewed profile code and produces valid TypeScript', () => {
  const projected = projectAzurRawNames(consumer, raw)
  assert(projected.includes(consumer))
  assert(projected.startsWith("import cmsRawNames from './raw-characters.json';\n"))
  assert(projected.includes('character.name = { zh: row.name, en: row.nameEn, ja: row.nameJa };'))
  const compiled = ts.transpileModule(projected, { reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  assert.equal(compiled.diagnostics?.filter(row => row.category === ts.DiagnosticCategory.Error).length, 0)
  const rows = JSON.parse(raw)
  rows[0].name = 'Isolated approved raw name'
  assert.doesNotThrow(() => projectAzurRawNames(consumer, JSON.stringify(rows)))
})

test('Azur projection refuses unreviewed runtime code and missing, duplicate or expanded source identities', () => {
  assert.throws(() => projectAzurRawNames(consumer + '\n', raw), /consumer changed/)
  const rows = JSON.parse(raw)
  for (const changed of [rows.slice(1), [...rows.slice(0, -1), rows[0]],
    rows.map((row: object, index: number) => index ? row : { ...row, id: 'unknown-id' }),
    rows.map((row: object, index: number) => index ? row : { ...row, unexpected: 'not editable' }),
    rows.map((row: object, index: number) => index ? row : { ...row, name: 5 })]) {
    assert.throws(() => projectAzurRawNames(consumer, JSON.stringify(changed)), /Azur/)
  }
})
