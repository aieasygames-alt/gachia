import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { readUnifiedSources, readSourceValue } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { freezeUnifiedContent, unifiedOwnerPlan, unifiedTree, verifyUnifiedFrozenSource } from '../src/unified-build'
import { objectValue, type JSONValue } from '../src/unified-content'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
const temporary = (prefix: string) => mkdtempSync(path.join(realpathSync(os.tmpdir()), prefix))
const originalSources = () => plan.sources.map(source => {
  const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
  return { sourcePath: source.sourcePath, text, sha256: digest(text) }
})
const recordAt = (sourcePath: string) => structuredClone(plan.sources.find(source => source.sourcePath === sourcePath)!.records[0])
const updateField = (value: JSONValue, field: string, edited: JSONValue) => {
  assert(objectValue(value))
  return { ...value, [field]: edited }
}

test('all technical scopes map to Main and the declared independent owners, including preservation-only overlays', () => {
  const ownership = JSON.parse(readFileSync(path.join(repo, 'packages/core/route-ownership.json'), 'utf8'))
  for (const game of plan.games) {
    const source = plan.sources.find(source => source.game === game)!
    const scope = unifiedOwnerPlan([source.sourcePath], plan, ownership)
    assert.deepEqual(scope.owners, Object.hasOwn(ownership.games, game) ? [game, 'main'] : ['main'])
  }
  assert.deepEqual(unifiedOwnerPlan(['packages/data/games/hi3/raw-characters.json', 'packages/data/games/genshin/raw-guides.json'], plan, ownership).owners, ['genshin', 'main'])
  assert.throws(() => unifiedOwnerPlan(['packages/data/games/unknown/raw-characters.json'], plan, ownership), /Unregistered/)
})

