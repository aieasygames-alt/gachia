import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { cmsEnvironment } from '../src/cms-environment'
import { exportDesktopGuides } from '../src/desktop-export'
import { localEnvironment } from '../src/local-environment'

test('editorial publication lifecycle protects approved revisions', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  process.env.CMS_LOCAL_ONLY = '1'
  if (!postgres) {
    process.env.CMS_LOCAL_NAMESPACE = `test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const runtime = postgres ? cmsEnvironment() : localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const password = randomUUID() + 'Aa1!'
    const admin = await payload.create({ collection: 'users', data: { email: 'lifecycle-admin@example.invalid', password, role: 'admin' } })
    const editor = await payload.create({ collection: 'users', user: admin, overrideAccess: false,
      data: { email: 'lifecycle-editor@example.invalid', password, role: 'editor' } })
    const reviewer = await payload.create({ collection: 'users', user: admin, overrideAccess: false,
      data: { email: 'lifecycle-reviewer@example.invalid', password, role: 'reviewer' } })
    const game = await payload.create({ collection: 'games', user: admin, overrideAccess: false,
      data: { key: 'genshin', name: 'Isolated lifecycle fixture', region: 'test', legacyRegistry: {} } })
    const original = { id: 'one', title: 'Imported O', content: 'Original body', image: '/unchanged.webp' }
    const data = (id: string) => ({ stableKey: `genshin:guides:${id}`, game: game.id, kind: 'guides', legacyId: id,
      legacyPath: `/genshin/guides/${id}`, title: 'Approved A', body: 'Approved body', bodyFormat: 'markdown' as const,
      sourceRecord: { ...original, id }, hold: false, _status: 'published' as const })
    const approved = (id: string) => payload.create({ collection: 'content-records', user: reviewer, overrideAccess: false, locale: 'zh', data: data(id) })
    const read = (id: number, draft = false) => payload.findByID({ collection: 'content-records', id, user: reviewer, overrideAccess: false,
      draft, locale: 'all', depth: 0 })
    const versions = async (id: number) => (await payload.findVersions({ collection: 'content-records', user: reviewer, overrideAccess: false,
      where: { parent: { equals: id } } })).totalDocs
    const forbidden = (error: unknown) => error instanceof Error && 'status' in error && error.status === 403 && /reviewer/i.test(error.message)

    for (const [name, patch] of [
      ['omitted status must not inherit published approval', { title: 'Unapproved replacement' }],
      ['hold changes without a draft must not alter approved eligibility', { hold: true }],
      ['explicit unpublish also requires a reviewer', { _status: 'draft' as const }],
    ] as const) await t.test(name, async () => {
      const record = await approved(`case-${(await payload.count({ collection: 'content-records' })).totalDocs}`)
      const before = await read(record.id), count = await versions(record.id)
      await assert.rejects(payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false,
        locale: 'zh', data: patch }), forbidden)
      assert.deepEqual(await read(record.id), before)
      assert.equal(await versions(record.id), count)
    })

    await t.test('bulk and local-access-override unpublish attempts also require a reviewer', async () => {
      const record = await approved('bulk')
      const before = await read(record.id), count = await versions(record.id)
      await assert.rejects(payload.update({ collection: 'content-records', user: editor, overrideAccess: false,
        where: { id: { equals: record.id } }, data: { _status: 'draft', body: 'Bulk overwrite' } }), forbidden)
      await assert.rejects(payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: true,
        data: { _status: 'draft', body: 'Local override overwrite' } }), forbidden)
      assert.deepEqual(await read(record.id), before)
      assert.equal(await versions(record.id), count)
    })

    await t.test('editors can create drafts but cannot create published records', async () => {
      const count = (await payload.count({ collection: 'content-records' })).totalDocs
      await assert.rejects(payload.create({ collection: 'content-records', user: editor, overrideAccess: false,
        data: data('published-create') }), forbidden)
      assert.equal((await payload.count({ collection: 'content-records' })).totalDocs, count)
      const created = await payload.create({ collection: 'content-records', user: editor, overrideAccess: false, draft: true,
        data: { ...data('explicit-create'), _status: 'draft', hold: true } })
      assert.equal(created._status, 'draft')
      assert.equal(created.hold, true)
    })

    await t.test('a draft flag cannot authorize publication, even with a local access override', async () => {
      const record = await approved('draft-publish')
      const before = await read(record.id), count = await versions(record.id)
      for (const overrideAccess of [false, true]) {
        await assert.rejects(payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess,
          draft: true, data: { _status: 'published', title: 'Unapproved publish' } }), forbidden)
      }
      assert.deepEqual(await read(record.id), before)
      assert.equal(await versions(record.id), count)
    })

    await t.test('saving localized drafts preserves the approved export until a reviewer publishes again', async () => {
      const record = await approved('one')
      const before = await read(record.id)
      const a = exportDesktopGuides(JSON.stringify([original]), 'genshin', [before], false)
      await payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, draft: true,
        locale: 'zh', data: { title: 'Draft B', body: 'Draft body', hold: true } })
      await payload.update({ collection: 'content-records', id: record.id, user: editor, overrideAccess: false, draft: true,
        locale: 'en', data: { title: 'English draft B' } })
      const draft = await read(record.id, true)
      assert.equal(draft._status, 'draft')
      const preview = JSON.parse(exportDesktopGuides(JSON.stringify([original]), 'genshin', [draft], true).content)[0]
      assert.equal(preview.title, 'Draft B')
      assert.equal(preview.titleEn, 'English draft B')
      assert.equal(draft.hold, true)
      assert.deepEqual(await read(record.id), before)
      const stillA = exportDesktopGuides(JSON.stringify([original]), 'genshin', [await read(record.id)], false)
      assert.deepEqual(stillA, a)
      await payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false,
        locale: 'zh', data: { _status: 'published', hold: false } })
      const b = exportDesktopGuides(JSON.stringify([original]), 'genshin', [await read(record.id)], false)
      assert.equal(JSON.parse(b.content)[0].title, 'Draft B')
      assert.equal(JSON.parse(b.content)[0].titleEn, 'English draft B')
      assert.notEqual(b.manifest.releaseKey, a.manifest.releaseKey)
      assert.equal(b.manifest.sourceSHA256, a.manifest.sourceSHA256)
    })

    await t.test('reviewers can explicitly hold or unpublish without activating a public release', async () => {
      const record = await approved('withdraw')
      await payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false, data: { hold: true } })
      const held = await read(record.id)
      assert.equal(held.hold, true)
      const text = JSON.stringify([{ ...original, id: 'withdraw' }])
      assert.throws(() => exportDesktopGuides(text, 'genshin', [held], false), /Unapproved/)
      await payload.update({ collection: 'content-records', id: record.id, user: reviewer, overrideAccess: false,
        data: { _status: 'draft', hold: false } })
      const unpublished = await read(record.id)
      assert.equal(unpublished._status, 'draft')
      assert.throws(() => exportDesktopGuides(text, 'genshin', [unpublished], false), /Unapproved/)
    })
  } finally {
    await payload.destroy()
    if (postgres) assert.equal(payload.db.pool.ended, true)
    else await rm(runtime.directory, { recursive: true, force: true })
  }
})
