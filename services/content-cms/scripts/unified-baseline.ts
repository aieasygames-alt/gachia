import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../src/legacy-intake'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { communityBaseline } from '../src/unified-baseline'

const args = process.argv.slice(2), options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  const key = args[index], value = args[index + 1]
  assert(['--commit', '--pin', '--output'].includes(key) && value && !value.startsWith('--') && !options.has(key), 'Usage: unified-baseline.ts --commit SHA1 --pin PLAN_SHA256 --output NEW_DIRECTORY')
  options.set(key, value)
}
assert.equal(options.size, 3)
const repo = realpathSync(path.resolve(projectRoot, '../..')), commit = options.get('--commit')!
assert(/^[a-f0-9]{40}$/.test(commit), 'Explicit exact code baseline commit required')
const git = (file: string) => execFileSync('git', ['show', `${commit}:${file}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 }).toString('utf8')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
assert.equal(options.get('--pin'), plan.planSHA256, 'Current plan pin required')
const originals = plan.sources.map(source => ({ sourcePath: source.sourcePath, text: git(source.sourcePath), sha256: source.sourceSHA256 }))
const ledger = JSON.parse(git('packages/data/raw-content-review.json'))
const directory = path.resolve(options.get('--output')!)
assert.equal(realpathSync(path.dirname(directory)), path.dirname(directory), 'Linked output parent forbidden')
mkdirSync(directory, { mode: 0o700 })
try {
  const result = await communityBaseline({ plan, originals, pairs: ledger.pairs })
  const save = (file: string, value: unknown) => {
    const text = JSON.stringify(value, null, 2) + '\n'
    writeFileSync(path.join(directory, file), text, { flag: 'wx', mode: 0o600 })
    return digest(text)
  }
  const activePin = save('active.json', result.sources), manifestPin = save('manifest.json', { ...result.manifest, codeCommit: commit, activePin })
  console.log(JSON.stringify({ directory, activePin, manifestPin, sources: result.sources.length, publicResponses: result.manifest.observations.length,
    sourceAuthenticationRequired: false, websiteChanged: false, cloudWrites: false }))
} catch (error) {
  writeFileSync(path.join(directory, 'failure.json'), JSON.stringify({ error: (error as Error).message, cloudWrites: false }), { flag: 'wx', mode: 0o600 })
  throw error
}
