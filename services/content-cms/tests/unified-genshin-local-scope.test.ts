import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { objectValue, type UnifiedRecord } from '../src/unified-content'
import { exportUnifiedContent } from '../src/unified-export'
import { GENSHIN_LOCAL_SCOPE, genshinLocalOwnerScope } from '../src/unified-genshin-local-scope'
import { unifiedPlan } from '../src/unified-plan'
import { readUnifiedSources } from '../src/unified-sources'
import { freezeUnifiedContent } from '../src/unified-build'
import { buildUnifiedOwners } from '../src/unified-owner-build'
import { GiB } from '../../../scripts/desktop-disk-preflight.mjs'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const originals = plan.sources.map(source => {
  const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
  return { sourcePath: source.sourcePath, text, sha256: digest(text) }
})
const record = (game = 'genshin', id = 'hu-tao', field = 'nameEn') => {
  const records = plan.sources.find(source => source.sourcePath === `packages/data/games/${game}/raw-characters.json`)!.records
  const row = structuredClone(records.find(row => row.sourceRecord.locator.identity?.id === id) ?? records[0])
  assert(objectValue(row.structuredValue))
  row.structuredValue[field] = 'Isolated local-only preview'
  return row
}
const candidate = (records: UnifiedRecord[], active = originals) => exportUnifiedContent(records, originals, active, true)
const scope = (result: ReturnType<typeof candidate>, active = originals) => genshinLocalOwnerScope(result.manifest, active,
  result.files.map(row => ({ sourcePath: row.sourcePath, text: row.content, sha256: row.candidateSHA256 })))

test('Genshin-only scope is a bounded explicit preview, not a new default owner policy', () => {
  const result = candidate([record()])
  assert.deepEqual(scope(result), { games: ['genshin'], owners: ['genshin'], services: ['gachia-game-genshin'], localScope: GENSHIN_LOCAL_SCOPE })
  assert.throws(() => scope({ ...result, manifest: { ...result.manifest, preview: false } }), /requires a local preview/)
  assert.throws(() => scope({ ...result, manifest: { ...result.manifest, changed: [] } }), /one editorial record/)
  assert.throws(() => scope(candidate([record('genshin', 'hu-tao', 'name')])), /witnessed English name/)
  assert.throws(() => scope(candidate([record('genshin', 'amber')])), /Hu Tao readback case/)
  const extraField = record()
  assert(objectValue(extraField.structuredValue)); extraField.structuredValue.name = 'Second field'
  assert.throws(() => scope(candidate([extraField])), /witnessed English name/)
  assert.throws(() => scope(candidate([record(), record('genshin', 'amber')])), /one editorial record/)
  assert.throws(() => scope(candidate([record(), record('hi3')])), /one editorial record/)
  assert.throws(() => scope(candidate([record('nte')])), /only the character source overlay/)
  assert.throws(() => genshinLocalOwnerScope(result.manifest, originals,
    [{ sourcePath: result.files[0].sourcePath, text: '[]', sha256: result.files[0].candidateSHA256 }]), /corrupt character baseline/)
})

test('single-owner preview cannot silently discard public-only preservation deltas from any game', () => {
  const active = structuredClone(originals)
  const other = active.find(row => row.sourcePath === 'packages/data/games/hi3/raw-guides.json')!
  const rows = JSON.parse(other.text)
  rows.push({ ...rows[0], id: 'public-only-isolated-fixture', title: 'Public-only preserved guide' })
  other.text = JSON.stringify(rows, null, 2) + '\n'; other.sha256 = digest(other.text)
  const result = candidate([record()], active)
  assert.equal(result.files.length, 2)
  assert.throws(() => scope(result, active), /cannot omit public preservation deltas/)
})

test('CLI refuses single-owner intent outside freeze-local preview before opening any CMS database', () => {
  for (const args of [['plan', '--genshin-only-local'], ['export-local', '--preview', '--genshin-only-local'],
    ['freeze-local', '--genshin-only-local', '--commit', 'a'.repeat(40), '--active', '/not-read.json', '--output', '/not-created']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/unified-content.ts', ...args], { cwd: projectRoot, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Arguments do not match action/)
  }
})

test('explicit Genshin local preview may fetch locked dependencies without enabling scripts or production', async () => {
  const directory = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'genshin-locked-dependencies-'))
  try {
    const frozen = freezeUnifiedContent({ repo, directory: path.join(directory, 'build'),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
      plan, records: [record()], activeSources: originals, preview: true, localScope: GENSHIN_LOCAL_SCOPE })
    let calls = 0
    await assert.rejects(buildUnifiedOwners(frozen.directory, frozen.manifestPin, [], {
      allowNetworkInstall: true, diskProbe: () => ({ filesystem: directory, availableBytes: 20 * GiB }),
      execute: async (file, args, { env }) => {
        calls++
        assert.equal(file, 'pnpm')
        assert.deepEqual(args.slice(0, 4), ['install', '--frozen-lockfile', '--ignore-scripts', '--prod=false'])
        assert(!args.includes('--offline')); assert(args.includes('--store-dir'))
        assert.equal(env.CLOUDFLARE_API_TOKEN, undefined)
        assert.equal(env.npm_config_manage_package_manager_versions, 'false')
        throw new Error('Stop after checking explicit locked install')
      },
    }), /Stop after checking explicit locked install/)
    assert.equal(calls, 1)
    assert.equal(existsSync(path.join(frozen.directory, 'build.json')), false)
    const state = JSON.parse(readFileSync(path.join(frozen.directory, 'build-state.json'), 'utf8'))
    assert.equal(state.cloudWrites, false); assert.equal(state.status, 'failed')
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
