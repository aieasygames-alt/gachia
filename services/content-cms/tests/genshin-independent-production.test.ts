import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { genshinIndependentRequest } from '../src/genshin-independent-production'
import { projectRoot } from '../src/local-environment'
const valid = () => ({ schemaVersion: 1, kind: 'genshin_independent_editorial_request', bundle: { path: '/sealed/bundle.json', pin: 'a'.repeat(64) }, executorRunID: 1 })
test('independent request cannot inject scope, transport, live review or retry authority', () => {
  assert.deepEqual(genshinIndependentRequest(valid()), valid())
  assert.equal(genshinIndependentRequest({ ...valid(), previewProxy: 'http://127.0.0.1:1087' }).previewProxy, 'http://127.0.0.1:1087')
  for (const previewProxy of ['http://example.com:1087', 'http://user:secret@127.0.0.1:1087', 'http://127.0.0.1:1087/path'])
    assert.throws(() => genshinIndependentRequest({ ...valid(), previewProxy }))
  for (const key of ['verify', 'transport', 'skipCI', 'record', 'sourceIndex', 'owner', 'baseline', 'retry', 'productionReady']) assert.throws(() => genshinIndependentRequest({ ...valid(), [key]: true }))
  for (const mutate of [(v: any) => { v.bundle.pin = 'invalid' }, (v: any) => { v.bundle.path = '../bundle.json' }, (v: any) => { v.executorRunID = 0 },
    (v: any) => { v.kind = 'genshin_initial_production_migration_request' }]) { const value = valid(); mutate(value); assert.throws(() => genshinIndependentRequest(value)) }
})
test('CLI rejects incomplete and injected writes before credentials, CMS or files are opened', () => {
  for (const args of [['activate'], ['prepare', '--preview', 'true'], ['source', '--retry', 'true'], ['audit', '--transport', 'injected']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/genshin-independent-production.ts', ...args], { cwd: projectRoot, encoding: 'utf8',
      env: { ...process.env, GACHIA_CMS_REVIEW_TOKEN: '', CLOUDFLARE_API_TOKEN: '' } })
    assert.notEqual(result.status, 0); assert.match(result.stderr, /independent production argument/)
  }
})
