import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { gzipSync } from 'node:zlib'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'

const repo = path.resolve(import.meta.dirname, '..')
const directory = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const sourceIndex = { path: path.join(repo, 'reports/genshin-code-production-2026-11-20-r139/published-sources/source-index.json'), pin: '59b5831d8547d02b37c4052506e777a11d6d75fbfc1d604a0a3412010cb99fca' }
mkdirSync(directory, { recursive: true, mode: 0o700 })
const save = (name: string, value: unknown) => {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n')
  writeFileSync(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 })
  return { path: path.join(directory, name), pin: digest(bytes) }
}
const origin = 'http://127.0.0.1:3100'
async function captureCMS() {
  const credentials = readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/initial-admin.txt'), 'utf8')
  const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]
  assert(email && password)
  const response = await fetch(origin + '/api/users/login', { method: 'POST', redirect: 'error', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, 'CMS login unavailable'); const { token } = await response.json(); assert(token)
  async function records(draft: boolean) {
    const rows: any[] = []
    for (let page = 1; page <= 20; page++) {
      const query = new URLSearchParams({ draft: String(draft), locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '1000', page: String(page), sort: 'id' })
      const result = await fetch(origin + '/api/content-records?' + query, { redirect: 'error', headers: { origin, authorization: `JWT ${token}` }, signal: AbortSignal.timeout(60000) })
      assert.equal(result.status, 200, 'CMS content read failed'); const value = await result.json()
      rows.push(...value.docs)
      if (!value.hasNextPage) { assert.equal(rows.length, value.totalDocs); return rows }
    }
    throw Error('CMS pagination budget exceeded')
  }
  const draft = await records(true), published = await records(false), recheck = await records(true)
  assert.equal(canonical(draft), canonical(recheck), 'CMS changed during capture')
  const value = { kind: 'genshin-bounded-intake-cms-capture-v1', observedAt: new Date().toISOString(), origin, draft, published, contentWrites: false }
  const bytes = gzipSync(Buffer.from(JSON.stringify(value) + '\n'))
  writeFileSync(path.join(directory, 'cms-capture.json.gz'), bytes, { flag: 'wx', mode: 0o600 })
  save('cms-capture-proof.json', { proof: { path: path.join(directory, 'cms-capture.json.gz'), pin: digest(bytes) }, records: draft.length, publishedRead: published.length, draftSetSHA256: digest(canonical(draft)), stableDoubleRead: true, contentWrites: false })
  console.log(JSON.stringify({ cmsCaptured: draft.length, at: value.observedAt }))
}
if (process.argv[2] === 'cms') await captureCMS()
else if (process.argv[2] === 'source') {
  assert.equal(digest(readFileSync(sourceIndex.path)), sourceIndex.pin)
  const result = await readNteSourceIndex(sourceIndex)
  assert.equal(result.sources.length, 115); assert.equal(result.allOwnersCurrent, true)
  const sources = save('active-sources.json', result.sources)
  save('source-reopen.json', { sourceIndex, sources, allOwnersCurrent: true, sourceCount: result.sources.length, observedAt: new Date().toISOString(), cloudWrites: false })
  console.log(JSON.stringify({ sourceReopened: result.sources.length, allOwnersCurrent: true }))
} else throw Error('Expected cms or source')
