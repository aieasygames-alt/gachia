import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { conflictOptions } from '../src/conflict-options'

test('conflict selector limits fields and preserves literal presence previews', () => {
  const row = { field: 'material.notes', status: 'conflict', baseText: 'null', currentText: '""', incomingText: '"<script>text</script>"' }
  assert.deepEqual(conflictOptions([row, { field: 'material.type', status: 'unchanged' }], ['material.notes', 'material.type']), [{ field: row.field, baseText: row.baseText, currentText: row.currentText, incomingText: row.incomingText }])
  for (const input of [null, {}, [row, row], [{ ...row, field: 'unknown' }], [{ ...row, status: 'unexpected' }], [{ ...row, currentText: null }]]) assert.throws(() => conflictOptions(input, ['material.notes']))
  assert.deepEqual(conflictOptions([], []), [])
})

test('generated Admin import map registers conflict field without a shadowing stub', () => {
  const base = new URL('../src/app/(payload)/admin/', import.meta.url)
  assert.equal(existsSync(new URL('importMap.ts', base)), false)
  const map = readFileSync(new URL('importMap.js', base), 'utf8')
  assert.match(map, /\/src\/components\/ConflictField#ConflictField/)
  assert.match(map, /@payloadcms\/next\/rsc#CollectionCards/)
})
