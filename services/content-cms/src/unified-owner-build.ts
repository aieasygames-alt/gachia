import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertDiskBudget, BUILD_TEMP_BUDGET, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { artifactFiles, isolatedEnvironment, withLocalWorker, withRunLock } from '../../../scripts/desktop-publish.mjs'
import { PRODUCTION_TARGETS } from '../../../scripts/production-release.mjs'
import { liveOwnerConfig } from '../../../scripts/live-owner-artifact.mjs'
import { parseWrangler } from '../../../scripts/game-release.mjs'
import { boundedBody } from '../../../scripts/desktop-version-preview.mjs'
import { digest } from './legacy-intake'
import { verifyUnifiedFrozenSource } from './unified-build'

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const bytesSHA = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
type CommandOptions = { cwd: string; env: NodeJS.ProcessEnv; log: string }
type Execute = (file: string, args: string[], options: CommandOptions) => Promise<void>
export type ConsumerExpectation = { owner: string; path: string; status: number; contains?: string[] }
type PublicFile = { path: string; sha256: string }
type ResponseReference = { path: string; status: number; headers: Record<string, string>; bytes: number; sha256: string; bodyFile: string }
type OwnerResult = { status: string; artifactSHA256?: string; responses?: number; referencesPin?: string }
type BuildReceipt = { schemaVersion: number; kind: string; frozenPin: string; sourceTreeSHA256: string;
  candidateSHA256: string; publicationPolicy: unknown; owners: Record<string, OwnerResult>; expectationsPin: string;
  preview: boolean; productionReady: boolean; cloudWrites: boolean; pending: string[] }

export function publicFiles(directory: string, owner: string) {
  return owner === 'main' ? (JSON.parse(readFileSync(path.join(directory, 'files.json'), 'utf8')) as PublicFile[])
    .filter(file => /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(file.path)) : []
}

export function consumerRequests(owner: string, expectations: ConsumerExpectation[], files: PublicFile[]) {
  return [...expectations.filter(row => row.owner === owner),
    { owner, path: '/sitemap.xml', status: 200 }, { owner, path: '/robots.txt', status: 200 },
    ...(owner === 'main' ? [{ owner, path: '/api/auth/get-session', status: 404 }, ...files.map(file =>
      ({ owner, path: '/' + file.path.slice('apps/web/public/'.length), status: 200, sha256: file.sha256 }))] : [])]
}

export function validateUnifiedConsumer(response: { status: number; headers: Headers }, body: Buffer,
  row: ConsumerExpectation & { sha256?: string }) {
  assert.equal(response.status, row.status, `Consumer HTTP failed: ${row.owner}${row.path}`)
  assert(!response.headers.has('set-cookie'), 'Public consumer unexpectedly sets a cookie')
  const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (row.contains) {
    assert.equal(mime, 'text/html', 'Edited consumer must be HTML')
    const main = body.toString().match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    assert(main, 'Edited consumer has no main content')
    for (const value of row.contains) assert(main.includes(value), `Edited value missing from ${row.owner}${row.path}: ${value}`)
  } else if (row.path === '/sitemap.xml') assert(['application/xml', 'text/xml'].includes(mime ?? ''), 'Invalid sitemap MIME')
  else if (row.path === '/robots.txt') assert.equal(mime, 'text/plain', 'Invalid robots MIME')
  else assert.equal(mime, 'application/json', 'Public data/API must be JSON')
  if (row.sha256) assert.equal(bytesSHA(body), row.sha256, `Served public bytes differ: ${row.path}`)
  if (row.path === '/api/auth/get-session') assert.equal(JSON.parse(body.toString()).code, 'ACCOUNT_FEATURES_DISABLED')
}

