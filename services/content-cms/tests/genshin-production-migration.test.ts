import assert from 'node:assert/strict'
import test from 'node:test'
import { genshinMigrationContinuationRequest, genshinProductionMigrationRequest } from '../src/genshin-production-migration'

const valid = () => ({ schemaVersion: 1, kind: 'genshin_initial_production_migration_request', bundle: { path: '/sealed/bundle.json', pin: 'a'.repeat(64) }, executorRunID: 1 })
test('migration request accepts only a pinned bundle and exact CI identity', () => {
  assert.deepEqual(genshinProductionMigrationRequest(valid()), valid())
  assert.deepEqual(genshinProductionMigrationRequest({ ...valid(), previewProxy: 'http://127.0.0.1:1087' }).previewProxy, 'http://127.0.0.1:1087')
  for (const previewProxy of ['http://example.com:1087', 'http://user:secret@127.0.0.1:1087', 'http://127.0.0.1:1087/path'])
    assert.throws(() => genshinProductionMigrationRequest({ ...valid(), previewProxy }))
  for (const extra of ['transport', 'verify', 'token', 'owner', 'skipCI', 'productionReady', 'sourceIndex']) {
    assert.throws(() => genshinProductionMigrationRequest({ ...valid(), [extra]: true }))
  }
  const changes: ((value: ReturnType<typeof valid>) => void)[] = [value => { value.bundle.pin = 'local' }, value => { value.executorRunID = 0 }, value => { value.bundle.path = '../bundle.json' }, value => { value.kind = 'unified_production_preview_request' }]
  for (const change of changes) {
    const value = valid(); change(value); assert.throws(() => genshinProductionMigrationRequest(value))
  }
})

test('continuation accepts only pinned stopped evidence and current exact CI, never injected state or writers', () => {
  const request = { schemaVersion: 1, kind: 'genshin_migration_continuation_request', executorRunID: 2,
    stopped: Object.fromEntries(['request', 'identity', 'journal'].map(key => [key, { path: `/prior/${key}.json`, pin: 'b'.repeat(64) }])) }
  assert.deepEqual(genshinMigrationContinuationRequest(request), request)
  assert.equal(genshinMigrationContinuationRequest({ ...request, publicProxy: 'http://127.0.0.1:1087' }).publicProxy, 'http://127.0.0.1:1087')
  for (const publicProxy of ['http://example.com:1087', 'http://user:secret@127.0.0.1:1087', 'http://127.0.0.1:1087/path'])
    assert.throws(() => genshinMigrationContinuationRequest({ ...request, publicProxy }))
  for (const key of ['transport', 'accepted', 'deployed', 'owners', 'skipCI', 'previewProxy', 'bundle', 'success'])
    assert.throws(() => genshinMigrationContinuationRequest({ ...request, [key]: true }))
  for (const stopped of [{ ...request.stopped, extra: true }, { request: request.stopped.request },
    { ...request.stopped, journal: { path: '../journal', pin: 'b'.repeat(64) } },
    { ...request.stopped, identity: { path: '/prior/identity.json', pin: 'invalid' } },
    { ...request.stopped, request: { ...request.stopped.request, success: true } }])
    assert.throws(() => genshinMigrationContinuationRequest({ ...request, stopped }))
  assert.throws(() => genshinMigrationContinuationRequest({ ...request, executorRunID: 0 }))
})
