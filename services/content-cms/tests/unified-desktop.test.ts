import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { digest, snapshot } from '../src/legacy-intake'
import { unifiedPlan } from '../src/unified-plan'
import { assertUnifiedDesktopEnvironment, assertUnifiedInstalledApplication, loadUnifiedDesktopPlan, parseUnifiedDesktopArguments,
  readPinnedUnifiedInput, unifiedSelection } from '../src/unified-desktop'
import { readUnifiedSources } from '../src/unified-sources'
import { baselineDirectory } from '../src/inventory-baseline'
import { projectRoot } from '../src/local-environment'

const pin = 'a'.repeat(64)
const args = ['--repo', '/tmp/repo', '--pin', pin, '--selection', '/tmp/selection', '--selection-pin', pin, '--active', '/tmp/active', '--active-pin', pin]
const plan = unifiedPlan([snapshot('hi3', 'packages/data/games/hi3/raw-characters.json', 'raw-json', '[{"id":"one","name":"Original"}]')], ['hi3'])
const key = plan.sources[0].records[0].stableKey

test('desktop actions require complete exact arguments and cannot enable preview or cloud writes', () => {
  assert.equal(parseUnifiedDesktopArguments(['import', '--repo', '/tmp/repo', '--pin', pin, '--scope', 'hi3']).action, 'import')
  assert.equal(parseUnifiedDesktopArguments(['export', ...args]).action, 'export')
  assert.equal(parseUnifiedDesktopArguments(['freeze', ...args, '--commit', 'a'.repeat(40), '--output', '/tmp/new']).action, 'freeze')
  for (const action of ['export', 'freeze']) {
    for (const flag of ['--preview', '--force', '--token', '--url', '--production-ready', '--scope']) {
      assert.throws(() => parseUnifiedDesktopArguments([action, ...args, flag, 'anything']))
    }
  }
  assert.throws(() => parseUnifiedDesktopArguments(['export', ...args, '--pin', pin]), /duplicate/)
  assert.throws(() => parseUnifiedDesktopArguments(['export', ...args.slice(0, -2)]), /Required/)
  assert.throws(() => parseUnifiedDesktopArguments(['export', ...args.slice(0, -1), 'bad']), /SHA-256/)
  assert.throws(() => parseUnifiedDesktopArguments(['freeze', ...args, '--commit', 'HEAD', '--output', '/tmp/new']), /Exact/)
})

test('selection supplies only registered identities, never approval or caller-provided records', () => {
  assert.deepEqual(unifiedSelection({ stableKeys: [key] }, plan), [key])
  for (const input of [{ stableKeys: [] }, { stableKeys: [key, key] }, { stableKeys: ['unified:unknown:one'] },
    { stableKeys: [key], approved: true }, { stableKeys: [key], records: [] }, { stableKeys: [key], productionReady: true }, null]) {
    assert.throws(() => unifiedSelection(input, plan))
  }
})

test('external pinned editorial inputs reject changed bytes and linked paths', t => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-pinned-')))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'selection.json'), text = JSON.stringify({ stableKeys: [key] })
  writeFileSync(file, text)
  assert.deepEqual(readPinnedUnifiedInput(file, digest(text)), { stableKeys: [key] })
  assert.throws(() => readPinnedUnifiedInput(file, pin), /pin/)
  const link = path.join(dir, 'linked.json')
  symlinkSync(file, link)
  assert.throws(() => readPinnedUnifiedInput(link, digest(text)), /Linked/)
})

test('installed reader takes explicit repository input, not the installed application parent', () => {
  const repo = path.resolve(projectRoot, '../..')
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const expected = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const loaded = loadUnifiedDesktopPlan(repo, expected.planSHA256)
  assert.equal(loaded.plan.planSHA256, expected.planSHA256)
  assert.equal(loaded.originals.length, 115)
  assert.deepEqual(loaded.originals.map(row => row.sourcePath).sort(), expected.sources.map(row => row.sourcePath).sort())
  assert.throws(() => loadUnifiedDesktopPlan(repo, pin), /explicitly pin/)
})

test('desktop environment gate rejects local fixtures, editor hosting and CI', () => {
  const secret = 'a'.repeat(48)
  const desktop = { CMS_MODE: 'desktop', PAYLOAD_SECRET: secret, CMS_DATA_DIR: path.join(process.env.HOME!, 'Library/Application Support/GachiaCMS/data'),
    DATABASE_URL: 'postgres://owner:unused@127.0.0.1:54329/gachia_cms', CMS_SERVER_URL: 'http://127.0.0.1:3100' }
  assert.doesNotThrow(() => assertUnifiedDesktopEnvironment(desktop))
  assert.throws(() => assertUnifiedDesktopEnvironment({ ...desktop, CI: 'true' }))
  assert.throws(() => assertUnifiedDesktopEnvironment({ ...desktop, CMS_MODE: 'editor', CMS_SERVER_URL: 'https://editor.invalid' }), /installed desktop/)
  assert.throws(() => assertUnifiedDesktopEnvironment({ CMS_LOCAL_ONLY: '1', PAYLOAD_SECRET: secret }), /installed desktop/)
  assert.throws(() => assertUnifiedDesktopEnvironment({ ...desktop, CMS_DATA_DIR: '/tmp/not-installed' }), /Unexpected/)
})

test('desktop database access refuses the source checkout and non-current staged installations', t => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-installed-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const app = path.join(root, 'releases/current/services/content-cms')
  const other = path.join(root, 'releases/staged/services/content-cms')
  mkdirSync(app, { recursive: true }); mkdirSync(other, { recursive: true })
  writeFileSync(path.join(root, 'settings.json'), JSON.stringify({ app }))
  assert.doesNotThrow(() => assertUnifiedInstalledApplication(root, app))
  assert.throws(() => assertUnifiedInstalledApplication(root, other), /currently installed/)
  assert.throws(() => assertUnifiedInstalledApplication(root, projectRoot), /currently installed/)
})
