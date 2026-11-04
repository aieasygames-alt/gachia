import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import EmbeddedPostgres from 'embedded-postgres'
import { projectRoot } from '../src/local-environment'
import { checkEditorialHTTP } from '../tests/editorial-http-checks'

const [reportDirectory, ...extra] = process.argv.slice(2)
assert.equal(extra.length, 0, 'Usage: postgres-smoke.ts [new-absolute-report-directory]')
assert(!reportDirectory || path.isAbsolute(reportDirectory), 'Report directory must be absolute')
const output = reportDirectory ?? path.resolve(projectRoot, '../../reports', `payload-postgres-smoke-${Date.now()}-${randomBytes(6).toString('hex')}`)
await mkdir(output, { mode: 0o700 })

async function freePort() {
  const server = createServer().listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  return address.port
}

// Never accept an external connection string: this probe owns its entire cluster.
const directory = await mkdtemp(path.join(tmpdir(), 'payload-pg-'))
const id = randomBytes(8).toString('hex')
const namespace = `pg-probe-${id}`
const port = await freePort()
const httpPort = await freePort()
const database = `cms_probe_${id}`
const password = randomBytes(32).toString('hex')
const logs: string[] = []
const checks: string[] = []
const secret = randomBytes(48).toString('hex')
const pg = new EmbeddedPostgres({ databaseDir: path.join(directory, 'db'), port, user: 'probe', password,
  authMethod: 'scram-sha-256', persistent: false, postgresFlags: ['-h', '127.0.0.1', '-k', directory],
  onLog: line => logs.push(String(line)), onError: line => logs.push(String(line)) })
const env: NodeJS.ProcessEnv = { ...process.env, CMS_MODE: 'postgres-local', CMS_LOCAL_ONLY: '1', CMS_LOCAL_NAMESPACE: namespace,
  CMS_SERVER_URL: `http://127.0.0.1:${httpPort}`, PAYLOAD_SECRET: secret,
  DATABASE_URL: `postgres://cms_app:${password}@127.0.0.1:${port}/${database}`, CMS_PG_SCHEMA_PUSH: '0',
  CMS_ADMIN_EMAIL: 'admin@example.invalid', CMS_ADMIN_PASSWORD: password, NEXT_TELEMETRY_DISABLED: '1' }
