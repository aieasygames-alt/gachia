import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { localEnvironment } from '../src/local-environment'
import { importSnapshots, snapshot } from '../src/legacy-intake'
import { mapBatch, type RecordBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
import { buildMergePlan, resolveMerge } from '../src/draft-merge'
import type { DraftMergeDecision, EditorialDraft } from '../src/payload-types'

test('three-way draft updates preserve editorial work and enforce append-only atomic review', { timeout: 90000 }, async t => {
  process.env.CMS_LOCAL_ONLY = '1'
  process.env.CMS_LOCAL_NAMESPACE = `merge-test-${randomUUID()}`
  process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const p = await getPayload({ config })
  const policy = { digest: 'merge-test-policy', routes: { games: {} } }
  const baseData = { id: 'one', title: 'Base title', content: 'Base body', faq: [{ question: 'Q', answer: 'Base answer' }] }
  const seed = async (data: unknown[], base?: RecordBatch, family = 'guides') => {
    const source = snapshot('fixture', `packages/data/games/fixture/raw-${family}.json`, 'raw-json', JSON.stringify(data))
    await importSnapshots(p, [source])
    const batch = mapBatch([source], policy)
    await importRecordBatch(p, batch, policy)
    const run = await stageReview(p, batch.batchKey, base?.batchKey)
    const item = (await p.find({ collection: 'review-items', overrideAccess: true, where: { runKey: { equals: run.runKey } } })).docs[0]
    return { batch, item }
  }
  try {
    const account = async (role: 'admin' | 'editor' | 'reviewer') => p.create({ collection: 'users', data: { email: `${role}@example.invalid`, password: randomUUID() + 'Aa1!', role } })
    const reviewer = await account('reviewer'), editor = await account('editor'), admin = await account('admin')
    const original = await seed([baseData])
    const initial = await p.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem: original.item.id, action: 'accept-draft', note: 'Reviewed synthetic source baseline.' } })
    const draftID = typeof initial.draft === 'object' ? initial.draft!.id : initial.draft!
    const getDraft = () => p.findByID({ collection: 'editorial-drafts', id: draftID, depth: 0, overrideAccess: false, user: editor })
    const edit = (data: Partial<EditorialDraft>) => p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data })
    const propose = (reviewItem: number) => p.create({ collection: 'draft-merge-proposals', overrideAccess: false, user: editor, data: { draft: draftID, reviewItem, actorID: 'forged', proposalKey: 'forged', conflictCount: 0 } })
    const choices: NonNullable<DraftMergeDecision['choices']> = [{ field: 'zh.title', choice: 'current' }, { field: 'faqs', choice: 'incoming' }]
    const apply = (proposal: number, selected = choices) => p.create({ collection: 'draft-merge-decisions', overrideAccess: false, user: reviewer, data: { proposal, action: 'apply', note: 'Reviewed three-way differences; remain held.', choices: selected, actorID: 'forged', targetReviewKey: 'forged' } })
    const countDecisions = () => p.count({ collection: 'draft-merge-decisions', overrideAccess: true })
    const old = await getDraft()
    await edit({ bodyFormat: 'plain', editorNote: 'Keep my editorial note', translations: [{ locale: 'zh', title: 'Editor title', body: 'Base body', summary: 'Editor summary' }], faqs: old.faqs!.map(row => ({ ...row, answer: 'Editor answer' })) })
    const nextData = { ...baseData, title: 'Source title', content: 'New source body', faq: [{ question: 'Q', answer: 'Source answer' }] }
    const next = await seed([nextData], original.batch)
    let proposal = await propose(next.item.id)

    await t.test('comparison separates independent changes and conflicts; caller metadata is ignored', async () => {
      assert.equal(proposal.conflictCount, 2)
      assert.equal(proposal.actorID, String(editor.id)); assert.notEqual(proposal.proposalKey, 'forged')
      const cells = new Map(proposal.comparison!.map(row => [row.field, row]))
      assert.equal(cells.get('zh.title')!.status, 'conflict')
      assert.equal(cells.get('zh.body')!.status, 'source-only')
      assert.equal(cells.get('zh.summary')!.status, 'editor-only')
      assert.equal(cells.get('faqs')!.status, 'conflict')
      assert.equal((await getDraft()).sourceReviewKey, null)
      await assert.rejects(propose(next.item.id), /already exists/)
    })
    await t.test('ACL, transaction requirement, source-head protection and immutable proposal history', async () => {
      for (const collection of ['draft-merge-proposals', 'draft-merge-decisions'] as const) await assert.rejects(p.find({ collection, overrideAccess: false }))
      await assert.rejects(p.create({ collection: 'draft-merge-decisions', user: editor, overrideAccess: true, data: { proposal: proposal.id, action: 'apply', note: 'Editor cannot approve.' } }), /authorized/)
      await assert.rejects(p.create({ collection: 'draft-merge-proposals', user: editor, overrideAccess: false, disableTransaction: true, data: { draft: draftID, reviewItem: next.item.id } }), /transaction/)
      await assert.rejects(p.create({ collection: 'draft-merge-decisions', user: reviewer, overrideAccess: false, disableTransaction: true, data: { proposal: proposal.id, action: 'apply', note: 'Cannot bypass transaction.' } }), /transaction/)
      await assert.rejects(p.update({ collection: 'draft-merge-proposals', id: proposal.id, user: admin, overrideAccess: true, data: { conflictCount: 0 } }), /append-only/)
      await assert.rejects(edit({ sourceReviewKey: next.item.reviewKey }), /Source head/)
      await assert.rejects(edit({ mergeHead: 'forged' }), /Source head/)
    })
    await t.test('post-comparison edits invalidate proposal instead of silently overwriting new work', async () => {
      await edit({ editorNote: 'New editorial note after comparison' })
      await assert.rejects(apply(proposal.id), /Stale/)
      assert.equal((await countDecisions()).totalDocs, 0)
      proposal = await propose(next.item.id)
    })
    await t.test('tampered comparison text and missing, duplicate or unrelated choices are rejected', async () => {
      const client = (p.db as unknown as SQLiteAdapter).client
      await client.execute({ sql: 'UPDATE draft_merge_proposals SET plan_text = ? WHERE id = ?', args: ['{}', proposal.id] })
      await assert.rejects(apply(proposal.id), /tampered/)
      await client.execute({ sql: 'UPDATE draft_merge_proposals SET plan_text = ? WHERE id = ?', args: [proposal.planText!, proposal.id] })
      await client.execute({ sql: 'UPDATE draft_merge_proposals_comparison SET current_text = ? WHERE _parent_id = ? AND field = ?', args: ['"forged"', proposal.id, 'zh.title'] })
      await assert.rejects(apply(proposal.id), /projection/)
      await client.execute({ sql: 'UPDATE draft_merge_proposals_comparison SET current_text = ? WHERE _parent_id = ? AND field = ?', args: ['"Editor title"', proposal.id, 'zh.title'] })
      await assert.rejects(apply(proposal.id, []), /every conflict/)
      await assert.rejects(apply(proposal.id, [choices[0], choices[0]]), /every conflict/)
      await assert.rejects(apply(proposal.id, [...choices, { field: 'zh.body', choice: 'incoming' }]), /every conflict/)
    })
    await t.test('edit locks and post-update errors roll back draft, head, versions and decision', async () => {
      const before = await getDraft()
      const versionsBefore = await p.findVersions({ collection: 'editorial-drafts', where: { parent: { equals: draftID } } })
      const lock = await p.create({ collection: 'payload-locked-documents', data: { document: { relationTo: 'editorial-drafts', value: draftID }, user: { relationTo: 'users', value: editor.id } } })
      await assert.rejects(apply(proposal.id))
      await p.delete({ collection: 'payload-locked-documents', id: lock.id })
      const hooks = p.collections['draft-merge-decisions'].config.hooks.beforeChange
      hooks.push(() => { throw new Error('Injected post-merge failure') })
      try { await assert.rejects(apply(proposal.id), /post-merge/) } finally { hooks.pop() }
      assert.deepEqual(await getDraft(), before)
      assert.equal((await p.findVersions({ collection: 'editorial-drafts', where: { parent: { equals: draftID } } })).totalDocs, versionsBefore.totalDocs)
      assert.equal((await countDecisions()).totalDocs, 0)
    })
    await t.test('reviewer resolves conflicts; independent edits and immutable intake provenance survive', async () => {
      const decision = await apply(proposal.id)
      const draft = await getDraft()
      assert.equal(decision.actorID, String(reviewer.id)); assert.equal(decision.targetReviewKey, next.item.reviewKey)
      assert.equal(draft.translations?.find(row => row.locale === 'zh')?.title, 'Editor title')
      assert.equal(draft.translations?.find(row => row.locale === 'zh')?.body, 'New source body')
      assert.equal(draft.translations?.find(row => row.locale === 'zh')?.summary, 'Editor summary')
      assert.equal(draft.faqs?.[0].answer, 'Source answer')
      assert.equal(draft.editorNote, 'New editorial note after comparison'); assert.equal(draft.bodyFormat, 'unclassified')
      assert.equal(draft.sourceReviewKey, next.item.reviewKey); assert.equal(draft.mergeHead, proposal.proposalKey)
      assert.equal(draft.reviewKey, original.item.reviewKey); assert.equal(draft.candidateRevision, old.candidateRevision)
      assert.equal(draft.hold, true); assert.equal(draft.state, 'draft')
      await assert.rejects(apply(proposal.id), /terminal/)
      await assert.rejects(p.update({ collection: 'draft-merge-decisions', id: decision.id, user: admin, overrideAccess: true, data: { note: 'Cannot rewrite history.' } }), /append-only/)
    })
    await t.test('second update compares against last accepted source, not the merged editorial result', async () => {
      const third = await seed([{ ...nextData, title: 'Source title v3', content: 'Body v3' }], next.batch)
      const thirdProposal = await propose(third.item.id)
      const title = thirdProposal.comparison!.find(row => row.field === 'zh.title')!
      assert.equal(title.baseText, '"Source title"'); assert.equal(title.currentText, '"Editor title"'); assert.equal(title.status, 'conflict')
      const before = await getDraft()
      await p.create({ collection: 'draft-merge-decisions', user: reviewer, overrideAccess: false, data: { proposal: thirdProposal.id, action: 'dismiss', note: 'Defer this source update for further review.' } })
      assert.deepEqual(await getDraft(), before)
      await assert.rejects(apply(thirdProposal.id, [{ field: 'zh.title', choice: 'incoming' }]), /terminal/)
    })
    await t.test('baseline, stale lineage, withdrawal, unrelated identity and rejected target cannot bypass intake', async () => {
      await assert.rejects(propose(original.item.id), /forward diff/)
      await assert.rejects(propose(next.item.id), /forward diff/)
      const withdrawn = await seed([], next.batch)
      await assert.rejects(propose(withdrawn.item.id), /forward diff/)
      const other = await seed([{ ...nextData, id: 'different' }], next.batch)
      await assert.rejects(propose(other.item.id), /forward diff/)
      const rejected = await seed([{ ...nextData, title: 'Explicitly rejected update' }], next.batch)
      await p.create({ collection: 'review-decisions', user: reviewer, overrideAccess: false, data: { reviewItem: rejected.item.id, action: 'reject', note: 'Explicitly reject this synthetic revision.' } })
      await assert.rejects(propose(rejected.item.id), /terminal intake/)
    })
    await t.test('simultaneous applications produce one decision and invalidate sibling proposals', async () => {
      const a = await seed([{ ...nextData, content: 'Concurrent source A' }], next.batch)
      const b = await seed([{ ...nextData, content: 'Concurrent source B' }], next.batch)
      const pa = await propose(a.item.id), pb = await propose(b.item.id)
      assert.equal(pa.conflictCount, 0)
      const results = await Promise.allSettled([apply(pa.id, []), apply(pa.id, [])])
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1)
      await assert.rejects(apply(pb.id, []), /forward diff/)
      assert.equal((await getDraft()).translations?.[0].body, 'Concurrent source A')
      await edit({ editorNote: 'Writes still work after concurrency rejection.' })
      assert.equal((await getDraft()).editorNote, 'Writes still work after concurrency rejection.')
    })
    await t.test('pure merge handles convergence, explicit empty values and conservative FAQ/asset units', async () => {
      const base = original.batch.sources[0].records[0]
      const draft = await getDraft()
      const incoming = { ...base, translations: [{ locale: 'zh' as const, title: '', body: null, summary: null }] }
      const clean = { ...draft, translations: base.translations, faqs: [], assetReference: undefined }
      const plan = buildMergePlan(clean, base, incoming, 'test-review')
      const patch = resolveMerge(plan, clean, incoming, [])
      assert.equal(patch.translations[0].title, ''); assert.equal(patch.translations[0].body, null)
      const converged = buildMergePlan({ ...clean, translations: incoming.translations }, base, incoming, 'test-review')
      assert.equal(converged.cells.find(cell => cell.field === 'zh.title')?.status, 'converged')
      const sourceAsset = { ...base, assetReference: { category: 'character', legacyId: 'a', url: 'https://example.invalid/new.png' } }
      const assetPlan = buildMergePlan({ ...clean, assetReference: { category: 'character', legacyId: 'a', url: 'https://example.invalid/editor.png' } }, base, sourceAsset, 'asset-review')
      assert.equal(assetPlan.cells.find(cell => cell.field === 'assetReference')?.status, 'conflict')
    })
    await t.test('FAQ and asset drafts merge through real typed collections without introducing article fields', async () => {
      for (const family of ['gacha-system', 'image-sources']) {
        const data = (version: string) => family === 'gacha-system' ? { banners: [], faqs: [{ question: 'Q', answer: version }] } : { characters: { one: `https://example.invalid/${version}.png` }, weapons: {}, vehicles: {} }
        const receive = async (version: string, base?: RecordBatch) => {
          const source = snapshot('nte', `packages/data/games/nte/raw-${family}.json`, 'raw-json', JSON.stringify(data(version)))
          await importSnapshots(p, [source]); const batch = mapBatch([source], policy); await importRecordBatch(p, batch, policy)
          const run = await stageReview(p, batch.batchKey, base?.batchKey)
          const item = (await p.find({ collection: 'review-items', where: { and: [{ runKey: { equals: run.runKey } }, { draftKind: { not_equals: 'unsupported' } }] } })).docs[0]
          return { batch, item }
        }
        const baseline = await receive('old')
        const intake = await p.create({ collection: 'review-decisions', user: reviewer, overrideAccess: false, data: { reviewItem: baseline.item.id, action: 'accept-draft', note: 'Typed synthetic baseline reviewed.' } })
        const id = typeof intake.draft === 'object' ? intake.draft!.id : intake.draft!
        const incoming = await receive('new', baseline.batch)
        const proposal = await p.create({ collection: 'draft-merge-proposals', user: editor, overrideAccess: false, data: { draft: id, reviewItem: incoming.item.id } })
        assert.equal(proposal.conflictCount, 0)
        await apply(proposal.id, [])
        const merged = await p.findByID({ collection: 'editorial-drafts', id })
        assert.equal(merged.translations?.length, 0); assert.equal(merged.hold, true)
        if (family === 'gacha-system') assert.equal(merged.faqs?.[0].answer, 'new')
        else assert.equal(merged.assetReference?.url, 'https://example.invalid/new.png')
      }
    })
  } finally { await p.destroy(); await rm(local.directory, { recursive: true, force: true }) }
})
