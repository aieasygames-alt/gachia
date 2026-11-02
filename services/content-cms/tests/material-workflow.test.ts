import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { localEnvironment } from '../src/local-environment'
import { snapshot, importSnapshots } from '../src/legacy-intake'
import { mapBatch, type RecordBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
import { buildReviewPlan, reviewVersion } from '../src/review-plan'
import { materialCells, materialRaw } from '../src/material-draft'
import { loadMaintenancePlan } from '../src/maintenance-store'

const raw = { id: 'ore', name: 'Base', nameEn: '', nameJa: null, type: 'resource', rarity: 3, source: 'Base source', uses: [], notes: null }
const policy = { digest: 'material-workflow-policy', routes: { games: {} } }
test('material policy remains opt-in and rejects unknown versions or unsupported fields', () => {
  const source = snapshot('nte', 'packages/data/games/nte/raw-materials.json', 'raw-json', JSON.stringify([raw]))
  const batch = mapBatch([source], policy)
  assert.equal(buildReviewPlan(batch).items[0].draftKind, null)
  assert.equal(buildReviewPlan(batch, undefined, 'review-v2-material').items[0].draftKind, 'material')
  assert.notEqual(buildReviewPlan(batch).runKey, buildReviewPlan(batch, undefined, 'review-v2-material').runKey)
  assert.throws(() => reviewVersion('{"version":"review-v999"}'))
  assert.deepEqual(materialRaw(raw.id, materialCells(raw)), raw)
  assert.throws(() => materialRaw(raw.id, []), /every contract/)
  const cells = materialCells(raw); cells[0].state = 'absent'
  assert.throws(() => materialRaw(raw.id, cells), /cannot carry/)
})

test('native material intake, edits and three-way merge on SQLite preserve old policy', { timeout: 120000 }, async t => {
  process.env.CMS_LOCAL_ONLY = '1'
  process.env.CMS_LOCAL_NAMESPACE = `material-test-${randomUUID()}`
  process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const p = await getPayload({ config })
  const seed = async (value: unknown, game = 'nte', base?: RecordBatch) => {
    const source = snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify([value]))
    await importSnapshots(p, [source]); const batch = mapBatch([source], policy)
    await importRecordBatch(p, batch, policy)
    const v1 = await stageReview(p, batch.batchKey, base?.batchKey)
    const v2 = await stageReview(p, batch.batchKey, base?.batchKey, 'review-v2-material')
    const item = async (runKey: string) => (await p.find({ collection: 'review-items', overrideAccess: true, where: { runKey: { equals: runKey } } })).docs[0]
    return { batch, v1, v2, old: await item(v1.runKey), next: await item(v2.runKey) }
  }
  try {
    const reviewer = await p.create({ collection: 'users', data: { email: 'reviewer@example.invalid', role: 'reviewer', password: randomUUID() + 'Aa1!' } })
    const editor = await p.create({ collection: 'users', data: { email: 'editor@example.invalid', role: 'editor', password: randomUUID() + 'Aa1!' } })
    const decide = (reviewItem: number) => p.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem, action: 'accept-draft', note: 'Reviewed synthetic material only.' } })
    const original = await seed(raw)
    await t.test('v1 stays blocked; v2 is explicit and editors cannot approve', async () => {
      assert.equal(original.old.draftKind, 'unsupported'); assert.equal(original.next.draftKind, 'material')
      await assert.rejects(decide(original.old.id), /No supported/)
      await assert.rejects(p.create({ collection: 'review-decisions', overrideAccess: false, user: editor, data: { reviewItem: original.next.id, action: 'accept-draft', note: 'Editor cannot accept material.' } }))
      assert.equal((await loadMaintenancePlan(p, original.v1.runKey)).counts.blocked, 1)
      assert.equal((await loadMaintenancePlan(p, original.v2.runKey)).counts['intake-review'], 1)
    })
    await t.test('new policy cannot bypass a previous rejection of the same revision', async () => {
      const rejected = await seed(raw, 'roco-cn')
      await p.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem: rejected.old.id, action: 'reject', note: 'Reject this synthetic candidate revision.' } })
      await assert.rejects(decide(rejected.next.id), /rejected under/)
      assert.equal((await loadMaintenancePlan(p, rejected.v2.runKey)).counts.blocked, 1)
    })
    await t.test('unsupported extensions stay blocked and concurrent material intake has one winner', async () => {
      const unknown = await seed({ ...raw, newMechanic: true }, 'zzz')
      assert.equal(unknown.next.draftKind, 'unsupported')
      await assert.rejects(decide(unknown.next.id), /No supported/)
      const ready = await seed(raw, 'sea')
      const outcomes = await Promise.allSettled([decide(ready.next.id), decide(ready.next.id)])
      assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1)
    })
    const accepted = await decide(original.next.id)
    const draftID = typeof accepted.draft === 'object' ? accepted.draft!.id : accepted.draft!
    const get = () => p.findByID({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor })
    await t.test('native storage preserves null, absent, empty string and empty ordered list', async () => {
      const draft = await get()
      assert.deepEqual(materialRaw(draft.legacyId, draft.materialFields), raw)
      assert.equal(draft.hold, true)
      assert.equal((await loadMaintenancePlan(p, original.v2.runKey)).counts['accepted-held'], 1)
      await assert.rejects(decide(original.next.id))
      for (const game of ['genshin', 'skjh']) {
        const row = await seed(raw, game); await decide(row.next.id)
      }
    })
    await t.test('untouched blank text in value state persists as empty text without changing null/absent', async () => {
      const cells = materialCells(raw)
      const notes = cells.find(c => c.field === 'notes')!
      notes.state = 'value'; notes.text = null
      await p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { materialFields: cells } })
      assert.deepEqual(materialRaw(raw.id, (await get()).materialFields), { ...raw, notes: '' })
      const name = cells.find(c => c.field === 'name')!
      name.text = null
      await assert.rejects(p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { materialFields: cells } }), /nonempty/)
    })
    const edit = (value: typeof raw) => p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { materialFields: materialCells(value) } })
    await t.test('material validation, immutable identity and hold remain enforced', async () => {
      await edit({ ...raw, name: 'Editor', source: 'Editor source' })
      await assert.rejects(p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { materialFields: [] } }), /every contract/)
      await assert.rejects(p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { legacyId: 'changed' } }), /Immutable/)
      await assert.rejects(p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { hold: false } }))
      await assert.rejects(p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { translations: [{ locale: 'zh', title: 'Wrong field' }] } }), /typed material/)
    })
    const updated = await seed({ ...raw, name: 'Incoming', rarity: 4, notes: 'Added', uses: ['First', 'Second', 'First'], acquisition: null }, 'nte', original.batch)
    const propose = () => p.create({ collection: 'draft-merge-proposals', overrideAccess: false, user: editor, data: { draft: draftID, reviewItem: updated.next.id } })
    let proposal = await propose()
    assert.equal((await loadMaintenancePlan(p, updated.v2.runKey)).counts['awaiting-conflict-review'], 1)
    await t.test('stale material proposals close and reconsider against fresh material fields', async () => {
      await edit({ ...raw, name: 'Editor', source: 'Editor source', uses: [] })
      // Changing a persisted note also invalidates the proposal fingerprint.
      await p.update({ collection: 'editorial-drafts', id: draftID, overrideAccess: false, user: editor, data: { editorNote: 'Changed after material comparison.' } })
      assert.equal((await loadMaintenancePlan(p, updated.v2.runKey)).counts.stale, 1)
      await assert.rejects(p.create({ collection: 'draft-merge-decisions', overrideAccess: false, user: reviewer, data: { proposal: proposal.id, action: 'apply', note: 'Stale material comparison must fail.', choices: [{ field: 'material.name', choice: 'current' }] } }), /Stale/)
      await p.create({ collection: 'merge-workflow-events', overrideAccess: false, user: reviewer, data: { proposal: proposal.id, action: 'close', note: 'Close stale material comparison.' } })
      assert.equal((await loadMaintenancePlan(p, updated.v2.runKey)).counts.closed, 1)
      const event = await p.create({ collection: 'merge-workflow-events', overrideAccess: false, user: reviewer, data: { proposal: proposal.id, action: 'reconsider', note: 'Recompute material comparison from latest draft.' } })
      const id = typeof event.replacement === 'object' ? event.replacement!.id : event.replacement!
      proposal = await p.findByID({ collection: 'draft-merge-proposals', id, overrideAccess: false, user: editor })
    })
    await t.test('material merge separates conflict, editor-only, source-only and presence changes', () => {
      assert.equal(proposal.conflictCount, 1)
      assert.equal(proposal.comparison!.find(c => c.field === 'material.name')!.status, 'conflict')
      assert.equal(proposal.comparison!.find(c => c.field === 'material.source')!.status, 'editor-only')
      assert.equal(proposal.comparison!.find(c => c.field === 'material.rarity')!.status, 'source-only')
      assert.equal(JSON.parse(proposal.planText!).version, 'draft-merge-material-v1')
    })
    const apply = () => p.create({ collection: 'draft-merge-decisions', overrideAccess: false, user: reviewer, data: { proposal: proposal.id, action: 'apply', note: 'Approve synthetic material conflict only.', choices: [{ field: 'material.name', choice: 'current' }] } })
    await t.test('failed apply rolls back draft and decision; retry succeeds once', async () => {
      const before = materialRaw(raw.id, (await get()).materialFields)
      const hooks = p.collections['draft-merge-decisions'].config.hooks.beforeChange
      hooks.push(() => { throw new Error('Injected material apply failure') })
      try { await assert.rejects(apply(), /Injected/) } finally { hooks.pop() }
      assert.deepEqual(materialRaw(raw.id, (await get()).materialFields), before)
      await apply(); await assert.rejects(apply())
      const result = await get()
      assert.deepEqual(materialRaw(raw.id, result.materialFields), { ...raw, name: 'Editor', source: 'Editor source', rarity: 4, notes: 'Added', uses: ['First', 'Second', 'First'], acquisition: null })
      assert.equal(result.sourceReviewKey, updated.next.reviewKey); assert.equal(result.hold, true)
      assert.equal((await loadMaintenancePlan(p, updated.v2.runKey)).counts.applied, 1)
      assert.equal((await stageReview(p, original.batch.batchKey)).reused, 1)
    })
  } finally { await p.destroy(); await rm(local.directory, { recursive: true, force: true }) }
})
