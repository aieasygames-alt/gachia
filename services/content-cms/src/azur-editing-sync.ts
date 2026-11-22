import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { contentUnit, validateUnifiedRecord } from './unified-content'
import { editingProjection, publishedEditingContext } from './published-editing-guard'
import { editingRowsKey } from './genshin-editing-sync'
import { readNteSourceIndex } from './nte-release-history'
import { withSourceHistoryRepository } from './source-history-repository'
import { readPinnedUnifiedInput } from './unified-desktop'
import { readSourceValue, locateValue, replaceValue, replaceSourceSymbol } from './unified-sources'
import { AZUR_PROMILIA_GUIDE_SOURCE, azurPromiliaGuidePairContract } from './azur-promilia-independent-text'
import { withArtifactVerificationSession } from '../../../scripts/artifact-verification-session.mjs'

type Proof = { path: string; pin: string }
export async function openAzurEditingSync(input: { sourceIndex: Proof; snapshot: Proof; selection: Proof }, repository?: string) {
  const sources = await withArtifactVerificationSession(() => repository
    ? withSourceHistoryRepository(repository, () => readNteSourceIndex(input.sourceIndex)) : readNteSourceIndex(input.sourceIndex))
  assert.equal(sources.allOwnersCurrent, true); assert.equal(sources.sources.length, 115)
  const bytes = readFileSync(input.snapshot.path); assert.equal(createHash('sha256').update(bytes).digest('hex'), input.snapshot.pin)
  const before = JSON.parse(gunzipSync(bytes).toString()), selection = readPinnedUnifiedInput(input.selection.path, input.selection.pin) as any
  assert.deepEqual(Object.keys(selection), ['stableKeys']); assert.equal(selection.stableKeys.length, 1)
  return { input, sources, before, stableKey: selection.stableKeys[0] as string }
}
export type AzurEditingInput = Awaited<ReturnType<typeof openAzurEditingSync>>

// Adopt published A as an explicit editing baseline while preserving real O and
// the already reviewed B. Only the one-guide English-text contract can qualify B.
export function planAzurEditingSync(opened: AzurEditingInput) {
  const { sources, input, before, stableKey } = opened
  assert.equal(sources.allOwnersCurrent, true)
  const matches = before.draft.filter((row: any) => row.stableKey === stableKey); assert.equal(matches.length, 1)
  const prior = matches[0]; assert.equal(prior._status, 'published'); assert.equal(prior.hold, false)
  const published = before.published.find((row: any) => row.id === prior.id)
  assert(published); assert.equal(canonical(editingProjection(published)), canonical(editingProjection(prior)))
  assert.equal(published.updatedAt, prior.updatedAt); validateUnifiedRecord(published); validateUnifiedRecord(prior)
  const imported = prior.sourceRecord
  assert.equal(imported.game, 'azur-promilia'); assert.equal(imported.family, 'guides')
  assert.equal(imported.sourcePath, AZUR_PROMILIA_GUIDE_SOURCE); assert.equal(imported.locator.symbol, 'guides')
  const source = sources.sources.find((row: any) => row.sourcePath === AZUR_PROMILIA_GUIDE_SOURCE)!
  const root = readSourceValue(source.text, source.sourcePath, imported.locator), active = locateValue(root, imported.locator)
  const text = replaceSourceSymbol(source.text, source.sourcePath, 'guides', replaceValue(root, imported.locator, prior.structuredValue))
  const contract = azurPromiliaGuidePairContract(sources.sources, [{ sourcePath: source.sourcePath, text, sha256: digest(text) }])
  const unit = contentUnit({ game: imported.game, family: imported.family, sourcePath: source.sourcePath,
    sourceSHA256: source.sha256, locator: imported.locator, original: active })
  assert.equal(unit.stableKey, prior.stableKey)
  const manifest = { kind: 'azur-published-guide-editing-sync-v1', sourceIndex: input.sourceIndex, snapshot: input.snapshot,
    stableKey, id: prior.id, beforeKey: editingRowsKey(before.draft), versionId: sources.owners['azur-promilia'].versionId,
    sourceSHA256: source.sha256, reviewedValueSHA256: digest(canonical(prior.structuredValue)), contract }
  const syncKey = digest(canonical(manifest))
  const after: any = { ...editingProjection(prior), reviewEvidence: { ...prior.reviewEvidence, publishedBaseline: {
    kind: 'azur-published-guide-editing-baseline-v1', syncKey, exportKey: syncKey, sourceIndex: input.sourceIndex,
    versionId: manifest.versionId, importOriginalSHA256: imported.originalSHA256, source: unit.sourceRecord,
  } } }
  validateUnifiedRecord(after); assert.deepEqual(after.structuredValue, prior.structuredValue)
  return { syncKey, manifest, before: prior, after }
}

