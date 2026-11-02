import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMediaEvidence } from '../src/media-evidence'

const summaries = [{ eligible: true, dto: { id: 'hero', image: { pathname: '/images/nte/hero.webp', url: 'https://img.gachia.com/images/nte/hero.webp' } } }, { eligible: false, dto: { id: 'future', image: { pathname: '/images/nte/future.webp', url: 'https://img.gachia.com/images/nte/future.webp' } } }]
const row = { pathname: '/images/nte/hero.webp', sha256: null, bytes: null, mime: 'image/webp' as const, rights: 'unverified' as const, sourcePointer: '/characters/0/image' }
test('media evidence keeps bytes and rights separate and excludes ineligible targets', () => {
  const report = buildMediaEvidence(summaries, [row])
  assert.equal(report.entries.length, 1)
  assert.equal(report.complete, false)
  assert.equal(report.entries[0].bytesVerified, false)
  assert.equal(report.entries[0].rightsVerified, false)
  assert.deepEqual(report.missing, [])
  assert.equal(report.publishable, false)
  assert.equal(buildMediaEvidence(summaries, [row]).evidenceKey, report.evidenceKey)
})
test('media evidence rejects traversal, duplicates, wrong MIME and unexpected paths', () => {
  assert.throws(() => buildMediaEvidence(summaries, [{ ...row, pathname: '/../escape' }]), /identity/)
  assert.throws(() => buildMediaEvidence(summaries, [{ ...row, mime: 'image/svg+xml' as never }]), /MIME/)
  assert.throws(() => buildMediaEvidence(summaries, [row, row]), /Duplicate/)
  const report = buildMediaEvidence(summaries, [{ ...row, pathname: '/images/nte/other.webp' }])
  assert.deepEqual(report.missing, ['/images/nte/hero.webp'])
  assert.deepEqual(report.unexpected, ['/images/nte/other.webp'])
})
test('verified-looking fields require a digest and size, while rights remain independent', () => {
  const verified = buildMediaEvidence(summaries, [{ ...row, sha256: 'a'.repeat(64), bytes: 12, rights: 'verified' }])
  assert.equal(verified.complete, true)
  assert.equal(verified.entries[0].bytesVerified, true)
  assert.equal(verified.entries[0].rightsVerified, true)
  const incomplete = buildMediaEvidence(summaries, [{ ...row, sha256: 'a'.repeat(64), bytes: null }])
  assert.equal(incomplete.complete, false)
})
