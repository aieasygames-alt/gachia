import assert from 'node:assert/strict'
import test from 'node:test'
import { auditMaterialParity } from '../src/material-parity-audit'

const expected = ['zh', 'en', 'ja'].flatMap(locale => [{ path: `/${locale}/nte/items`, owner: 'nte', locale, kind: 'collection' as const }, { path: `/${locale}/nte/items/ore`, owner: 'main', locale, kind: 'detail' as const }])
test('parity audit separates page set from SEO consumer completeness', () => {
  const observed = expected.map(row => ({ ...row, metadata: true, search: row.kind === 'detail', sitemap: row.kind === 'collection' }))
  const report = auditMaterialParity(expected, observed)
  assert.equal(report.pageSetComplete, true)
  assert.equal(report.metadataSearchSitemapComplete, false)
  assert.ok(report.blockers.includes('search-unverified'))
  assert.equal(report.publishable, false)
})
test('parity audit reports missing, extra and owner drift deterministically', () => {
  const observed = [{ ...expected[0], metadata: true, search: true, sitemap: true }, { ...expected[1], owner: 'nte', metadata: true, search: true, sitemap: true }, { path: '/zh/nte/items/extra', owner: 'main', locale: 'zh', kind: 'detail' as const }]
  const report = auditMaterialParity(expected, observed)
  assert.deepEqual(report.missing, ['/en/nte/items', '/en/nte/items/ore', '/ja/nte/items', '/ja/nte/items/ore'])
  assert.deepEqual(report.extra, ['/zh/nte/items/extra'])
  assert.deepEqual(report.ownerMismatch, [{ path: '/zh/nte/items/ore', expected: 'main', observed: 'nte' }])
  assert.equal(report.pageSetComplete, false)
  assert.ok(report.blockers.includes('owner-mismatch'))
  assert.throws(() => auditMaterialParity([...expected, expected[0]], observed), /Duplicate/)
  assert.throws(() => auditMaterialParity([{ ...expected[0], path: '/../escape' }], []), /Invalid/)
})
