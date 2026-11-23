import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { digest } from '../../scripts/desktop-release-assets.mjs'
import { migrationSave, migrationPinned } from '../../scripts/genshin-migration-http.mjs'
import { withArtifactVerificationSession } from '../../scripts/artifact-verification-session.mjs'
import { withSourceHistoryRepository } from '../../services/content-cms/src/source-history-repository.ts'
import { prepareAzurPromiliaIndependentProduction, auditAzurPromiliaProduction, activateAzurPromiliaProduction, advanceAzurPromiliaProduction } from '../../services/content-cms/src/azur-promilia-independent-production.ts'

const directory = import.meta.dirname, root = path.join(homedir(), 'Library/Application Support/GachiaCMS')
const origin = 'http://127.0.0.1:3100', phase = process.argv[2]
assert(['prepare', 'audit', 'activate', 'source'].includes(phase))
const load = (name: string) => JSON.parse(readFileSync(path.join(directory, name), 'utf8'))
const save = (name: string, value: unknown) => migrationSave(directory, name, value)
const proof = (name: string) => ({ path: path.join(directory, name), pin: digest(readFileSync(path.join(directory, name))) })
const historical = <T>(read: () => T): T => withSourceHistoryRepository('/Users/robert/.codex/worktrees/nte-source-restoration/gachia', read)
const sourceIndex = {
  path: '/Users/robert/.codex/worktrees/nte-source-restoration/gachia/reports/genshin-material-editorial-2026-11-22-r153/published-sources/source-index.json',
  pin: 'cc71a49160ba622a34eaf5d05bfe21006bfa41a0632f208b57afd36e10376340',
}
async function request(route: string, token?: string, body?: unknown) {
  const response = await fetch(origin + route, {
    method: body === undefined ? 'GET' : 'POST', redirect: 'error',
    headers: { origin, connection: 'close', 'content-type': 'application/json', ...(token ? { authorization: `JWT ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000),
  })
  assert(response.ok, `CMS request returned ${response.status}`)
  return response.json()
}
const credentials = readFileSync(path.join(root, 'initial-admin.txt'), 'utf8')
const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]
assert(email && password)
const login = await request('/api/users/login', undefined, { email, password })
assert(login.token && login.user.role === 'admin')
const token = login.token as string
function cloudToken(minutes: number) {
  const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
  const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
  assert(Date.parse(field('expiration_time')) - Date.now() > minutes * 60000, 'Refresh the existing Wrangler login before this phase')
  return field('oauth_token') as string
}
function ci() {
  const row = load('ci.json')
  assert.equal(row.status, 'completed'); assert.equal(row.conclusion, 'success')
  return Number(row.databaseId)
}
console.log(JSON.stringify({ phase, at: new Date().toISOString() }))
try {
  let result: any
  if (phase === 'prepare') {
    const settings = JSON.parse(readFileSync(path.join(root, 'settings.json'), 'utf8'))
    const manifest = path.resolve(settings.app, '../..', 'application-manifest.json')
    result = await withArtifactVerificationSession(() => historical(() => prepareAzurPromiliaIndependentProduction({
      sourceIndex, selection: proof('selection.json'), application: { path: manifest, pin: digest(readFileSync(manifest)) },
      directory: path.join(directory, 'prepare'), cmsToken: token,
    })))
    save('prepared.json', result)
  } else if (phase === 'audit') {
    const value = { schemaVersion: 1, kind: 'azur_promilia_release_request', bundle: load('prepared.json').proof,
      executorRunID: ci(), previewProxy: 'http://127.0.0.1:1087', publicProxy: 'http://127.0.0.1:1087' }
    const requestProof = save('request.json', value)
    const start = Date.now(), audited = await historical(() => auditAzurPromiliaProduction(value, { cmsToken: token, cloudToken: cloudToken(35) }))
    const auditSeconds = (Date.now() - start) / 1000, verifyStart = Date.now()
    await historical(() => audited.verify())
    const verifySeconds = (Date.now() - verifyStart) / 1000
    save('audit.json', { request: requestProof, identity: audited.identity, auditSeconds, verifySeconds, cloudWrites: false })
    assert(verifySeconds < 180, 'Measured verification exceeds the exact-preview freshness budget')
  } else if (phase === 'activate') {
    const audit = load('audit.json'); assert(audit.verifySeconds < 180)
    result = await historical(() => activateAzurPromiliaProduction({ request: migrationPinned(audit.request), cmsToken: token,
      cloudToken: cloudToken(40), directory: path.join(directory, 'production'), releaseKey: audit.identity.releaseKey }))
    save('result.json', result)
  } else {
    result = await historical(() => advanceAzurPromiliaProduction({ completion: load('result.json').proof, executorRunID: ci(),
      directory: path.join(directory, 'published-sources'), cloudToken: cloudToken(30) }))
    save('source-result.json', result)
  }
  console.log(JSON.stringify({ phase, completed: true, proof: result?.proof, at: new Date().toISOString() }))
} finally {
  await request('/api/users/logout', token, {})
}
