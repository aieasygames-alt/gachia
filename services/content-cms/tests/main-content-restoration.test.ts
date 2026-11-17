import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRestorationJSON } from '../src/main-content-restoration'

test('restoration binds approved content even when stale responses are rehashed or omitted', () => {
  const sources = [{ sourcePath: 'packages/data/games/ananta/raw-guides.json', text: '{"content":"approved checklist"}' }]
  const references = [{ path: '/data/ananta/raw-guides.json', status: 200 }], pairs = ['ananta/raw-guides.json']
  const approved = () => Buffer.from('{"content":"approved checklist"}'), old = () => Buffer.from('{"content":"old"}')
  assertRestorationJSON(sources, pairs, references, approved, old, 'candidate')
  assert.throws(() => assertRestorationJSON(sources, pairs, references, old, old, 'candidate'), /differs/)
  assert.throws(() => assertRestorationJSON(sources, pairs, [], approved, old, 'candidate'), /omitted/)
  assertRestorationJSON(sources, pairs, references, old, old, 'recovery')
  assert.throws(() => assertRestorationJSON(sources, pairs, references, approved, old, 'recovery'), /differs/)
})
