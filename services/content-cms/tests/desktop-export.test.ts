import assert from 'node:assert/strict'
import test from 'node:test'
import { exportDesktopGuides } from '../src/desktop-export'

const original = { id: 'one', title: 'O', image: '/keep.webp' }, text = JSON.stringify([original])
const record = { legacyId: 'one', stableKey: 'genshin:guides:one', sourceRecord: original, hold: false, _status: 'published', title: { zh: 'A' } }
test('successive exports preserve O provenance and distinguish A/B and rehearsal identity', () => {
  const a = exportDesktopGuides(text, 'genshin', [record], false)
  const b = exportDesktopGuides(text, 'genshin', [{ ...record, title: { zh: 'B' } }], false)
  assert.equal(a.manifest.sourceSHA256, b.manifest.sourceSHA256)
  assert.notEqual(a.manifest.releaseKey, b.manifest.releaseKey)
  assert.equal(JSON.parse(b.content)[0].image, original.image)
  const rehearsal = exportDesktopGuides(text, 'genshin', [record], true)
  assert.equal(rehearsal.content, a.content); assert.notEqual(rehearsal.manifest.releaseKey, a.manifest.releaseKey)
})
test('export rejects missing approval, duplicates and source rebase drift', () => {
  for (const rows of [[], [record, record], [{ ...record, hold: true }], [{ ...record, _status: 'draft' }], [{ ...record, sourceRecord: { ...original, title: 'A' } }]]) {
    assert.throws(() => exportDesktopGuides(text, 'genshin', rows, false))
  }
})
