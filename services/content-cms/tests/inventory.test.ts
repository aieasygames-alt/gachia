import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { baselineDirectory, checkInventory, collectInventory } from '../scripts/inventory'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const commit = 'a'.repeat(40)

test('current inventory includes shadow readers and preserves historical inputs', () => {
  const old = path.join(root, 'reports/payload-migration-2026-10-28/inventory.json')
  const before = readFileSync(old)
  const inventory = collectInventory(root, commit)
  assert.equal(inventory.scopes.length, 16)
  for (const file of ['apps/web/app/[lang]/page.tsx', 'apps/web/lib/homepage-content.ts',
    'apps/web/lib/genshin-platform-content.ts', 'apps/web/public/data-client/genshin-platform.json',
    'packages/core/genshin-platform.ts', 'packages/data/scripts/main-manifests.mjs', 'scripts/genshin-content-assets.mjs',
    'packages/core/genshin-map.ts', 'apps/router/src/genshin-map.ts', 'apps/web/app/api/map/progress/route.ts',
    'packages/core/vendor/streamparser-json/jsonparser.js']) {
    assert(inventory.sharedCandidates.some(row => row.path === file), `Missing runtime content input: ${file}`)
  }
  for (const game of ['genshin', 'nte']) {
    const scope = inventory.scopes.find(row => row.id === game)!
    assert(scope.appCandidates.some(row => row.path.endsWith('/lib/shadow-reader.ts')))
  }
  const genshin = inventory.scopes.find(row => row.id === 'genshin')!
  for (const file of ['leaflet.js', 'leaflet.css', 'LICENSE', 'leaflet.markercluster.js', 'locate.svg', 'PROVENANCE.md']) {
    assert(genshin.appCandidates.some(row => row.path === `apps/game-genshin/public/_games/genshin/vendor/map-v1/${file}`))
  }
  assert(readFileSync(old).equals(before))
  assert(!baselineDirectory.startsWith('reports/'))
  assert.throws(() => collectInventory(root, 'HEAD'), /Exact/)
})

test('versioned check detects source/addition drift without rewriting any baseline', t => {
  const temp = mkdtempSync(path.join(tmpdir(), 'cms-inventory-'))
  t.after(() => rmSync(temp, { recursive: true, force: true }))
  for (const file of ['packages/core/constants/index.ts', 'packages/core/deployments.ts', 'packages/core/route-ownership.json', 'packages/data/raw-content-review.json']) {
    mkdirSync(path.dirname(path.join(temp, file)), { recursive: true })
    cpSync(path.join(root, file), path.join(temp, file))
  }
  const source = path.join(temp, 'packages/data/games/genshin/raw-guides.json')
  mkdirSync(path.dirname(source), { recursive: true }); writeFileSync(source, '[]\n')
  execFileSync('git', ['init', '-q', temp])
  execFileSync('git', ['add', '.'], { cwd: temp })
  const inventory = collectInventory(temp, commit)
  checkInventory(temp, inventory, false)
  checkInventory(temp, collectInventory(temp, commit), true)
  const current = path.join(temp, baselineDirectory, 'inventory.json'), saved = readFileSync(current)
  assert.throws(() => checkInventory(temp, inventory, false), /already exists/)
  assert(readFileSync(current).equals(saved))
  writeFileSync(source, '[{"id":"changed"}]\n')
  assert.throws(() => checkInventory(temp, collectInventory(temp, commit), true), /Inventory drift/)
  assert(readFileSync(current).equals(saved))
  writeFileSync(source, '[]\n')
  const added = path.join(temp, 'packages/data/games/genshin/raw-extra.json')
  writeFileSync(added, '[]\n')
  assert.throws(() => checkInventory(temp, collectInventory(temp, commit), true), /Inventory drift/)
  assert(readFileSync(current).equals(saved))
  execFileSync('git', ['add', added], { cwd: temp })
  assert.throws(() => checkInventory(temp, collectInventory(temp, commit), true), /Inventory drift/)
  assert(readFileSync(current).equals(saved))
  rmSync(source)
  const deleted = collectInventory(temp, commit)
  assert(!deleted.scopes.find(row => row.id === 'genshin')!.sourceFiles.some(row => row.path.endsWith('/raw-guides.json')))
  assert.throws(() => checkInventory(temp, deleted, true), /Inventory drift/)
  assert(readFileSync(current).equals(saved))
})
