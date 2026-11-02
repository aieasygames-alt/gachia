import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import test from 'node:test'
import { localEnvironment } from '../src/local-environment'
import { digest, importSnapshots, snapshot } from '../src/legacy-intake'
import { batchManifest, canonical, diffBatches, mapBatch } from '../src/record-mapping'
import { importRecordBatch, loadRecordBatch } from '../src/record-store'

test('real adapter persists record batches and bounded read-only verification jobs', { timeout: 60000 }, async t => {
  process.env.CMS_LOCAL_ONLY = '1'
  process.env.CMS_LOCAL_NAMESPACE = `records-test-${randomUUID()}`
  process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  const local = localEnvironment()
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const source = snapshot('nte', 'packages/data/games/nte/raw-guides.json', 'raw-json', JSON.stringify([{ id: 'a', title: 'A', content: 'Original' }, { id: 'b', titleEn: 'B', contentEn: '' }]))
  const policy = { digest: 'test-policy', routes: { games: {} } }
  const batch = mapBatch([source], policy)
  try {
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'records@example.invalid', password: randomUUID() + 'Aa1!', role: 'admin' } })
    await t.test('source preflight fails before any record writes', async () => {
      await assert.rejects(importRecordBatch(payload, batch, policy), /Missing/)
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 0)
    })
    await importSnapshots(payload, [source])
    await t.test('self-consistent but truncated manifests cannot be imported as complete', async () => {
      const truncated = structuredClone(batch)
      truncated.sources[0].records.pop()
      truncated.batchKey = digest(canonical(batchManifest(truncated)))
      await assert.rejects(importRecordBatch(payload, truncated, policy), /does not match stored source/)
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 0)
    })
    await t.test('interrupted real writes leave no complete batch and resume without duplicating revisions', async () => {
      const hooks = payload.collections['migration-records'].config.hooks.beforeChange
      const fail = () => { throw new Error('Injected write failure') }
      let calls = 0
      hooks.push(({ data }) => { if (++calls === 2) fail(); return data })
      try { await assert.rejects(importRecordBatch(payload, batch, policy), /Injected/) } finally { hooks.pop() }
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 1)
      assert.equal((await payload.count({ collection: 'migration-batches', overrideAccess: true })).totalDocs, 0)
      await assert.rejects(loadRecordBatch(payload, batch.batchKey), /Complete batch not found/)
      const resumed = await importRecordBatch(payload, batch, policy)
      assert.equal(resumed.created, 1)
      assert.equal(resumed.reused, 1)
      const repeated = await importRecordBatch(payload, batch, policy)
      assert.equal(repeated.created, 0)
      assert.equal(repeated.reused, 2)
      assert.equal((await payload.count({ collection: 'migration-batches', overrideAccess: true })).totalDocs, 1)
    })
    await t.test('candidate projections are verified and all editorial write paths remain denied', async () => {
      const row = (await payload.find({ collection: 'migration-records', user: admin, overrideAccess: false })).docs[0]
      await assert.rejects(payload.find({ collection: 'migration-records', overrideAccess: false }))
      await assert.rejects(payload.update({ collection: 'migration-records', id: row.id, user: admin, overrideAccess: false, data: { hold: false } }))
      await assert.rejects(payload.delete({ collection: 'migration-records', id: row.id, user: admin, overrideAccess: false }))
      await assert.rejects(payload.find({ collection: 'migration-batches', overrideAccess: false }))
      await payload.update({ collection: 'migration-records', id: row.id, overrideAccess: true, data: { legacyId: 'tampered' } })
      await assert.rejects(importRecordBatch(payload, batch, policy), /Stored record mismatch/)
      await payload.update({ collection: 'migration-records', id: row.id, overrideAccess: true, data: { legacyId: row.legacyId } })
    })
    await t.test('explicit empty source records a new complete candidate batch without deleting history', async () => {
      const empty = snapshot('nte', source.sourcePath, 'raw-json', '[]')
      await importSnapshots(payload, [empty])
      const result = await importRecordBatch(payload, mapBatch([empty], policy), policy)
      assert.equal(result.total, 0)
      assert.equal(result.publishable, false)
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 2)
      assert.equal((await payload.count({ collection: 'migration-batches', overrideAccess: true })).totalDocs, 2)
      const diff = diffBatches(await loadRecordBatch(payload, batch.batchKey), await loadRecordBatch(payload, result.batchKey))
      assert.equal(diff.changes.length, 2)
      assert.ok(diff.changes.every(change => change.kind === 'withdrawal-review-required'))
    })
    await t.test('queueing is not execution; explicit local runner retains successful evidence', async () => {
      await assert.rejects(payload.jobs.queue({ task: 'verifySource', input: { snapshotKey: source.snapshotKey, expectedDigest: source.sourceDigest }, overrideAccess: false }))
      await assert.rejects(payload.jobs.run({ overrideAccess: false }))
      const job = await payload.jobs.queue({ task: 'verifySource', input: { snapshotKey: source.snapshotKey, expectedDigest: source.sourceDigest }, queue: 'probe-success', overrideAccess: true })
      assert.ok(!job.completedAt)
      await payload.jobs.run({ queue: 'probe-success', sequential: true, limit: 1, overrideAccess: true, silent: true })
      const done = await payload.findByID({ collection: 'payload-jobs', id: job.id, overrideAccess: true })
      assert.ok(done.completedAt)
      assert.equal(done.hasError, false)
      assert.equal(done.totalTried, 1)
      assert.ok(done.log?.some(entry => entry.state === 'succeeded' && JSON.stringify(entry.output).includes(source.sourceDigest)))
      await payload.jobs.run({ queue: 'probe-success', sequential: true, overrideAccess: true, silent: true })
      assert.equal((await payload.findByID({ collection: 'payload-jobs', id: job.id, overrideAccess: true })).totalTried, 1)
    })
    await t.test('typed FAQ and asset projections round-trip, reject tampering, and remain private', async () => {
      const faq = snapshot('nte', source.sourcePath, 'raw-json', JSON.stringify([{ id: 'faq', title: 'Original', faq: [{ question: 'Q', answer: '', questionZh: 'Qz', answerZh: 'Az' }] }]))
      const assets = snapshot('nte', 'packages/data/games/nte/raw-image-sources.json', 'raw-json', JSON.stringify({ characters: { missing: '', present: 'https://example.invalid/image.png' }, weapons: {}, vehicles: {} }))
      const inline = snapshot('genshin', 'apps/game-genshin/lib/data.ts', 'inline-code', 'export const versionDecisionRoute = [{ id: "one", title: { zh: "Original", en: "English" } }]')
      await importSnapshots(payload, [faq, assets, inline])
      const typed = mapBatch([faq, assets, inline], policy)
      const first = await importRecordBatch(payload, typed, policy)
      assert.equal(first.created, 5)
      assert.equal((await importRecordBatch(payload, typed, policy)).reused, 5)
      assert.deepEqual(await loadRecordBatch(payload, typed.batchKey), typed)
      const row = (await payload.find({ collection: 'migration-records', overrideAccess: true, where: { legacyId: { equals: 'faq' } } })).docs[0]
      assert.equal(row.faqs?.length, 2)
      assert.equal(row.faqs?.find(x => x.locale === 'en')?.answer, '')
      await assert.rejects(payload.update({ collection: 'migration-records', id: row.id, user: admin, overrideAccess: false, data: { faqs: [] } }))
      await payload.update({ collection: 'migration-records', id: row.id, overrideAccess: true, data: { faqs: [] } })
      await assert.rejects(importRecordBatch(payload, typed, policy), /Stored record mismatch/)
      await payload.update({ collection: 'migration-records', id: row.id, overrideAccess: true, data: { faqs: row.faqs } })
      const asset = (await payload.find({ collection: 'migration-records', overrideAccess: true, where: { legacyId: { equals: 'missing' } } })).docs[0]
      assert.equal(asset.assetReference?.url, '')
      await payload.update({ collection: 'migration-records', id: asset.id, overrideAccess: true, data: { assetReference: { ...asset.assetReference, url: 'https://example.invalid/tampered' } } })
      await assert.rejects(importRecordBatch(payload, typed, policy), /Stored record mismatch/)
      await payload.update({ collection: 'migration-records', id: asset.id, overrideAccess: true, data: { assetReference: asset.assetReference } })
      assert.equal((await importRecordBatch(payload, typed, policy)).reused, 5)
      assert.throws(() => diffBatches({ ...typed, mapperVersion: 'legacy-records-v1' }, typed), /re-baselining/)
    })
    await t.test('unavailable source remains a failed check and bounded retries stop', async () => {
      const job = await payload.jobs.queue({ task: 'verifySource', input: { snapshotKey: '0'.repeat(64), expectedDigest: '0'.repeat(64) }, queue: 'probe-failure', overrideAccess: true })
      await payload.jobs.run({ queue: 'probe-failure', sequential: true, overrideAccess: true, silent: true })
      const first = await payload.findByID({ collection: 'payload-jobs', id: job.id, overrideAccess: true })
      assert.equal(first.totalTried, 1)
      assert.ok(!first.completedAt)
      const wait = first.waitUntil ? Math.max(0, new Date(first.waitUntil).getTime() - Date.now()) : 0
      assert.ok(wait < 5000, 'Local probe backoff should be bounded')
      await new Promise(resolve => setTimeout(resolve, wait + 75))
      await payload.jobs.run({ queue: 'probe-failure', sequential: true, overrideAccess: true, silent: true })
      const failed = await payload.findByID({ collection: 'payload-jobs', id: job.id, overrideAccess: true })
      assert.equal(failed.hasError, true)
      assert.ok(!failed.completedAt)
      assert.equal(failed.totalTried, 2)
      assert.match(JSON.stringify(failed.error), /Source unavailable/)
      await payload.jobs.run({ queue: 'probe-failure', sequential: true, overrideAccess: true, silent: true })
      assert.equal((await payload.findByID({ collection: 'payload-jobs', id: job.id, overrideAccess: true })).totalTried, 2)
    })
  } finally {
    await payload.destroy()
    await rm(local.directory, { recursive: true, force: true })
  }
})
