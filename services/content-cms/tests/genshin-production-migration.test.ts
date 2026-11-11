import assert from 'node:assert/strict'
import test from 'node:test'
import { genshinProductionMigrationRequest } from '../src/genshin-production-migration'

const valid = () => ({ schemaVersion: 1, kind: 'genshin_initial_production_migration_request', bundle: { path: '/sealed/bundle.json', pin: 'a'.repeat(64) }, executorRunID: 1 })
test('migration request accepts only a pinned bundle and exact CI identity', () => {
  assert.deepEqual(genshinProductionMigrationRequest(valid()), valid())
  for (const extra of ['transport', 'verify', 'token', 'owner', 'skipCI', 'productionReady', 'sourceIndex']) {
    assert.throws(() => genshinProductionMigrationRequest({ ...valid(), [extra]: true }))
  }
  const changes: ((value: ReturnType<typeof valid>) => void)[] = [value => { value.bundle.pin = 'local' }, value => { value.executorRunID = 0 }, value => { value.bundle.path = '../bundle.json' }, value => { value.kind = 'unified_production_preview_request' }]
  for (const change of changes) {
    const value = valid(); change(value); assert.throws(() => genshinProductionMigrationRequest(value))
  }
})
