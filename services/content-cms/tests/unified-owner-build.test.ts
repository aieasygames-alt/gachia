import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { buildUnifiedOwners, ownerBuildTarget, validateConsumerExpectations, validateUnifiedConsumer, verifyUnifiedOwnerBuild } from '../src/unified-owner-build'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { freezeUnifiedContent } from '../src/unified-build'
import { digest } from '../src/legacy-intake'
import { objectValue } from '../src/unified-content'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'

const repo = path.resolve(projectRoot, '../..')
for (const owner of ['genshin', 'nte', 'lvmeng', 'azur-promilia', 'main']) test(`${owner} builds the correct production configuration, not a default preview`, () => {
  const app = owner === 'main' ? 'web' : `game-${owner}`
  const target = ownerBuildTarget(owner, readFileSync(path.join(repo, 'apps', app, 'wrangler.jsonc'), 'utf8'))
  assert.equal(target.service, owner === 'main' ? 'gachia' : `gachia-game-${owner}`)
  assert.equal(target.environment, owner === 'lvmeng' ? 'production' : '')
  assert.equal(target.mode, owner === 'nte' ? 'live' : 'production')
})
test('all owner consumers need explicit edited-value assertions, with no foreign routes or owners', () => {
  const rows = [{ owner: 'main', path: '/zh/hi3/characters', status: 200, contains: ['Isolated content'] },
    { owner: 'lvmeng', path: '/zh/lvmeng/version', status: 200, contains: ['Isolated version'] }]
  assert.doesNotThrow(() => validateConsumerExpectations(['main', 'lvmeng'], rows))
  assert.throws(() => validateConsumerExpectations(['main', 'lvmeng'], rows.slice(0, 1)), /Missing/)
  for (const replacement of [{ ...rows[1], path: '/zh/nte/characters' }, { ...rows[1], contains: [] },
    { ...rows[1], path: '//external/zh' }, { ...rows[1], owner: 'router' }, { ...rows[1], status: 404 }]) {
    assert.throws(() => validateConsumerExpectations(['main', 'lvmeng'], [rows[0], replacement]))
  }
  assert.throws(() => ownerBuildTarget('router', '{}'), /Unknown/)
})

test('consumer acceptance requires edited HTML in main content, correct MIME and no cookies', () => {
  const row = { owner: 'main', path: '/zh/hi3/characters/fixture', status: 200, contains: ['Approved fixture'] }
  const response = { status: 200, headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }) }
  const body = Buffer.from('<html><main><h1>Approved fixture</h1></main></html>')
  assert.doesNotThrow(() => validateUnifiedConsumer(response, body, row))
  assert.throws(() => validateUnifiedConsumer(response, Buffer.from('<title>Approved fixture</title><main>Old content</main>'), row), /Edited value missing/)
  assert.throws(() => validateUnifiedConsumer({ ...response, headers: new Headers({ 'content-type': 'text/html', 'set-cookie': 'session=bad' }) }, body, row), /cookie/)
  assert.throws(() => validateUnifiedConsumer({ ...response, headers: new Headers({ 'content-type': 'application/json' }) }, body, row), /HTML/)
  assert.throws(() => validateUnifiedConsumer({ ...response, status: 404 }, body, row), /HTTP/)
})

