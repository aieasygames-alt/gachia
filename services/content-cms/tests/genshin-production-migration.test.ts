import assert from 'node:assert/strict'
import test from 'node:test'
import { genshinProductionMigrationRequest } from '../src/genshin-production-migration'

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
