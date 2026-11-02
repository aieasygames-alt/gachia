import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMaterialLinkPreview } from '../src/material-link-policy'
import { buildMaterialSnapshot, verifyMaterialSnapshot } from '../src/material-snapshot'

const material = { dto: { material: { id: 'ore' }, routes: [{ locale: 'zh', path: '/zh/nte/items/ore', owner: 'main', collectionPath: '/zh/nte/items', collectionOwner: 'nte' }, { locale: 'en', path: '/en/nte/items/ore', owner: 'main', collectionPath: '/en/nte/items', collectionOwner: 'nte' }, { locale: 'ja', path: '/ja/nte/items/ore', owner: 'main', collectionPath: '/ja/nte/items', collectionOwner: 'nte' }] }, dtoKey: 'a'.repeat(64), sourceRevision: 'b'.repeat(64) }
const links = buildMaterialLinkPreview('nte', [material], [])
test('typed snapshot binds explicit links and remains non-publishable', () => {
  const snapshot = buildMaterialSnapshot('nte', 'route-policy', [material], links)
  assert.equal(snapshot.snapshotKey.length, 64)
  assert.equal(snapshot.publishable, false)
  assert.equal(snapshot.releaseCompatible, false)
  assert.deepEqual(verifyMaterialSnapshot(snapshot), snapshot)
  assert.deepEqual(verifyMaterialSnapshot({ ...snapshot, materials: [...snapshot.materials].reverse() }), snapshot)
})
test('snapshot rejects tampering, wrong links, missing locales and approval flags', () => {
  const snapshot = buildMaterialSnapshot('nte', 'route-policy', [material], links)
  assert.throws(() => verifyMaterialSnapshot({ ...snapshot, routePolicy: 'other' }), /integrity/)
  assert.throws(() => verifyMaterialSnapshot({ ...snapshot, publishable: true } as never), /flags/)
  assert.throws(() => buildMaterialSnapshot('genshin', 'route-policy', [material], links), /policy/)
  assert.throws(() => buildMaterialSnapshot('nte', 'route-policy', [material], { ...links, pages: links.pages.slice(1) }), /closure/)
})
