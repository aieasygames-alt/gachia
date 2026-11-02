import test from 'node:test'
import assert from 'node:assert/strict'
import { shadowReaderGate } from '../src/shadow-reader-gate'

test('shadow reader remains disabled unless explicitly opted in', () => {
  assert.deepEqual(shadowReaderGate(undefined), { enabled: false, publicTrafficChanged: false, reason: 'disabled' })
  assert.deepEqual(shadowReaderGate('1'), { enabled: true, publicTrafficChanged: false, reason: 'opt-in' })
  assert.deepEqual(shadowReaderGate('true'), { enabled: true, publicTrafficChanged: false, reason: 'opt-in' })
  assert.equal(shadowReaderGate('yes').enabled, false)
})
