import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { newGuideSource } from '../../../scripts/desktop-guide-contract.mjs'
import { exportDesktopGuides } from '../src/desktop-export'
import { desktopNewGuideDraft, validateDesktopNewGuideIdentity } from '../src/desktop-new-guide'

const original = { id: 'legacy', title: 'Imported', content: 'Original', image: '/keep.webp' }
const input = { id: 'cms-resource-planning', title: 'Local fixture guide', summary: 'Isolated new-guide fixture', body: 'Isolated CMS content and publication contract. '.repeat(4) }
const record = () => ({ legacyId: input.id, stableKey: `genshin:guides:${input.id}`, sourceRecord: newGuideSource('genshin', input),
  hold: false, _status: 'published', title: { zh: input.title }, body: { zh: input.body } })

test('self-contained CMS and publisher contract modules cannot drift', () => {
  assert.deepEqual(readFileSync(new URL('../src/desktop-guide-contract.mjs', import.meta.url)),
    readFileSync(new URL('../../../scripts/desktop-guide-contract.mjs', import.meta.url)))
})

test('new guide export appends a complete namespaced CMS record without forging import provenance', () => {
  const a = exportDesktopGuides(JSON.stringify([original]), 'genshin', [record()], false)
  const rows = JSON.parse(a.content)
  assert.deepEqual(rows[0], original); assert.equal(rows[1].id, input.id)
  assert.equal(rows[1].cmsOrigin, 'desktop-guide-v1'); assert.equal(rows[1].titleEn, '')
  assert.deepEqual(a.manifest.changed, [input.id]); assert.deepEqual(a.manifest.added, [input.id])
  const b = exportDesktopGuides(JSON.stringify([original]), 'genshin', [{ ...record(), body: { zh: input.body + ' B' } }], false)
  assert.notEqual(a.manifest.releaseKey, b.manifest.releaseKey)
  assert.equal(a.manifest.sourceSHA256, b.manifest.sourceSHA256)
})

test('new guides reject collisions, legacy-shaped provenance, unapproved records and unsupported NTE additions', () => {
  for (const row of [{ ...record(), hold: true }, { ...record(), hold: null }, { ...record(), _status: 'draft' }, { ...record(), sourceRecord: { id: input.id } },
    { ...record(), legacyId: 'legacy', stableKey: 'genshin:guides:legacy' }, { ...record(), stableKey: 'nte:guides:wrong' }]) {
    assert.throws(() => exportDesktopGuides(JSON.stringify([original]), 'genshin', [row], false))
  }
  assert.throws(() => exportDesktopGuides('[]', 'nte', [{ ...record(), stableKey: `nte:guides:${input.id}` }], false))
  assert.throws(() => newGuideSource('genshin', { ...input, id: '../escape' }))
  assert.throws(() => newGuideSource('genshin', { ...input, body: '</script>' + input.body }))
})

test('new guide drafts remain preview-only and export order is independent of database query ordering', () => {
  const second = { ...input, id: 'cms-another' }
  const rows = [record(), { ...record(), legacyId: second.id, stableKey: `genshin:guides:${second.id}`, sourceRecord: newGuideSource('genshin', second) }]
  assert.equal(exportDesktopGuides('[]', 'genshin', rows, false).content, exportDesktopGuides('[]', 'genshin', rows.toReversed(), false).content)
  const draft = { ...record(), hold: true, _status: 'draft' }
  assert.equal(JSON.parse(exportDesktopGuides('[]', 'genshin', [draft], true).content)[0].id, input.id)
})

test('NTE Chinese additions have immutable game-bound draft identity and deterministic preview, not production authorization', () => {
  const draft = desktopNewGuideDraft('nte', 2, input)
  assert.equal(draft.hold, true); assert.equal(draft._status, 'draft')
  assert.equal(validateDesktopNewGuideIdentity(draft), 'nte')
  for (const patch of [{ game: 1 }, { legacyPath: '/genshin/guides/' + input.id }, { sourceRecord: newGuideSource('genshin', input) }]) {
    assert.throws(() => validateDesktopNewGuideIdentity({ ...draft, ...patch }, draft), /immutable/)
  }
  const approved = { ...draft, title: { zh: input.title }, body: { zh: input.body }, hold: false, _status: 'published' }
  const result = exportDesktopGuides(JSON.stringify([original]), 'nte', [approved], true)
  assert.deepEqual(JSON.parse(result.content)[0], original)
  assert.deepEqual(result.manifest.added, [input.id]); assert.equal(result.manifest.preview, true)
  assert.throws(() => exportDesktopGuides(JSON.stringify([original]), 'nte', [approved], false), /preview-only/)
  assert.throws(() => exportDesktopGuides(JSON.stringify([original]), 'nte', [approved, approved], true), /Duplicate/)
})
