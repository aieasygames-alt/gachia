import assert from 'node:assert/strict'
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, withLocalWorker, withRunLock } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, GiB, treeBytes } from '../../../scripts/desktop-disk-preflight.mjs'
import { multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { boundedBody } from '../../../scripts/desktop-version-preview.mjs'
import { digest, withVerificationPass } from '../../../scripts/desktop-release-assets.mjs'
import { prepareUnifiedAssetPair, unifiedService, unifiedStaticFiles, verifyUnifiedAssetPair } from '../../../scripts/unified-release-assets.mjs'
import { consumerRequests, ownerBuildTarget, publicFiles, validateConsumerExpectations, validateUnifiedConsumer,
  verifyUnifiedOwnerBuild, type ConsumerExpectation } from './unified-owner-build'
import { projectRoot } from './local-environment'

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const SHA = /^[a-f0-9]{64}$/
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
const save = (file: string, value: unknown) => {
  const bytes = json(value); writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return digest(bytes)
}
type PreviousOwner = { service: string; versionId: string; directory: string; artifactSHA256: string;
  modulePath: string; archiveSHA256: string; moduleSHA256: string }
export type UnifiedPrevious = { schemaVersion: number; kind: string; purpose: string; owners: Record<string, PreviousOwner> }
type Input = { buildDirectory: string; buildPin: string; previousPath: string; previousPin: string;
  baselineExpectations: ConsumerExpectation[]; directory: string }
type RequestRow = ConsumerExpectation & { sha256?: string; static?: boolean }
type Reference = { path: string; status: number; headers: Record<string, string>; bytes: number; sha256: string; bodyFile: string }
type Role = 'candidate' | 'recovery'
type Result = { artifactSHA256: string; referencesPin: string; responses: number; configPin: string }
type OwnerResult = { service: string; sourceVersionId: string; runtimeModuleSHA256: string; candidate: Result; recovery: Result }
type ArtifactEntry = { path: string; type: string; sha256?: string }
type PublicationReceipt = Pick<Input, 'buildDirectory' | 'buildPin' | 'previousPath' | 'previousPin'> & {
  schemaVersion: number; kind: string; status: string; candidateSHA256: string; baselineExpectationsPin: string;
  owners: Record<string, OwnerResult>; preview: boolean; productionReady: boolean; activationSupported: boolean; cloudWrites: boolean;
  rawUuidRollbackAuthorized: boolean; previousRuntimeVerification: string; pending: string[]
}
const PENDING = ['fresh cloud topology and immutable-version module verification', 'reviewed multi-owner no-bundle transport',
  'exact candidate and recovery cloud previews', 'controlled promotion, partial reconciliation and source advance']

export async function serveUnifiedWorker(cwd: string, config: string, home: string, log: string, accept: (origin: string) => Promise<void>) {
  // Reuse installed tooling after frozen build dependencies have been cleaned.
  // This runs no application source from the tooling workspace.
  const workspace = path.resolve(projectRoot, '../..'), frozen = path.resolve(cwd, '../..')
  assert.equal(digest(bytes(path.join(workspace, 'pnpm-lock.yaml'))), digest(bytes(path.join(frozen, 'pnpm-lock.yaml'))), 'Local Worker tooling lock differs from the frozen source')
  return withLocalWorker(path.join(workspace, 'apps/web'), config, home, log, accept)
}

function bytes(file: string) {
  assert.equal(realpathSync(file), path.resolve(file), 'Linked publication evidence forbidden')
  const stat = lstatSync(file)
  assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Publication evidence budget exceeded')
  return readFileSync(file)
}
function pinned<T>(file: string, pin: string): T {
  assert(SHA.test(pin), 'External publication evidence pin required')
  const raw = bytes(file); assert.equal(digest(raw), pin, 'Publication evidence changed')
  return JSON.parse(raw.toString()) as T
}
function checkedArtifact(directory: string, pin: string) {
  assert.equal(realpathSync(directory), path.resolve(directory), 'Linked prior artifact forbidden')
  assert(SHA.test(pin))
  const tree = artifactFiles(directory)
  assert.equal(digest(json(tree)), pin, 'Previous artifact changed')
  return tree
}

async function inputs(input: Pick<Input, 'buildDirectory' | 'buildPin' | 'previousPath' | 'previousPin'>) {
  const built = verifyUnifiedOwnerBuild(input.buildDirectory, input.buildPin)
  const previous = pinned<UnifiedPrevious>(input.previousPath, input.previousPin)
  assert.equal(previous.schemaVersion, 1); assert.equal(previous.kind, 'unified_previous_artifacts')
  assert.equal(previous.purpose, 'local_compatibility_only', 'Local snapshots cannot assert cloud authority')
  assert.deepEqual(Object.keys(previous.owners).sort(), [...built.frozen.owners].sort(), 'Incomplete previous owner set')
  const modules = new Map<string, Buffer>()
  for (const owner of built.frozen.owners) {
    const row = previous.owners[owner]
    assert.equal(row.service, unifiedService(owner)); assert(UUID.test(row.versionId), 'Previous version UUID required')
    checkedArtifact(row.directory, row.artifactSHA256)
    unifiedStaticFiles(row.directory, owner)
    const archive = bytes(row.modulePath)
    assert.equal(digest(archive), row.archiveSHA256, 'Previous module archive changed')
    const module = await multipartModule(archive)
    assert.equal(module.moduleSHA256, row.moduleSHA256, 'Previous runtime module changed')
    modules.set(owner, module.code)
  }
  return { built, previous, modules }
}

function publicBaseline(build: string, previous: string) {
  const active = JSON.parse(bytes(path.join(build, 'active.json')).toString()) as { sourcePath: string; sha256: string; file: string }[]
  const pairs = JSON.parse(bytes(path.join(build, 'source/packages/data/raw-content-review.json')).toString()).pairs as string[]
  assert(pairs.length > 0 && new Set(pairs).size === pairs.length, 'Invalid public baseline mapping')
  for (const pair of pairs) {
    assert(/^[a-z0-9-]+\/raw-[a-z0-9-]+\.json$/.test(pair), 'Unsafe baseline mapping')
    const source = active.find(row => row.sourcePath === `packages/data/games/${pair}`)
    assert(source, 'Previous Main baseline is incomplete')
    assert.equal(digest(bytes(path.join(previous, 'assets/data', pair))), source.sha256,
      `Previous Main does not preserve public A: ${pair}`)
  }
}

function oldPublicFiles(directory: string) {
  return (artifactFiles(directory) as ArtifactEntry[]).filter(row => row.type === 'file' && /^assets\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path))
    .map(row => ({ path: `apps/web/public/${row.path.slice('assets/'.length)}`, sha256: row.sha256! }))
}

