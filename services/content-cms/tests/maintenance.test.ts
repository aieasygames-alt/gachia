import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { snapshot, importSnapshots } from '../src/legacy-intake'
import { mapBatch } from '../src/record-mapping'
import { maintenancePlan } from '../src/maintenance-plan'
import { loadMaintenancePlan } from '../src/maintenance-store'
import { importRecordBatch, loadRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
import { withBatchReads, type BatchReader } from '../src/batch-read-scope'
import { localEnvironment } from '../src/local-environment'

const sources = ['nte', 'genshin'].flatMap(game => [
  snapshot(game, `packages/data/games/${game}/raw-guides.json`, 'raw-json', JSON.stringify(Array.from({ length: 103 }, (_, i) => ({ id: String(i), title: 'Guide', content: 'Text' })))),
  snapshot(game, `packages/data/games/${game}/raw-weapons.json`, 'raw-json', JSON.stringify([{ id: 'w', name: 'Weapon' }])),
])
const policy = { digest: 'maintenance-fixture', routes: { games: {} } }
const batch = mapBatch(sources, policy)
const empty = { decisions: [], drafts: [] }

test('maintenance plan has deterministic bounded chunks across games and types', () => {
  const plan = maintenancePlan(batch, undefined, empty, { chunkSize: 20 })
  assert.equal(plan.total, 208)
  assert.equal(plan.counts.blocked, 2)
  assert.equal(plan.counts['intake-review'], 206)
  assert.equal(plan.executable, false)
  assert.equal(plan.publishable, false)
  const keys = plan.groups.flatMap(g => g.chunks.flatMap(c => c.reviewKeys))
  assert.equal(new Set(keys).size, 208)
  assert.ok(plan.groups.every(g => g.chunks.every(c => c.reviewKeys.length <= 20)))
  assert.deepEqual(plan, maintenancePlan(batch, undefined, empty, { games: ['nte', 'genshin', 'nte'], chunkSize: 20 }))
  assert.equal(maintenancePlan(batch, undefined, empty, { games: ['nte'] }).total, 104)
  for (const chunkSize of [0, 201, NaN, 1.5]) assert.throws(() => maintenancePlan(batch, undefined, empty, { chunkSize }))
  assert.throws(() => maintenancePlan(batch, undefined, empty, { games: ['typo'] }))
  assert.throws(() => maintenancePlan(batch, undefined, empty, { games: [] }))
})

test('terminal decisions and existing drafts never become bulk intake actions', () => {
  const initial = maintenancePlan(batch, undefined, empty)
  const [a, b, c] = initial.items.filter(i => i.status === 'intake-review')
  const state = { decisions: [{ reviewKey: a.reviewKey, action: 'accept-draft' as const }, { reviewKey: b.reviewKey, action: 'reject' as const }], drafts: [{ stableKey: a.stableKey }, { stableKey: c.stableKey }] }
  const plan = maintenancePlan(batch, undefined, state)
  assert.equal(plan.counts['accepted-held'], 1)
  assert.equal(plan.counts.rejected, 1)
  assert.equal(plan.counts['existing-draft-review'], 1)
  const superseded = maintenancePlan(batch, undefined, { ...state, operationalStates: {
    [a.reviewKey]: 'superseded', [b.reviewKey]: 'superseded',
  } })
  assert.equal(superseded.items.find(i => i.reviewKey === a.reviewKey)!.status, 'superseded')
  assert.equal(superseded.items.find(i => i.reviewKey === b.reviewKey)!.status, 'rejected')
  assert.equal(superseded.executable, false)
  assert.equal(state.decisions[0].action, 'accept-draft')
  assert.notEqual(plan.planKey, initial.planKey)
  assert.throws(() => maintenancePlan(batch, undefined, { ...state, drafts: [] }), /no draft/)
  assert.throws(() => maintenancePlan(batch, undefined, { ...state, decisions: [...state.decisions, state.decisions[0]] }), /Duplicate/)
  assert.equal(maintenancePlan(batch, batch, empty).total, 0)
})

test('maintenance snapshot verifies complete runs, paginates and does not mutate content', { timeout: 120000 }, async () => {
  process.env.CMS_LOCAL_ONLY = '1'
  process.env.CMS_LOCAL_NAMESPACE = `maintenance-test-${randomUUID()}`
  process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    await importSnapshots(payload, sources)
    await importRecordBatch(payload, batch, policy)
    const originalFind = payload.find.bind(payload)
    let recordQueries = 0
    payload.find = (async (...args: Parameters<typeof payload.find>) => {
      if (args[0].collection === 'migration-records') recordQueries++
      return originalFind(...args)
    }) as typeof payload.find
    try {
      assert.deepEqual(await loadRecordBatch(payload, batch.batchKey), batch)
      assert.equal(recordQueries, 3, '208 records use three bounded queries, not 208')
      await assert.rejects(withBatchReads(payload, {}, async read => read(batch.batchKey)), /requires a transaction/)
      const transactionID = await payload.db.beginTransaction()
      assert.ok(transactionID)
      const req = { transactionID }
      let escaped: BatchReader | undefined
      try {
        recordQueries = 0
        await withBatchReads(payload, req, async read => {
          escaped = read
          const [first, second] = await Promise.all([read(batch.batchKey), read(batch.batchKey)])
          first.sources[0].records.length = 0
          assert.deepEqual(second, batch)
          assert.deepEqual(await read(batch.batchKey), batch)
          assert.equal(recordQueries, 3)
        })
        await assert.rejects(escaped!(batch.batchKey), /expired/)
        await withBatchReads(payload, req, async read => { assert.deepEqual(await read(batch.batchKey), batch) })
        assert.equal(recordQueries, 6, 'new operation cannot reuse an expired scope')
        await withBatchReads(payload, req, async read => {
          const saved = req.transactionID
          req.transactionID = 'different-transaction'
          await assert.rejects(read(batch.batchKey), /transaction changed/)
          req.transactionID = saved
          assert.deepEqual(await read(batch.batchKey), batch)
        })
        await withBatchReads(payload, req, async read => {
          await assert.rejects(read('a'.repeat(64)), /Complete batch not found/)
          await assert.rejects(read('a'.repeat(64)), /Complete batch not found/)
          assert.deepEqual(await read(batch.batchKey), batch)
        })
      } finally { await payload.db.rollbackTransaction(transactionID) }

      payload.find = (async (...args: Parameters<typeof payload.find>) => {
        const result = await originalFind(...args)
        return args[0].collection === 'migration-records' ? { ...result, docs: result.docs.slice(1) } : result
      }) as typeof payload.find
      await assert.rejects(loadRecordBatch(payload, batch.batchKey), /record unavailable/)
    } finally { payload.find = originalFind }
    const staged = await stageReview(payload, batch.batchKey)
    const result = await loadMaintenancePlan(payload, staged.runKey)
    assert.deepEqual(result, maintenancePlan(batch, undefined, empty))
    assert.equal((await payload.count({ collection: 'editorial-drafts', overrideAccess: true })).totalDocs, 0)
    assert.equal((await payload.count({ collection: 'review-decisions', overrideAccess: true })).totalDocs, 0)
    await assert.rejects(loadMaintenancePlan(payload, 'a'.repeat(64)), /not found/)
    await assert.rejects(loadMaintenancePlan(payload, staged.runKey, { games: ['typo'] }), /Unknown/)
    assert.deepEqual(await loadMaintenancePlan(payload, staged.runKey), result)
    const reviewer = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'maintenance@example.invalid', password: randomUUID() + 'Aa1!', role: 'reviewer' } })
    const ready = (await payload.find({ collection: 'review-items', overrideAccess: true, limit: 2, where: { draftKind: { equals: 'guide' } } })).docs
    await payload.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem: ready[0].id, action: 'accept-draft', note: 'Synthetic maintenance acceptance only.' } })
    await payload.create({ collection: 'review-decisions', overrideAccess: false, user: reviewer, data: { reviewItem: ready[1].id, action: 'reject', note: 'Synthetic maintenance rejection only.' } })
    const decided = await loadMaintenancePlan(payload, staged.runKey)
    assert.equal(decided.counts['accepted-held'], 1)
    assert.equal(decided.counts.rejected, 1)
    assert.equal(decided.counts['intake-review'], 204)
    assert.notEqual(decided.planKey, result.planKey)
    const item = (await payload.find({ collection: 'review-items', overrideAccess: true, limit: 1 })).docs[0]
    await payload.update({ collection: 'review-items', id: item.id, overrideAccess: true, data: { warnings: 'tampered' } })
    await assert.rejects(loadMaintenancePlan(payload, staged.runKey), /projection mismatch/)
    await payload.update({ collection: 'review-items', id: item.id, overrideAccess: true, data: { warnings: item.warnings } })
    const run = (await payload.find({ collection: 'review-runs', overrideAccess: true, limit: 1 })).docs[0]
    await payload.update({ collection: 'review-runs', id: run.id, overrideAccess: true, data: { manifest: '{}' } })
    await assert.rejects(loadMaintenancePlan(payload, staged.runKey), /integrity failure/)
  } finally { await payload.destroy(); await rm(local.directory, { recursive: true, force: true }) }
})