export function verifyAzurEditingRows(opened: AzurEditingInput, plan: ReturnType<typeof planAzurEditingSync>, current: any[], draft = true) {
  assert.equal(current.length, opened.before.draft.length)
  const byID = new Map((draft ? opened.before.draft : opened.before.published).map((row: any) => [row.id, row]))
  const matches = current.filter(row => row.id === plan.before.id); assert.equal(matches.length, 1)
  for (const row of current) {
    if (row.id !== plan.before.id) assert.equal(canonical(row), canonical(byID.get(row.id)), 'Unrelated CMS content changed')
    else {
      assert.equal(canonical(editingProjection(row)), canonical(plan.after), 'Editing sync drift')
      assert.equal(row.createdAt, plan.before.createdAt); assert.deepEqual(row.sourceRecord, plan.before.sourceRecord)
      validateUnifiedRecord(row)
    }
  }
}

export async function applyAzurEditingSync(payload: Payload, opened: AzurEditingInput, reviewerID: number) {
  const plan = planAzurEditingSync(opened), transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'Editing sync requires a real transaction')
  const req = { transactionID }, rows = async (draft = true) => (await payload.find({ collection: 'content-records', req,
    overrideAccess: true, draft, locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
  const batch = { batchKey: plan.syncKey, mapperVersion: plan.manifest.kind, policyDigest: digest(plan.manifest.kind), recordCount: 1, manifest: canonical(plan.manifest) }
  let updated = 0
  try {
    const existing = (await payload.find({ collection: 'migration-batches', req, overrideAccess: true, depth: 0, limit: 2, where: { batchKey: { equals: plan.syncKey } } })).docs
    if (existing.length) {
      assert.equal(existing.length, 1)
      for (const [key, value] of Object.entries(batch)) assert.equal(canonical((existing[0] as any)[key]), canonical(value))
      verifyAzurEditingRows(opened, plan, await rows()); verifyAzurEditingRows(opened, plan, await rows(false), false)
    } else {
      assert.equal(editingRowsKey(await rows()), plan.manifest.beforeKey, 'Live CMS draft changed')
      assert.equal(editingRowsKey(await rows(false)), editingRowsKey(opened.before.published), 'Live CMS published changed')
      const locks = (await payload.find({ collection: 'payload-locked-documents', req, overrideAccess: true, depth: 0, pagination: false,
        where: { and: [{ 'document.relationTo': { equals: 'content-records' } }, { 'document.value': { equals: plan.before.id } }] } })).docs
      assert(!locks.some(lock => Date.now() - Date.parse(lock.updatedAt) <= 300000), 'An editor holds a live content lock')
      const user = await payload.findByID({ collection: 'users', id: reviewerID, req, depth: 0, overrideAccess: true }); assert(['admin', 'reviewer'].includes(user.role))
      await payload.update({ collection: 'content-records', id: plan.before.id, req, user, overrideAccess: false, draft: false,
        context: publishedEditingContext(plan.before, plan.after), depth: 0, data: plan.after as any }); updated++
      verifyAzurEditingRows(opened, plan, await rows()); verifyAzurEditingRows(opened, plan, await rows(false), false)
      await payload.create({ collection: 'migration-batches', req, overrideAccess: true, data: batch })
    }
    await payload.db.commitTransaction(transactionID)
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  return { syncKey: plan.syncKey, updated, reused: 1 - updated, reviewedContentPreserved: true, realImportPreserved: true, cloudWrites: false }
}
