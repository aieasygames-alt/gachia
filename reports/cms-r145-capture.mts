import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
const repo = path.resolve(import.meta.dirname, '..'), directory = path.join(repo, 'reports/cms-next-security-2026-11-21-r145')
const [phase] = process.argv.slice(2); assert(['before', 'after', 'final'].includes(phase))
mkdirSync(directory, { recursive: true, mode: 0o700 })
const file = path.join(directory, `cms-${phase}.json.gz`)
const credentials = readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/initial-admin.txt'), 'utf8')
const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]
assert(email && password)
const origin = 'http://127.0.0.1:3100'
async function request(url: string, token?: string, data?: unknown) {
  const response = await fetch(origin + url, { method: data ? 'POST' : 'GET', redirect: 'error',
    headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: `JWT ${token}` } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(60000) })
  assert.equal(response.status, 200, `CMS capture ${url}: ${response.status}`); return response.json()
}
const { token } = await request('/api/users/login', undefined, { email, password }); assert(token)
async function records(draft: boolean) {
  const rows: any[] = []
  for (let page = 1; page <= 20; page++) {
    const q = new URLSearchParams({ draft: String(draft), locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '1000', page: String(page), sort: 'id' })
    const body = await request('/api/content-records?' + q, token); rows.push(...body.docs)
    if (!body.hasNextPage) { assert.equal(rows.length, body.totalDocs); return rows }
  }
  throw Error('CMS capture pagination exceeded')
}
try {
  const draft = await records(true), published = await records(false), repeat = await records(true)
  assert.equal(canonical(draft), canonical(repeat), 'CMS capture drift')
  {
    const previous = JSON.parse(gunzipSync(readFileSync(path.join(repo, 'reports/genshin-editing-source-sync-2026-11-21-r144/cms-final.json.gz'))).toString())
    assert.equal(canonical(draft), canonical(previous.draft)); assert.equal(canonical(published), canonical(previous.published))
  }
  const bytes = gzipSync(Buffer.from(JSON.stringify({ kind: 'cms-next-security-capture-r145', phase, observedAt: new Date().toISOString(), draft, published, contentWrites: 0 }) + '\n'))
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
  writeFileSync(path.join(directory, `cms-${phase}-proof.json`), JSON.stringify({ path: file, pin: createHash('sha256').update(bytes).digest('hex'), records: draft.length, stableDoubleRead: true }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ phase, records: draft.length, stableDoubleRead: true, cmsWrites: 0 }))
} finally { await request('/api/users/logout', token, {}) }
