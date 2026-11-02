import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { once } from 'node:events'
import path from 'node:path'
import { localEnvironment, projectRoot } from '../src/local-environment'
import { importSnapshots, snapshot } from '../src/legacy-intake'
import { mapBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { materialCells, materialRaw } from '../src/material-draft'
import { stageReview } from '../src/review-store'

process.env.CMS_LOCAL_ONLY = '1'
process.env.CMS_LOCAL_NAMESPACE = `http-${randomUUID()}`
process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
const local = localEnvironment()
const base = 'http://127.0.0.1:3100'
try {
  await fetch(base, { signal: AbortSignal.timeout(1000) })
  throw new Error('Port 3100 already responds; refusing to test an unrelated server.')
} catch (error) {
  if (!(error instanceof TypeError)) throw error
}

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const password = randomUUID() + 'Aa1!'
let filename: string
let snapshotID: number
let recordID: number
let batchID: number
let reviewID: number
let updateReviewID: number
let materialReviewID = 0
let materialUpdateID = 0
const materialFixture = { id: 'ore', name: 'Material', type: 'resource', rarity: 2, nameEn: '', notes: null, uses: [] }
const source = snapshot('fixture', 'packages/data/games/fixture/raw-guides.json', 'raw-json', '[{"id":"one","title":"Fixture","content":"<script>untrusted()</script>","faq":[{"question":"English question","answer":"","questionZh":"Original question"}]}]')
try {
  const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'http@example.invalid', password, role: 'admin' } })
  await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'editor-http@example.invalid', password, role: 'editor' } })
  const data = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')
  const media = await payload.create({ collection: 'media', user: admin, overrideAccess: false, data: { alt: 'HTTP fixture' }, file: { data, mimetype: 'image/png', name: 'http-pixel.png', size: data.length } })
  filename = media.filename!
  await importSnapshots(payload, [source])
  snapshotID = (await payload.find({ collection: 'migration-sources', overrideAccess: true })).docs[0].id
  const policy = { digest: 'http-fixture-policy', routes: { games: {} } }
  await importRecordBatch(payload, mapBatch([source], policy), policy)
  recordID = (await payload.find({ collection: 'migration-records', overrideAccess: true })).docs[0].id
  batchID = (await payload.find({ collection: 'migration-batches', overrideAccess: true })).docs[0].id
  await stageReview(payload, mapBatch([source], policy).batchKey)
  reviewID = (await payload.find({ collection: 'review-items', overrideAccess: true })).docs[0].id
  const changed = snapshot('fixture', source.sourcePath, 'raw-json', JSON.stringify([{ id: 'one', title: 'Incoming title', content: 'Incoming body', faq: [{ question: 'English question', answer: '', questionZh: 'Original question' }] }]))
  await importSnapshots(payload, [changed])
  const nextBatch = mapBatch([changed], policy)
  await importRecordBatch(payload, nextBatch, policy)
  const updateRun = await stageReview(payload, nextBatch.batchKey, mapBatch([source], policy).batchKey)
  updateReviewID = (await payload.find({ collection: 'review-items', where: { runKey: { equals: updateRun.runKey } } })).docs[0].id
  let materialBase: string | undefined
  for (const value of [materialFixture, { ...materialFixture, name: 'Source material', rarity: 3 }]) {
    const input = snapshot('fixture', 'packages/data/games/fixture/raw-materials.json', 'raw-json', JSON.stringify([value]))
    await importSnapshots(payload, [input])
    const batch = mapBatch([input], policy)
    await importRecordBatch(payload, batch, policy)
    const run = await stageReview(payload, batch.batchKey, materialBase, 'review-v2-material')
    const id = (await payload.find({ collection: 'review-items', where: { runKey: { equals: run.runKey } } })).docs[0].id
    if (!materialBase) materialReviewID = id
    else materialUpdateID = id
    materialBase = batch.batchKey
  }
} finally {
  await payload.destroy()
}

