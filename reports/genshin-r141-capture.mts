import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'

const repo = path.resolve(import.meta.dirname, '..')
const root = path.join(repo, 'reports/genshin-structural-intake-2026-11-20-r141')
assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === 'after'))
const prefix = process.argv[2] === 'after' ? 'cms-after' : 'cms-capture'
mkdirSync(root, { recursive: true, mode: 0o700 })
const previous = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const deliveryBytes = readFileSync(path.join(previous, 'delivery.json'))
assert.equal(digest(deliveryBytes), 'f612e802132fa7e3a1af36e6076be9c59eccf353c6bb9c4ae650455c7d651892')
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
assert.equal(canonical(draft), canonical(before.draft), 'CMS differs from R140 AFTER snapshot; do not replay')
assert.equal(canonical(published), canonical(before.published), 'Published CMS differs from R140 AFTER snapshot')
if (prefix === 'cms-after') {
  const preparation = JSON.parse(readFileSync(path.join(root, 'preparation.json'), 'utf8'))
  const stageBytes = readFileSync(preparation.stage.path); assert.equal(digest(stageBytes), preparation.stage.pin)
  const stage = JSON.parse(stageBytes.toString())
  const query = new URLSearchParams({ depth: '0', limit: '1000', sort: 'id', 'where[stableKey][contains]': 'genshin-staged:' })
  const found = await request('/api/migration-records?' + query, undefined, token)
  assert.equal(found.totalDocs, 179); assert.equal(found.docs.length, 179); assert.equal(found.hasNextPage, false)
  const rows = new Map(found.docs.map((row: any) => [row.revisionKey, row]))
  const checked = stage.records.map((expected: any) => {
    const row: any = rows.get(expected.revisionKey); assert(row)
    const { key, ...data } = expected
    assert.equal(canonical(Object.fromEntries(Object.keys(data).map(name => [name, row[name]]))), canonical(data))
    assert.equal(digest(row.candidateText), row.revisionKey)
    return { key, id: row.id, revisionKey: row.revisionKey, hold: row.hold }
  })
  const batches = await request('/api/migration-batches?' + new URLSearchParams({ depth: '0', limit: '2', 'where[batchKey][equals]': stage.stageKey }), undefined, token)
  assert.equal(batches.totalDocs, 1); assert.equal(batches.docs[0].manifest, canonical(stage.manifest)); assert.equal(batches.docs[0].recordCount, 179)
  const anonymous = await fetch(origin + '/api/migration-records?limit=1', { redirect: 'error', signal: AbortSignal.timeout(30000) })
  assert([401, 403].includes(anonymous.status))
  writeFileSync(path.join(root, 'rest-stage-readback.json'), JSON.stringify({ stageKey: stage.stageKey, batchId: batches.docs[0].id,
    records: checked, total: checked.length, unchangedContentRecords: draft.length, exactR140AfterMatch: true,
    anonymousStatus: anonymous.status, observedAt: new Date().toISOString(), writes: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
}
const capture = { kind: 'genshin-intake-resume-cms-v1', observedAt: new Date().toISOString(), origin, draft, published, parent: delivery.cmsAfter, contentWrites: 0 }
const bytes = gzipSync(Buffer.from(JSON.stringify(capture) + '\n'))
const file = path.join(root, prefix + '.json.gz')
writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 })
writeFileSync(path.join(root, prefix + '-proof.json'), JSON.stringify({ proof: { path: file, pin: digest(bytes) },
  parentDelivery: { path: path.join(previous, 'delivery.json'), pin: digest(deliveryBytes) }, parentSnapshot: delivery.cmsAfter,
  records: draft.length, publishedRead: published.length, stableDoubleRead: true, exactR140AfterMatch: true,
  draftSetSHA256: digest(canonical(draft)), replayedContentWrites: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ records: draft.length, exactR140AfterMatch: true, replayedContentWrites: 0 }))
