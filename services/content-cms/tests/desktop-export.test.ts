import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { exportDesktopGuides } from '../src/desktop-export'
import { parseDesktopContentArguments } from '../src/desktop-guides'

const original = { id: 'one', title: 'O', image: '/keep.webp' }, text = JSON.stringify([original])
const record = { legacyId: 'one', stableKey: 'genshin:guides:one', sourceRecord: original, hold: false, _status: 'published', title: { zh: 'A' } }
test('successive exports preserve O provenance and distinguish A/B and rehearsal identity', () => {
  const a = exportDesktopGuides(text, 'genshin', [record], false)
  const b = exportDesktopGuides(text, 'genshin', [{ ...record, title: { zh: 'B' } }], false)
  assert.equal(a.manifest.sourceSHA256, b.manifest.sourceSHA256)
  assert.notEqual(a.manifest.releaseKey, b.manifest.releaseKey)
  assert.equal(JSON.parse(b.content)[0].image, original.image)
  const rehearsal = exportDesktopGuides(text, 'genshin', [record], true)
  assert.equal(rehearsal.content, a.content); assert.notEqual(rehearsal.manifest.releaseKey, a.manifest.releaseKey)
})
test('export rejects missing approval, duplicates and source rebase drift', () => {
  for (const rows of [[], [record, record], [{ ...record, hold: true }], [{ ...record, _status: 'draft' }], [{ ...record, sourceRecord: { ...original, title: 'A' } }]]) {
    assert.throws(() => exportDesktopGuides(text, 'genshin', rows, false))
  }
})

test('content CLI accepts only exact import/export arguments and never treats import preview as a write', () => {
  assert.deepEqual(parseDesktopContentArguments(['import', '/tmp/repo path', 'genshin']), { action: 'import', repo: '/tmp/repo path', game: 'genshin', preview: false })
  assert.deepEqual(parseDesktopContentArguments(['export', '/tmp/repo', 'nte', '--preview']), { action: 'export', repo: '/tmp/repo', game: 'nte', preview: true })
  for (const args of [['import', '/tmp/repo', 'genshin', '--preview'], ['export', '/tmp/repo', 'nte', '--preview', '--force'],
    ['export', '/tmp/repo', 'nte', 'unknown'], ['import', '/tmp/repo', 'other'], ['export', '', 'genshin']]) {
    assert.throws(() => parseDesktopContentArguments(args), /Usage/)
  }
})

test('direct content CLI rejects import preview and surplus arguments before resolving a database environment', () => {
  for (const args of [['import', '/tmp/unused', 'genshin', '--preview'], ['export', '/tmp/unused', 'nte', '--preview', '--force']]) {
    const child = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/desktop-content.ts', ...args], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', env: { ...process.env, CI: 'true', CMS_MODE: 'invalid' },
    })
    assert.equal(child.status, 1); assert.match(child.stderr, /Usage: desktop-content/)
    assert(!child.stderr.includes('Only the installed desktop'))
  }
})
