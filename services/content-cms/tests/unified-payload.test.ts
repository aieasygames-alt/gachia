import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { readUnifiedSources } from '../src/unified-sources'
import { baselineDirectory } from '../src/inventory-baseline'
import { localEnvironment, projectRoot } from '../src/local-environment'
import { cmsEnvironment } from '../src/cms-environment'
import { unifiedPlan, importUnifiedPlan } from '../src/unified-plan'
import { readUnifiedPublishedSelection } from '../src/unified-desktop'
import { exportUnifiedContent } from '../src/unified-export'
import { locateValue, readSourceValue } from '../src/unified-sources'
import { editProbe } from './fixtures/unified-edit-probe'
import { publishedEditingContext } from '../src/published-editing-guard'

test('all-game source import and editorial controls use real Payload transactions and versions', async t => {
  const postgres = process.env.CMS_MODE === 'postgres-local'
  process.env.CMS_LOCAL_ONLY = '1'
  if (!postgres) {
    process.env.CMS_LOCAL_NAMESPACE = `unified-test-${randomUUID()}`
    process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
  }
  const local = postgres ? cmsEnvironment() : localEnvironment()
  const inventory = JSON.parse(await readFile(path.resolve(projectRoot, '../..', baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const password = randomUUID() + 'Aa1!'
    const admin = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'unified-admin@example.invalid', password, role: 'admin' } })
    const editor = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'unified-editor@example.invalid', password, role: 'editor' } })
    const reviewer = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'unified-reviewer@example.invalid', password, role: 'reviewer' } })
    const expected = plan.sources.reduce((sum, source) => sum + source.records.length, 0)
    const eligibleBefore = (await payload.count({ collection: 'content-records', overrideAccess: true, where: { hold: { equals: false } } })).totalDocs
    const guidesBefore = (await payload.count({ collection: 'content-records', overrideAccess: true, where: { stableKey: { like: 'genshin:guides:' } } })).totalDocs
    const selectedScope = plan.scopeCoverage.find(scope => scope.game === 'ananta')!
    await t.test('explicit scope import does not import other games, and invalid scopes fail before database access', async () => {
      const result = await importUnifiedPlan(payload, plan, ['ananta'])
      assert.equal(result.created, selectedScope.recordCount)
      assert.equal((await payload.count({ collection: 'content-records', overrideAccess: true,
        where: { stableKey: { like: 'unified:' } } })).totalDocs, selectedScope.recordCount)
      for (const scopes of [[], ['unknown'], ['ananta', 'ananta']]) await assert.rejects(importUnifiedPlan(payload, plan, scopes), /registered/)
    })
    await t.test('all actual sources import held drafts without touching the existing guide channel', async () => {
      const result = await importUnifiedPlan(payload, plan)
      assert.equal(result.created, expected - selectedScope.recordCount)
      assert.equal(result.websiteChanged, false)
      assert.equal((await payload.count({ collection: 'games', overrideAccess: true, where: { key: { in: plan.games } } })).totalDocs, 16)
      assert.equal((await payload.count({ collection: 'content-records', overrideAccess: true, where: { hold: { equals: false } } })).totalDocs, eligibleBefore)
      assert.equal((await payload.count({ collection: 'content-records', overrideAccess: true, where: { stableKey: { like: 'genshin:guides:' } } })).totalDocs, guidesBefore)
    })
    const imported = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
      where: { and: [{ kind: { equals: 'characters' } }, { stableKey: { like: 'unified:hi3:' } }] }, limit: 1 })).docs[0]
    assert.ok(imported)
    const value = imported.structuredValue as Record<string, unknown>
    assert.equal(typeof value.name, 'string')
    await t.test('Genshin material acquisition text supports real draft/review while preserving immutable provenance', async () => {
      let material = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
        where: { and: [{ kind: { equals: 'materials' } }, { stableKey: { like: 'unified:genshin:' } }] }, limit: 1 })).docs[0]
      const source = material.sourceRecord as any
      const after = { ...material, reviewEvidence: { publishedBaseline: { kind: 'genshin-published-editing-baseline-v1', source,
        importOriginalSHA256: source.originalSHA256, syncKey: 'a'.repeat(64), exportKey: 'b'.repeat(64),
        sourceIndex: { path: '/fixture/source-index.json', pin: 'c'.repeat(64) }, versionId: 'fixture-version' } } }
      material = await payload.update({ collection: 'content-records', id: material.id, user: admin, overrideAccess: false,
        draft: true, data: after, context: publishedEditingContext(material, after) })
      const before = material.structuredValue as Record<string, unknown>
      assert.equal(typeof before.sourceEn, 'string')
      const edited = { ...before, sourceEn: before.sourceEn + ' Editorial wording fixture.' }
      const draft = await payload.update({ collection: 'content-records', id: material.id, user: editor, overrideAccess: false,
        draft: true, data: { structuredValue: edited } })
      assert.deepEqual(draft.sourceRecord, material.sourceRecord)
      assert.deepEqual(draft.structuredValue, edited)
      await assert.rejects(payload.update({ collection: 'content-records', id: material.id, user: editor, overrideAccess: false,
        data: { _status: 'published', hold: false } }), /reviewer/)
      const approved = await payload.update({ collection: 'content-records', id: material.id, user: reviewer, overrideAccess: false,
        data: { structuredValue: edited, _status: 'published', hold: false } })
      assert.deepEqual(approved.sourceRecord, material.sourceRecord)
      assert.deepEqual(approved.structuredValue, edited)
      await assert.rejects(payload.update({ collection: 'content-records', id: material.id, user: admin, overrideAccess: false,
        draft: true, data: { sourceRecord: { ...(material.sourceRecord as any), sourceSHA256: 'a'.repeat(64) } } }), /Immutable/)
      await assert.rejects(payload.update({ collection: 'content-records', id: material.id, user: editor, overrideAccess: false,
        draft: true, data: { structuredValue: { ...edited, sourceReview: 'untrusted' } } }), /fields/)
    })
    await t.test('installed selection rejects unapproved records even when a caller selects their correct identity', async () => {
      await assert.rejects(readUnifiedPublishedSelection(payload, plan, [imported.stableKey]), /published and approved/)
    })
    await t.test('anonymous access, uncontrolled creation, identity edits and administrative deletion are denied', async () => {
      await assert.rejects(payload.findByID({ collection: 'content-records', id: imported.id, overrideAccess: false }))
      const template = plan.sources.flatMap(source => source.records).find(record => record.stableKey === imported.stableKey)!
      await assert.rejects(payload.create({ collection: 'content-records', user: admin, overrideAccess: false, draft: true,
        data: { ...template, game: imported.game, bodyFormat: 'plain' } }), /controlled source importer/)
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { stableKey: 'escaped', sourceRecord: {} } }), /provenance|identity/i)
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { structuredValue: { ...value, id: 'changed-id' } } }), /Protected/)
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { title: 'Wrong editor' } }), /structured editor/)
      await assert.rejects(payload.delete({ collection: 'content-records', id: imported.id, user: admin, overrideAccess: false }))
      assert.ok(await payload.findByID({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true }))
    })
    await t.test('editor saves structured drafts, reviewer approves, later drafts do not replace the published version', async () => {
      const updated = { ...value, name: `${value.name} editorial fixture` }
      await payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { structuredValue: updated } })
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { hold: false } }), /reviewer/)
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false,
        data: { _status: 'published' } }), /reviewer/)
      const approved = await payload.update({ collection: 'content-records', id: imported.id, user: reviewer, overrideAccess: false,
        data: { structuredValue: updated, _status: 'published', hold: false } })
      assert.deepEqual(approved.structuredValue, updated)
      const nextDraft = await payload.update({ collection: 'content-records', id: imported.id, user: editor, overrideAccess: false, draft: true,
        data: { structuredValue: { ...updated, name: 'Next unapproved fixture' } } })
      assert.equal(nextDraft.hold, true)
      const published = await payload.findByID({ collection: 'content-records', id: imported.id, user: reviewer, overrideAccess: false, draft: false })
      assert.deepEqual(published.structuredValue, updated)
      assert.equal(published.hold, false)
      const selected = await readUnifiedPublishedSelection(payload, plan, [imported.stableKey])
      assert.deepEqual(selected.records[0].structuredValue, updated)
      assert.equal(selected.reviews[0].id, imported.id)
      assert.match(selected.reviewPin, /^[a-f0-9]{64}$/)
      const reread = await readUnifiedPublishedSelection(payload, plan, [imported.stableKey])
      assert.equal(reread.reviewPin, selected.reviewPin)
      const versions = await payload.findVersions({ collection: 'content-records', user: reviewer, overrideAccess: false,
        where: { parent: { equals: imported.id } } })
      assert.ok(versions.totalDocs >= 4)
    })
    await t.test('active document locks still prevent privileged overwrite attempts', async () => {
      const lock = await payload.create({ collection: 'payload-locked-documents', user: editor, overrideAccess: false,
        data: { document: { relationTo: 'content-records', value: imported.id }, user: { relationTo: 'users', value: editor.id } } })
      await assert.rejects(payload.update({ collection: 'content-records', id: imported.id, user: reviewer, overrideAccess: false, overrideLock: true,
        draft: true, data: { structuredValue: { ...value, name: 'Locked fixture' } } }), /locked/i)
      await payload.delete({ collection: 'payload-locked-documents', id: lock.id, user: editor, overrideAccess: false })
    })
    await t.test('repeat import preserves all edits and approvals without duplicate or overwrite', async () => {
      const before = await payload.findByID({ collection: 'content-records', id: imported.id, overrideAccess: true, draft: true })
      const result = await importUnifiedPlan(payload, plan)
      assert.equal(result.created, 0)
      assert.equal(result.unchanged, expected)
      const after = await payload.findByID({ collection: 'content-records', id: imported.id, overrideAccess: true, draft: true })
      assert.deepEqual(after, before)
    })
    await t.test('source drift rolls an in-progress game import back instead of replacing editorial provenance', async () => {
      const original = readUnifiedSources().sources.find(source => source.sourcePath === 'packages/data/games/hi3/raw-characters.json')!
      const rows = JSON.parse(original.rawText)
      rows.unshift({ ...rows[0], id: 'unified-rollback-fixture' })
      const { snapshot } = await import('../src/legacy-intake')
      const changed = snapshot(original.gameKey, original.sourcePath, original.sourceKind, JSON.stringify(rows))
      const before = (await payload.count({ collection: 'content-records', overrideAccess: true })).totalDocs
      await assert.rejects(importUnifiedPlan(payload, unifiedPlan([changed], ['hi3'])), /Source revision changed/)
      assert.equal((await payload.count({ collection: 'content-records', overrideAccess: true })).totalDocs, before)
    })
    await t.test('every editable game/source/family completes draft, review, published selection and batch export', async () => {
      const selectedKeys: string[] = [], expectedValues = new Map<string, unknown>()
      const coveredGames = new Set<string>(), coveredFamilies = new Set<string>()
      const scalarStrings: string[] = []
      const docs = await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
        pagination: false, where: { stableKey: { like: 'unified:' } } })
      const byKey = new Map(docs.docs.map(doc => [doc.stableKey, doc]))
      for (const source of plan.sources) for (const family of new Set(source.records.map(record => record.kind))) {
        const template = source.records.find(record => record.kind === family && editProbe(record.structuredValue) !== null)
        if (!template) continue // Empty lists and protected-only units require the separate structural contract.
        const value = editProbe(template.structuredValue)!, doc = byKey.get(template.stableKey)!
        assert(doc, template.stableKey)
        const draft = await payload.update({ collection: 'content-records', id: doc.id, user: editor, overrideAccess: false, draft: true,
          data: { structuredValue: value } })
        assert.equal(draft.hold, true)
        if (template.stableKey === imported.stableKey) {
          const previous = await readUnifiedPublishedSelection(payload, plan, [template.stableKey])
          assert.notDeepEqual(previous.records[0].structuredValue, value)
        } else await assert.rejects(readUnifiedPublishedSelection(payload, plan, [template.stableKey]), /published and approved/)
        await payload.update({ collection: 'content-records', id: doc.id, user: reviewer, overrideAccess: false,
          data: { structuredValue: value, _status: 'published', hold: false } })
        selectedKeys.push(template.stableKey); expectedValues.set(template.stableKey, value)
        coveredGames.add(source.game); coveredFamilies.add(`${source.sourcePath}:${family}`)
        if (typeof value === 'string') scalarStrings.push(`${source.game}:${family}`)
      }
      assert.deepEqual([...coveredGames].sort(), plan.games)
      assert(scalarStrings.length > 0, 'Scalar string blocks must be included in real Payload publication coverage')
      const selected = await readUnifiedPublishedSelection(payload, plan, selectedKeys.sort())
      assert.equal(selected.records.length, coveredFamilies.size)
      const known = new Set(plan.sources.map(source => source.sourcePath))
      const originals = readUnifiedSources().sources.filter(source => known.has(source.sourcePath))
        .map(source => ({ sourcePath: source.sourcePath, text: source.rawText, sha256: source.sourceDigest }))
      const exported = exportUnifiedContent(selected.records, originals, originals, false)
      assert.equal(exported.manifest.changed.length, selectedKeys.length)
      for (const record of selected.records) {
        const source = record.sourceRecord, output = exported.files.find(file => file.sourcePath === source.sourcePath)!
        assert.deepEqual(record.structuredValue, expectedValues.get(record.stableKey))
        assert.deepEqual(locateValue(readSourceValue(output.content, source.sourcePath, source.locator), source.locator), record.structuredValue)
      }
      assert.equal(exported.manifest.cloudWrites, false)
      assert.equal(exported.manifest.activationSupported, false)
      t.diagnostic(`Batch verified: ${coveredGames.size} scopes, ${coveredFamilies.size} editable source/family rows; no public deployment`)
      t.diagnostic(`Scalar string blocks: ${scalarStrings.join(', ')}`)
    })
  } finally {
    await payload.destroy()
    await rm(local.directory, { recursive: true, force: true })
  }
})
