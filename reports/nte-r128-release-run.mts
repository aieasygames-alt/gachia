import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { migrationSave } from '../scripts/genshin-migration-http.mjs'
import { digest } from '../scripts/desktop-release-assets.mjs'
import { desktopCloudSnapshot } from '../scripts/desktop-cloud-release.mjs'
import { unifiedProductionRead } from '../scripts/unified-production-transport.mjs'
import { readUnifiedVersion } from '../scripts/unified-version-identity.mjs'
import { readMigrationRouterVersion } from '../scripts/genshin-migration-router.mjs'
import { prepareNteDataOnlyProduction, activateNteProduction, advanceNteProduction } from '../services/content-cms/src/nte-release-production.ts'
import { nteReleaseKey } from '../services/content-cms/src/nte-release-history.ts'
import { createUnifiedExecutorVerifier } from '../services/content-cms/src/unified-production.ts'

const root = path.resolve(import.meta.dirname)
const sourceIndex = { path: '/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/nte-r127-remediation-2026-11-17/qualification-02/nte-published-sources-01/source-index.json', pin: '60d832f0b70fdf92159ffc7728295bf9ce0694e1b90204e286617363f8e96eb8' }
const proxy = 'http://127.0.0.1:1087'
const load = (name: string) => JSON.parse(readFileSync(path.join(root, name), 'utf8'))
const save = (name: string, value: unknown) => migrationSave(root, name, value)
const runID = () => { const value = Number(process.env.NTE_EXECUTOR_RUN_ID); assert(Number.isSafeInteger(value) && value > 0, 'Exact R128 CI run ID required'); return value }
const cloudToken = (minimumMinutes = 20) => {
  const auth = JSON.parse(execFileSync('/opt/homebrew/bin/python3', ['-c', 'import tomllib,json,sys;print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', path.join(homedir(), '.wrangler/config/default.toml')], { encoding: 'utf8' }))
  assert(auth.oauth_token && Date.parse(auth.expiration_time) - Date.now() > minimumMinutes * 60000, 'Refresh Cloudflare authentication before this bounded stage')
  return auth.oauth_token as string
}
const githubToken = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8' }).trim()

const action = process.argv[2]
mkdirSync(root, { recursive: true, mode: 0o700 })
console.log(JSON.stringify({ phase: action, at: new Date().toISOString() }))
let result: any
if (action === 'prepare') {
  result = await prepareNteDataOnlyProduction({ sourceIndex, directory: path.join(root, 'prepare') })
  save('prepared.json', result)
} else if (action === 'activate') {
  const request = { schemaVersion: 1, kind: 'nte_release_request', bundle: load('prepared.json').proof, executorRunID: runID(), previewProxy: proxy, publicProxy: proxy }
  save('request.json', request)
  const releaseKey = nteReleaseKey(request, (await createUnifiedExecutorVerifier(runID(), githubToken())).executorCI, false)
  result = await activateNteProduction({ request, cloudToken: cloudToken(35), releaseKey, directory: path.join(root, 'production') })
  save('result.json', result)
} else if (action === 'advance') {
  result = await advanceNteProduction({ completion: load('result.json').proof, executorRunID: runID(), directory: path.join(root, 'published-sources'), cloudToken: cloudToken() })
  save('source-result.json', result)
} else if (action === 'snapshot') {
  const token = cloudToken()
  result = { observedAt: new Date().toISOString(), snapshot: await desktopCloudSnapshot(token, unifiedProductionRead), nte: await readUnifiedVersion({ service: 'gachia-game-nte', versionId: (await desktopCloudSnapshot(token, unifiedProductionRead)).services['gachia-game-nte'].versionId, token, request: unifiedProductionRead }), router: await readMigrationRouterVersion({ versionId: (await desktopCloudSnapshot(token, unifiedProductionRead)).services['gachia-router'].versionId, token, request: unifiedProductionRead }) }
  save('snapshot.json', result)
} else throw new Error('Expected prepare, activate, advance or snapshot')
console.log(JSON.stringify({ phase: action, status: 'completed', proof: result?.proof, at: new Date().toISOString() }))
