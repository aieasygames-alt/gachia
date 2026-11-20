import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
const repo = path.resolve(import.meta.dirname, '..'), directory = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const load = (name: string) => JSON.parse(readFileSync(path.join(directory, name), 'utf8'))
const pin = (name: string) => digest(readFileSync(path.join(directory, name), 'utf8'))
const shared = ['--input', path.join(directory, 'intake-input.json'), '--input-pin', pin('intake-input.json')]
const run = (args: string[]) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'scripts/genshin-bounded-intake.ts', ...args], { cwd: path.join(repo, 'services/content-cms'), encoding: 'utf8' }))
const result = run(['plan', ...shared, '--output', path.join(directory, 'cli-plan')])
assert.equal(result.proof.pin, pin('reconciliation.json'))
assert.equal(canonical(JSON.parse(readFileSync(result.proof.path, 'utf8'))), canonical(load('reconciliation.json')))
const batch = run(['batch', ...shared, '--plan', result.proof.path, '--plan-pin', result.proof.pin,
  '--selection', path.join(directory, 'compatible-selection.json'), '--selection-pin', pin('compatible-selection.json'), '--output', path.join(directory, 'cli-batch')])
assert.equal(batch.proof.pin, pin('compatible-intake.json'))
assert(batch.hold && !batch.publishable && !batch.cmsWrites && !batch.cloudWrites)
writeFileSync(path.join(directory, 'cli-check.json'), JSON.stringify({ plan: result, batch, exactReplay: true, cmsWrites: false, cloudWrites: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ planReplayed: true, batchReplayed: true, cmsWrites: false, cloudWrites: false }))
