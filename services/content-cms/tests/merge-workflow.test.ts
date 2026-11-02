import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { localEnvironment } from '../src/local-environment'
import { snapshot, importSnapshots } from '../src/legacy-intake'
import { mapBatch, type RecordBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
import { loadMaintenancePlan } from '../src/maintenance-store'

test('append-only closure and reconsideration preserve old decisions and require fresh approval', { timeout: 90000 }, async t => {
  process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `workflow-test-${randomUUID()}`; process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload'); const { default: config } = await import('../src/payload.config')
  const p = await getPayload({ config })
  try {
    const reviewer = await p.create({ collection: 'users', data: { email: 'reviewer@example.invalid', password: randomUUID() + 'Aa1!', role: 'reviewer' } })
    const editor = await p.create({ collection: 'users', data: { email: 'editor@example.invalid', password: randomUUID() + 'Aa1!', role: 'editor' } })
    const policy = { digest: 'workflow-fixture', routes: { games: {} } }
    const seed = async (key: string, title: string, base?: RecordBatch) => {
      const src = snapshot('fixture', 'packages/data/games/fixture/raw-guides.json', 'raw-json', JSON.stringify([{ id: key, title, content: 'Source body' }]))
      await importSnapshots(p, [src]); const batch = mapBatch([src], policy); await importRecordBatch(p, batch, policy)
      const run = await stageReview(p, batch.batchKey, base?.batchKey)
      const item = (await p.find({ collection: 'review-items', where: { runKey: { equals: run.runKey } } })).docs[0]
      return { batch, item }
    }
    const pair = async () => {
      const key = randomUUID(), base = await seed(key, 'Original')
      const intake = await p.create({ collection: 'review-decisions', user: reviewer, overrideAccess: false, data: { reviewItem: base.item.id, action: 'accept-draft', note: 'Synthetic baseline accepted as held.' } })
      const draft = typeof intake.draft === 'object' ? intake.draft!.id : intake.draft!
      const next = await seed(key, 'Updated', base.batch)
      const proposal = await p.create({ collection: 'draft-merge-proposals', user: editor, overrideAccess: false, data: { draft, reviewItem: next.item.id } })
      return { draft, proposal, next, base, key }
    }
    const event = (proposal: number, action: 'close' | 'reconsider') => p.create({ collection: 'merge-workflow-events', user: reviewer, overrideAccess: false, data: { proposal, action, note: 'Explicit workflow reason for this synthetic test.', actorID: 'forged', eventKey: 'forged', replacementKey: 'forged' } })
    const decision = (proposal: number, action: 'apply' | 'dismiss') => p.create({ collection: 'draft-merge-decisions', user: reviewer, overrideAccess: false, data: { proposal, action, note: 'Explicit fresh approval for synthetic comparison.' } })
    const replacementID = (value: Awaited<ReturnType<typeof event>>) => typeof value.replacement === 'object' ? value.replacement!.id : value.replacement!
    const draft = async (id: number) => {
      const { mergeProposals: _derivedHistory, ...record } = await p.findByID({ collection: 'editorial-drafts', id, depth: 0 })
      return record
    }

    await t.test('staff cannot forge retry lineage; reviewer events require transactions and cannot be rewritten/deleted', async () => {
      const x = await pair()
      await assert.rejects(p.find({ collection: 'merge-workflow-events', overrideAccess: false }))
      await assert.rejects(p.create({ collection: 'merge-workflow-events', user: editor, overrideAccess: true, data: { proposal: x.proposal.id, action: 'close', note: 'Editor cannot close proposals.' } }), /reviewers/)
      await assert.rejects(p.create({ collection: 'merge-workflow-events', user: reviewer, disableTransaction: true, data: { proposal: x.proposal.id, action: 'close', note: 'No transaction is forbidden.' } }), /transaction/)
      await assert.rejects(p.create({ collection: 'draft-merge-proposals', user: reviewer, data: { draft: x.draft, reviewItem: x.next.item.id, parentProposalKey: x.proposal.proposalKey } }), /reconsideration/)
      await assert.rejects(event(x.proposal.id, 'reconsider'), /Close or dismiss/)
      const closed = await event(x.proposal.id, 'close')
      assert.equal(closed.actorID, String(reviewer.id)); assert.notEqual(closed.eventKey, 'forged'); assert.equal(closed.replacement, null)
      await assert.rejects(p.update({ collection: 'merge-workflow-events', id: closed.id, user: reviewer, data: { note: 'Changed history is forbidden.' } }), /reviewers/)
      await assert.rejects(p.delete({ collection: 'merge-workflow-events', id: closed.id, user: reviewer }), /cannot be deleted/)
    })
    await t.test('stale proposals close without changing draft or versions, and closed proposals cannot apply', async () => {
      const x = await pair()
      await p.update({ collection: 'editorial-drafts', id: x.draft, user: editor, overrideAccess: false, data: { editorNote: 'New work after old proposal.' } })
      const before = await draft(x.draft), versions = await p.findVersions({ collection: 'editorial-drafts', where: { parent: { equals: x.draft } } })
      await assert.rejects(decision(x.proposal.id, 'apply'), /Stale/)
      await event(x.proposal.id, 'close')
      assert.deepEqual(await draft(x.draft), before)
      assert.equal((await p.findVersions({ collection: 'editorial-drafts', where: { parent: { equals: x.draft } } })).totalDocs, versions.totalDocs)
      await assert.rejects(event(x.proposal.id, 'close'), /already exists/)
      await assert.rejects(decision(x.proposal.id, 'apply'), /closed/)
      const renewed = await event(x.proposal.id, 'reconsider')
      const proposal = await p.findByID({ collection: 'draft-merge-proposals', id: replacementID(renewed), depth: 0 })
      assert.equal(proposal.parentProposalKey, x.proposal.proposalKey)
      assert.notEqual(proposal.draftFingerprint, x.proposal.draftFingerprint)
      assert.deepEqual(await draft(x.draft), before)
      await decision(proposal.id, 'apply')
      assert.equal((await draft(x.draft)).translations?.[0].title, 'Updated')
      assert.equal((await draft(x.draft)).editorNote, 'New work after old proposal.')
      assert.equal((await draft(x.draft)).hold, true)
    })
    await t.test('dismissed identical snapshots can be reconsidered without dummy edits or changing old decisions', async () => {
      const x = await pair(), dismissed = await decision(x.proposal.id, 'dismiss'), before = await draft(x.draft)
      const renewed = await event(x.proposal.id, 'reconsider')
      const fresh = await p.findByID({ collection: 'draft-merge-proposals', id: replacementID(renewed) })
      assert.equal(fresh.draftFingerprint, x.proposal.draftFingerprint); assert.notEqual(fresh.proposalKey, x.proposal.proposalKey)
      assert.deepEqual(await draft(x.draft), before)
      assert.equal((await p.findByID({ collection: 'draft-merge-decisions', id: dismissed.id })).action, 'dismiss')
      await assert.rejects(decision(x.proposal.id, 'apply'), /terminal/)
      await event(fresh.id, 'close')
      const again = await event(fresh.id, 'reconsider')
      await decision(replacementID(again), 'apply')
      await assert.rejects(event(replacementID(again), 'reconsider'), /applied/)
      await assert.rejects(event(replacementID(again), 'close'), /applied/)
    })
    await t.test('failure after replacement creation rolls back proposal and event together', async () => {
      const x = await pair(); await event(x.proposal.id, 'close')
      const count = async () => (await p.count({ collection: 'draft-merge-proposals' })).totalDocs
      const before = await count(), hooks = p.collections['merge-workflow-events'].config.hooks.beforeChange
      hooks.push(() => { throw new Error('Injected event failure') })
      try { await assert.rejects(event(x.proposal.id, 'reconsider'), /Injected/) } finally { hooks.pop() }
      assert.equal(await count(), before)
      const renewed = await event(x.proposal.id, 'reconsider'); assert.ok(renewed.replacement)
    })
    await t.test('concurrent reconsiderations create one replacement; close/apply race has one winner', async () => {
      const x = await pair(); await event(x.proposal.id, 'close')
      const retry = await Promise.allSettled([event(x.proposal.id, 'reconsider'), event(x.proposal.id, 'reconsider')])
      assert.equal(retry.filter(row => row.status === 'fulfilled').length, 1)
      const y = await pair()
      const race = await Promise.allSettled([event(y.proposal.id, 'close'), decision(y.proposal.id, 'apply')])
      assert.equal(race.filter(row => row.status === 'fulfilled').length, 1)
      assert.equal((await draft(y.draft)).hold, true)
    })
    await t.test('reconsideration cannot bypass rejected target reviews or obsolete source baselines', async () => {
      const x = await pair(); await event(x.proposal.id, 'close')
      await p.create({ collection: 'review-decisions', user: reviewer, data: { reviewItem: x.next.item.id, action: 'reject', note: 'Reject this update for substantive reasons.' } })
      await assert.rejects(event(x.proposal.id, 'reconsider'), /terminal intake/)
      const y = await pair(), sibling = await seed(y.key, 'Sibling source', y.base.batch)
      const siblingProposal = await p.create({ collection: 'draft-merge-proposals', user: reviewer, data: { draft: y.draft, reviewItem: sibling.item.id } })
      await event(y.proposal.id, 'close'); await decision(siblingProposal.id, 'apply')
      await assert.rejects(event(y.proposal.id, 'reconsider'), /forward diff/)
    })
    await t.test('maintenance lifecycle follows live mutations and agrees with action restrictions', async () => {
      const x = await pair()
      const status = async () => (await loadMaintenancePlan(p, x.next.item.runKey)).items.find(i => i.reviewKey === x.next.item.reviewKey)!.status
      assert.equal(await status(), 'awaiting-approval')
      await p.update({ collection: 'editorial-drafts', id: x.draft, user: editor, overrideAccess: false, data: { editorNote: 'Invalidate the old comparison.' } })
      assert.equal(await status(), 'stale')
      await assert.rejects(decision(x.proposal.id, 'dismiss'), /Stale/)
      await event(x.proposal.id, 'close')
      assert.equal(await status(), 'closed')
      await assert.rejects(decision(x.proposal.id, 'dismiss'), /closed/)
      const renewed = await event(x.proposal.id, 'reconsider')
      assert.equal(await status(), 'awaiting-approval')
      await decision(replacementID(renewed), 'dismiss')
      assert.equal(await status(), 'dismissed')
      await assert.rejects(event(replacementID(renewed), 'close'), /terminal/)
      const again = await event(replacementID(renewed), 'reconsider')
      await decision(replacementID(again), 'apply')
      assert.equal(await status(), 'applied')
      await assert.rejects(event(replacementID(again), 'reconsider'), /applied/)
    })
    await t.test('successive merges supersede initial acceptance across review policies without rewriting history', async () => {
      const x = await pair()
      const alternate = await stageReview(p, x.base.batch.batchKey, undefined, 'review-v2-material')
      const status = async (runKey: string) => (await loadMaintenancePlan(p, runKey)).items.find(i => i.stableKey === x.base.item.stableKey)!.status
      const history = async () => (await p.find({ collection: 'review-decisions', depth: 0, where: { reviewKey: { equals: x.base.item.reviewKey } } })).docs
      const accepted = await history()
      assert.equal(accepted.length, 1)
      assert.equal(accepted[0].action, 'accept-draft')
      assert.equal(await status(x.base.item.runKey), 'accepted-held')
      assert.equal(await status(alternate.runKey), 'accepted-held')
      const applied = await decision(x.proposal.id, 'apply')
      assert.equal(await status(x.base.item.runKey), 'superseded')
      assert.equal(await status(alternate.runKey), 'superseded')
      assert.equal(await status(x.next.item.runKey), 'applied')
      const third = await seed(x.key, 'Third revision', x.next.batch)
      const proposal = await p.create({ collection: 'draft-merge-proposals', user: editor, overrideAccess: false, data: { draft: x.draft, reviewItem: third.item.id } })
      await decision(proposal.id, 'apply')
      assert.equal(await status(x.base.item.runKey), 'superseded')
      assert.equal(await status(alternate.runKey), 'superseded')
      assert.equal(await status(x.next.item.runKey), 'superseded')
      assert.equal(await status(third.item.runKey), 'applied')
      assert.deepEqual(await history(), accepted)
      assert.equal((await p.findByID({ collection: 'draft-merge-decisions', id: applied.id })).action, 'apply')
      const plan = await loadMaintenancePlan(p, x.base.item.runKey)
      assert.deepEqual(await loadMaintenancePlan(p, x.base.item.runKey), plan)
      assert.equal(plan.executable, false)
      assert.equal(plan.publishable, false)
      assert.equal((await draft(x.draft)).hold, true)
    })
    await t.test('retry application validates its immutable event link', async () => {
      const x = await pair(); await event(x.proposal.id, 'close')
      const renewed = await event(x.proposal.id, 'reconsider'), client = (p.db as unknown as SQLiteAdapter).client
      await client.execute({ sql: 'UPDATE merge_workflow_events SET replacement_key = ? WHERE id = ?', args: ['forged', renewed.id] })
      await assert.rejects(decision(replacementID(renewed), 'apply'), /audit link/)
      await client.execute({ sql: 'UPDATE merge_workflow_events SET replacement_key = ? WHERE id = ?', args: [renewed.replacementKey!, renewed.id] })
      await decision(replacementID(renewed), 'apply')
    })
  } finally { await p.destroy(); await rm(local.directory, { recursive: true, force: true }) }
})
