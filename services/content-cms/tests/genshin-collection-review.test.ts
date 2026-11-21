import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { canonical } from '../src/record-mapping'
import { cmsEnvironment } from '../src/cms-environment'
import { type GenshinIntakeInput, reconcileGenshinIntake } from '../src/genshin-bounded-intake'
import { importGenshinStructuralStage } from '../src/genshin-structural-stage'
import { exportGenshinCollection, prepareGenshinCollectionReview, readGenshinCollectionReview, stageGenshinCollectionReview } from '../src/genshin-collection-review'
import { auditMaterialReleaseDependencies } from '../src/material-release-dependencies'

test('independent complete-collection review and export on a real database', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  if (!postgres) {
    process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `collection-test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const runtime = cmsEnvironment(); assert(['sqlite-local', 'postgres-local'].includes(runtime.mode))
  const input: GenshinIntakeInput = JSON.parse(gunzipSync(readFileSync(new URL('../reviews/2026-11-20-genshin-resume-r141.json.gz', import.meta.url))).toString()).input
  const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'collection-admin@example.invalid', password: randomUUID() + 'Aa1!', role: 'admin' } })
    const editor = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'collection-editor@example.invalid', password: randomUUID() + 'Aa1!', role: 'editor' } })
    const game = await payload.create({ collection: 'games', overrideAccess: true, data: { key: 'genshin', name: '原神', region: 'test', legacyRegistry: {} } })
    for (const row of input.cms) await payload.create({ collection: 'content-records', overrideAccess: true, draft: true, context: { unifiedContentImport: true },
      data: { stableKey: row.stableKey, game: game.id, kind: row.kind, legacyId: row.legacyId, legacyPath: row.legacyPath,
        bodyFormat: 'plain', sourceRecord: row.sourceRecord, structuredValue: row.structuredValue, hold: true, _status: 'draft' } })
    const records = async () => (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
    input.cms = await records() as unknown as GenshinIntakeInput['cms']
    await importGenshinStructuralStage(payload, reconcileGenshinIntake(input), input)
    const review = prepareGenshinCollectionReview(input), before = canonical(await records())
    await t.test('review comparisons and manifest roll back together after a late failure', async () => {
      const hooks = payload.collections['migration-batches'].config.hooks!.beforeChange ??= []
      const failure = () => { throw Error('injected complete-review failure') }; hooks.push(failure)
      try { await assert.rejects(stageGenshinCollectionReview(payload, input), /injected complete-review failure/) }
      finally { hooks.splice(hooks.indexOf(failure), 1) }
      assert.equal((await payload.count({ collection: 'migration-records', overrideAccess: true })).totalDocs, 179)
      assert.equal(canonical(await records()), before)
    })
    await t.test('complete run includes saved drafts and all structural classes without touching contents', async () => {
      const result = await stageGenshinCollectionReview(payload, input)
      assert.equal(result.total, 221); assert.equal(result.created, 221); assert.equal(result.alreadySavedDrafts, 42)
      assert.equal((await stageGenshinCollectionReview(payload, input)).created, 0)
      assert.equal((await readGenshinCollectionReview(payload, review)).length, 221)
      assert.equal(canonical(await records()), before)
    })
    const items = await readGenshinCollectionReview(payload, review)
    const data = (index = 0) => ({ runKey: review.runKey, reviewItem: items[index].id, action: 'accept-export' as const,
      decisionKey: '', revisionKey: '', cmsKey: '', actorID: '', actorEmail: '',
      note: 'Reviewed pinned source, full O/A/CMS comparison, identity and recovery scope.' })
    await t.test('no decisions or partial decisions cannot export', async () => {
      await assert.rejects(exportGenshinCollection(payload, input), /Every proposal/)
    })
    await t.test('anonymous/editor/override access without a reviewer cannot approve', async () => {
      for (const user of [undefined, editor]) await assert.rejects(payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user, data: data() }))
      await assert.rejects(payload.create({ collection: 'genshin-review-decisions', overrideAccess: true, data: data() }), /Only reviewers/)
    })
    await t.test('a decision recomputes provenance and attribution, and cannot be overwritten or repeated', async () => {
      const decision = await payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin,
        data: { ...data(), actorEmail: 'forged@example.invalid', cmsKey: 'forged', revisionKey: 'forged' } })
      assert.equal(decision.actorEmail, admin.email); assert.equal(decision.cmsKey, review.manifest.cmsKey)
      assert.equal(decision.revisionKey, items[0].revisionKey)
      await assert.rejects(payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin, data: data() }), /terminal decision/)
      await assert.rejects(payload.update({ collection: 'genshin-review-decisions', id: decision.id, overrideAccess: false, user: admin, data: { action: 'reject' } }))
      await assert.rejects(payload.delete({ collection: 'genshin-review-decisions', id: decision.id, overrideAccess: false, user: admin }))
      await assert.rejects(exportGenshinCollection(payload, input), /Every proposal/)
    })
    await t.test('wrong run, unrelated revision, incomplete or corrupt display is rejected', async () => {
      await assert.rejects(payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin, data: { ...data(1), runKey: '0'.repeat(64) } }))
      const item = items[1]
      await payload.update({ collection: 'migration-records', id: item.id, overrideAccess: true, data: { reviewText: '{}' } })
      await assert.rejects(payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin, data: data(1) }), /projection mismatch/)
      await payload.update({ collection: 'migration-records', id: item.id, overrideAccess: true, data: { reviewText: item.reviewText } })
    })
    await t.test('all remaining decisions are atomic and every item has its own attributed review', async () => {
      const transactionID = await payload.db.beginTransaction(); assert(transactionID)
      try {
        for (let index = 1; index < items.length; index++) await payload.create({ collection: 'genshin-review-decisions', overrideAccess: false, user: admin, req: { transactionID }, data: data(index) })
        await payload.db.commitTransaction(transactionID)
      } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    })
    await t.test('complete export preserves 112 published sources and exports all 476 entities', async () => {
      const result = await exportGenshinCollection(payload, input)
      assert.equal(result.sources.length, 115); assert.equal(result.overlays.length, 3); assert.equal(result.manifest.decisions.length, 221)
      assert.equal(result.manifest.changedPaths.length, 3)
      const count = (family: string) => JSON.parse(result.sources.find(row => row.sourcePath === `packages/data/games/genshin/raw-${family}.json`)!.text).length
      assert.equal(count('materials'), 269); assert.equal(count('characters'), 117); assert.equal(count('character-materials'), 90)
      for (const row of result.sources.filter(row => !result.manifest.changedPaths.includes(row.sourcePath))) assert.deepEqual(row, input.active.find(a => a.sourcePath === row.sourcePath))
      assert.equal(result.manifest.dependency.materialReferences, 5490); assert.equal(result.manifest.dependency.complete, true)
      assert.equal(result.manifest.activationSupported, false); assert.equal(result.manifest.contentRecordWrites, 0)
      assert.equal(canonical(result.recoverySources), canonical(input.active))
      const recovery = auditMaterialReleaseDependencies('genshin', result.recoverySources)
      assert(recovery.issues.length > 0, 'Legacy recovery must retain its known dependency gaps')
      assert.equal(canonical(await records()), before)
    })
    await t.test('CMS drift invalidates accepted reviews and cannot silently export a new draft', async () => {
      const row = input.cms.find(row => row.sourceRecord.locator.identity?.id === 'hu-tao')!
      await payload.update({ collection: 'content-records', id: row.id, overrideAccess: false, user: admin, draft: true,
        data: { structuredValue: { ...(row.structuredValue as object), nameEn: 'Hu Tao (unreviewed draft)' } } })
      await assert.rejects(exportGenshinCollection(payload, input), /CMS drift/)
      const changed = structuredClone(input); changed.cms = await records() as unknown as GenshinIntakeInput['cms']
      assert.throws(() => prepareGenshinCollectionReview(changed), /Unreviewed CMS draft/)
    })
  } finally { await payload.destroy(); if (!postgres) await rm(runtime.directory, { recursive: true, force: true }) }
})
