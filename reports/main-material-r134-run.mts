import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { migrationSave } from '../scripts/genshin-migration-http.mjs'
import { activeVersion, assertTopology, desktopCloudSnapshot } from '../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET, diskSpace } from '../scripts/desktop-disk-preflight.mjs'
import { unifiedProductionRead } from '../scripts/unified-production-transport.mjs'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'
import { prepareMainMaterialConsumerMigration, activateMainContentRestoration, advanceMainContentRestoration } from '../services/content-cms/src/main-content-restoration.ts'

const repo = path.resolve(import.meta.dirname, '..'), root = path.join(import.meta.dirname, 'main-material-migration-2026-11-19-r134')
const sourceIndex = { path: path.join(repo, 'reports/nte-material-r130-2026-11-18/published-sources-02/source-index.json'), pin: '6aed8261c80cdddf39739777f724b94eee2a5f72bae114603637ff4b34e5a4a6' }
const proxy = 'http://127.0.0.1:1087', save = (file: string, value: unknown) => migrationSave(root, file, value)
const load = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
function cloudToken(minutes = 15) {
  const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
  const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
  assert(Date.parse(field('expiration_time')) - Date.now() > minutes * 60000, 'Refresh cloud auth before this stage')
  return field('oauth_token') as string
}
const phase = process.argv[2]; mkdirSync(root, { recursive: true, mode: 0o700 })
console.log(JSON.stringify({ phase, at: new Date().toISOString() }))
let result: any
if (phase === 'baseline') {
  const sources = await readNteSourceIndex(sourceIndex), token = cloudToken(10)
  assert.equal(sources.sources.length, 115); assert.equal(sources.allOwnersCurrent, true)
  const before = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(sources.baseline, before)
  const after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(before, after)
  result = { sourceIndex, sourceHashes: sources.sources.map(({ sourcePath, sha256 }: any) => ({ sourcePath, sha256 })),
    before, after, budget: assertDiskBudget({ path: root, operation: 'Main consumer production build', estimatedBytes: BUILD_TEMP_BUDGET }), cloudWrites: false }
  save('baseline.json', result)
} else if (phase === 'prepare') {
  assert(!existsSync(path.join(root, 'prepared.json')))
  result = await prepareMainMaterialConsumerMigration({ sourceIndex, directory: path.join(root, process.env.MAIN_PREPARE_DIRECTORY ?? 'prepare') })
  save('prepared.json', result)
} else if (phase === 'activate') {
  assert(!existsSync(path.join(root, 'production')), 'Do not replay production writes')
  const executorRunID = Number(process.env.MAIN_EXECUTOR_RUN_ID); assert(Number.isSafeInteger(executorRunID) && executorRunID > 0)
  result = await activateMainContentRestoration({ bundle: load('prepared.json').proof, executorRunID, cloudToken: cloudToken(35), directory: path.join(root, 'production'), proxy })
  save('result.json', result)
} else if (phase === 'advance') {
  result = await advanceMainContentRestoration({ completion: load('result.json').proof, directory: path.join(root, process.env.MAIN_ADVANCE_DIRECTORY ?? 'published-sources'), cloudToken: cloudToken(), proxy })
  save('source-result.json', result)
} else if (phase === 'snapshot') {
  const snapshot = await desktopCloudSnapshot(cloudToken(5), unifiedProductionRead)
  result = { snapshot, active: Object.fromEntries(Object.keys(snapshot.services).map(service => [service, activeVersion(snapshot, service)])), disk: diskSpace(root) }
  save(process.env.MAIN_SNAPSHOT_FILE ?? 'snapshot.json', result)
} else throw Error('Unknown bounded phase')
console.log(JSON.stringify({ phase, completed: true, proof: result?.proof, at: new Date().toISOString() }))
