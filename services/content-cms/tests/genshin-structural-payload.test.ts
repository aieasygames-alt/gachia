import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { canonical } from '../src/record-mapping'
import { cmsEnvironment } from '../src/cms-environment'
import { reconcileGenshinIntake, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
import { importGenshinStructuralStage, prepareGenshinStructuralStage, readGenshinStructuralStage } from '../src/genshin-structural-stage'

test('structural intake uses real database transactions, read-only ACLs and repeat verification', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  if (!postgres) {
    process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `stage-test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const runtime = cmsEnvironment()
  assert(['sqlite-local', 'postgres-local'].includes(runtime.mode), 'Only owned test databases allowed')
  const input: GenshinIntakeInput = JSON.parse(gunzipSync(readFileSync(new URL('../reviews/2026-11-20-genshin-resume-r141.json.gz', import.meta.url))).toString()).input
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const admin = await payload.create({ collection: 'users', overrideAccess: true,
      data: { email: 'stage-admin@example.invalid', password: randomUUID() + 'Aa1!', role: 'admin' } })
    const game = await payload.create({ collection: 'games', overrideAccess: true,
      data: { key: 'genshin', name: '原神', region: 'test', legacyRegistry: {} } })
    for (const row of input.cms) {
      await payload.create({ collection: 'content-records', overrideAccess: true, draft: true, context: { unifiedContentImport: true },
        data: { stableKey: row.stableKey, game: game.id, kind: row.kind, legacyId: row.legacyId, legacyPath: row.legacyPath,
          bodyFormat: 'plain', sourceRecord: row.sourceRecord, structuredValue: row.structuredValue,
          hold: true, _status: 'draft' } })
    }
    const records = async () => (await payload.find({ collection: 'content-records', overrideAccess: true,
      draft: true, locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
    input.cms = await records() as unknown as GenshinIntakeInput['cms']
    const plan = reconcileGenshinIntake(input), stage = prepareGenshinStructuralStage(plan, input)
    const before = canonical(await records())
    const count = async (collection: 'migration-records' | 'migration-batches') => (await payload.count({ collection, overrideAccess: true })).totalDocs
    await t.test('failure after creating all 179 revisions rolls back revisions and manifest together', async () => {
      const hooks = payload.collections['migration-batches'].config.hooks!.beforeChange!
      const failure = () => { throw Error('injected manifest failure') }
      hooks.push(failure)
      try { await assert.rejects(importGenshinStructuralStage(payload, plan, input), /injected manifest failure/) }
      finally { hooks.splice(hooks.indexOf(failure), 1) }
      assert.equal(await count('migration-records'), 0); assert.equal(await count('migration-batches'), 0)
      assert.equal(canonical(await records()), before)
    })
    await t.test('stale live CMS blocks staging before any candidate write', async () => {
      const stale = structuredClone(input); stale.cms[0].updatedAt = '2026-11-21T00:00:00.000Z'
      await assert.rejects(importGenshinStructuralStage(payload, reconcileGenshinIntake(stale), stale), /Live CMS changed/)
      assert.equal(await count('migration-records'), 0)
    })
    await t.test('atomic import stages exactly 179 held revisions while skipping 42 saved drafts', async () => {
      const result = await importGenshinStructuralStage(payload, plan, input)
      assert.equal(result.created, 179); assert.equal(result.reused, 0); assert.equal(result.alreadyAppliedSkipped, 42)
      assert.equal(result.contentRecordWrites, 0); assert.equal(result.approvalWrites, 0)
      assert.equal(await count('migration-records'), 179); assert.equal(await count('migration-batches'), 1)
      assert.equal(canonical(await records()), before)
    })
    await t.test('repeated import performs reads without another create or any content update', async () => {
      const hooks = payload.collections['migration-records'].config.hooks!.beforeChange!
      const failure = () => { throw Error('repeat attempted a write') }; hooks.push(failure)
      try {
        const result = await importGenshinStructuralStage(payload, plan, input)
        assert.equal(result.created, 0); assert.equal(result.reused, 179)
      } finally { hooks.splice(hooks.indexOf(failure), 1) }
      assert.equal(await count('migration-records'), 179)
      assert.equal(canonical(await records()), before)
    })
    const staged = (await payload.find({ collection: 'migration-records', overrideAccess: true, limit: 1 })).docs[0]
    await t.test('staff can inspect stages; anonymous and ordinary administrative writes are denied', async () => {
      await assert.rejects(payload.findByID({ collection: 'migration-records', id: staged.id, overrideAccess: false }))
      assert.equal((await payload.findByID({ collection: 'migration-records', id: staged.id, user: admin, overrideAccess: false })).hold, true)
      await assert.rejects(payload.update({ collection: 'migration-records', id: staged.id, user: admin, overrideAccess: false, data: { hold: false } }))
      await assert.rejects(payload.delete({ collection: 'migration-records', id: staged.id, user: admin, overrideAccess: false }))
      await assert.rejects(payload.create({ collection: 'migration-batches', user: admin, overrideAccess: false,
        data: { batchKey: 'forged', mapperVersion: 'forged', policyDigest: 'forged', recordCount: 0, manifest: '{}' } }))
    })
    await t.test('stored revision or manifest corruption is rejected on read and repeat', async () => {
      await payload.update({ collection: 'migration-records', id: staged.id, overrideAccess: true, data: { rawRecord: '{}' } })
      await assert.rejects(readGenshinStructuralStage(payload, stage), /revision mismatch/)
      await assert.rejects(importGenshinStructuralStage(payload, plan, input), /revision mismatch/)
      await payload.update({ collection: 'migration-records', id: staged.id, overrideAccess: true, data: { rawRecord: staged.rawRecord } })
      assert.equal((await readGenshinStructuralStage(payload, stage)).records, 179)
      assert.equal(canonical(await records()), before)
    })
  } finally {
    await payload.destroy()
    if (!postgres) await rm(runtime.directory, { recursive: true, force: true })
  }
})
