import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editedGuide, parseGuides } from '../src/desktop-guides'

test('desktop guide projection preserves unknown fields, missing translations and intentionally empty strings', () => {
  const original = { id: 'one', title: 'Unverified title', content: 'Old', titleEn: '', category: 'legacy', faq: [{ arbitrary: true }] }
  assert.deepEqual(editedGuide(original, { title: { zh: original.title, en: null, ja: null }, body: { zh: original.content } }), original)
  const edited = editedGuide(original, { title: { zh: original.title, en: null }, body: { zh: 'New' } })
  assert.deepEqual(edited, { ...original, content: 'New' })
  assert.throws(() => editedGuide(original, { title: { zh: 123 } }), /text/)
})
test('desktop import rejects duplicate, missing and traversal-like guide identities', () => {
  assert.deepEqual(parseGuides('[{"id":"one"}]'), [{ id: 'one' }])
  for (const text of ['{}', '[{}]', '[{"id":"../one"}]', '[{"id":"one"},{"id":"one"}]']) assert.throws(() => parseGuides(text))
})