test('frozen tree receipts hash binary media bytes without UTF-8 replacement', () => {
  const directory = temporary('gachia-unified-tree-')
  try {
    const bytes = Buffer.from([0xff, 0xfe, 0x00, 0x01])
    writeFileSync(path.join(directory, 'image.webp'), bytes)
    assert.equal(unifiedTree(directory)[0].sha256, createHash('sha256').update(bytes).digest('hex'))
    assert.notEqual(unifiedTree(directory)[0].sha256, digest(bytes.toString()))
    symlinkSync(path.join(directory, 'image.webp'), path.join(directory, 'linked.webp'))
    assert.throws(() => unifiedTree(directory), /Linked/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('freeze rejects no-op, incomplete public A, foreign records, and floating commits before creating output', () => {
  const directory = temporary('gachia-unified-rejected-')
  const output = path.join(directory, 'output'), record = recordAt('packages/data/games/hi3/raw-characters.json')
  const input = { repo, commit, directory: output, plan, records: [record], activeSources: originalSources(), preview: true }
  try {
    assert.throws(() => freezeUnifiedContent({ ...input, commit: 'HEAD' }), /exact source commit/)
    assert.throws(() => freezeUnifiedContent(input), /No new editorial changes/)
    assert.throws(() => freezeUnifiedContent({ ...input, activeSources: input.activeSources.slice(1) }), /Complete public baseline/)
    assert.throws(() => freezeUnifiedContent({ ...input, records: [{ ...record, stableKey: 'foreign' }] }), /outside the pinned plan/)
    assert.equal(existsSync(output), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('real 115-source freeze projects CMS raw and literal edits to mirrors, summaries, search and client payloads while preserving public-only guides', context => {
  const directory = temporary('gachia-unified-freeze-')
  const genshin = recordAt('packages/data/games/genshin/raw-characters.json')
  const hi3 = recordAt('packages/data/games/hi3/raw-characters.json')
  const roco = recordAt('packages/data/games/roco-cn/raw-characters.json')
  const azur = recordAt('packages/data/games/azur-promilia/raw-characters.json')
  const lvmeng = recordAt('apps/game-lvmeng/lib/data.ts')
  genshin.structuredValue = updateField(genshin.structuredValue, 'name', 'Isolated Genshin fixture')
  hi3.structuredValue = updateField(hi3.structuredValue, 'name', 'Isolated HI3 fixture')
  roco.structuredValue = updateField(roco.structuredValue, 'name', 'Isolated Roco fixture')
  azur.structuredValue = updateField(azur.structuredValue, 'name', 'Isolated Azur fixture')
  lvmeng.structuredValue = updateField(lvmeng.structuredValue, 'version', 'Isolated literal fixture')
  const active = originalSources()
  const guides = active.find(source => source.sourcePath === 'packages/data/games/genshin/raw-guides.json')!
  const rows = JSON.parse(guides.text)
  rows.push({ ...rows[0], id: 'cms-public-only-isolated-fixture', title: 'Public-only fixture, never publish' })
  guides.text = JSON.stringify(rows, null, 2) + '\n'; guides.sha256 = digest(guides.text)
  const untouched = active.find(source => source.sourcePath === 'packages/data/games/nte/raw-guides.json')!
  const originalHI3 = readFileSync(path.join(repo, hi3.sourceRecord.sourcePath), 'utf8')
  try {
    const result = freezeUnifiedContent({ repo, commit, directory: path.join(directory, 'frozen'), plan,
      records: [genshin, hi3, roco, azur, lvmeng], activeSources: active, preview: true })
    assert.deepEqual(result.owners, ['azur-promilia', 'genshin', 'lvmeng', 'main'])
    assert.equal(result.candidate.baselines.length, 115)
    assert.equal(result.sourceAuthentication, 'not_required_by_operator')
    assert.equal(result.publicationPolicy.publicSourceAttestationRequired, false)
    assert.equal(result.productionReady, false)
    assert.equal(result.activationSupported, false)
    assert.equal(result.cloudWrites, false)
    const read = (relative: string) => readFileSync(path.join(result.workspace, relative), 'utf8')
    const rowsAt = (relative: string) => JSON.parse(read(relative)) as Record<string, unknown>[]
    for (const [game, name] of [['genshin', 'Isolated Genshin fixture'], ['hi3', 'Isolated HI3 fixture'], ['roco-cn', 'Isolated Roco fixture']]) {
      assert.equal(rowsAt(`packages/data/games/${game}/raw-characters.json`)[0].name, name)
      assert.equal(rowsAt(`apps/web/public/data/${game}/raw-characters.json`)[0].name, name)
      if (game !== 'roco-cn') assert.equal(JSON.parse(read('apps/web/public/data-manifest/search-zh.json'))[game].characters[0].name, name)
    }
    assert.equal(rowsAt('packages/data/games/genshin/raw-character-summaries.json')[0].name, 'Isolated Genshin fixture')
    assert.equal(rowsAt('packages/data/games/azur-promilia/raw-characters.json')[0].name, 'Isolated Azur fixture')
    assert(read('packages/data/games/azur-promilia/characters.ts').includes('character.name = { zh: row.name, en: row.nameEn, ja: row.nameJa };'))
    assert.equal(rowsAt('apps/web/public/data-client/tier-list-genshin.json')[0].name, 'Isolated Genshin fixture')
    assert.equal(rowsAt('apps/web/public/data-client/roco-cn/characters.json')[0].name, 'Isolated Roco fixture')
    const rocoId = (roco.sourceRecord.original as { id: string }).id
    assert.equal(JSON.parse(read(`apps/web/public/data-client/roco-cn/characters/${rocoId}.json`)).name, 'Isolated Roco fixture')
    const literal = readSourceValue(read('apps/game-lvmeng/lib/data.ts'), 'apps/game-lvmeng/lib/data.ts', lvmeng.sourceRecord.locator)
    assert(objectValue(literal)); assert.equal(literal.version, 'Isolated literal fixture')
    assert.equal(read(guides.sourcePath), guides.text)
    assert.equal(read('apps/web/public/data/genshin/raw-guides.json'), guides.text)
    assert.equal(read(untouched.sourcePath), untouched.text)
    assert.equal(read('apps/web/public/data/nte/raw-guides.json'), untouched.text)
    assert.equal(digest(readFileSync(path.join(result.directory, 'manifest.json'), 'utf8')), result.manifestPin)
    assert.equal(verifyUnifiedFrozenSource(result.directory, result.manifestPin).sourceTreeSHA256, result.sourceTreeSHA256)
    assert.throws(() => verifyUnifiedFrozenSource(result.directory, '0'.repeat(64)), /manifest changed/)
    const source = path.join(result.workspace, hi3.sourceRecord.sourcePath), saved = readFileSync(source)
    writeFileSync(source, '[]')
    assert.throws(() => verifyUnifiedFrozenSource(result.directory, result.manifestPin), /source files changed/)
    writeFileSync(source, saved)
    const activeFile = path.join(result.directory, 'active/0.source'), activeBytes = readFileSync(activeFile)
    writeFileSync(activeFile, '[]')
    assert.throws(() => verifyUnifiedFrozenSource(result.directory, result.manifestPin), /Active source bytes changed/)
    writeFileSync(activeFile, activeBytes)
    verifyUnifiedFrozenSource(result.directory, result.manifestPin)
    assert.throws(() => freezeUnifiedContent({ repo, commit, directory: result.directory, plan,
      records: [genshin], activeSources: active, preview: true }), /EEXIST/)
    assert.equal(readFileSync(path.join(repo, hi3.sourceRecord.sourcePath), 'utf8'), originalHI3)
    context.diagnostic(JSON.stringify({ sourceFiles: result.candidate.baselines.length, editedRecords: result.candidate.changed.length,
      frozenFiles: unifiedTree(result.workspace).length, projectedFiles: result.modified.length, owners: result.owners,
      productionReady: false, disposableSourceRemovedAfterTest: true }))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('active-only character summary drift fails closed instead of being erased by regeneration', () => {
  const directory = temporary('gachia-unified-summary-drift-'), output = path.join(directory, 'frozen')
  const record = recordAt('packages/data/games/hi3/raw-characters.json')
  record.structuredValue = updateField(record.structuredValue, 'name', 'Isolated fixture')
  const active = originalSources(), summary = active.find(source => source.sourcePath === 'packages/data/games/genshin/raw-character-summaries.json')!
  const rows = JSON.parse(summary.text)
  rows[0].name = 'Independent public change that characters do not contain'
  summary.text = JSON.stringify(rows); summary.sha256 = digest(summary.text)
  try {
    assert.throws(() => freezeUnifiedContent({ repo, commit, directory: output, plan, records: [record], activeSources: active, preview: true }), /Active summary differs/)
    assert.equal(existsSync(path.join(output, 'manifest.json')), false)
    assert.equal(JSON.parse(readFileSync(path.join(output, 'failure.json'), 'utf8')).cloudWrites, false)
    assert.equal(existsSync(path.join(output, 'source.tar')), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
