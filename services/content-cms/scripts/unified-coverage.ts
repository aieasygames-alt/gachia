import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { coverageMarkdown, unifiedCoverage } from '../src/unified-coverage'

const args = process.argv.slice(2)
assert(args.length === 0 || args.length === 2 && args[0] === '--output' && args[1], 'Usage: unified-coverage.ts [--output NEW_DIRECTORY]')
const repo = path.resolve(projectRoot, '../..')
const read = (file: string) => JSON.parse(readFileSync(path.join(repo, file), 'utf8'))
const inventory = read(`${baselineDirectory}/inventory.json`)
const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const report = unifiedCoverage(plan, read('packages/core/route-ownership.json'), read('packages/data/raw-content-review.json').pairs)
if (args.length) {
  const directory = path.resolve(args[1])
  mkdirSync(directory, { mode: 0o700 })
  writeFileSync(path.join(directory, 'coverage.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  writeFileSync(path.join(directory, 'coverage.md'), coverageMarkdown(report), { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ directory, ...report.summary, cloudWrites: false }))
} else console.log(JSON.stringify(report, null, 2))