const server = spawn(process.execPath, [path.join(projectRoot, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
  cwd: projectRoot, env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs = (logs + chunk.toString()).slice(-16000) })
server.stderr.on('data', chunk => { logs = (logs + chunk.toString()).slice(-16000) })
server.on('error', error => { logs += error.message })
const request = (url: string, options: RequestInit = {}) => fetch(base + url, { ...options, signal: AbortSignal.timeout(15000) })
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Local server exited before readiness.')
    try { ready = (await request('/admin/login')).status === 200 } catch { /* Wait for this process only. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Admin login must respond with HTTP 200')
  const json = { 'Content-Type': 'application/json' }
  const first = await request('/api/users/first-register', { method: 'POST', headers: json, body: JSON.stringify({ email: 'blocked@example.invalid', password, role: 'admin' }) })
  assert.equal(first.status, 403)
  assert.match(await first.text(), /bootstrap CLI/)
  for (const url of ['/api/content-records', '/api/content-records/versions', '/api/media', `/api/media/file/${filename}`, '/api/migration-sources', '/api/migration-records', '/api/migration-batches', '/api/payload-jobs', '/api/review-items', '/api/review-runs', '/api/review-decisions', '/api/editorial-drafts', '/api/editorial-drafts/versions', '/api/draft-merge-proposals', '/api/draft-merge-decisions', '/api/merge-workflow-events']) {
    assert.equal((await request(url)).status, 403, `Anonymous access must fail: ${url}`)
  }
  const login = await request('/api/users/login', { method: 'POST', headers: json, body: JSON.stringify({ email: 'http@example.invalid', password }) })
  assert.equal(login.status, 200)
  const { token } = await login.json()
  assert.ok(token)
  const headers = { Authorization: `JWT ${token}` }
  const me = await request('/api/users/me', { headers })
  assert.equal((await me.json()).user.role, 'admin')
  for (const access of [{}, headers]) assert.equal((await request('/api/payload-jobs/run', { headers: access })).status, 401)
  for (const [collection, id] of [['migration-records', recordID], ['migration-batches', batchID]]) {
    assert.equal((await request(`/api/${collection}`, { headers })).status, 200)
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const result = await request(`/api/${collection}${method === 'POST' ? '' : `/${id}`}`, { method, headers: { ...headers, ...json }, body: method === 'DELETE' ? undefined : '{}' })
      assert.equal(result.status, 403, `${collection} ${method} must be denied`)
    }
  }
  const record = await request(`/api/migration-records/${recordID}`, { headers })
  assert.equal(record.status, 200)
  const candidate = await record.json()
  assert.deepEqual(candidate.faqs.map(({ locale, sourcePointer, question, answer }: { locale: string; sourcePointer: string; question: string | null; answer: string | null }) => ({ locale, sourcePointer, question, answer })), [
    { locale: 'zh', sourcePointer: 'faq/0', question: 'Original question', answer: null },
    { locale: 'en', sourcePointer: 'faq/0', question: 'English question', answer: '' },
  ])
  assert.equal(candidate.hold, true)
  const editorLogin = await request('/api/users/login', { method: 'POST', headers: json, body: JSON.stringify({ email: 'editor-http@example.invalid', password }) })
  assert.equal(editorLogin.status, 200)
  const editorHeaders = { Authorization: `JWT ${(await editorLogin.json()).token}`, ...json }
  const reviewBody = JSON.stringify({ reviewItem: reviewID, action: 'accept-draft', note: 'HTTP fixture reviewed; still held.' })
  assert.equal((await request('/api/review-decisions', { method: 'POST', headers: editorHeaders, body: reviewBody })).status, 403)
  assert.equal((await request('/api/editorial-drafts', { method: 'POST', headers: { ...headers, ...json }, body: '{}' })).status, 403)
  const decision = await request('/api/review-decisions', { method: 'POST', headers: { ...headers, ...json }, body: reviewBody })
  assert.equal(decision.status, 201, await decision.clone().text())
  const decided = (await decision.json()).doc
  const draftID = typeof decided.draft === 'object' ? decided.draft.id : decided.draft
  const draft = await request(`/api/editorial-drafts/${draftID}`, { headers: editorHeaders })
  assert.equal(draft.status, 200)
  const draftData = await draft.json()
  assert.equal(draftData.state, 'draft'); assert.equal(draftData.hold, true); assert.equal(draftData.faqs.length, 2)
  const edited = await request(`/api/editorial-drafts/${draftID}`, { method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ editorNote: 'Edited through HTTP', translations: draftData.translations.map((row: { locale: string }) => row.locale === 'zh' ? { ...row, title: 'Editor title' } : row) }) })
  assert.equal(edited.status, 200)
  assert.equal((await request(`/api/editorial-drafts/${draftID}`, { method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ hold: false }) })).status, 403)
  assert.equal((await request(`/api/editorial-drafts/${draftID}`, { method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ sourceReviewKey: 'forged' }) })).status, 403)
  const proposalResponse = await request('/api/draft-merge-proposals', { method: 'POST', headers: editorHeaders, body: JSON.stringify({ draft: draftID, reviewItem: updateReviewID }) })
  assert.equal(proposalResponse.status, 201, await proposalResponse.clone().text())
  let proposal = (await proposalResponse.json()).doc
  assert.equal(proposal.conflictCount, 1)
  const workflow = (action: string) => JSON.stringify({ proposal: proposal.id, action, note: 'HTTP workflow review; old comparison remains in history.' })
  assert.equal((await request('/api/merge-workflow-events', { method: 'POST', headers: editorHeaders, body: workflow('close') })).status, 403)
  const closed = await request('/api/merge-workflow-events', { method: 'POST', headers: { ...headers, ...json }, body: workflow('close') })
  assert.equal(closed.status, 201, await closed.clone().text())
  assert.equal((await request('/api/draft-merge-decisions', { method: 'POST', headers: { ...headers, ...json }, body: JSON.stringify({ proposal: proposal.id, action: 'apply', note: 'A closed comparison must not apply.' }) })).status, 409)
  const reconsidered = await request('/api/merge-workflow-events', { method: 'POST', headers: { ...headers, ...json }, body: workflow('reconsider') })
  assert.equal(reconsidered.status, 201, await reconsidered.clone().text())
  const replacement = (await reconsidered.json()).doc.replacement
  const fresh = await (await request(`/api/draft-merge-proposals/${typeof replacement === 'object' ? replacement.id : replacement}`, { headers })).json()
  assert.equal(fresh.parentProposalKey, proposal.proposalKey)
  assert.equal(fresh.draftFingerprint, proposal.draftFingerprint)
  proposal = fresh
  const mergeBody = JSON.stringify({ proposal: proposal.id, action: 'apply', note: 'HTTP reviewer preserves editor title.', choices: [{ field: 'zh.title', choice: 'current' }] })
  assert.equal((await request('/api/draft-merge-decisions', { method: 'POST', headers: editorHeaders, body: mergeBody })).status, 403)
  const merged = await request('/api/draft-merge-decisions', { method: 'POST', headers: { ...headers, ...json }, body: mergeBody })
  assert.equal(merged.status, 201, await merged.clone().text())
  assert.equal((await request('/api/draft-merge-decisions', { method: 'POST', headers: { ...headers, ...json }, body: mergeBody })).status, 409)
  const updatedDraft = await (await request(`/api/editorial-drafts/${draftID}`, { headers: editorHeaders })).json()
  assert.equal(updatedDraft.translations.find((row: { locale: string }) => row.locale === 'zh').title, 'Editor title')
  assert.equal(updatedDraft.translations.find((row: { locale: string }) => row.locale === 'zh').body, 'Incoming body')
  assert.equal(updatedDraft.editorNote, 'Edited through HTTP'); assert.equal(updatedDraft.hold, true)
  assert.equal(updatedDraft.mergeHead, proposal.proposalKey)
  assert.equal((await request('/api/merge-workflow-events', { method: 'POST', headers: { ...headers, ...json }, body: workflow('reconsider') })).status, 409)
  assert.ok(materialReviewID > 0 && materialUpdateID > 0)
  const materialDecision = JSON.stringify({ reviewItem: materialReviewID, action: 'accept-draft', note: 'HTTP material baseline reviewed.' })
  assert.equal((await request('/api/review-decisions', { method: 'POST', headers: editorHeaders, body: materialDecision })).status, 403)
  const materialAccepted = await request('/api/review-decisions', { method: 'POST', headers: { ...headers, ...json }, body: materialDecision })
  assert.equal(materialAccepted.status, 201, await materialAccepted.clone().text())
  const materialRelation = (await materialAccepted.json()).doc.draft
  const materialID = typeof materialRelation === 'object' ? materialRelation.id : materialRelation
  const materialRead = await (await request(`/api/editorial-drafts/${materialID}`, { headers: editorHeaders })).json()
  assert.deepEqual(materialRaw(materialRead.legacyId, materialRead.materialFields), materialFixture)
  const materialEdit = await request(`/api/editorial-drafts/${materialID}`, { method: 'PATCH', headers: editorHeaders, body: JSON.stringify({ materialFields: materialCells({ ...materialFixture, name: 'Editor material' }) }) })
  assert.equal(materialEdit.status, 200, await materialEdit.clone().text())
  const materialProposed = await request('/api/draft-merge-proposals', { method: 'POST', headers: editorHeaders, body: JSON.stringify({ draft: materialID, reviewItem: materialUpdateID }) })
  assert.equal(materialProposed.status, 201, await materialProposed.clone().text())
  const materialProposal = (await materialProposed.json()).doc
  assert.equal(materialProposal.conflictCount, 1)
  const materialApplied = await request('/api/draft-merge-decisions', { method: 'POST', headers: { ...headers, ...json }, body: JSON.stringify({ proposal: materialProposal.id, action: 'apply', note: 'HTTP material conflict reviewed.', choices: [{ field: 'material.name', choice: 'current' }] }) })
  assert.equal(materialApplied.status, 201, await materialApplied.clone().text())
  const materialResult = await (await request(`/api/editorial-drafts/${materialID}`, { headers: editorHeaders })).json()
  assert.deepEqual(materialRaw(materialResult.legacyId, materialResult.materialFields), { ...materialFixture, name: 'Editor material', rarity: 3 })
  assert.equal(materialResult.hold, true)
  const sources = await request('/api/migration-sources', { headers })
  assert.equal(sources.status, 200)
  assert.equal((await (await request(`/api/migration-sources/${snapshotID}`, { headers })).json()).rawText, source.rawText)
  for (const [method, url] of [['POST', '/api/migration-sources'], ['PATCH', `/api/migration-sources/${snapshotID}`], ['DELETE', `/api/migration-sources/${snapshotID}`]]) {
    const result = await request(url, { method, headers: { ...headers, ...json }, body: method === 'DELETE' ? undefined : JSON.stringify(source) })
    assert.equal(result.status, 403, `Even admin HTTP writes must fail: ${method}`)
  }
  const file = await request(`/api/media/file/${filename}`, { headers })
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('content-type'), 'image/png')
  assert.equal((await file.arrayBuffer()).byteLength, 68)
  console.log('HTTP smoke passed: material v2 intake/edit/conflict/apply and presence fidelity, login, first-register denial, sixteen private endpoints, media bytes, immutable migration collections, typed FAQ fidelity, reviewer intake, editor draft editing, close/reconsider audit chain, closed/application rejection, fresh conflict approval, duplicate rejection, source-head/hold protection, job runner denied even for admin.')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  if (server.exitCode === null) {
    const exit = once(server, 'exit')
    server.kill('SIGTERM')
    const force = setTimeout(() => server.kill('SIGKILL'), 5000)
    await exit
    clearTimeout(force)
  }
  await rm(local.directory, { recursive: true, force: true })
}