delete env.PAYLOAD_DROP_DATABASE
delete env.CMS_SHADOW_READER
function run(args: string[], accepted = [0]) {
  console.log(`Running: ${args.join(' ')}`)
  return new Promise<number>((resolve, reject) => {
    const child = spawn('pnpm', args, { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', data => logs.push(String(data)))
    child.stderr.on('data', data => logs.push(String(data)))
    child.once('error', reject)
    const timer = setTimeout(() => child.kill('SIGTERM'), 180000)
    child.once('exit', code => {
      clearTimeout(timer)
      accepted.includes(code ?? -1) ? resolve(code!) : reject(new Error(`${args.join(' ')} failed (${code})`))
    })
  })
}
let server: ReturnType<typeof spawn> | undefined
let started = false
let failure: unknown
try {
  await pg.initialise()
  await pg.start()
  started = true
  async function provisionDatabase(createRole = false) {
    await pg.createDatabase(database)
    const client = pg.getPgClient()
    await client.connect()
    try {
      // Both identifiers and password are generated here, never caller input.
      if (createRole) await client.query(`CREATE ROLE cms_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`)
      await client.query(`ALTER DATABASE "${database}" OWNER TO cms_app`)
    } finally { await client.end() }
  }
  await provisionDatabase(true)
  await run(['exec', 'payload', 'migrate'])
  await run(['exec', 'payload', 'migrate'])
  checks.push('non-superuser PostgreSQL role: empty database migrated; repeated migration idempotent; schema push disabled')
  await run(['exec', 'tsx', '--test', 'tests/payload.test.ts'])
  checks.push('real PostgreSQL editorial suite: login, ACL, locale, publish, locks, versions, rollback/commit, private media, immutable intake')
  await run(['exec', 'tsx', '--test', 'tests/editorial-lifecycle.test.ts'])
  checks.push('real PostgreSQL lifecycle: reviewer-only unpublish, single/bulk/override rejection, localized draft/export fidelity')
  await pg.dropDatabase(database)
  await provisionDatabase()
  await run(['exec', 'payload', 'migrate'])
  const bootstrap = await Promise.all([
    run(['exec', 'tsx', 'scripts/editor-admin.ts'], [0, 1]),
    run(['exec', 'tsx', 'scripts/editor-admin.ts'], [0, 1]),
  ])
  assert.deepEqual(bootstrap.sort(), [0, 1])
  checks.push('concurrent administrator bootstraps create exactly one account; repeat refuses')

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(httpPort)],
    { cwd: projectRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout!.on('data', data => logs.push(String(data)))
  server.stderr!.on('data', data => logs.push(String(data)))
  server.once('error', error => { failure = error })
  const base = env.CMS_SERVER_URL!
  let ready = false
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null || failure) throw new Error('Next server exited before readiness')
    try { ready = (await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) })).ok } catch { /* startup */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.ok(ready, 'Built Next server must become database-ready')
  async function request(route: string, method = 'GET', data?: unknown, token?: string) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
      Origin: base, ...(token ? { Authorization: `JWT ${token}` } : {}) }, body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15000) })
    const body = await response.json()
    return { response, body }
  }
  assert.equal((await request('/api/users/first-register', 'POST', { email: 'intruder@example.invalid', password })).response.status, 403)
  assert.ok((await request('/api/content-records')).response.status >= 400)
  const login = await request('/api/users/login', 'POST', { email: env.CMS_ADMIN_EMAIL, password })
  assert.equal(login.response.status, 200)
  assert.ok(login.response.headers.get('set-cookie')?.includes('HttpOnly'))
  const token = login.body.token as string
  assert.ok(token)
  assert.equal((await request('/api/users', 'GET', undefined, token)).body.totalDocs, 1)
  const game = await request('/api/games', 'POST', { key: 'editor-smoke', name: 'Unverified legacy name', region: 'test', legacyRegistry: {} }, token)
  assert.equal(game.response.status, 201)
  const draft = await request('/api/content-records?draft=true&locale=zh', 'POST', {
    stableKey: 'editor-smoke:guides:launch', game: game.body.doc.id, kind: 'guides', legacyId: 'launch', legacyPath: '/fixture/launch',
    title: 'Existing content, accuracy deferred', body: 'Editable before content review.', bodyFormat: 'markdown', sourceRecord: { fixture: true }, hold: true,
  }, token)
  assert.equal(draft.response.status, 201)
  const edited = await request(`/api/content-records/${draft.body.doc.id}?draft=true&locale=zh`, 'PATCH', { body: 'CMS editing works over real HTTP.' }, token)
  assert.equal(edited.response.status, 200)
  assert.equal(edited.body.doc.body, 'CMS editing works over real HTTP.')
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')
  const form = new FormData()
  form.append('_payload', JSON.stringify({ alt: 'Synthetic test pixel' }))
  form.append('file', new Blob([pixel], { type: 'image/png' }), 'pixel.png')
  const upload = await fetch(`${base}/api/media`, { method: 'POST', body: form, headers: { Origin: base, Authorization: `JWT ${token}` } })
  assert.equal(upload.status, 201)
  const media = await upload.json()
  const mediaURL = new URL(media.doc.url, base)
  assert.equal(mediaURL.origin, base)
  assert.ok((await fetch(mediaURL)).status >= 400)
  const download = await fetch(mediaURL, { headers: { Authorization: `JWT ${token}` } })
  assert.equal(download.status, 200)
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), pixel)
  const page = await fetch(`${base}/admin/login`, { signal: AbortSignal.timeout(30000) })
  assert.equal(page.status, 200)
  assert.ok((await page.text()).includes('<html'))
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow')
  assert.equal((await fetch(`${base}/api/shadow/releases/${'a'.repeat(64)}`)).status, 404)
  checks.push('built Next + PostgreSQL HTTP: health, admin login HTML, closed registration, anonymous denial, login cookie, single admin, content create/edit, private media bytes, noindex, shadow disabled')
  checks.push(...await checkEditorialHTTP(base, token, password, env.DATABASE_URL!))
  await pg.stop()
  started = false
  const unavailable = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15000) })
  assert.equal(unavailable.status, 503)
  assert.deepEqual(await unavailable.json(), { status: 'unavailable' })
  checks.push('database outage returns sanitized 503 readiness instead of false healthy')
} catch (error) {
  failure = error
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit')
    server.kill('SIGTERM')
    const timer = setTimeout(() => server?.kill('SIGKILL'), 10000)
    await exited
    clearTimeout(timer)
  }
  if (started) await pg.stop()
  await rm(directory, { recursive: true, force: true })
  await rm(path.join(projectRoot, '.local', namespace), { recursive: true, force: true })
  const redact = (text: string) => text.replaceAll(password, '[REDACTED]').replaceAll(secret, '[REDACTED]')
  await writeFile(path.join(output, 'postgres-smoke.log'), redact(logs.join('\n')))
  await writeFile(path.join(output, 'postgres-smoke.json'), JSON.stringify({ passed: !failure, engine: 'PostgreSQL 17.6',
    schemaPush: false, checks, error: failure ? redact(String(failure)) : null, productionTouched: false }, null, 2) + '\n')
}
if (failure) throw failure
console.log(`PostgreSQL editor smoke passed (${checks.length} groups); temporary services and credentials removed.`)
