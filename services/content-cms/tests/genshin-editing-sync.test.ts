import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { canonical } from '../src/record-mapping'
import { cmsEnvironment } from '../src/cms-environment'
import { GENSHIN_INTAKE_PATHS, reconcileGenshinIntake, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
import { importGenshinStructuralStage } from '../src/genshin-structural-stage'
import { exportGenshinCollection, prepareGenshinCollectionReview, readGenshinCollectionReview, stageGenshinCollectionReview } from '../src/genshin-collection-review'
import { applyGenshinEditingSync, planGenshinEditingSync, verifyEditingSyncRows } from '../src/genshin-editing-sync'
import { editingSource, validateUnifiedRecord } from '../src/unified-content'
import { exportUnifiedContent } from '../src/unified-export'

test('published editing sync preserves real O, review history and unrelated content on a real database', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  if (!postgres) {
    process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `editing-test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const runtime = cmsEnvironment(); assert(['sqlite-local', 'postgres-local'].includes(runtime.mode))
  const input: GenshinIntakeInput = JSON.parse(gunzipSync(readFileSync(new URL('../reviews/2026-11-20-genshin-resume-r141.json.gz', import.meta.url))).toString()).input
  const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const admin = await payload.create({ collection: 'users', overrideAccess: true,
      data: { email: 'editing-admin@example.invalid', password: randomUUID() + 'Aa1!', role: 'admin' } })
    const game = await payload.create({ collection: 'games', overrideAccess: true,
      data: { key: 'genshin', name: '原神', region: 'test', legacyRegistry: {} } })
    for (const row of input.cms) await payload.create({ collection: 'content-records', overrideAccess: true, user: admin,
      draft: false, context: { unifiedContentImport: true }, data: { stableKey: row.stableKey, game: game.id, kind: row.kind,
        legacyId: row.legacyId, legacyPath: row.legacyPath, bodyFormat: 'plain', sourceRecord: row.sourceRecord,
        structuredValue: row.structuredValue, hold: row.hold, _status: row._status } })
    await payload.create({ collection: 'content-records', overrideAccess: true, user: admin,
      data: { stableKey: 'unrelated-guide', game: game.id, kind: 'guides', legacyId: 'untouched', legacyPath: 'untouched', bodyFormat: 'plain', sourceRecord: {}, body: 'Preserve this draft.', hold: true, _status: 'draft' } })
    const records = async (draft = true) => (await payload.find({ collection: 'content-records', overrideAccess: true, draft,
      locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
    const before = { draft: await records(), published: await records(false) }
    input.cms = before.draft.filter(r => GENSHIN_INTAKE_PATHS.includes(r.legacyPath)) as any
    await importGenshinStructuralStage(payload, reconcileGenshinIntake(input), input)
    await stageGenshinCollectionReview(payload, input)
    const review = prepareGenshinCollectionReview(input), items = await readGenshinCollectionReview(payload, review)
    const transactionID = await payload.db.beginTransaction(); assert(transactionID)
    try {
      for (const item of items) await payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin,
        req: { transactionID }, data: { runKey: review.runKey, reviewItem: item.id, action: 'accept-export',
          note: 'Reviewed exact complete source, canonical identity, numeric values and recovery.', decisionKey: '', revisionKey: '', cmsKey: '', actorID: '', actorEmail: '' } })
      await payload.db.commitTransaction(transactionID)
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    const exported = await exportGenshinCollection(payload, input)
    const delivery = { sourceIndex: { path: '/test/published-source.json', pin: 'a'.repeat(64) },
      candidateVersion: 'c76c9d57-f814-410c-843a-1dcef57412e3', exportKey: exported.manifest.exportKey }
    const opened = { delivery, input, exported, before, review } as any
    const plan = planGenshinEditingSync(opened)
    assert.equal(plan.changes.length, 476)
    const oldState = canonical(before.draft)
    await t.test('a live editor lock blocks the whole maintenance transaction', async () => {
      const lock = await payload.create({ collection: 'payload-locked-documents', overrideAccess: true,
        data: { document: { relationTo: 'content-records', value: input.cms[0].id as number }, user: { relationTo: 'users', value: admin.id } } })
      try { await assert.rejects(applyGenshinEditingSync(payload, opened, admin.id), /live content lock/) }
      finally { await payload.delete({ collection: 'payload-locked-documents', id: lock.id, overrideAccess: true }) }
      assert.equal(canonical(await records()), oldState)
    })
    await t.test('late failure rolls back all new entities, relation identities, values and completion marker', async () => {
      const hooks = payload.collections['migration-batches'].config.hooks!.beforeChange ??= []
      const failure = ({ data }: any) => { if (data.mapperVersion === 'genshin-published-editing-sync-v1') throw Error('injected sync commit failure') }
      hooks.push(failure)
      try { await assert.rejects(applyGenshinEditingSync(payload, opened, admin.id), /injected sync commit failure/) }
      finally { hooks.splice(hooks.indexOf(failure), 1) }
      assert.equal(canonical(await records()), oldState)
    })
    await t.test('ordinary admin and overrideAccess cannot forge a published baseline', async () => {
      const c = plan.changes.find(c => c.before && c.from === 'sara')!
      await assert.rejects(payload.update({ collection: 'content-records', id: c.before!.id, user: admin,
        overrideAccess: true, draft: false, data: c.after as any }), /maintenance-only/)
      const added = plan.changes.find(c => !c.before)!
      await assert.rejects(payload.create({ collection: 'content-records', user: admin, overrideAccess: true,
        context: { unifiedContentImport: true }, data: added.after as any }), /maintenance-only/)
      assert.equal(canonical(await records()), oldState)
    })
    await t.test('sync imports 86 real entities and updates 390 records atomically, preserving O and flags', async () => {
      const result = await applyGenshinEditingSync(payload, opened, admin.id)
      assert.equal(result.created, 86); assert.equal(result.updated, 390); assert.equal(result.reused, 0)
      assert.equal(result.identityMigrations.length, 2); assert.equal(result.reviewWrites, 0)
      const after = await records(); verifyEditingSyncRows(plan, before.draft, after)
      assert.equal(after.length, 477)
      assert.equal((await payload.count({ collection: 'genshin-review-decisions', overrideAccess: true })).totalDocs, 221)
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 400)
    })
    await t.test('repeat performs no content writes and preserves all record timestamps', async () => {
      const saved = canonical(await records()), hooks = payload.collections['content-records'].config.hooks!.beforeChange!
      const failure = () => { throw Error('repeat tried a content write') }; hooks.push(failure)
      try {
        const result = await applyGenshinEditingSync(payload, opened, admin.id)
        assert.equal(result.created, 0); assert.equal(result.updated, 0); assert.equal(result.reused, 476)
      } finally { hooks.splice(hooks.indexOf(failure), 1) }
      assert.equal(canonical(await records()), saved)
    })
    await t.test('canonical relation exports against real A with zero deltas and retains legacy import O', async () => {
      const after = await records(), migrated = after.find(r => r.kind === 'character-materials' && r.legacyId === '{"characterId":"kujou-sara"}')!
      assert.equal((migrated.sourceRecord as any).locator.identity.characterId, 'sara')
      assert.equal(editingSource(migrated).locator.identity!.characterId, 'kujou-sara')
      const content = after.filter(r => GENSHIN_INTAKE_PATHS.includes(r.legacyPath)) as any
      const result = exportUnifiedContent(content, input.active, exported.sources, true)
      assert.equal(result.manifest.changed.length, 0)
      const fixture = content.find((r: any) => r.kind === 'characters' && r.legacyId === '{"id":"mualani"}')
      validateUnifiedRecord({ ...fixture, structuredValue: { ...fixture.structuredValue, description: 'An ordinary editable leaf.' } }, fixture)
      assert.throws(() => validateUnifiedRecord({ ...fixture, structuredValue: { ...fixture.structuredValue, id: 'forged' } }, fixture), /Protected/)
      await assert.rejects(payload.update({ collection: 'content-records', id: fixture.id, user: admin,
        overrideAccess: false, draft: true, data: { reviewEvidence: null } }), /maintenance-only/)
    })
    await t.test('stale repeated sync refuses newer editorial changes', async () => {
      const row = (await records()).find(r => r.kind === 'characters' && r.legacyId === '{"id":"mualani"}')!
      await payload.update({ collection: 'content-records', id: row.id, user: admin, overrideAccess: false, draft: true,
        data: { structuredValue: { ...(row.structuredValue as object), description: 'Keep newer editorial work.' } } })
      await assert.rejects(applyGenshinEditingSync(payload, opened, admin.id), /record drift/)
    })
  } finally { await payload.destroy(); if (!postgres) await rm(runtime.directory, { recursive: true, force: true }) }
})
