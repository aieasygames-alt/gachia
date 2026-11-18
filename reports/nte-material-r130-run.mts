import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { digest } from '../scripts/desktop-release-assets.mjs'
import { migrationSave } from '../scripts/genshin-migration-http.mjs'
import { diskSpace, treeBytes } from '../scripts/desktop-disk-preflight.mjs'
import { activeVersion, assertTopology, desktopCloudSnapshot } from '../scripts/desktop-cloud-release.mjs'
import { unifiedProductionRead } from '../scripts/unified-production-transport.mjs'
import { readNteSourceIndex, nteReleaseKey } from '../services/content-cms/src/nte-release-history.ts'
import { prepareNteIndependentProduction, activateNteProduction, advanceNteProduction } from '../services/content-cms/src/nte-release-production.ts'
import { createUnifiedExecutorVerifier } from '../services/content-cms/src/unified-production.ts'
import { readUnifiedSources } from '../services/content-cms/src/unified-sources.ts'
import { unifiedPlan } from '../services/content-cms/src/unified-plan.ts'
import { baselineDirectory } from '../services/content-cms/src/inventory-baseline.ts'
const repo = path.resolve(import.meta.dirname, '..'), root = path.join(import.meta.dirname, 'nte-material-r130-2026-11-18')
const sourceIndex = { path: path.join(repo, 'reports/nte-r128-zero-reader-2026-11-18/published-sources/source-index.json'), pin: 'e15cb281a184d19eb3711a8c31f44e51003624a2923957b08c3bb8ffae3458fa' }
const base = 'http://127.0.0.1:3100', proxy = 'http://127.0.0.1:1087'
const materialID = 'collectors-drama-core', beforeText = "Collector's Drama Core", afterText = 'Collector’s Drama Core'
const save = (name: string, value: unknown) => migrationSave(root, name, value)
const load = (name: string) => JSON.parse(readFileSync(path.join(root, name), 'utf8'))
const plan = () => unifiedPlan(readUnifiedSources(repo).sources, JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8')).scopes.map((row: any) => row.id))
const template = () => plan().sources.find(row => row.sourcePath === 'packages/data/games/nte/raw-materials.json')!.records.find(row => row.sourceRecord.locator.identity?.id === materialID)!
async function cmsToken() {
 const credentials = readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/initial-admin.txt'), 'utf8')
 const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]; assert(email && password)
 const response = await fetch(base + '/api/users/login', { method: 'POST', redirect: 'error', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000) })
 assert(response.ok, `CMS login HTTP ${response.status}`); const result = await response.json(); assert(result.token); return result.token as string
}
async function cms(token: string, url: string, method = 'GET', body?: unknown) {
 const response = await fetch(base + url, { method, redirect: 'error', headers: { authorization: `JWT ${token}`, origin: base, connection: 'close', 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) })
 assert(response.ok, `CMS ${method} HTTP ${response.status}`); return response.json()
}
async function doc(token: string, draft: boolean) {
 const query = new URLSearchParams({ 'where[stableKey][equals]': template().stableKey, draft: String(draft), locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '2' })
 const result = await cms(token, '/api/content-records?' + query); assert.equal(result.totalDocs, 1); const row = result.docs[0]
 assert.deepEqual(row.sourceRecord, template().sourceRecord, 'CMS immutable origin differs from exact current plan'); return row
}
function cloudToken(minimumMinutes = 15) {
 const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
 const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
 assert(Date.parse(field('expiration_time')) - Date.now() > minimumMinutes * 60000, 'Refresh cloud auth before this stage'); return field('oauth_token') as string
}
const runID = () => { const n = Number(process.env.NTE_EXECUTOR_RUN_ID); assert(Number.isSafeInteger(n) && n > 0); return n }
const githubToken = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8' }).trim()
const action = process.argv[2]; mkdirSync(root, { recursive: true, mode: 0o700 })
console.log(JSON.stringify({ phase: action, at: new Date().toISOString() }))
let result: any
if (action === 'inspect-cms') {
 const token = await cmsToken(), row = await doc(token, true), published = await doc(token, false)
 save('cms-before.json', { row, published, textEdit: { materialID, field: '/nameEn', before: beforeText, after: afterText }, cloudWrites: false })
 console.log(JSON.stringify({ id: row.id, stableKey: row.stableKey, status: row._status, hold: row.hold, nameEn: row.structuredValue.nameEn }))
} else if (action === 'draft') {
 assert(!existsSync(path.join(root, 'cms-draft-intent.json')), 'Do not replay CMS writes')
 const token = await cmsToken(), row = await doc(token, true), previous = load('cms-before.json').row
 assert.deepEqual(row, previous); assert.equal(row.structuredValue.nameEn, beforeText)
 const structuredValue = { ...row.structuredValue, nameEn: afterText }
 save('cms-draft-intent.json', { id: row.id, previousUpdatedAt: row.updatedAt, structuredValue, at: new Date().toISOString() })
 await cms(token, `/api/content-records/${row.id}?draft=true&locale=all&depth=0`, 'PATCH', { structuredValue, _status: 'draft', hold: true })
 const next = await doc(token, true); assert.equal(next.structuredValue.nameEn, afterText); assert.equal(next._status, 'draft'); assert.equal(next.hold, true)
 save('cms-draft.json', { row: next, siteActivated: false })
} else if (action === 'review') {
 assert(!existsSync(path.join(root, 'cms-review-intent.json')), 'Do not replay CMS approval')
 const token = await cmsToken(), row = await doc(token, true), draft = load('cms-draft.json').row
 assert.deepEqual(row, draft)
 const { nameEn: a, ...oldRest } = load('cms-before.json').row.structuredValue, { nameEn: b, ...newRest } = row.structuredValue
 assert.equal(a, beforeText); assert.equal(b, afterText); assert.deepEqual(newRest, oldRest)
 save('cms-review-intent.json', { id: row.id, note: '既有材料英文名称撇号规范化；不修改游戏事实、来源、数值、身份和关系。', beforeText, afterText, at: new Date().toISOString() })
 await cms(token, `/api/content-records/${row.id}?draft=false&locale=all&depth=0`, 'PATCH', { _status: 'published', hold: false })
 const next = await doc(token, false); assert.equal(next.structuredValue.nameEn, afterText); assert.equal(next._status, 'published'); assert.equal(next.hold, false)
 save('cms-review.json', { row: next, siteActivated: false })
 save('selection.json', { stableKeys: [next.stableKey] })
} else if (action === 'source-and-disk') {
 const source = await readNteSourceIndex(sourceIndex)
 const targets = ['reports/prepare/build/source-input/source/apps/game-nte/.next/cache', 'reports/nte-r128-zero-reader-2026-11-18/prepare/build/source-input/source/apps/game-nte/.next/cache'].map(row => path.join(repo, row))
 const before = diskSpace(root), files = targets.filter(existsSync).map(target => { assert.equal(realpathSync(target), target); return { target, bytes: treeBytes(target) } })
 save('cache-cleanup-intent.json', { sourceIndex, files, before, scope: 'Only rebuildable Next compiler caches; frozen source files and release evidence retained' })
 for (const { target } of files) rmSync(target, { recursive: true })
 await readNteSourceIndex(sourceIndex)
 result = { sourceIndex, sources: source.sources.length, owners: Object.keys(source.owners), before, after: diskSpace(root), reverifiedAfter: true }; save('source-and-disk.json', result)
} else if (action === 'prepare') {
 const settings = JSON.parse(readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/settings.json'), 'utf8'))
 const manifest = path.resolve(settings.app, '../..', 'application-manifest.json')
 const application = { path: manifest, pin: digest(readFileSync(manifest)) }, selectionPath = path.join(root, 'selection.json')
 result = await prepareNteIndependentProduction({ sourceIndex, selection: { path: selectionPath, pin: digest(readFileSync(selectionPath)) }, application, cmsToken: await cmsToken(), directory: path.join(root, 'prepare') }); save('prepared.json', result)
} else if (action === 'activate') {
 const request = { schemaVersion: 1, kind: 'nte_release_request', bundle: load('prepared.json').proof, executorRunID: runID(), previewProxy: proxy, publicProxy: proxy }
 save('request.json', request)
 const ci = (await createUnifiedExecutorVerifier(runID(), githubToken())).executorCI
 result = await activateNteProduction({ request, cmsToken: await cmsToken(), cloudToken: cloudToken(35), releaseKey: nteReleaseKey(request, ci, false), directory: path.join(root, 'production') }); save('result.json', result)
} else if (action === 'advance') {
 result = await advanceNteProduction({ completion: load('result.json').proof, executorRunID: runID(), directory: path.join(root, 'published-sources'), cloudToken: cloudToken() }); save('source-result.json', result)
} else if (action === 'snapshot') {
 const token = cloudToken(5), snapshot = await desktopCloudSnapshot(token, unifiedProductionRead)
 const after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(snapshot, after)
 result = { at: new Date().toISOString(), snapshot, active: Object.fromEntries(Object.keys(snapshot.deployments).map(service => [service, activeVersion(snapshot, service)])) }; save('snapshot.json', result)
} else throw Error('Unknown bounded stage')
console.log(JSON.stringify({ phase: action, completed: true, proof: result?.proof, at: new Date().toISOString() }))