export function unifiedPublicationRequests(build: string, owner: string, role: Role, artifact: string, expectations: ConsumerExpectation[]): RequestRow[] {
  const files = role === 'candidate' ? publicFiles(build, owner) : owner === 'main' ? oldPublicFiles(artifact) : []
  return [...consumerRequests(owner, expectations, files), ...(unifiedStaticFiles(artifact, owner) as ArtifactEntry[]).map(file => ({ owner,
    path: '/' + file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/'), status: 200, sha256: file.sha256, static: true }))]
}

export function validateUnifiedPublicationResponse(response: { status: number; headers: Headers }, body: Buffer, wanted: RequestRow) {
  if (!wanted.static) { validateUnifiedConsumer(response, body, wanted); return }
  assert.equal(response.status, 200, `Static HTTP failed: ${wanted.owner}${wanted.path}`)
  assert(!response.headers.has('set-cookie'), 'Static response sets a cookie')
  assert.equal(digest(body), wanted.sha256, 'Static HTTP bytes differ from the union')
  const mime = response.headers.get('content-type')?.split(';')[0].toLowerCase().trim() ?? ''
  const images: Record<string, string[]> = { png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], gif: ['image/gif'],
    webp: ['image/webp'], avif: ['image/avif'], svg: ['image/svg+xml'], ico: ['image/x-icon', 'image/vnd.microsoft.icon'] }
  const image = images[wanted.path.split('.').at(-1)!]
  const allowed = wanted.path.endsWith('.js') ? ['text/javascript', 'application/javascript', 'application/x-javascript']
    : wanted.path.endsWith('.css') ? ['text/css'] : wanted.path.endsWith('.json') ? ['application/json']
      : image ?? ['font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff', 'application/octet-stream', 'application/vnd.ms-fontobject']
  assert(allowed.includes(mime), 'Wrong static MIME, possibly an HTML fallback')
}

function localConfig(build: string, owner: string, role: Role, artifact: string) {
  const app = owner === 'main' ? 'web' : `game-${owner}`
  const target = ownerBuildTarget(owner, bytes(path.join(build, 'source/apps', app, 'wrangler.jsonc')).toString())
  return { name: `cms-unified-${role}-${owner}`, main: path.join(artifact, 'worker.js'), no_bundle: role === 'recovery',
    compatibility_date: target.config.compatibility_date, compatibility_flags: target.config.compatibility_flags,
    assets: { directory: path.join(artifact, 'assets'), binding: 'ASSETS' },
    vars: { ...target.config.vars, ...(target.environment ? target.config.env?.[target.environment]?.vars : {}) },
    ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
      r2_buckets: [{ binding: 'IMAGES', bucket_name: 'local-only' }] } : {}) }
}

function expectationsMatch(build: string, baseline: ConsumerExpectation[]) {
  const candidate = JSON.parse(bytes(path.join(build, 'consumer-expectations.json')).toString()) as ConsumerExpectation[]
  assert.deepEqual(baseline.map(row => [row.owner, row.path, row.status]), candidate.map(row => [row.owner, row.path, row.status]),
    'Recovery must cover every changed consumer, in the same order')
  return candidate
}

export async function prepareUnifiedPublication(input: Input, { serve = serveUnifiedWorker }: { serve?: typeof withLocalWorker } = {}) {
  const initial = await inputs(input), root = path.resolve(input.directory), build = initial.built.directory
  validateConsumerExpectations(initial.built.frozen.owners, input.baselineExpectations)
  const candidateExpectations = expectationsMatch(build, input.baselineExpectations)
  publicBaseline(build, initial.previous.owners.main.directory)
  const sources = [build, ...Object.values(initial.previous.owners).map(row => row.directory)]
  assert(sources.every(source => root !== source && !source.startsWith(root + path.sep) && !root.startsWith(source + path.sep)), 'Output overlaps publication inputs')
  assert.equal(realpathSync(path.dirname(root)), path.dirname(root), 'Linked publication parent forbidden')
  assertDiskBudget({ path: root, operation: 'unified candidate and recovery copies', estimatedBytes: GiB + sources.slice(1)
    .reduce((sum, source) => sum + treeBytes(source), 0) + treeBytes(path.join(build, 'artifacts')) * 2 })
  mkdirSync(root, { mode: 0o700 })
  return withRunLock(root, async () => {
    const owners: Record<string, OwnerResult> = {}
    const stateFile = path.join(root, 'state.json')
    save(stateFile, { status: 'preparing', cloudWrites: false })
    try {
      save(path.join(root, 'baseline-expectations.json'), input.baselineExpectations)
      mkdirSync(path.join(root, 'home'), { mode: 0o700 })
      for (const owner of initial.built.frozen.owners) {
        const prior = initial.previous.owners[owner], ownerDir = path.join(root, owner)
        mkdirSync(ownerDir, { mode: 0o700 })
        const forward = path.join(ownerDir, 'candidate'), recovery = path.join(ownerDir, 'recovery')
        prepareUnifiedAssetPair({ owner, previous: prior.directory, candidate: path.join(build, 'artifacts', owner),
          forward, recovery, runtime: initial.modules.get(owner)! })
        const results: Partial<Record<Role, Result>> = {}
        for (const role of ['candidate', 'recovery'] as const) {
          const artifact = path.join(ownerDir, role), config = localConfig(build, owner, role, artifact)
          const tree = artifactFiles(artifact), artifactSHA256 = save(path.join(ownerDir, `${role}-artifact.json`), tree)
          const configPath = path.join(ownerDir, `${role}-local.json`), configPin = save(configPath, config)
          const refs: Reference[] = [], http = path.join(ownerDir, `${role}-http`)
          mkdirSync(http, { mode: 0o700 })
          const expected = unifiedPublicationRequests(build, owner, role, artifact, role === 'candidate' ? candidateExpectations : input.baselineExpectations)
          const app = owner === 'main' ? 'web' : `game-${owner}`
          await serve(path.join(build, 'source/apps', app), configPath, path.join(root, 'home'), path.join(ownerDir, `${role}.log`), async (origin: string) => {
            for (const wanted of expected) {
              const response = await fetch(origin + wanted.path, { method: 'GET', redirect: 'error', credentials: 'omit',
                headers: { 'accept-language': wanted.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) })
              const body = await boundedBody(response), bodyFile = `${refs.length}.body`
              writeFileSync(path.join(http, bodyFile), body, { flag: 'wx', mode: 0o600 })
              refs.push({ path: wanted.path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: digest(body), bodyFile })
              validateUnifiedPublicationResponse(response, body, wanted)
            }
          })
          assert.deepEqual(artifactFiles(artifact), tree, 'Publication artifact changed during HTTP acceptance')
          results[role] = { artifactSHA256, configPin, referencesPin: save(path.join(http, 'references.json'), refs), responses: refs.length }
        }
        owners[owner] = { service: prior.service, sourceVersionId: prior.versionId, runtimeModuleSHA256: prior.moduleSHA256,
          candidate: results.candidate!, recovery: results.recovery! }
      }
      const fresh = await inputs(input)
      assert.deepEqual(fresh.previous, initial.previous, 'Previous publication inputs changed')
      publicBaseline(build, initial.previous.owners.main.directory)
      const receipt: PublicationReceipt = { schemaVersion: 1, kind: 'unified_local_publication', status: 'candidate_and_compatible_recovery_locally_accepted',
        buildDirectory: build, buildPin: input.buildPin, previousPath: path.resolve(input.previousPath), previousPin: input.previousPin,
        candidateSHA256: initial.built.receipt.candidateSHA256, baselineExpectationsPin: digest(bytes(path.join(root, 'baseline-expectations.json'))),
        owners, preview: initial.built.receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false,
        rawUuidRollbackAuthorized: false, previousRuntimeVerification: 'pinned_local_module_not_fresh_cloud_verification', pending: PENDING }
      writeFileSync(stateFile, json({ status: 'complete', cloudWrites: false }), { mode: 0o600 })
      const publicationPin = save(path.join(root, 'publication.json'), receipt)
      await verifyUnifiedPublication(root, publicationPin)
      return { directory: root, publicationPin, ...receipt }
    } catch (error) {
      writeFileSync(stateFile, json({ status: 'failed', error: (error as Error).message, cloudWrites: false }), { mode: 0o600 })
      throw error
    }
  })
}

export async function verifyUnifiedPublication(directory: string, publicationPin: string): Promise<{ directory: string; publicationPin: string; receipt: PublicationReceipt }> {
  const root = path.resolve(directory)
  assert.equal(realpathSync(root), root, 'Linked publication directory forbidden')
  const receipt = pinned<PublicationReceipt>(path.join(root, 'publication.json'), publicationPin)
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_local_publication')
  assert.equal(receipt.status, 'candidate_and_compatible_recovery_locally_accepted')
  for (const field of ['productionReady', 'activationSupported', 'cloudWrites', 'rawUuidRollbackAuthorized'] as const) assert.equal(receipt[field], false)
  assert.equal(receipt.previousRuntimeVerification, 'pinned_local_module_not_fresh_cloud_verification')
  assert.deepEqual(receipt.pending, PENDING)
  assert.deepEqual(JSON.parse(bytes(path.join(root, 'state.json')).toString()), { status: 'complete', cloudWrites: false }, 'Partial or failed publication')
  const { built, previous } = await inputs(receipt), build = built.directory
  return withVerificationPass(() => verifyPublicationArtifacts(root, publicationPin, receipt, built, previous, build))
}

// Start after module parsing has completed: this pass must never span an await.
function verifyPublicationArtifacts(root: string, publicationPin: string, receipt: PublicationReceipt,
  built: Awaited<ReturnType<typeof inputs>>['built'], previous: UnifiedPrevious, build: string) {
  assert.equal(receipt.candidateSHA256, built.receipt.candidateSHA256); assert.equal(receipt.preview, built.receipt.preview)
  assert.deepEqual(Object.keys(receipt.owners).sort(), [...built.frozen.owners].sort(), 'Incomplete publication owner set')
  const baseline = pinned<ConsumerExpectation[]>(path.join(root, 'baseline-expectations.json'), receipt.baselineExpectationsPin)
  validateConsumerExpectations(built.frozen.owners, baseline)
  const candidate = expectationsMatch(build, baseline)
  publicBaseline(build, previous.owners.main.directory)
  for (const owner of built.frozen.owners) {
    const result = receipt.owners[owner], prior = previous.owners[owner], ownerDir = path.join(root, owner)
    assert.equal(result.service, prior.service); assert.equal(result.sourceVersionId, prior.versionId)
    assert.equal(result.runtimeModuleSHA256, prior.moduleSHA256)
    verifyUnifiedAssetPair({ owner, previous: prior.directory, candidate: path.join(build, 'artifacts', owner),
      forward: path.join(ownerDir, 'candidate'), recovery: path.join(ownerDir, 'recovery'), runtimeSHA256: prior.moduleSHA256 })
    for (const role of ['candidate', 'recovery'] as const) {
      const row = result[role], artifact = path.join(ownerDir, role), http = path.join(ownerDir, `${role}-http`)
      assert.deepEqual(artifactFiles(artifact), pinned(path.join(ownerDir, `${role}-artifact.json`), row.artifactSHA256), 'Publication artifact changed')
      assert.deepEqual(pinned(path.join(ownerDir, `${role}-local.json`), row.configPin), localConfig(build, owner, role, artifact), 'Publication runtime configuration changed')
      const expected = unifiedPublicationRequests(build, owner, role, artifact, role === 'candidate' ? candidate : baseline)
      const refs = pinned<Reference[]>(path.join(http, 'references.json'), row.referencesPin)
      assert.equal(refs.length, expected.length, 'Incomplete publication HTTP coverage'); assert.equal(row.responses, refs.length)
      for (const [index, reference] of refs.entries()) {
        assert.equal(reference.path, expected[index].path); assert.equal(reference.bodyFile, `${index}.body`)
        const body = bytes(path.join(http, reference.bodyFile))
        assert.equal(body.length, reference.bytes); assert.equal(digest(body), reference.sha256, 'Publication HTTP body changed')
        validateUnifiedPublicationResponse({ status: reference.status, headers: new Headers(reference.headers) }, body, expected[index])
      }
    }
  }
  return { directory: root, publicationPin, receipt }
}
