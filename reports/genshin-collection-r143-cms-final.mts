import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'

const repo = path.resolve(import.meta.dirname, '..')
const root = path.join(repo, 'reports/genshin-collection-production-2026-11-21-r143')
assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === 'after'))
const prefix = 'cms-final'
mkdirSync(root, { recursive: true, mode: 0o700 })
const previous = path.join(repo, 'reports/genshin-collection-review-2026-11-21-r142')
const deliveryBytes = readFileSync(path.join(previous, 'delivery-final.json'))
assert.equal(digest(deliveryBytes), '6e3ae59eb8f2e6d4284ea88d59f20837ca87a2c328e6adbcb7834d4f46276907')
const delivery = JSON.parse(deliveryBytes.toString())
const beforeBytes = readFileSync(delivery.cmsAfter.path)
assert.equal(digest(beforeBytes), delivery.cmsAfter.pin)
const before = JSON.parse(gunzipSync(beforeBytes).toString())
const origin = 'http://127.0.0.1:3100'
const credentials = readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/initial-admin.txt'), 'utf8')
const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]
assert(email && password)
async function request(url: string, body?: unknown, token?: string) {
  const response = await fetch(origin + url, { method: body ? 'POST' : 'GET', redirect: 'error',
    headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: `JWT ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) })
  assert.equal(response.status, 200, `CMS read ${url}: ${response.status}`)
  return response.json()
}
const { token } = await request('/api/users/login', { email, password }); assert(token)
async function records(draft: boolean) {
  const rows: any[] = []
  for (let page = 1; page <= 20; page++) {
    const query = new URLSearchParams({ draft: String(draft), locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '1000', page: String(page), sort: 'id' })
    const value = await request('/api/content-records?' + query, undefined, token)
    rows.push(...value.docs)
    if (!value.hasNextPage) { assert.equal(rows.length, value.totalDocs); return rows }
  }
  throw Error('Pagination exceeded')
}
const draft = await records(true), published = await records(false), recheck = await records(true)
assert.equal(canonical(draft), canonical(recheck), 'CMS changed during capture')
assert.equal(canonical(draft), canonical(before.draft), 'CMS differs from R142 AFTER snapshot; do not replay')
assert.equal(canonical(published), canonical(before.published), 'Published CMS differs from R142 AFTER snapshot')

const capture = { kind: 'genshin-intake-resume-cms-v1', observedAt: new Date().toISOString(), origin, draft, published, parent: delivery.cmsAfter, contentWrites: 0 }
const bytes = gzipSync(Buffer.from(JSON.stringify(capture) + '\n'))
const file = path.join(root, prefix + '.json.gz')
writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
writeFileSync(path.join(root, prefix + '-proof.json'), JSON.stringify({ proof: { path: file, pin: digest(bytes) },
  parentDelivery: { path: path.join(previous, 'delivery-final.json'), pin: digest(deliveryBytes) }, parentSnapshot: delivery.cmsAfter,
  records: draft.length, publishedRead: published.length, stableDoubleRead: true, exactR142AfterMatch: true,
  draftSetSHA256: digest(canonical(draft)), replayedContentWrites: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ records: draft.length, exactR142AfterMatch: true, replayedContentWrites: 0 }))