const executeCommand: Execute = (file, args, options) => new Promise((accept, reject) => {
  const child = spawn(file, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.on('data', bytes => appendFileSync(options.log, bytes))
  child.stderr.on('data', bytes => appendFileSync(options.log, bytes))
  child.once('error', reject)
  child.once('exit', code => code === 0 ? accept() : reject(new Error(`Owner build failed (${code}); inspect ${options.log}`)))
})

export function ownerBuildTarget(owner: string, configText: string) {
  assert(Object.hasOwn(PRODUCTION_TARGETS, owner) && owner !== 'router', 'Unknown content build owner')
  const target = PRODUCTION_TARGETS[owner as keyof typeof PRODUCTION_TARGETS]
  if (['nte', 'lvmeng', 'azur-promilia'].includes(owner)) {
    const live = liveOwnerConfig(owner, configText)
    return { ...target, config: live.config, environment: live.environment, mode: live.mode }
  }
  const config = parseWrangler(configText)
  assert.equal(config.name, target.service, 'Content build service mismatch')
  return { ...target, config, mode: 'production' }
}

export function validateConsumerExpectations(owners: string[], expectations: ConsumerExpectation[]) {
  const seen = new Set<string>()
  for (const row of expectations) {
    assert(owners.includes(row.owner), 'Consumer owner is outside the batch')
    assert(/^\/(?:zh|en|ja)\/[a-z0-9/-]*$/.test(row.path) && !row.path.includes('//') && !row.path.includes('..'), 'Invalid content consumer path')
    assert(Number.isInteger(row.status) && [200, 404].includes(row.status), 'Invalid consumer status')
    assert(row.owner === 'main' || row.path.split('/')[2] === row.owner, 'Cross-owner consumer path')
    assert(!seen.has(`${row.owner}:${row.path}`), 'Duplicate consumer expectation')
    assert(row.status === 200 && Array.isArray(row.contains) && row.contains.length > 0
      && row.contains.every(value => typeof value === 'string' && value.length > 0 && value.length <= 1000), 'An actual edited-content assertion is required')
    seen.add(`${row.owner}:${row.path}`)
  }
  for (const owner of owners) assert(expectations.some(row => row.owner === owner), `Missing rendered content acceptance: ${owner}`)
}

export async function buildUnifiedOwners(directory: string, pin: string, expectations: ConsumerExpectation[], {
  execute = executeCommand,
}: { execute?: Execute } = {}) {
  const initial = verifyUnifiedFrozenSource(directory, pin)
  validateConsumerExpectations(initial.owners, expectations)
  return withRunLock(directory, async () => {
    const plan = verifyUnifiedFrozenSource(directory, pin), workspace = path.join(directory, 'source')
    assertDiskBudget({ path: directory, operation: 'unified owner build', estimatedBytes: BUILD_TEMP_BUDGET })
    const statePath = path.join(directory, 'build-state.json')
    const state: { status: string; owners: Record<string, OwnerResult>; error?: string; cloudWrites: boolean } = { status: 'building', owners: {}, cloudWrites: false }
    writeFileSync(statePath, json(state), { flag: 'wx', mode: 0o600 })
    const saveState = () => { writeFileSync(statePath + '.tmp', json(state), { mode: 0o600 }); renameSync(statePath + '.tmp', statePath) }
    const save = (file: string, value: unknown) => { const text = json(value); writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return digest(text) }
    const home = path.join(directory, 'home')
    mkdirSync(home, { mode: 0o700 })
    const env = { ...isolatedEnvironment(home), NODE_ENV: 'production' as const }
    try {
      save(path.join(directory, 'consumer-expectations.json'), expectations)
      const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim()
      await execute('pnpm', ['install', '--frozen-lockfile', '--offline', '--ignore-scripts', '--prod=false', '--store-dir', store],
        { cwd: workspace, env, log: path.join(directory, 'owner-install.log') })
      for (const owner of plan.owners) {
        verifyUnifiedFrozenSource(directory, pin)
        assertDiskBudget({ path: directory, operation: `${owner} unified build`, estimatedBytes: 3 * GiB })
        state.owners[owner] = { status: 'building' }; saveState()
        const app = owner === 'main' ? 'web' : `game-${owner}`, cwd = path.join(workspace, 'apps', app)
        const target = ownerBuildTarget(owner, readFileSync(path.join(cwd, 'wrangler.jsonc'), 'utf8'))
        const buildEnv = { ...env, ...(owner === 'main' ? {} : { [`${owner.toUpperCase().replaceAll('-', '_')}_DEPLOYMENT_MODE`]: target.mode }),
          CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' }
        const log = path.join(directory, `${owner}-build.log`)
        await execute(process.execPath, [path.join(workspace, 'scripts/require-app-runtime.mjs')], { cwd, env: buildEnv, log })
        await execute('pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', target.environment], { cwd, env: buildEnv, log })
        if (owner !== 'main') await execute(process.execPath, [path.join(workspace, 'scripts/game-release.mjs'), 'prepare-assets', '--game', owner, '--environment', 'production'], { cwd, env: buildEnv, log })
        verifyUnifiedFrozenSource(directory, pin)
        const artifact = path.join(directory, 'artifacts', owner)
        mkdirSync(path.dirname(artifact), { recursive: true, mode: 0o700 })
        cpSync(path.join(cwd, '.open-next'), artifact, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false })
        const tree = artifactFiles(artifact), artifactSHA256 = save(path.join(directory, `${owner}-artifact.json`), tree)
        const expectedPublic = publicFiles(directory, owner)
        for (const file of expectedPublic) assert.equal(bytesSHA(readFileSync(path.join(artifact, 'assets', file.path.slice('apps/web/public/'.length)))), file.sha256, 'Built Main lost projected public data')
        const localConfig = { name: `cms-unified-local-${owner}`, main: path.join(artifact, 'worker.js'),
          compatibility_date: target.config.compatibility_date, compatibility_flags: target.config.compatibility_flags,
          assets: { directory: path.join(artifact, 'assets'), binding: 'ASSETS' },
          vars: { ...target.config.vars, ...(target.environment ? target.config.env?.[target.environment]?.vars : {}) },
          ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
            r2_buckets: [{ binding: 'IMAGES', bucket_name: 'local-only' }] } : {}) }
        const configPath = path.join(directory, `${owner}-local.json`)
        save(configPath, localConfig)
        const references: ResponseReference[] = []
        const http = path.join(directory, `${owner}-http`)
        mkdirSync(http, { mode: 0o700 })
        await withLocalWorker(cwd, configPath, home, path.join(directory, `${owner}-local.log`), async (origin: string) => {
          const requests = consumerRequests(owner, expectations, expectedPublic)
          for (const row of requests) {
            const response = await fetch(origin + row.path, { method: 'GET', credentials: 'omit', redirect: 'error',
              headers: { 'accept-language': row.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) })
            const body = await boundedBody(response), bodyFile = `${references.length}.body`
            writeFileSync(path.join(http, bodyFile), body, { flag: 'wx', mode: 0o600 })
            references.push({ path: row.path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: bytesSHA(body), bodyFile })
            validateUnifiedConsumer(response, body, row)
          }
        })
        assert.deepEqual(artifactFiles(artifact), tree, 'Artifact changed during local acceptance')
        const referencesPin = save(path.join(http, 'references.json'), references)
        state.owners[owner] = { status: 'built_and_locally_accepted', artifactSHA256, responses: references.length, referencesPin }; saveState()
        // These are only this run's reproducible intermediates; keep the sealed artifact and HTTP evidence.
        rmSync(path.join(cwd, '.next'), { recursive: true, force: true })
        rmSync(path.join(cwd, '.open-next'), { recursive: true, force: true })
      }
      verifyUnifiedFrozenSource(directory, pin)
      state.status = 'all_owners_built_and_locally_accepted'; saveState()
      const receipt = { schemaVersion: 1, kind: 'unified_owner_build', frozenPin: pin, sourceTreeSHA256: plan.sourceTreeSHA256,
        candidateSHA256: plan.candidate.candidateSHA256, publicationPolicy: plan.publicationPolicy, owners: state.owners,
        expectationsPin: bytesSHA(readFileSync(path.join(directory, 'consumer-expectations.json'))), preview: plan.candidate.preview,
        productionReady: false, cloudWrites: false, pending: ['old/new asset compatibility and compatible recovery', 'controlled multi-owner cloud activation'] }
      const buildPin = save(path.join(directory, 'build.json'), receipt)
      return { directory, buildPin, ...receipt }
    } catch (error) { state.status = 'failed'; state.error = (error as Error).message; saveState(); throw error }
  })
}

