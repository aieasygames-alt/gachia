import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { nteProductionRequest } from '../src/nte-release-production'
import { nteLocalConfig, nteRequests } from '../src/nte-release-bundle'
import { readUnifiedSources } from '../src/unified-sources'
import { projectRoot } from '../src/local-environment'
import { nteMigrationContinuationRequest, nteContinuationKey } from '../src/nte-release-history'
const valid = () => ({ schemaVersion: 1, kind: 'nte_release_request', bundle: { path: '/sealed/bundle.json', pin: 'a'.repeat(64) }, executorRunID: 1 })
test('NTE continuation pins the precise stopped request, identity and journal without replay options', () => {
  const proof = { path: '/stopped/proof.json', pin: 'a'.repeat(64) }
  const input = { schemaVersion: 1, kind: 'nte_migration_continuation_request', stopped: { request: proof, identity: proof, journal: proof }, executorRunID: 2 }
  assert.deepEqual(nteMigrationContinuationRequest(input), input)
  for (const key of ['skipCI', 'retry', 'owner', 'knownRouterRecovery', 'baseline', 'transport', 'bundle']) assert.throws(() => nteMigrationContinuationRequest({ ...input, [key]: true }))
  assert.throws(() => nteMigrationContinuationRequest({ ...input, stopped: { ...input.stopped, extra: proof } }))
  assert.throws(() => nteMigrationContinuationRequest({ ...input, stopped: { ...input.stopped, journal: { ...proof, path: 'relative' } } }))
  assert.throws(() => nteMigrationContinuationRequest({ ...input, publicProxy: 'https://example.com' }))
  const key = nteContinuationKey(input, { commit: 'b'.repeat(40), runID: 2 })
  assert.notEqual(key, nteContinuationKey({ ...input, executorRunID: 3 }, { commit: 'b'.repeat(40), runID: 3 }))
  assert.notEqual(key, nteContinuationKey({ ...input, stopped: { ...input.stopped, journal: { ...proof, pin: 'c'.repeat(64) } } }, { commit: 'b'.repeat(40), runID: 2 }))
})
test('NTE request cannot inject owner, transport, retry or weaker evidence', () => {
  assert.deepEqual(nteProductionRequest(valid()), valid())
  for (const key of ['owner', 'transport', 'verify', 'skipCI', 'baseline', 'retry', 'productionReady', 'record']) assert.throws(() => nteProductionRequest({ ...valid(), [key]: true }))
  for (const previewProxy of ['http://example.com:1087', 'http://user:secret@127.0.0.1:1087', 'http://127.0.0.1:1087/path']) assert.throws(() => nteProductionRequest({ ...valid(), previewProxy }))
  assert.equal(nteProductionRequest({ ...valid(), previewProxy: 'http://127.0.0.1:1087' }).previewProxy, 'http://127.0.0.1:1087')
})
test('incomplete or injected CLI arguments fail before opening credentials or a write journal', () => {
  for (const args of [['activate'], ['migration', '--owner', 'genshin'], ['prepare', '--preview', 'true'], ['source', '--retry', 'true']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/nte-production.ts', ...args], { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, GACHIA_CMS_REVIEW_TOKEN: '', CLOUDFLARE_API_TOKEN: '' } })
    assert.notEqual(result.status, 0); assert.match(result.stderr, /NTE production argument/)
  }
})
test('local graph resolves NTE, published Genshin and Main services without production storage or account configuration', () => {
  const local = nteLocalConfig({ account_id: 'production', routes: ['gachia.com/*'], env: { production: {} }, compatibility_date: '2026-07-08', vars: { NTE_CONTENT_ENABLED: 'true' },
    services: [{ binding: 'NTE_CONTENT', service: 'gachia-game-nte' }, { binding: 'GENSHIN_CONTENT', service: 'gachia-game-genshin' }, { binding: 'OTHER', service: 'gachia-game-lvmeng' }] }, 'main', '/tmp/main', '/tmp/modules/main.js')
  for (const key of ['account_id', 'routes', 'env', 'secrets']) assert(!Object.hasOwn(local, key))
  assert.deepEqual(local.services.map((row: any) => row.service), ['nte-release-nte', 'nte-release-genshin', 'nte-release-unused'])
  assert.equal(local.d1_databases[0].database_id, '00000000-0000-0000-0000-000000000000')
  assert.equal(local.r2_buckets[0].bucket_name, 'nte-release-local-only')
})
test('NTE acceptance covers all 171 material URLs and distinguishes former mirrors from current public exports', async () => {
  const repo = path.resolve(projectRoot, '../..'), sources = readUnifiedSources(repo).sources.map(row => ({ sourcePath: row.sourcePath, text: row.rawText }))
  const result = await nteRequests(repo, 'router', 'candidate', undefined, true, sources)
  const materials = JSON.parse(readFileSync(path.join(repo, 'packages/data/games/nte/raw-materials.json'), 'utf8'))
  for (const lang of ['zh', 'en', 'ja']) for (const row of materials) assert(result.requests.some(request => request.path === `/${lang}/nte/items/${row.id}` && request.status === 200))
  assert.equal(result.requests.find(row => row.path === '/data/nte/raw-image-sources.json')?.status, 404)
  assert.equal(result.requests.find(row => row.path === '/data/nte/raw-character-summaries.json')?.status, 200)
  assert(result.requests.some(row => row.path === '/zh/nte/disk-sets' && row.status === 200))
  assert(!result.requests.some(row => row.path === '/zh/nte/artifacts'))
  const recovery = await nteRequests(repo, 'router', 'recovery', undefined, true, sources)
  assert.equal(recovery.requests.find(row => row.path === '/data/nte/raw-image-sources.json')?.status, 200)
  assert.equal(recovery.requests.find(row => row.path === '/data-client/nte-platform.json')?.status, 404)
  for (const file of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) assert(result.values.has('/data-manifest/' + file))
})
