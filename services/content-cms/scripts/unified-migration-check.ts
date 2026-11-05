import assert from 'node:assert/strict'
import { cmsEnvironment } from '../src/cms-environment'
import { migrations } from '../src/migrations'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { createLocalReq } from 'payload'

const runtime = cmsEnvironment()
assert.equal(runtime.mode, 'postgres-local', 'Migration probe must use its owned cms_probe_* database')
assert.equal(runtime.schemaPush, false)
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
// Payload's generic migration API erases adapter args; this probe has already required the PostgreSQL adapter.
const adapterMigrations = migrations.map(migration => ({ name: migration.name,
  up: (args: unknown) => migration.up(args as MigrateUpArgs), down: (args: unknown) => migration.down(args as MigrateDownArgs) }))
try {
  await payload.db.migrate({ migrations: [adapterMigrations[0]] })
  const original = { fixture: 'legacy-before-unified-upgrade', preserve: ['', null, false, 0] }
  const game = await payload.db.pool.query(`INSERT INTO games (key, region, legacy_registry) VALUES ('migration-fixture', 'test', '{}') RETURNING id`)
  const inserted = await payload.db.pool.query(`INSERT INTO content_records
    (stable_key, game_id, kind, legacy_id, legacy_path, body_format, source_record, hold, _status)
    VALUES ('migration-fixture:guides:one', $1, 'guides', 'one', '/fixture', 'plain', $2, true, 'draft') RETURNING id`,
  [game.rows[0].id, JSON.stringify(original)])
  const id = inserted.rows[0].id
  await payload.db.migrate({ migrations: adapterMigrations })
  const upgraded = await payload.findByID({ collection: 'content-records', id, overrideAccess: true })
  assert.deepEqual(upgraded.sourceRecord, original)
  assert.equal(upgraded.structuredValue, null)
  await payload.db.migrateDown()
  const rolledBack = await payload.db.pool.query('SELECT source_record FROM content_records WHERE id = $1', [id])
  assert.deepEqual(rolledBack.rows[0].source_record, original)
  const columns = await payload.db.pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'content_records' AND column_name = 'structured_value'`)
  assert.equal(columns.rows.length, 0)
  await payload.db.migrate({ migrations: adapterMigrations })
  assert.deepEqual((await payload.findByID({ collection: 'content-records', id, overrideAccess: true })).sourceRecord, original)
  await payload.db.pool.query('UPDATE content_records SET structured_value = $1 WHERE id = $2', [JSON.stringify({ fixture: 'must-survive' }), id])
  const postgresDB = payload.db.drizzle as unknown as MigrateDownArgs['db']
  await assert.rejects(migrations[1].down({ db: postgresDB, payload, req: await createLocalReq({}, payload) }), error =>
    [error, error instanceof Error ? error.cause : null].some(item => item instanceof Error && 'code' in item
      && item.code === 'P0001' && item.message.includes('Cannot drop structured content')))
  assert.deepEqual((await payload.db.pool.query('SELECT structured_value FROM content_records WHERE id = $1', [id])).rows[0].structured_value, { fixture: 'must-survive' })
  await payload.db.pool.query('UPDATE content_records SET structured_value = NULL WHERE id = $1', [id])
  console.log('Additive PostgreSQL upgrade, downgrade, and re-upgrade preserve legacy content; schema push disabled.')
} finally { await payload.destroy() }
