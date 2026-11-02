import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { applyLocalSchema, localSchemaStatements } from '../src/local-schema'
import { projectRoot } from '../src/local-environment'

test('upgraded lock relations survive repeated fresh-process schema push without duplicate indexes or lost rows', { timeout: 90000 }, () => {
  const namespace = `schema-test-${randomUUID()}`
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development', CMS_LOCAL_ONLY: '1', CMS_LOCAL_NAMESPACE: namespace, PAYLOAD_SECRET: randomUUID() + randomUUID() }
  try {
    for (const mode of ['old', 'upgrade', 'reopen', 'stable']) {
      const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/schema-fixture.ts', mode], { cwd: projectRoot, env, encoding: 'utf8', timeout: 20000 })
      assert.equal(result.status, 0, `${mode}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`)
    }
  } finally { rmSync(path.join(projectRoot, '.local', namespace), { recursive: true, force: true }) }
})

test('schema normalization is narrow and schema writes rollback on SQL or FK failures', async () => {
  const index = 'CREATE INDEX `one` ON `example` (`id`);'
  assert.deepEqual(localSchemaStatements([index, index]), [index])
  assert.deepEqual(localSchemaStatements([index, 'DROP TABLE `example`;', index]), [index, 'DROP TABLE `example`;', index])
  assert.throws(() => localSchemaStatements([index, 'CREATE INDEX `one` ON `example` (`other`);']), /Conflicting/)
  assert.throws(() => localSchemaStatements(undefined), /Unsupported/)
  const require = createRequire(import.meta.url)
  const adapterRequire = createRequire(require.resolve('@payloadcms/db-sqlite'))
  const directory = mkdtempSync(path.join(tmpdir(), 'cms-schema-'))
  const client: SQLiteAdapter['client'] = adapterRequire('@libsql/client').createClient({ url: `file:${path.join(directory, 'cms.db')}` })
  try {
    await applyLocalSchema(client, ['CREATE TABLE example (id integer PRIMARY KEY);', index])
    await assert.rejects(applyLocalSchema(client, ['INSERT INTO example VALUES (1);', index]), /already exists/)
    assert.deepEqual((await client.execute('SELECT * FROM example')).rows, [])
    await assert.rejects(applyLocalSchema(client, ['CREATE TABLE child (id integer REFERENCES example(id));', 'INSERT INTO child VALUES (99);']), /foreign key validation/)
    assert.deepEqual((await client.execute("SELECT name FROM sqlite_master WHERE name='child'")).rows, [])
    assert.equal((await client.execute('PRAGMA foreign_keys')).rows[0].foreign_keys, 1)
    await applyLocalSchema(client, ['INSERT INTO example VALUES (2);'])
    assert.equal((await client.execute('SELECT * FROM example')).rows[0].id, 2)
  } finally { client.close(); rmSync(directory, { recursive: true, force: true }) }
})