// Re-open all pinned bytes, not a caller-supplied success flag. This is still local acceptance only.
export function verifyUnifiedOwnerBuild(directory: string, buildPin: string) {
  const root = path.resolve(directory)
  assert.equal(realpathSync(root), root, 'Linked owner build directory forbidden')
  const read = (relative: string) => {
    assert(relative.split('/').every(part => part && part !== '.' && part !== '..') && !relative.includes('\\'), 'Unsafe build evidence path')
    const file = path.join(root, relative)
    assert.equal(realpathSync(file), file, 'Linked build evidence forbidden')
    const stat = lstatSync(file)
    assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Invalid build evidence bounds')
    return readFileSync(file)
  }
  const pinned = (relative: string, pin: string | undefined) => {
    assert(pin && /^[a-f0-9]{64}$/.test(pin), 'External build evidence pin required')
    const bytes = read(relative)
    assert.equal(bytesSHA(bytes), pin, `Build evidence changed: ${relative}`)
    return JSON.parse(bytes.toString())
  }
  const receipt = pinned('build.json', buildPin) as BuildReceipt
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_owner_build')
  const frozen = verifyUnifiedFrozenSource(root, receipt.frozenPin)
  assert.equal(receipt.sourceTreeSHA256, frozen.sourceTreeSHA256)
  assert.equal(receipt.candidateSHA256, frozen.candidate.candidateSHA256)
  assert.deepEqual(receipt.publicationPolicy, frozen.publicationPolicy)
  assert.equal(receipt.preview, frozen.candidate.preview)
  assert.equal(receipt.productionReady, false); assert.equal(receipt.cloudWrites, false)
  assert.deepEqual(Object.keys(receipt.owners).sort(), [...frozen.owners].sort(), 'Incomplete owner build')
  const state = JSON.parse(read('build-state.json').toString())
  assert.equal(state.status, 'all_owners_built_and_locally_accepted', 'Partial or failed owner build')
  assert.equal(state.cloudWrites, false); assert.equal(state.error, undefined)
  assert.deepEqual(state.owners, receipt.owners, 'Owner build state changed')
  const expectations = pinned('consumer-expectations.json', receipt.expectationsPin) as ConsumerExpectation[]
  validateConsumerExpectations(frozen.owners, expectations)
  for (const owner of frozen.owners) {
    const result = receipt.owners[owner]
    assert.equal(result.status, 'built_and_locally_accepted', 'Owner did not complete local acceptance')
    const inventory = pinned(`${owner}-artifact.json`, result.artifactSHA256)
    const artifact = path.join(root, 'artifacts', owner)
    assert.deepEqual(artifactFiles(artifact), inventory, `Owner artifact changed: ${owner}`)
    const files = publicFiles(root, owner)
    for (const file of files) assert.equal(bytesSHA(read(`artifacts/${owner}/assets/${file.path.slice('apps/web/public/'.length)}`)), file.sha256, 'Built public data changed')
    const references = pinned(`${owner}-http/references.json`, result.referencesPin) as ResponseReference[]
    const expected = consumerRequests(owner, expectations, files)
    assert.equal(references.length, expected.length, 'Incomplete consumer responses')
    assert.equal(result.responses, references.length)
    for (const [index, reference] of references.entries()) {
      const wanted = expected[index]
      assert.equal(reference.path, wanted.path); assert.equal(reference.status, wanted.status)
      assert.equal(reference.bodyFile, `${index}.body`, 'Unexpected response body path')
      const body = read(`${owner}-http/${reference.bodyFile}`)
      assert.equal(body.length, reference.bytes)
      assert.equal(bytesSHA(body), reference.sha256, 'Consumer body changed')
      assert(reference.headers && typeof reference.headers === 'object', 'Response headers missing')
      validateUnifiedConsumer({ status: reference.status, headers: new Headers(reference.headers) }, body, wanted)
    }
  }
  return { receipt, frozen, directory: root, buildPin }
}
