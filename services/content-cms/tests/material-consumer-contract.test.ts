import assert from 'node:assert/strict'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { materialConsumerContract, assertMaterialPageConsumer, assertMaterialSearchConsumer, mergeMaterialConsumerExpectations } from '../src/material-consumer-contract'
import { validateUnifiedConsumer } from '../src/unified-owner-build'

const source = (family: string, value: unknown) => {
  const text = JSON.stringify(value)
  return { sourcePath: `packages/data/games/nte/raw-${family}.json`, text, sha256: digest(text) }
}
const inputs = [source('materials', [{ id: 'ore', name: '矿石', nameEn: 'Ore & crystal', type: 'ore', rarity: 1 }]),
  source('characters', [{ id: 'zero-male' }, { id: 'zero-female' }]), source('character-materials', [{ characterId: 'zero',
    levelingMaterials: [{ levelRange: '41-50', materials: [{ id: 'ore', quantity: 4 }] }], skillMaterials: [] }])]

test('material consumer contracts derive every locale page, canonical reverse link and search entry from one source', () => {
  const contract = materialConsumerContract('nte', inputs)
  assert.equal(contract.pages.length, 6)
  const page = contract.pages.find(row => row.path === '/en/nte/items/ore')!
  assert.equal(page.owner, 'nte')
  assert.deepEqual(page.links, ['/en/nte/items', '/en/nte/characters/zero-male', '/en/nte/characters/zero-female'])
  assert.deepEqual(contract.search.en, [{ id: 'ore', name: 'Ore & crystal', nameAlt: '矿石' }])
  assert.equal(contract.productionQualified, false)
  assert.equal(contract.pages.find(row => row.path === '/ja/nte/items')!.indexable, false)
  assert.equal(contract.pages.find(row => row.path === '/ja/nte/items/ore')!.indexable, true)
})

test('a name in Flight/metadata cannot satisfy the visible page assertion, and missing reverse links fail', () => {
  const page = materialConsumerContract('nte', inputs).pages.find(row => row.path === '/en/nte/items/ore')!
  const html = '<link rel="canonical" href="https://gachia.com/en/nte/items/ore"/><main><h1>Ore &amp; crystal</h1>'
    + page.links.map(link => `<a href="${link}">link</a>`).join('') + '</main>'
  assert.doesNotThrow(() => assertMaterialPageConsumer(page, 200, html))
  assert.throws(() => assertMaterialPageConsumer(page, 200, html.replace('<h1>Ore &amp; crystal</h1>', '<h1>Old name</h1><script>Ore &amp; crystal</script>')), /rendered name/)
  assert.throws(() => assertMaterialPageConsumer(page, 200, html.replace('/en/nte/characters/zero-female', '/en/nte/characters/zero')), /consumer link/)
  assert.throws(() => assertMaterialPageConsumer(page, 200, html.replace('gachia.com/en', 'gachia.com/zh')), /canonical drift/)
  assert.throws(() => assertMaterialPageConsumer(page, 200, '<meta name="robots" content="noindex"/>' + html), /noindex/)
})

test('global search must expose the exact material projection; missing scopes and stale names fail', () => {
  const contract = materialConsumerContract('nte', inputs)
  assert.doesNotThrow(() => assertMaterialSearchConsumer(contract, 'en', { nte: { items: contract.search.en } }))
  assert.throws(() => assertMaterialSearchConsumer(contract, 'en', {}), /Missing material search/)
  assert.throws(() => assertMaterialSearchConsumer(contract, 'en', { nte: { items: [{ id: 'ore', name: 'old' }] } }), /projection drift/)
})

test('owner build assertions cannot omit or replace source-derived material pages and metadata', () => {
  const contracts = [materialConsumerContract('nte', inputs)]
  const expectations = mergeMaterialConsumerExpectations([], contracts)
  assert.equal(expectations.length, 6)
  assert.deepEqual(mergeMaterialConsumerExpectations(expectations, contracts), expectations)
  const row = expectations.find(row => row.path === '/en/nte/items/ore')!
  assert.throws(() => mergeMaterialConsumerExpectations([{ ...row, status: 404 }], contracts), /status/)
  assert.throws(() => mergeMaterialConsumerExpectations([{ ...row, materialPage: { ...row.materialPage!, name: 'replaced' } }], contracts), /source-derived/)
  const html = '<link rel="canonical" href="https://gachia.com/en/nte/items/ore"/><main><h1>Ore &amp; crystal</h1>'
    + row.materialPage!.links.map(link => `<a href="${link}">link</a>`).join('') + '</main>'
  const response = { status: 200, headers: new Headers({ 'content-type': 'text/html' }) }
  assert.doesNotThrow(() => validateUnifiedConsumer(response, Buffer.from(html), row))
  assert.throws(() => validateUnifiedConsumer(response, Buffer.from(html.replace('gachia.com/en', 'gachia.com/zh')), row), /canonical drift/)
})
