import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMaterialLinkPreview } from '../src/material-link-policy'
import { buildMediaEvidence } from '../src/media-evidence'
import { buildCompleteMaterialSnapshot, verifyCompleteMaterialSnapshot } from '../src/material-complete-snapshot'

const material = { dto: { material: { id: 'ore' }, routes: ['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/nte/items/ore`, owner: 'main', collectionPath: `/${locale}/nte/items`, collectionOwner: 'nte' })) }, dtoKey: 'a'.repeat(64), sourceRevision: 'b'.repeat(64) }
const character = { eligible: true, dto: { id: 'hero', routes: [], image: { pathname: '/images/characters/hero.webp', url: 'https://img.gachia.com/images/characters/hero.webp' } }, dtoKey: 'c'.repeat(64), media: { bytesVerified: true, rightsVerified: true } }
const links = buildMaterialLinkPreview('nte', [material], [character])
const media = buildMediaEvidence([character], [{ pathname: '/images/characters/hero.webp', sha256: 'd'.repeat(64), bytes: 10, mime: 'image/webp', rights: 'verified', sourcePointer: '/characters/0/image' }])
test('complete snapshot binds material, character, links and verified media while staying non-publishable', () => {
  const snapshot = buildCompleteMaterialSnapshot('nte', 'route-policy', [material], [character], links, media)
  assert.equal(snapshot.snapshotKey.length, 64)
  assert.equal(snapshot.publishable, false)
  assert.equal(snapshot.releaseCompatible, false)
  assert.deepEqual(verifyCompleteMaterialSnapshot(snapshot), snapshot)
  assert.deepEqual(verifyCompleteMaterialSnapshot({ ...snapshot, materials: [...snapshot.materials].reverse() }), snapshot)
})
test('complete snapshot fails closed for missing evidence, changed links and forged flags', () => {
  assert.throws(() => buildCompleteMaterialSnapshot('nte', 'route-policy', [material], [character], links, { ...media, complete: false }), /media evidence/)
  assert.throws(() => buildCompleteMaterialSnapshot('nte', 'route-policy', [material], [character], { ...links, fallback: 'zh' } as never, media), /link policy/)
  const snapshot = buildCompleteMaterialSnapshot('nte', 'route-policy', [material], [character], links, media)
  assert.throws(() => verifyCompleteMaterialSnapshot({ ...snapshot, publishable: true } as never), /flags/)
  assert.throws(() => verifyCompleteMaterialSnapshot({ ...snapshot, routePolicy: 'changed' }), /integrity/)
})
