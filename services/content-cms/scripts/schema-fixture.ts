import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { buildConfig, getPayload, type CollectionConfig } from 'payload'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { localEnvironment } from '../src/local-environment'
import { localSQLiteAdapter } from '../src/local-sqlite'

const local = localEnvironment()
if (!process.env.CMS_LOCAL_NAMESPACE?.startsWith('schema-test-')) throw new Error('Disposable schema-test namespace required')
mkdirSync(local.directory, { recursive: true })
const old = process.argv[2] === 'old'
const collections: CollectionConfig[] = [{ slug: 'users', auth: true, fields: [{ name: 'role', type: 'text' }] }]
if (!old) collections.push({ slug: 'drafts', versions: true, lockDocuments: { duration: 300 }, fields: [{ name: 'title', type: 'text' }] })
const payload = await getPayload({ config: buildConfig({ secret: local.secret, collections, telemetry: false, db: localSQLiteAdapter({ client: { url: local.databaseURL }, push: true, transactionOptions: { behavior: 'immediate' } }) }) })
try {
  const db = payload.db as unknown as SQLiteAdapter
  if (old) {
    const user = await payload.create({ collection: 'users', data: { email: 'schema@example.invalid', password: 'Disposable-only-schema-password-123!', role: 'reviewer' } })
    await db.client.execute("INSERT INTO payload_locked_documents (id, global_slug) VALUES (101, 'fixture')")
    await db.client.execute({ sql: 'INSERT INTO payload_locked_documents_rels (id, parent_id, path, users_id) VALUES (101, 101, ?, ?)', args: ['user', user.id] })
  }
  assert.equal((await payload.count({ collection: 'users' })).totalDocs, 1)
  assert.equal((await db.client.execute('SELECT id FROM payload_locked_documents WHERE id=101')).rows.length, 1)
  assert.equal((await db.client.execute('SELECT id FROM payload_locked_documents_rels WHERE id=101')).rows.length, 1)
  assert.deepEqual((await db.client.execute('PRAGMA foreign_key_check')).rows, [])
  if (process.argv[2] === 'stable') {
    const { pushSchema } = db.requireDrizzleKit()
    const plan = await pushSchema(db.schema, db.drizzle as unknown as Parameters<typeof pushSchema>[1])
    assert.deepEqual((plan as typeof plan & { statementsToExecute: string[] }).statementsToExecute, [])
  }
} finally { await payload.destroy() }
