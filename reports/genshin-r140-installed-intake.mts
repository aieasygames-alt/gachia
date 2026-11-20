import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { prepareGenshinExistingMaterialDrafts } from '../services/content-cms/src/genshin-bounded-intake.ts'

const repo = path.resolve(import.meta.dirname, '..'), directory = path.join(repo, 'reports/genshin-bounded-intake-2026-11-20-r140')
const load = (name: string) => JSON.parse(readFileSync(path.join(directory, name), 'utf8'))
const save = (name: string, value: unknown) => {
  const file = path.join(directory, name), bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n')
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(bytes.toString('utf8')) }
}
const input = load('intake-input.json'), plan = load('reconciliation.json')
const keys = plan.entries.filter((row: any) => row.family === 'materials' && row.existingEditorCompatible).map((row: any) => row.key)
assert.equal(keys.length, 42)
const batch = prepareGenshinExistingMaterialDrafts(plan, input, { keys })
if (process.argv[2] === 'prepare') {
  const selection = save('compatible-selection.json', { keys })
  const prepared = save('compatible-intake.json', batch)
  save('compatible-intake-intent.json', { intakeKey: plan.intakeKey, batchKey: batch.batchKey, prepared, selection, records: batch.records.map(row => ({ key: row.key, id: row.cms!.id, updatedAt: row.cms!.updatedAt, changes: row.changes.map(x => x.pointer) })),
    writeContract: '42 compatible existing Genshin material leaf edits; draft=true, hold=true, immutable origin unchanged; no editorial approval or website publication' })
  console.log(JSON.stringify({ prepared: 42, batchKey: batch.batchKey, productionQualified: false }))
} else if (process.argv[2] === 'apply' || process.argv[2] === 'verify') {
  const prepared = load('compatible-intake-intent.json')
  assert.equal(digest(readFileSync(prepared.prepared.path, 'utf8')), prepared.prepared.pin)
  assert.equal(canonical(load('compatible-intake.json')), canonical(batch))
  const captureProof = load('cms-capture-proof.json').proof, capturedBytes = readFileSync(captureProof.path)
  assert.deepEqual(captureProof, input.cmsProof)
  assert.equal(createHash('sha256').update(capturedBytes).digest('hex'), captureProof.pin)
  const captured = JSON.parse(gunzipSync(capturedBytes).toString('utf8'))
  const origin = 'http://127.0.0.1:3100'
  const credentials = readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/initial-admin.txt'), 'utf8')
  const email = credentials.match(/^Email: (.+)$/m)?.[1], password = credentials.match(/^Password: (.+)$/m)?.[1]; assert(email && password)
  async function request(url: string, method = 'GET', body?: unknown, token?: string) {
    const response = await fetch(origin + url, { method, redirect: 'error', headers: { origin, 'content-type': 'application/json', ...(token ? { authorization: `JWT ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) })
    assert.equal(response.status, 200, `Installed CMS ${method} ${url} failed: ${response.status}`)
    return response.json()
  }
  const { token } = await request('/api/users/login', 'POST', { email, password }); assert(token)
  async function records(draft: boolean) {
    const rows: any[] = []
    for (let page = 1; page <= 20; page++) {
      const query = new URLSearchParams({ draft: String(draft), locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '1000', page: String(page), sort: 'id' })
      const value = await request('/api/content-records?' + query, 'GET', undefined, token); rows.push(...value.docs)
      if (!value.hasNextPage) { assert.equal(rows.length, value.totalDocs); return rows }
    }
    throw Error('Pagination budget exceeded')
  }
  const before = await records(true), index = new Map(before.map(row => [row.id, row]))
  const expected = new Map(captured.draft.map((row: any) => [row.id, row]))
  const receiptDirectory = path.join(directory, 'installed-intake'); mkdirSync(receiptDirectory, { recursive: true, mode: 0o700 })
  function assertWritten(row: any, entry: typeof batch.records[number]) {
    assert.equal(canonical(row.sourceRecord), canonical(entry.cms!.sourceRecord), 'CMS origin changed')
    assert.equal(canonical(row.structuredValue), canonical(entry.draft), 'CMS draft differs from reviewed value')
    assert.equal(row._status, 'draft'); assert.equal(row.hold, true)
    const omit = (value: any) => Object.fromEntries(Object.entries(value).filter(([key]) => !['updatedAt', 'structuredValue', '_status', 'hold'].includes(key)))
    assert.equal(canonical(omit(row)), canonical(omit(entry.cms)), 'Unintended CMS metadata change')
  }
  // Existing receipts authorize read-only reconciliation, never a second PATCH.
  for (const entry of batch.records) {
    const resultName = `installed-intake/${entry.cms!.id}-result.json`, intentName = `installed-intake/${entry.cms!.id}-intent.json`
    if (existsSync(path.join(directory, resultName))) {
      const row = load(resultName).row; assertWritten(row, entry); expected.set(row.id, row)
    } else if (existsSync(path.join(directory, intentName))) {
      const row = index.get(entry.cms!.id); assertWritten(row, entry)
      save(resultName, { row, reconciledReadOnly: true, replayed: false }); expected.set(row.id, row)
    }
  }
  assert.equal(canonical(before), canonical([...expected.values()]), 'CMS changed since captured origin/last receipt; stop before writes')
  if (process.argv[2] === 'verify') assert(existsSync(path.join(directory, 'installed-intake-result.json')), 'No completed intake to verify')
  for (const entry of batch.records) {
    const resultName = `installed-intake/${entry.cms!.id}-result.json`, intentName = `installed-intake/${entry.cms!.id}-intent.json`
    if (existsSync(path.join(directory, resultName))) continue
    assert.equal(process.argv[2], 'apply')
    const id = entry.cms!.id, query = '?draft=true&locale=all&depth=0&fallback-locale=none'
    const current = await request(`/api/content-records/${id}${query}`, 'GET', undefined, token)
    assert.equal(canonical(current), canonical(entry.cms), 'Record changed before draft write')
    save(intentName, { key: entry.key, id, before: entry.cms, draft: entry.draft, batchKey: batch.batchKey, at: new Date().toISOString() })
    await request(`/api/content-records/${id}${query}`, 'PATCH', { structuredValue: entry.draft, _status: 'draft', hold: true }, token)
    const row = await request(`/api/content-records/${id}${query}`, 'GET', undefined, token)
    assertWritten(row, entry); save(resultName, { row, reconciledReadOnly: false, replayed: false }); expected.set(row.id, row)
    console.log(JSON.stringify({ drafted: entry.key, id, hold: true }))
  }
  const after = await records(true), published = await records(false)
  assert.equal(canonical(after), canonical([...expected.values()]), 'Unselected CMS content changed')
  const approved = (rows: any[]) => rows.filter(row => row._status === 'published' && row.hold === false)
  assert.equal(canonical(approved(published)), canonical(approved(captured.published)), 'Approved CMS content changed')
  if (!existsSync(path.join(directory, 'installed-intake-result.json'))) {
    const bytes = gzipSync(Buffer.from(JSON.stringify({ kind: 'genshin-bounded-intake-cms-readback-v1', observedAt: new Date().toISOString(), draft: after, published }) + '\n'))
    writeFileSync(path.join(directory, 'cms-after.json.gz'), bytes, { flag: 'wx', mode: 0o600 })
    save('installed-intake-result.json', { status: 'held-drafts-written-and-read-back', batchKey: batch.batchKey, records: 42, unchangedRecords: after.length - 42,
      immutableOriginsPreserved: true, approvedContentPreserved: true, sourceIndex: input.sourceIndex, before: input.cmsProof,
      after: { path: path.join(directory, 'cms-after.json.gz'), pin: createHash('sha256').update(bytes).digest('hex') },
      contentWrites: 42, approvalWrites: 0, productionDeployments: 0, sourceAdvanced: false, hold: true, publishable: false, observedAt: new Date().toISOString() })
  }
  console.log(JSON.stringify({ status: 'verified', drafted: 42, unchanged: after.length - 42, approvedContentPreserved: true, replayedWrites: 0 }))
} else throw Error('Expected prepare, apply or verify')
