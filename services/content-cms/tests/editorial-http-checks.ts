import assert from 'node:assert/strict'
import { desktopNewGuideDraft } from '../src/desktop-new-guide'
import { exportDesktopGuides } from '../src/desktop-export'

export async function checkEditorialHTTP(base: string, adminToken: string, password: string, databaseURL: string) {
  assert.equal(new URL(databaseURL).hostname, '127.0.0.1')
  assert.match(new URL(databaseURL).pathname, /^\/cms_probe_[a-z0-9_]+$/)
  assert.equal(new URL(base).hostname, '127.0.0.1')
  const checks: string[] = []
  async function request(route: string, method = 'GET', data?: unknown, token = adminToken) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Origin: base,
      Authorization: `JWT ${token}` }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000) })
    return { response, body: await response.json() }
  }
  async function user(role: 'editor' | 'reviewer') {
    const email = `lifecycle-${role}@example.invalid`
    const created = await request('/api/users', 'POST', { email, password, role })
    assert.equal(created.response.status, 201)
    const login = await request('/api/users/login', 'POST', { email, password })
    assert.equal(login.response.status, 200)
    assert.equal(typeof login.body.token, 'string')
    return { id: created.body.doc.id, token: login.body.token as string }
  }
  const editor = await user('editor'), reviewer = await user('reviewer')
  const game = await request('/api/games', 'POST', { key: 'lifecycle-http', name: 'Isolated lifecycle HTTP', region: 'test', legacyRegistry: {} })
  assert.equal(game.response.status, 201)
  const created = await request('/api/content-records?locale=zh', 'POST', { stableKey: 'lifecycle-http:guides:one', game: game.body.doc.id,
    kind: 'guides', legacyId: 'one', legacyPath: '/fixture/one', title: 'Approved A', body: 'Approved body', bodyFormat: 'markdown',
    sourceRecord: { id: 'one', title: 'Imported O' }, hold: false, _status: 'published' }, reviewer.token)
  assert.equal(created.response.status, 201)
  const id = created.body.doc.id, route = `/api/content-records/${id}`
  const read = async (suffix = '?draft=false&locale=zh') => {
    const result = await request(route + suffix)
    assert.equal(result.response.status, 200)
    return result.body
  }
  const versionRoute = `/api/content-records/versions?where[parent][equals]=${id}&limit=100`
  const versions = await request(versionRoute)
  assert.equal(versions.response.status, 200)
  const version = versions.body.docs.find((row: { version: { _status: string } }) => row.version._status === 'published')
  assert(version)
  const before = await read()
  for (const suffix of ['?locale=zh', '?draft=false&locale=zh', '?draft=0&locale=zh']) {
    const result = await request(route + suffix, 'PATCH', { _status: 'draft', title: 'Unauthorized withdrawal' }, editor.token)
    assert.equal(result.response.status, 403, `Editor withdrawal must fail: ${suffix}`)
  }
  const bulk = await request(`/api/content-records?where[id][equals]=${id}`, 'PATCH', { _status: 'draft' }, editor.token)
  assert.equal(bulk.response.status, 403)
  assert.deepEqual(await read(), before)
  assert.equal((await request(versionRoute)).body.totalDocs, versions.body.totalDocs)
  checks.push('editor single/bulk unpublish denied with absent/false/invalid draft query; approved bytes and versions unchanged')

  for (const [locale, title] of [['zh', 'Draft B'], ['en', 'English draft B']]) {
    const edited = await request(`${route}?draft=true&locale=${locale}`, 'PATCH', { title, hold: true }, editor.token)
    assert.equal(edited.response.status, 200)
    assert.equal(edited.body.doc._status, 'draft')
  }
  assert.deepEqual(await read(), before)
  assert.equal((await read('?draft=true&locale=zh')).title, 'Draft B')
  assert.equal((await read('?draft=true&locale=en')).title, 'English draft B')
  const published = await request(route + '?locale=zh', 'PATCH', { _status: 'published', hold: false }, reviewer.token)
  assert.equal(published.response.status, 200)
  assert.equal((await read()).title, 'Draft B')
  assert.equal((await read('?draft=false&locale=en')).title, 'English draft B')
  checks.push('localized editor drafts preserve approved A; explicit reviewer publication advances both locales to B')

  const existingGame = await request('/api/games?where[key][equals]=genshin&limit=1')
  const newGame = existingGame.body.docs?.length ? { body: { doc: existingGame.body.docs[0] } }
    : await request('/api/games', 'POST', { key: 'genshin', name: 'Isolated new-guide HTTP', region: 'test', legacyRegistry: {} })
  assert.ok(newGame.body.doc?.id)
  const newInput = { id: 'cms-http-fixture', title: 'Private new-guide fixture', summary: 'Isolated HTTP contract', body: 'Actual authenticated HTTP creation and approval. '.repeat(5) }
  const newData = desktopNewGuideDraft('genshin', newGame.body.doc.id, newInput)
  const newDraft = await request('/api/content-records?draft=true&locale=zh', 'POST', newData, editor.token)
  assert.equal(newDraft.response.status, 201); assert.equal(newDraft.body.doc.hold, true); assert.equal(newDraft.body.doc._status, 'draft')
  const duplicate = await request('/api/content-records?draft=true&locale=zh', 'POST', newData, editor.token)
  assert.equal(duplicate.response.status, 400)
  const newRoute = `/api/content-records/${newDraft.body.doc.id}`
  assert.equal((await request(newRoute, 'PATCH', { _status: 'published', hold: false }, editor.token)).response.status, 403)
  assert.equal((await request(newRoute + '?draft=true', 'PATCH', { legacyId: 'cms-renamed' }, editor.token)).response.status, 400)
  assert.equal((await request(newRoute, 'PATCH', { _status: 'published', hold: false }, reviewer.token)).response.status, 200)
  const approvedNew = await request(newRoute + '?draft=false&locale=all&depth=0')
  assert.equal(approvedNew.response.status, 200)
  const newExport = exportDesktopGuides('[]', 'genshin', [approvedNew.body], false)
  assert.equal(JSON.parse(newExport.content)[0].content, newInput.body)
  const wrongGame = await request('/api/content-records?draft=true&locale=zh', 'POST', { ...newData, stableKey: 'genshin:guides:cms-wrong-game',
    legacyId: 'cms-wrong-game', legacyPath: '/genshin/guides/cms-wrong-game', game: game.body.doc.id,
    sourceRecord: desktopNewGuideDraft('genshin', newGame.body.doc.id, { ...newInput, id: 'cms-wrong-game' }).sourceRecord }, editor.token)
  assert.equal(wrongGame.response.status, 400)
  checks.push('new Genshin guide HTTP: editor draft, unique identity, denied editor approval/identity changes, reviewer publish, formal export, wrong-game denial')

  const lock = await request('/api/payload-locked-documents', 'POST', { document: { relationTo: 'content-records', value: id },
    user: { relationTo: 'users', value: editor.id } }, editor.token)
  assert.equal(lock.response.status, 201)
  const locked = await request(route + '?overrideLock=true', 'PATCH', { title: 'Lock override' }, reviewer.token)
  assert.equal(locked.response.status, 423)
  const restoreRoute = `/api/content-records/versions/${version.id}`
  assert.equal((await request(restoreRoute, 'POST', {}, reviewer.token)).response.status, 423)
  assert.equal((await request(restoreRoute, 'POST', {}, editor.token)).response.status, 403)
  assert.equal((await read()).title, 'Draft B')
  assert.equal((await request(`/api/payload-locked-documents/${lock.body.doc.id}`, 'DELETE', undefined, editor.token)).response.status, 200)
  const restored = await request(restoreRoute, 'POST', {}, reviewer.token)
  assert.equal(restored.response.status, 200)
  assert.equal((await read()).title, 'Approved A')
  checks.push('live locks deny reviewer override and restore; editor restore denied; reviewer restore succeeds after lock release')

  const eligible = `/api/content-records?draft=false&where[and][0][id][equals]=${id}&where[and][1][_status][equals]=published&where[and][2][hold][equals]=false`
  assert.equal((await request(eligible)).body.totalDocs, 1)
  assert.equal((await request(route, 'PATCH', { hold: true }, reviewer.token)).response.status, 200)
  assert.equal((await request(eligible)).body.totalDocs, 0)
  assert.equal((await request(route, 'PATCH', { _status: 'draft', hold: false }, reviewer.token)).response.status, 200)
  assert.equal((await read())._status, 'draft')
  assert.equal((await request(eligible)).body.totalDocs, 0)
  checks.push('reviewer hold and explicit unpublish remove formal export eligibility, without any public activation')

  assert.equal((await request('/api/users/logout', 'POST', {}, editor.token)).response.status, 200)
  assert.equal((await request(route + '?draft=true', 'PATCH', { title: 'Revoked session write' }, editor.token)).response.status, 403)
  assert.equal((await read()).title, 'Approved A')
  checks.push('logout revokes the editor token; later draft writes are denied')
  return checks
}
