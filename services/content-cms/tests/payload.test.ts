import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { localEnvironment } from '../src/local-environment'
import { cmsEnvironment } from '../src/cms-environment'
import { importSnapshots, snapshot } from '../src/legacy-intake'

test('real Payload adapter: editorial boundaries and fidelity', async (t) => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  process.env.CMS_LOCAL_ONLY = '1'
  if (!postgres) {
    process.env.CMS_LOCAL_NAMESPACE = `test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const local = postgres ? cmsEnvironment() : localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    // Privileged fixture bootstrap only; all user-context actions below enforce ACLs.
    const password = randomUUID() + 'Aa1!'
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'admin@example.invalid', password, role: 'admin' } })
    const editor = await payload.create({ collection: 'users', user: admin, overrideAccess: false, data: { email: 'editor@example.invalid', password, role: 'editor' } })
    const reviewer = await payload.create({ collection: 'users', user: admin, overrideAccess: false, data: { email: 'reviewer@example.invalid', password, role: 'reviewer' } })
    const game = await payload.create({ collection: 'games', user: admin, overrideAccess: false, locale: 'zh', data: { key: 'roco-cn', name: 'Local fixture', region: 'cn', legacyRegistry: { routes: { guides: true } } } })
    const original = { slug: 'fixture-guide', text: '**original**', reviewed: false }
    const record = await payload.create({ collection: 'content-records', user: editor, overrideAccess: false, draft: true, locale: 'zh', data: { stableKey: 'roco-cn:guides:fixture-guide', game: game.id, kind: 'guides', legacyId: original.slug, legacyPath: '/roco-cn/guides/fixture-guide', title: 'Original title', body: original.text, bodyFormat: 'markdown', sourceRecord: original, hold: true } })

    await t.test('login works; bad credentials fail', async () => {
      assert.ok((await payload.login({ collection: 'users', data: { email: editor.email, password } })).token)
      await assert.rejects(payload.login({ collection: 'users', data: { email: editor.email, password: 'wrong' } }))
    })
    await t.test('anonymous reads and self-escalation are denied', async () => {
      await assert.rejects(payload.findByID({ collection: 'content-records', id: record.id, overrideAccess: false, draft: true }))
      await assert.rejects(payload.create({ collection: 'users', overrideAccess: false, data: { email: 'anon@example.invalid', password, role: 'admin' } }))
      await assert.rejects(payload.update({ collection: 'users', id: editor.id, user: editor, overrideAccess: false, data: { role: 'admin' } }))
      await assert.rejects(payload.create({ collection: 'games', user: editor, overrideAccess: false, data: { key: 'forbidden', name: 'No', region: 'cn', legacyRegistry: {} } }))
    })
    await t.test('stable identity is unique and relationships preserve the region', async () => {
      await assert.rejects(payload.create({ collection: 'games', user: admin, overrideAccess: false, data: { key: 'roco-cn', name: 'Duplicate', region: 'global', legacyRegistry: {} } }))
      const result = await payload.findByID({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false, draft: true, depth: 1 })
      assert.equal(typeof result.game === 'object' ? result.game.region : null, 'cn')
      assert.deepEqual(result.sourceRecord, original)
      assert.equal(result.legacyPath, '/roco-cn/guides/fixture-guide')
    })
    await t.test('missing translations do not silently fall back', async () => {
      const result = await payload.findByID({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, draft: true, locale: 'en', fallbackLocale: false })
      assert.ok(!result.title)
      await payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, overrideLock: false, draft: true, locale: 'en', data: { title: 'English title' } })
      const zh = await payload.findByID({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, draft: true, locale: 'zh' })
      assert.equal(zh.title, 'Original title')
    })
    await t.test('editors cannot publish; reviewers can, without activating any website', async () => {
      await assert.rejects(payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, overrideLock: false, data: { _status: 'published' } }), /reviewer/)
      const published = await payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false, overrideLock: false, data: { _status: 'published' } })
      assert.equal(published._status, 'published')
      assert.equal(published.hold, true)
      await assert.rejects(payload.findByID({ collection: 'content-records', id: record.id, overrideAccess: false }))
    })
    await t.test('version history is retained', async () => {
      const versions = await payload.findVersions({ collection: 'content-records', user: reviewer, overrideAccess: false, where: { parent: { equals: record.id } } })
      assert.ok(versions.totalDocs >= 3)
    })
    await t.test('active edit locks block updates and restores, including explicit override attempts', async () => {
      const versions = await payload.findVersions({ collection: 'content-records', user: reviewer, overrideAccess: false, where: { parent: { equals: record.id } } })
      const version = versions.docs.find(item => item.version._status === 'published')!
      assert.ok(version)
      const lock = await payload.create({ collection: 'payload-locked-documents', user: editor, overrideAccess: false, data: { document: { relationTo: 'content-records', value: record.id }, user: { relationTo: 'users', value: editor.id } } })
      await assert.rejects(payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false, overrideLock: true, draft: true, data: { title: 'Must not overwrite' } }), /locked/i)
      await assert.rejects(payload.restoreVersion({ collection: 'content-records', id: String(version.id), user: reviewer, overrideAccess: false }), /locked/i)
      await assert.rejects(payload.restoreVersion({ collection: 'content-records', id: String(version.id), user: editor, overrideAccess: false }), /reviewer/i)
      await payload.delete({ collection: 'payload-locked-documents', id: lock.id, user: editor, overrideAccess: false })
      await payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false, overrideLock: false, locale: 'zh', draft: true, data: { title: 'Changed after lock release' } })
      const restored = await payload.restoreVersion({ collection: 'content-records', id: String(version.id), user: reviewer, overrideAccess: false, locale: 'zh' })
      assert.equal(restored.title, 'Original title')
      assert.equal(restored._status, 'published')
      assert.deepEqual(restored.sourceRecord, original)
    })
    await t.test('explicit multi-record transactions really roll back and commit', async () => {
      const transactionID = await payload.db.beginTransaction()
      assert.ok(transactionID, 'A null transaction ID would silently disable rollback')
      const req = { transactionID, user: admin }
      await payload.create({ collection: 'games', req, overrideAccess: false, data: { key: 'rollback-a', name: 'A', region: 'test', legacyRegistry: {} } })
      await payload.create({ collection: 'games', req, overrideAccess: false, data: { key: 'rollback-b', name: 'B', region: 'test', legacyRegistry: {} } })
      await payload.db.rollbackTransaction(transactionID)
      assert.equal((await payload.count({ collection: 'games', user: admin, overrideAccess: false, where: { key: { in: ['rollback-a', 'rollback-b'] } } })).totalDocs, 0)
      const committedID = await payload.db.beginTransaction()
      assert.ok(committedID)
      await payload.create({ collection: 'games', req: { transactionID: committedID, user: admin }, overrideAccess: false, data: { key: 'committed', name: 'C', region: 'test', legacyRegistry: {} } })
      await payload.db.commitTransaction(committedID)
      assert.equal((await payload.count({ collection: 'games', user: admin, overrideAccess: false, where: { key: { equals: 'committed' } } })).totalDocs, 1)
    })
    await t.test('media remains private and persists to the isolated directory', async () => {
      const data = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')
      const media = await payload.create({ collection: 'media', user: editor, overrideAccess: false, data: { alt: 'Local test pixel' }, file: { data, mimetype: 'image/png', name: 'pixel.png', size: data.length } })
      assert.ok(media.filename)
      await assert.rejects(payload.findByID({ collection: 'media', id: media.id, overrideAccess: false }))
    })
    await t.test('legacy intake resumes without duplicates, preserves revisions, and denies all editorial writes', async () => {
      const first = snapshot('roco-cn', 'fixture/raw-guides.json', 'raw-json', JSON.stringify({ hold: true, text: '<b>not HTML-rendered</b>'.repeat(3000) }))
      const second = snapshot('lvmeng', 'fixture/data.ts', 'inline-code', 'export const status = "unverified"')
      assert.deepEqual(await importSnapshots(payload, [first]), { created: 1, unchanged: 0, total: 1 })
      assert.deepEqual(await importSnapshots(payload, [first, second]), { created: 1, unchanged: 1, total: 2 })
      assert.deepEqual(await importSnapshots(payload, [first, second]), { created: 0, unchanged: 2, total: 2 })
      const changed = snapshot('roco-cn', first.sourcePath, 'raw-json', '{"hold":true,"text":"new, still unreviewed"}')
      assert.equal((await importSnapshots(payload, [changed])).created, 1)
      const rows = await payload.find({ collection: 'migration-sources', user: editor, overrideAccess: false })
      assert.equal(rows.totalDocs, 3)
      assert.ok(rows.docs.some(row => row.rawText === first.rawText))
      await assert.rejects(importSnapshots(payload, [{ ...first, rawText: 'tampered' }]), /integrity/)
      await assert.rejects(importSnapshots(payload, [{ ...first, gameKey: 'wrong-game' }]), /mismatch/)
      await assert.rejects(payload.find({ collection: 'migration-sources', overrideAccess: false }))
      await assert.rejects(payload.create({ collection: 'migration-sources', user: admin, overrideAccess: false, data: first }))
      await assert.rejects(payload.update({ collection: 'migration-sources', id: rows.docs[0].id, user: admin, overrideAccess: false, data: { rawText: 'changed' } }))
      await assert.rejects(payload.delete({ collection: 'migration-sources', id: rows.docs[0].id, user: admin, overrideAccess: false }))
    })
    await t.test('custom first-user registration endpoint precedes the builtin', async () => {
      const users = payload.config.collections.find(collection => collection.slug === 'users')!
      assert.ok(Array.isArray(users.endpoints))
      const endpoint = users.endpoints.find(endpoint => endpoint.path === '/first-register' && endpoint.method === 'post')!
      const response = await endpoint.handler({} as never)
      assert.equal(response.status, 403)
    })
  } finally {
    await payload.destroy()
    if (postgres) {
      assert.equal(payload.db.pool.ended, true, 'Destroy must close the PostgreSQL pool')
      await payload.db.destroy?.()
    }
    await rm(local.directory, { recursive: true, force: true })
  }
})
