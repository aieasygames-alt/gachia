import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { cmsEnvironment } from '../src/cms-environment'
import { canonical } from '../src/record-mapping'
import { digest } from '../src/legacy-intake'
import { editingSource } from '../src/unified-content'
import { readSourceValue, replaceSourceSymbol, readUnifiedSources, sourceUnits } from '../src/unified-sources'
import { exportUnifiedContent } from '../src/unified-export'
import { applyAzurEditingSync, planAzurEditingSync, verifyAzurEditingRows } from '../src/azur-editing-sync'
import { AZUR_PROMILIA_GUIDE_SOURCE as sourcePath } from '../src/azur-promilia-independent-text'

test('Azur repeated edit uses explicit published A, preserving reviewed B and original O in a real transaction', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  if (!postgres) { process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `azur-sync-${randomUUID()}`; process.env.PAYLOAD_SECRET = randomUUID() + randomUUID() }
  const runtime = cmsEnvironment(); assert(['sqlite-local', 'postgres-local'].includes(runtime.mode))
  const text = readFileSync(new URL('../../../apps/game-azur-promilia/lib/data.ts', import.meta.url), 'utf8')
  const guides = readSourceValue(text, sourcePath, { symbol: 'guides' }) as any[], original = structuredClone(guides[0])
  const unit = sourceUnits(readUnifiedSources().sources.find(row => row.sourcePath === sourcePath)!).records.find(row => row.sourceRecord.locator.identity?.id === original.id)!
  assert(unit); assert.equal(unit.kind, 'inline-guides'); assert.deepEqual(unit.sourceRecord.original, original)
  guides[0].content.en += ' First published increment.'
  const activeText = replaceSourceSymbol(text, sourcePath, 'guides', guides), active = { sourcePath, text: activeText, sha256: digest(activeText) }
  const edited = structuredClone(guides[0]); edited.content.en += ' Second reviewed increment.'
  const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'azur-sync@example.invalid', password: randomUUID() + 'Aa1!', role: 'admin' } })
    const game = await payload.create({ collection: 'games', overrideAccess: true, data: { key: 'azur-promilia', name: '蓝色星原', region: 'test', legacyRegistry: {} } })
    await payload.create({ collection: 'content-records', user: admin, overrideAccess: true, draft: false, context: { unifiedContentImport: true },
      data: { ...unit, game: game.id, bodyFormat: 'plain', structuredValue: edited, hold: false, _status: 'published' } as any })
    await payload.create({ collection: 'content-records', user: admin, overrideAccess: true, data: { stableKey: 'unrelated', game: game.id, kind: 'guides', legacyId: 'untouched', legacyPath: 'untouched', bodyFormat: 'plain', sourceRecord: {}, body: 'Preserve.', hold: true, _status: 'draft' } })
    const records = async (draft = true) => (await payload.find({ collection: 'content-records', overrideAccess: true, draft, locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
    const before = { draft: await records(), published: await records(false) }
    const opened: any = { stableKey: unit.stableKey, before, input: { sourceIndex: { path: '/test/source-index.json', pin: 'a'.repeat(64) }, snapshot: { path: '/test/before.gz', pin: 'b'.repeat(64) } },
      sources: { allOwnersCurrent: true, sources: [active], owners: { 'azur-promilia': { versionId: '78442797-d15e-441e-a00d-2faa6d9aa543' } } } }
    const plan = planAzurEditingSync(opened), saved = canonical(await records())
    const originals = [{ sourcePath, text, sha256: digest(text) }]
    assert.throws(() => exportUnifiedContent([plan.before], originals, [active], false), /requires rebase/)
    await t.test('ordinary admin cannot forge an editing baseline', async () => {
      await assert.rejects(payload.update({ collection: 'content-records', id: plan.before.id, user: admin, overrideAccess: true, data: plan.after as any }), /maintenance-only/)
      assert.equal(canonical(await records()), saved)
    })
    await t.test('a live lock refuses the complete sync', async () => {
      const lock = await payload.create({ collection: 'payload-locked-documents', overrideAccess: true, data: { document: { relationTo: 'content-records', value: plan.before.id }, user: { relationTo: 'users', value: admin.id } } })
      try { await assert.rejects(applyAzurEditingSync(payload, opened, admin.id), /live content lock/) }
      finally { await payload.delete({ collection: 'payload-locked-documents', id: lock.id, overrideAccess: true }) }
      assert.equal(canonical(await records()), saved)
    })
    await t.test('late failure rolls back the content baseline and batch marker', async () => {
      const hooks = payload.collections['migration-batches'].config.hooks!.beforeChange ??= []
      const fail = () => { throw Error('injected Azur transaction failure') }; hooks.push(fail)
      try { await assert.rejects(applyAzurEditingSync(payload, opened, admin.id), /injected Azur/) }
      finally { hooks.splice(hooks.indexOf(fail), 1) }
      assert.equal(canonical(await records()), saved)
    })
    await t.test('only baseline metadata changes, and reviewed text now exports against A', async () => {
      assert.equal((await applyAzurEditingSync(payload, opened, admin.id)).updated, 1)
      const current = await records(); verifyAzurEditingRows(opened, plan, current)
      const row = current.find(row => row.id === plan.before.id)!
      assert.deepEqual(row.structuredValue, edited); assert.deepEqual(row.sourceRecord, unit.sourceRecord)
      assert.deepEqual(editingSource(row).original, guides[0])
      const result = exportUnifiedContent([row as any], originals, [active], false)
      assert.deepEqual(result.manifest.changed, [unit.stableKey])
      const published = readSourceValue(result.files[0].content, sourcePath, { symbol: 'guides' }) as any[]
      assert.equal(published[0].content.en, edited.content.en)
    })
    await t.test('repeat has zero writes and preserves timestamps', async () => {
      const previous = canonical(await records()), hooks = payload.collections['content-records'].config.hooks!.beforeChange!
      const fail = () => { throw Error('repeat attempted a write') }; hooks.push(fail)
      try { assert.equal((await applyAzurEditingSync(payload, opened, admin.id)).updated, 0) }
      finally { hooks.splice(hooks.indexOf(fail), 1) }
      assert.equal(canonical(await records()), previous)
    })
    await t.test('stale sync cannot overwrite a subsequent draft', async () => {
      await payload.update({ collection: 'content-records', id: plan.before.id, user: admin, overrideAccess: false, draft: true, data: { structuredValue: { ...edited, content: { ...edited.content, en: edited.content.en + ' Later edit.' } } } })
      await assert.rejects(applyAzurEditingSync(payload, opened, admin.id), /sync drift/)
    })
    for (const mutate of [
      (x: any) => { x.sources.allOwnersCurrent = false },
      (x: any) => { x.before.draft.find((r: any) => r.stableKey === unit.stableKey).hold = true },
      (x: any) => { x.before.draft.find((r: any) => r.stableKey === unit.stableKey).structuredValue.title.en += ' Wrong field' },
    ]) { const invalid = structuredClone(opened); mutate(invalid); assert.throws(() => planAzurEditingSync(invalid)) }
  } finally { await payload.destroy(); if (!postgres) await rm(runtime.directory, { recursive: true, force: true }) }
})
