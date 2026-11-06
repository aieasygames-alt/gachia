import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createUnifiedExecutorVerifier } from '../../services/content-cms/src/unified-production'

const [commit, id] = process.argv.slice(2), runID = Number(id)
assert(/^[a-f0-9]{40}$/.test(commit) && Number.isSafeInteger(runID) && runID > 0)
const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const executor = await createUnifiedExecutorVerifier(runID, githubToken)
assert.equal(executor.executorCommit, commit); executor.verify()
const result = { ...executor.executorCI, executorFilesUnchanged: true, observedAt: new Date().toISOString(), cloudWrites: false,
  newExecutorInstalledInCMS: false, productionPromoted: false, sourceAdvanced: false }
writeFileSync(new URL('./ci-exact.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify(result))
