import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { localEnvironment } from '../src/local-environment'
import { importSnapshots, snapshot } from '../src/legacy-intake'
import { mapBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { buildReviewPlan } from '../src/review-plan'
import { stageReview } from '../src/review-store'

test('review workbench and typed draft intake on the real local adapter', { timeout: 60000 }, async t => {
  process.env.CMS_LOCAL_ONLY = '1'
  process.env.CMS_LOCAL_NAMESPACE = `review-test-${randomUUID()}`
  process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const src = (family: string, value: unknown) => snapshot('nte', `packages/data/games/nte/raw-${family}.json`, 'raw-json', JSON.stringify(value))
  const sources = [
    src('guides', [{ id: 'a', title: 'Original', content: '<b>raw</b>', faq: [{ question: 'Q', answer: '', questionZh: 'Qz' }], source: 'unmapped' }, { id: 'b', titleEn: 'English only' }]),
    src('characters', [{ id: 'c', name: 'Character', description: 'Description', skills: ['unmapped'] }]),
    src('weapons', [{ id: 'w', name: 'Weapon' }]),
    src('image-sources', { characters: { image: '' }, weapons: {}, vehicles: {} }),
    src('gacha-system', { banners: [], faqs: [{ question: 'Gacha', answer: 'Unverified' }] }),
  ]
  const policy = { digest: 'review-test-policy', routes: { games: {} } }
  const batch = mapBatch(sources, policy)
  try {
    const account = async (role: 'admin' | 'reviewer' | 'editor') => payload.create({ collection: 'users', overrideAccess: true, data: { email: `${role}@example.invalid`, password: randomUUID() + 'Aa1!', role } })
    const admin = await account('admin'), reviewer = await account('reviewer'), editor = await account('editor')
    const decide = (id: number, action: 'accept-draft' | 'reject' = 'accept-draft') => payload.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem: id, action, note: 'Reviewed fixture; remains held.', actorID: 'forged', actorEmail: 'forged@example.invalid', reviewKey: 'forged' } })
    const count = async (collection: 'editorial-drafts' | 'review-decisions' | 'review-runs') => (await payload.count({ collection, overrideAccess: true })).totalDocs
    const reviewFor = async (legacyId: string, runKey?: string) => (await payload.find({ collection: 'review-items', overrideAccess: true, where: { and: [{ stableKey: { contains: encodeURIComponent(JSON.stringify([legacyId])) } }, ...(runKey ? [{ runKey: { equals: runKey } }] : [])] } })).docs[0]
    await importSnapshots(payload, sources)
    await importRecordBatch(payload, batch, policy)
    const plan = buildReviewPlan(batch)
    assert.equal(plan.items.length, 7)
    assert.equal(plan.items.filter(x => !x.blockers.length).length, 5)

    await t.test('incomplete staging cannot be decided, and rerun resumes without duplicates', async () => {
      const hooks = payload.collections['review-items'].config.hooks.beforeChange
      let calls = 0
      hooks.push(({ data }) => { if (++calls === 2) throw new Error('Injected review write failure'); return data })
      try { await assert.rejects(stageReview(payload, batch.batchKey), /Injected/) } finally { hooks.pop() }
      assert.equal(await count('review-runs'), 0)
      const partial = (await payload.find({ collection: 'review-items', overrideAccess: true })).docs[0]
      await assert.rejects(decide(partial.id, 'reject'), /incomplete/)
      const result = await stageReview(payload, batch.batchKey)
      assert.equal(result.created, 6); assert.equal(result.reused, 1)
      assert.equal((await stageReview(payload, batch.batchKey)).reused, 7)
    })
    const guide = await reviewFor('a', plan.runKey)

    await t.test('roles cannot bypass immutable review data or directly create drafts', async () => {
      for (const collection of ['review-items', 'review-runs', 'review-decisions', 'editorial-drafts'] as const) await assert.rejects(payload.find({ collection, overrideAccess: false }))
      await assert.rejects(payload.create({ collection: 'review-decisions', user: editor, overrideAccess: false, data: { reviewItem: guide.id, action: 'accept-draft', note: 'Not allowed editor', reviewKey: '', actorID: '', actorEmail: '' } }))
      await assert.rejects(payload.update({ collection: 'review-items', id: guide.id, user: admin, overrideAccess: false, data: { blockers: '' } }))
      const draft = { stableKey: 'forged', gameKey: 'nte', legacyId: 'x', kind: 'guide' as const, state: 'draft' as const, hold: true, bodyFormat: 'plain' as const, runKey: 'x', reviewKey: 'x', candidateRevision: 'x', sourcePath: 'x' }
      await assert.rejects(payload.create({ collection: 'editorial-drafts', user: admin, overrideAccess: false, data: draft }))
      await assert.rejects(payload.create({ collection: 'editorial-drafts', user: admin, overrideAccess: true, context: { draftIntake: {} }, data: draft }), /review intake/)
      await assert.rejects(payload.create({ collection: 'review-decisions', user: reviewer, overrideAccess: false, disableTransaction: true, data: { reviewItem: guide.id, action: 'accept-draft', note: 'Cannot bypass transaction' } }), /transaction is required/)
    })

    await t.test('tampered review display and complete manifest are rejected before decisions', async () => {
      await payload.update({ collection: 'review-items', id: guide.id, overrideAccess: true, data: { warnings: 'forged warning' } })
      await assert.rejects(decide(guide.id), /projection mismatch/)
      await payload.update({ collection: 'review-items', id: guide.id, overrideAccess: true, data: { warnings: guide.warnings } })
      const run = (await payload.find({ collection: 'review-runs', overrideAccess: true })).docs[0]
      await payload.update({ collection: 'review-runs', id: run.id, overrideAccess: true, data: { manifest: '{}' } })
      await assert.rejects(decide(guide.id), /integrity failure/)
      await payload.update({ collection: 'review-runs', id: run.id, overrideAccess: true, data: { manifest: run.manifest } })
      assert.equal(await count('editorial-drafts'), 0)
    })

    await t.test('failure after nested draft creation rolls back both draft and decision', async () => {
      const hooks = payload.collections['review-decisions'].config.hooks.beforeChange
      hooks.push(() => { throw new Error('Injected post-draft failure') })
      try { await assert.rejects(decide(guide.id), /post-draft/) } finally { hooks.pop() }
      assert.equal(await count('editorial-drafts'), 0)
      assert.equal(await count('review-decisions'), 0)
    })

    const accepted = await decide(guide.id)
    const draftID = typeof accepted.draft === 'object' ? accepted.draft!.id : accepted.draft!
    await t.test('reviewer acceptance records server-owned identity and creates exact held typed draft', async () => {
      assert.equal(accepted.actorID, String(reviewer.id)); assert.equal(accepted.actorEmail, reviewer.email)
      assert.equal(accepted.reviewKey, guide.reviewKey)
      const draft = await payload.findByID({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor })
      assert.equal(draft.hold, true); assert.equal(draft.state, 'draft'); assert.equal(draft.kind, 'guide')
      assert.equal(draft.translations?.find(x => x.locale === 'zh')?.body, '<b>raw</b>')
      assert.equal(draft.translations?.find(x => x.locale === 'en')?.body, null)
      assert.equal(draft.faqs?.find(x => x.locale === 'en')?.answer, '')
      assert.match(draft.unmappedFields!, /source/)
      await assert.rejects(decide(guide.id), /terminal decision/)
      await assert.rejects(payload.update({ collection: 'review-decisions', id: accepted.id, user: admin, overrideAccess: false, data: { note: 'Changed historical decision' } }))
    })

    await t.test('editing typed fields versions changes but never changes identity, provenance or hold', async () => {
      await payload.update({ collection: 'editorial-drafts', id: draftID, user: editor, overrideAccess: false, data: { translations: [{ locale: 'zh', title: 'Edited by human', body: 'Edited body' }] } })
      for (const data of [{ hold: false }, { stableKey: 'changed' }, { candidateRevision: 'changed' }, { kind: 'character' as const }]) await assert.rejects(payload.update({ collection: 'editorial-drafts', id: draftID, user: admin, overrideAccess: false, data }), /Immutable|held/)
      await assert.rejects(payload.update({ collection: 'editorial-drafts', id: draftID, user: editor, overrideAccess: false, data: { translations: [{ locale: 'en' }, { locale: 'en' }] } }), /Duplicate/)
      const versions = await payload.findVersions({ collection: 'editorial-drafts', user: reviewer, overrideAccess: false, where: { parent: { equals: draftID } } })
      assert.ok(versions.totalDocs >= 2)
      await assert.rejects(payload.restoreVersion({ collection: 'editorial-drafts', id: versions.docs[0].id, user: reviewer, overrideAccess: false }), /Restore/)
      const lock = await payload.create({ collection: 'payload-locked-documents', overrideAccess: true, data: { document: { relationTo: 'editorial-drafts', value: draftID }, user: { relationTo: 'users', value: reviewer.id } } })
      await assert.rejects(payload.update({ collection: 'editorial-drafts', id: draftID, user: editor, overrideAccess: false, overrideLock: true, data: { editorNote: 'Bypass lock attempt' } }))
      await payload.delete({ collection: 'payload-locked-documents', id: lock.id, overrideAccess: true })
    })

    await t.test('new candidate cannot overwrite an edited draft; field changes remain inspectable', async () => {
      const changed = src('guides', [{ id: 'a', title: 'New source revision' }, { id: 'b', titleEn: 'English only' }])
      await importSnapshots(payload, [changed])
      const next = mapBatch([changed, ...sources.slice(1)], policy)
      await importRecordBatch(payload, next, policy)
      const result = await stageReview(payload, next.batchKey, batch.batchKey)
      assert.equal(result.total, 1)
      const nextItem = await reviewFor('a', result.runKey)
      assert.ok(nextItem.fieldChanges?.some(x => x.field === 'zh.title'))
      await assert.rejects(decide(nextItem.id), /already exists/)
      assert.equal((await payload.findByID({ collection: 'editorial-drafts', id: draftID, overrideAccess: true })).translations?.[0].title, 'Edited by human')
      assert.equal(await count('review-decisions'), 1)
    })

    await t.test('unsupported adapters can be rejected but not accepted as generic JSON drafts', async () => {
      const item = await reviewFor('w', plan.runKey)
      await assert.rejects(decide(item.id), /No supported/)
      const rejected = await decide(item.id, 'reject')
      assert.equal(rejected.draft, null)
      assert.equal(await count('editorial-drafts'), 1)
    })

    await t.test('character, FAQ and asset adapters preserve typed fields and validation boundaries', async () => {
      const items = (await payload.find({ collection: 'review-items', limit: 100, overrideAccess: true, where: { runKey: { equals: plan.runKey } } })).docs
      for (const kind of ['character', 'faq-section', 'asset-reference']) {
        const item = items.find(x => x.draftKind === kind)!
        const decision = await decide(item.id)
        const id = typeof decision.draft === 'object' ? decision.draft!.id : decision.draft!
        const draft = await payload.findByID({ collection: 'editorial-drafts', id, overrideAccess: true })
        assert.equal(draft.kind, kind)
        if (kind === 'asset-reference') {
          assert.equal(draft.assetReference?.url, '')
          await assert.rejects(payload.update({ collection: 'editorial-drafts', id, overrideAccess: false, user: editor, data: { assetReference: { url: 'javascript:alert(1)' } } }), /Invalid asset/)
        }
      }
    })

    await t.test('simultaneous local decisions cannot create duplicate drafts or decisions', async () => {
      const item = await reviewFor('b', plan.runKey)
      const outcomes = await Promise.allSettled([decide(item.id), decide(item.id)])
      assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1)
      assert.equal((await payload.count({ collection: 'review-decisions', overrideAccess: true, where: { reviewKey: { equals: item.reviewKey } } })).totalDocs, 1)
      assert.equal((await payload.count({ collection: 'editorial-drafts', overrideAccess: true, where: { stableKey: { equals: item.stableKey } } })).totalDocs, 1)
    })

    await t.test('withdrawal/source gaps never delete drafts; empty diffs and mapper gates stay explicit', async () => {
      const empty = src('guides', [])
      await importSnapshots(payload, [empty])
      const next = mapBatch([empty], policy)
      await importRecordBatch(payload, next, policy)
      const result = await stageReview(payload, next.batchKey, batch.batchKey)
      const item = await reviewFor('a', result.runKey)
      assert.equal(item.change, 'withdrawal-review-required')
      await assert.rejects(decide(item.id), /No supported/)
      await decide(item.id, 'reject')
      assert.equal(await count('editorial-drafts'), 5)
      assert.equal((await stageReview(payload, batch.batchKey, batch.batchKey)).total, 0)
      assert.throws(() => buildReviewPlan(batch, { ...batch, mapperVersion: 'legacy-records-v1' }), /re-baselining/)
    })
    await t.test('local writer queue has a bounded backlog and releases after rollback', async () => {
      const held = await payload.db.beginTransaction()
      assert.ok(held)
      const waiting = Array.from({ length: 65 }, () => payload.db.beginTransaction().then(async id => { assert.ok(id); await payload.db.rollbackTransaction(id); return id }))
      const settled = Promise.allSettled(waiting)
      await payload.db.rollbackTransaction(held)
      const results = await settled
      assert.equal(results.filter(x => x.status === 'fulfilled').length, 64)
      assert.equal(results.filter(x => x.status === 'rejected').length, 1)
      const next = await payload.db.beginTransaction()
      assert.ok(next)
      await payload.db.rollbackTransaction(next)
      assert.equal(await count('editorial-drafts'), 5)
    })
  } finally {
    await payload.destroy()
    await rm(local.directory, { recursive: true, force: true })
  }
})