test('failed actual frozen builds are recorded and cannot be retried or mistaken for complete acceptance', async () => {
  const directory = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'unified-owner-rejected-'))
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const record = structuredClone(plan.sources.find(row => row.sourcePath === 'packages/data/games/hi3/raw-characters.json')!.records[0])
  assert(objectValue(record.structuredValue)); record.structuredValue.name = 'Unpublished owner failure fixture'
  const active = plan.sources.map(source => {
    const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  try {
    const frozen = freezeUnifiedContent({ repo, directory: path.join(directory, 'frozen'),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), plan,
      records: [record], activeSources: active, preview: true })
    assert(!frozen.stages.includes('cms:project-azur-existing-raw-names-v1'), 'Unedited source-only names must not expand the build scope')
    const expectations = [{ owner: 'main', path: '/zh/hi3/characters', status: 200, contains: ['Unpublished owner failure fixture'] }]
    let calls = 0
    const execute = async (_file: string, _args: string[], options: { env: NodeJS.ProcessEnv }) => {
      calls++
      assert.equal(options.env.CI, 'true')
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined)
      assert.equal(options.env.DATABASE_URL, undefined)
      throw new Error('Controlled offline install failure')
    }
    await assert.rejects(buildUnifiedOwners(frozen.directory, frozen.manifestPin, expectations, { execute }), /Controlled offline/)
    const state = JSON.parse(readFileSync(path.join(frozen.directory, 'build-state.json'), 'utf8'))
    assert.equal(state.status, 'failed'); assert.equal(state.cloudWrites, false)
    assert.equal(existsSync(path.join(frozen.directory, 'build.json')), false)
    assert.throws(() => verifyUnifiedOwnerBuild(frozen.directory, '0'.repeat(64)), /ENOENT/)
    await assert.rejects(buildUnifiedOwners(frozen.directory, frozen.manifestPin, expectations, { execute }), /EEXIST/)
    assert.equal(calls, 1, 'A second attempt must not restart a failed run')
    assert.equal(existsSync(path.join(frozen.directory, 'operation.lock')), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('build reread binds every source, artifact, response and owner and rejects incomplete or tampered receipts', () => {
  const directory = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'unified-owner-evidence-'))
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const record = structuredClone(plan.sources.find(row => row.sourcePath === 'packages/data/games/hi3/raw-characters.json')!.records[0])
  assert(objectValue(record.structuredValue)); record.structuredValue.name = 'Local evidence fixture'
  const active = plan.sources.map(source => {
    const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  try {
    const frozen = freezeUnifiedContent({ repo, directory: path.join(directory, 'frozen'),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), plan,
      records: [record], activeSources: active, preview: true })
    const root = frozen.directory
    const write = (relative: string, text: string) => {
      mkdirSync(path.dirname(path.join(root, relative)), { recursive: true })
      writeFileSync(path.join(root, relative), text)
      return digest(text)
    }
    const save = (relative: string, value: unknown) => write(relative, JSON.stringify(value, null, 2) + '\n')
    write('artifacts/main/worker.js', 'export default {}')
    write('artifacts/main/.build/open-next.config.edge.mjs', 'export default {}')
    write('artifacts/main/assets/BUILD_ID', 'unit-fixture-not-a-real-build')
    const expectations = [{ owner: 'main', path: '/zh/hi3/characters/fixture', status: 200, contains: ['Local evidence fixture'] }]
    const responses = [
      { path: expectations[0].path, status: 200, mime: 'text/html', text: '<main><h1>Local evidence fixture</h1></main>' },
      { path: '/sitemap.xml', status: 200, mime: 'application/xml', text: '<urlset />' },
      { path: '/robots.txt', status: 200, mime: 'text/plain', text: 'User-agent: *\n' },
      { path: '/api/auth/get-session', status: 404, mime: 'application/json', text: '{"code":"ACCOUNT_FEATURES_DISABLED"}' },
    ]
    const files = JSON.parse(readFileSync(path.join(root, 'files.json'), 'utf8')) as { path: string; sha256: string }[]
    for (const file of files.filter(row => /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path))) {
      const relative = file.path.slice('apps/web/public/'.length)
      const text = readFileSync(path.join(frozen.workspace, file.path), 'utf8')
      write(`artifacts/main/assets/${relative}`, text)
      responses.push({ path: '/' + relative, status: 200, mime: 'application/json', text })
    }
    const refs = responses.map((response, index) => {
      const bodyFile = `${index}.body`
      const sha256 = write(`main-http/${bodyFile}`, response.text)
      return { path: response.path, status: response.status, headers: { 'content-type': response.mime },
        bytes: Buffer.byteLength(response.text), sha256, bodyFile }
    })
    const owners = { main: { status: 'built_and_locally_accepted',
      artifactSHA256: save('main-artifact.json', artifactFiles(path.join(root, 'artifacts/main'))),
      referencesPin: save('main-http/references.json', refs), responses: refs.length } }
    const state = { status: 'all_owners_built_and_locally_accepted', owners, cloudWrites: false }
    save('build-state.json', state)
    const receipt = { schemaVersion: 1, kind: 'unified_owner_build', frozenPin: frozen.manifestPin,
      sourceTreeSHA256: frozen.sourceTreeSHA256, candidateSHA256: frozen.candidate.candidateSHA256,
      publicationPolicy: frozen.publicationPolicy, owners, expectationsPin: save('consumer-expectations.json', expectations),
      preview: true, productionReady: false, cloudWrites: false, pending: ['unit fixture only'] }
    const buildPin = save('build.json', receipt)
    assert.equal(verifyUnifiedOwnerBuild(root, buildPin).receipt.preview, true)
    assert.throws(() => verifyUnifiedOwnerBuild(root, '0'.repeat(64)), /evidence changed/)
    const body = readFileSync(path.join(root, 'main-http/0.body'), 'utf8')
    write('main-http/0.body', body + 'tampered')
    assert.throws(() => verifyUnifiedOwnerBuild(root, buildPin), /AssertionError/)
    write('main-http/0.body', body)
    save('build-state.json', { ...state, status: 'failed' })
    assert.throws(() => verifyUnifiedOwnerBuild(root, buildPin), /Partial or failed/)
    save('build-state.json', state)
    const incompletePin = save('build.json', { ...receipt, owners: {} })
    assert.throws(() => verifyUnifiedOwnerBuild(root, incompletePin), /Incomplete owner/)
    save('build.json', receipt)
    write('artifacts/main/worker.js', 'export default { changed: true }')
    assert.throws(() => verifyUnifiedOwnerBuild(root, buildPin), /Owner artifact changed/)
    write('artifacts/main/worker.js', 'export default {}')
    verifyUnifiedOwnerBuild(root, buildPin)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
