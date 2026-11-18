import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'
import { auditMaterialReleaseDependencies } from '../services/content-cms/src/material-release-dependencies.ts'
import { digest } from '../services/content-cms/src/legacy-intake.ts'

const directory = path.join(import.meta.dirname, 'material-type-expansion-2026-11-18-r129')
const audit = JSON.parse(readFileSync(path.join(directory, 'dependency-audit.json'), 'utf8'))
const inputPin = digest(readFileSync(audit.sourceIndex.path, 'utf8'))
assert.equal(inputPin, 'e15cb281a184d19eb3711a8c31f44e51003624a2923957b08c3bb8ffae3458fa')
const current = await readNteSourceIndex(audit.sourceIndex)
const originalHashes = JSON.parse(readFileSync(path.join(directory, 'published-source-hashes.json'), 'utf8'))
assert.deepEqual(current.sources.map(({ sourcePath, sha256 }: any) => ({ sourcePath, sha256 })), originalHashes)
for (const row of audit.games) assert.deepEqual(auditMaterialReleaseDependencies(row.game, current.sources), row)
assert.equal(digest(readFileSync(audit.sourceIndex.path, 'utf8')), inputPin)
const result = { schemaVersion: 1, kind: 'r129_final_r128_source_recheck', status: 'passed', observedAt: new Date().toISOString(),
  sourceIndex: audit.sourceIndex, sources: current.sources.length, owners: Object.keys(current.owners).sort(),
  unchangedPublishedSources: originalHashes.length, sourceIndexAdvanced: false, cloudWrites: false, cmsWrites: false }
const file = path.join(directory, 'source-recheck.json')
writeFileSync(file, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify(result))
