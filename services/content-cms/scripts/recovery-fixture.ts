import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment } from '../src/local-environment'
import { digest } from '../src/legacy-intake'

const mode = process.argv[2]
if (!['seed', 'verify'].includes(mode) || !process.env.CMS_LOCAL_NAMESPACE?.startsWith('recovery-')) throw new Error('This script is only a disposable recovery fixture.')
const local = localEnvironment()
const password = process.env.CMS_RECOVERY_PASSWORD
if (!password) throw new Error('Missing fixture password')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  if (mode === 'seed') {
    assert.equal((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs, 0)
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'recovery@example.invalid', password, role: 'admin' } })
    const game = await payload.create({ collection: 'games', user: admin, overrideAccess: false, data: { key: 'recovery', name: 'Original game', region: 'test', legacyRegistry: { source: 'fixture' } } })
    const record = await payload.create({ collection: 'content-records', user: admin, overrideAccess: false, draft: true, locale: 'zh', data: { stableKey: 'recovery:guide', game: game.id, kind: 'guides', legacyId: 'guide', legacyPath: '/recovery/guides/guide', title: 'Original', bodyFormat: 'markdown', body: '**original**', sourceRecord: { hold: true }, hold: true } })
    await payload.update({ collection: 'content-records', id: record.id, user: admin, overrideAccess: false, overrideLock: false, locale: 'en', data: { title: 'English', _status: 'published' } })
    await payload.update({ collection: 'content-records', id: record.id, user: admin, overrideAccess: false, overrideLock: false, locale: 'zh', draft: true, data: { title: 'Later draft' } })
    const data = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')
    await payload.create({ collection: 'media', user: admin, overrideAccess: false, data: { alt: 'Recovery fixture' }, file: { name: 'recovery.png', data, size: data.length, mimetype: 'image/png' } })
  }
  const games = await payload.find({ collection: 'games', overrideAccess: true, locale: 'all', depth: 0, sort: 'id' })
  const records = await payload.find({ collection: 'content-records', overrideAccess: true, locale: 'all', draft: true, depth: 0, sort: 'id' })
  const versions = await payload.findVersions({ collection: 'content-records', overrideAccess: true, locale: 'all', depth: 0, sort: 'id' })
  const media = await payload.find({ collection: 'media', overrideAccess: true, locale: 'all', depth: 0, sort: 'id' })
  const state = { games: games.docs, records: records.docs, versions: versions.docs, media: media.docs, bytes: media.docs.map(file => ({ filename: file.filename, digest: digest(readFileSync(path.join(local.directory, 'media', file.filename!)).toString('base64')) })) }
  const statePath = path.join(local.directory, 'fixture-state.json')
  if (mode === 'seed') writeFileSync(statePath, JSON.stringify(state))
  else {
    assert.deepEqual(state, JSON.parse(readFileSync(statePath, 'utf8')))
    assert.ok((await payload.login({ collection: 'users', data: { email: 'recovery@example.invalid', password } })).token)
    assert.equal(records.docs.length, 1)
    assert.ok(versions.totalDocs >= 3)
    assert.equal(media.docs.length, 1)
    console.log('Restored database, IDs, relationships, all locales, draft/version history, media bytes and login verified.')
  }
} finally {
  await payload.destroy()
}
