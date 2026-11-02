import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_SNAPSHOT_BYTES, profileJSON, snapshot } from '../src/legacy-intake'

test('field profiles report ambiguity rather than inventing identity or locales', () => {
  const profile = profileJSON('[{"id":"a","titleZh":"A","name":"same"},{"id":"a","name":"same"},null,5]')
  assert.equal(profile.rowCount, 4)
  assert.equal(profile.objectRows, 2)
  assert.deepEqual(profile.identityCandidates.find(candidate => candidate.field === 'id'), { field: 'id', present: 2, unique: 1, duplicates: 1 })
  assert.deepEqual(profile.localeFieldCandidates, ['titleZh'])
  assert.equal(profile.mappingStatus, 'unmapped')
  assert.throws(() => profileJSON('invalid JSON'))
})

test('legacy JSON stays exact text, including unsafe keys, without object merging', () => {
  const text = '{"__proto__":{"poisoned":true},"constructor":{"prototype":{"poisoned":true}}}'
  const source = snapshot('test', 'fixture.json', 'raw-json', text)
  assert.equal(source.rawText, text)
  assert.notEqual(source.snapshotKey, snapshot('test', 'other.json', 'raw-json', text).snapshotKey)
  assert.notEqual(source.snapshotKey, snapshot('test', 'fixture.json', 'raw-json', text + '\n').snapshotKey)
  assert.equal(Object.hasOwn(Object.prototype, 'poisoned'), false)
  assert.throws(() => snapshot('test', 'empty', 'raw-json', ''))
  assert.throws(() => snapshot('test', 'oversized', 'raw-json', 'x'.repeat(MAX_SNAPSHOT_BYTES + 1)), /limit/)
})
