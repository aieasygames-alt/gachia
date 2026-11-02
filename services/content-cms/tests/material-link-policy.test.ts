import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMaterialLinkPreview } from '../src/material-link-policy'

const materials = [{ dto: { material: { id: 'ore' }, routes: ['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/nte/items/ore`, owner: locale === 'zh' ? 'main' : 'main', collectionPath: `/${locale}/nte/items`, collectionOwner: 'nte' })) } }]
const characters = [{ eligible: true, dto: { id: 'hero', routes: ['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/nte/characters/hero`, owner: 'nte' })) } }, { eligible: false, dto: { id: 'future', routes: [] } }]

test('link preview emits explicit locale links and never applies fallback', () => {
  const result = buildMaterialLinkPreview('nte', materials, characters)
  assert.equal(result.pages.length, 3)
  assert.equal(result.fallback, 'none')
  assert.equal(result.localePathsExplicit, true)
  assert.deepEqual(result.excludedTargets, ['future'])
  assert.deepEqual(result.missingLocaleLinks, [])
  assert.equal(result.publishable, false)
  assert.equal(result.releaseCompatible, false)
  assert.deepEqual(result.pages[0].links.locales.map(link => link.locale), ['zh', 'en', 'ja'])
  assert.notEqual(buildMaterialLinkPreview('nte', materials, characters).linkKey, buildMaterialLinkPreview('nte', materials, [characters[0]]).linkKey)
})

test('unsafe or incomplete link inputs fail closed', () => {
  assert.throws(() => buildMaterialLinkPreview('nte', [], characters), /requires materials/)
  assert.throws(() => buildMaterialLinkPreview('nte', [...materials, materials[0]], characters), /Duplicate material/)
  assert.throws(() => buildMaterialLinkPreview('nte', materials, [...characters, characters[0]]), /Duplicate character/)
  const missing = [{ dto: { material: { id: 'ore' }, routes: [{ locale: 'zh', path: '', owner: '' }] } }]
  const result = buildMaterialLinkPreview('nte', missing as typeof materials, characters)
  assert.equal(result.missingLocaleLinks.length, 0)
  assert.deepEqual(result.fallback, 'none')
})
