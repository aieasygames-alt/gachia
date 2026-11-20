import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'
import { projectRoot } from '../src/local-environment'

const [report, ...extra] = process.argv.slice(2)
assert(report && path.isAbsolute(report) && !extra.length, 'A new absolute log file is required')
const directory = await mkdtemp(path.join(tmpdir(), 'genshin-stage-pg-'))
const socket = createServer().listen(0, '127.0.0.1'); await once(socket, 'listening')
const address = socket.address(); assert(address && typeof address === 'object')
const port = address.port; await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
const id = randomBytes(8).toString('hex'), password = randomBytes(32).toString('hex'), database = `cms_probe_${id}`
const namespace = `pg-probe-${id}`, logs: string[] = []
const pg = new EmbeddedPostgres({ databaseDir: path.join(directory, 'db'), port, user: 'probe', password,
  authMethod: 'scram-sha-256', persistent: false, postgresFlags: ['-h', '127.0.0.1', '-k', directory],
  onLog: line => logs.push(String(line)), onError: line => logs.push(String(line)) })
const env = { ...process.env, CMS_MODE: 'postgres-local', CMS_LOCAL_ONLY: '1', CMS_LOCAL_NAMESPACE: namespace,
  PAYLOAD_SECRET: randomBytes(48).toString('hex'), DATABASE_URL: `postgres://cms_app:${password}@127.0.0.1:${port}/${database}`,
  CMS_PG_SCHEMA_PUSH: '0', CMS_SERVER_URL: 'http://127.0.0.1:3100' }
async function run(args: string[]) {
  const child = spawn(process.execPath, args, { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', data => logs.push(String(data))); child.stderr.on('data', data => logs.push(String(data)))
  const timer = setTimeout(() => child.kill('SIGTERM'), 180000)
  try { const [code] = await once(child, 'exit'); assert.equal(code, 0, `Owned PostgreSQL probe failed: ${args.join(' ')}`) }
  finally { clearTimeout(timer) }
}
let started = false
try {
  await pg.initialise(); await pg.start(); started = true; await pg.createDatabase(database)
  const client = pg.getPgClient(); await client.connect()
  try {
    await client.query(`CREATE ROLE cms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`)
    await client.query(`ALTER DATABASE "${database}" OWNER TO cms_app`)
  } finally { await client.end() }
  await run(['node_modules/payload/bin.js', 'migrate'])
  await run(['--import', 'tsx', '--test', 'tests/genshin-structural-payload.test.ts'])
  console.log(JSON.stringify({ passed: true, existingSchema: true, schemaPush: false, isolatedPostgres: true }))
} finally {
  if (started) await pg.stop()
  await rm(directory, { recursive: true, force: true })
  await rm(path.join(projectRoot, '.local', namespace), { recursive: true, force: true })
  await writeFile(report, logs.join('\n'), { flag: 'wx', mode: 0o600 })
}
