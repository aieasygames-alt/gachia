import assert from 'node:assert/strict'
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { withRunLock } from '../../../scripts/desktop-publish.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { boundedBody } from '../../../scripts/desktop-version-preview.mjs'
import { assertUnifiedUploadMetadata, unifiedConfigSemantics, unifiedDryRun, unifiedRuntimeConfig,
  unifiedTransportTarget, unifiedTransportTool, unifiedUploadConfig, verifyUnifiedTool } from '../../../scripts/unified-cloud-module.mjs'
import { projectRoot } from './local-environment'
import type { ConsumerExpectation } from './unified-owner-build'
import { serveUnifiedWorker, unifiedPublicationRequests, validateUnifiedPublicationResponse, verifyUnifiedPublication, type UnifiedPrevious } from './unified-publication'

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const save = (file: string, value: unknown) => {
  const text = json(value); writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return digest(text)
}
function bytes(file: string) {
  assert.equal(realpathSync(file), path.resolve(file), 'Linked transport evidence forbidden')
  const stat = lstatSync(file); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Transport evidence budget exceeded')
  return readFileSync(file)
}
function pinned<T>(file: string, pin: string): T {
  assert(/^[a-f0-9]{64}$/.test(pin), 'External transport pin required')
  const raw = bytes(file); assert.equal(digest(raw), pin, 'Transport evidence changed'); return JSON.parse(raw.toString()) as T
}
type Role = 'candidate' | 'recovery'
type Input = { publicationDirectory: string; publicationPin: string; directory: string }
type Reference = { path: string; status: number; headers: Record<string, string>; bytes: number; sha256: string; bodyFile: string }
type RoleResult = { moduleSHA256: string; inputModuleSHA256: string; compileArchivePin: string; exactArchivePin: string;
  compileConfigPin: string; uploadConfigPin: string; localConfigPin: string; semanticsPin: string; referencesPin: string; responses: number;
  compileInvocationPin: string; exactInvocationPin: string; compileLogPin: string; exactLogPin: string }
type Receipt = Pick<Input, 'publicationDirectory' | 'publicationPin'> & { schemaVersion: number; kind: string; status: string;
  tool: ReturnType<typeof unifiedTransportTool>; owners: Record<string, { service: string; environment: string; tags: string[]; candidate: RoleResult; recovery: RoleResult }>;
  preview: boolean; productionReady: boolean; activationSupported: boolean; cloudWrites: boolean; credentials: boolean;
  rawUuidRollbackAuthorized: boolean; previousRuntimeVerification: string; pending: string[] }
const pending = ['fresh cloud topology and immutable-version module verification', 'exact candidate and recovery cloud previews',
  'controlled promotion, partial reconciliation and source advance']

function localConfig(target: ReturnType<typeof unifiedTransportTarget>, owner: string, role: Role, module: string, assets: string) {
  const selected = unifiedRuntimeConfig(target)
  return { name: `cms-unified-sealed-${role}-${owner}`, main: module, no_bundle: true,
    compatibility_date: selected.compatibility_date, compatibility_flags: selected.compatibility_flags,
    assets: { directory: assets, binding: 'ASSETS' }, vars: selected.vars,
    ...(owner === 'main' ? { d1_databases: [{ binding: 'DB', database_name: 'local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
      r2_buckets: [{ binding: 'IMAGES', bucket_name: 'local-only' }] } : {}) }
}

function paths(root: string, publication: string, owner: string, role: Role) {
  const directory = path.join(root, owner, role), artifact = path.join(publication, owner, role)
  return { directory, artifact, assets: path.join(artifact, 'assets'), module: path.join(directory, 'module/worker.js'),
    compile: path.join(directory, 'compile.json'), upload: path.join(directory, 'upload.json'), local: path.join(directory, 'local.json') }
}

function expectations(build: string, publication: string, role: Role): ConsumerExpectation[] {
  return JSON.parse(bytes(role === 'candidate' ? path.join(build, 'consumer-expectations.json') : path.join(publication, 'baseline-expectations.json')).toString())
}

function invocation(tool: Receipt['tool'], config: string, environment: string, outfile: string, exact: boolean) {
  return { executable: process.execPath, args: ['versions', 'upload', '--dry-run', ...(exact ? ['--no-bundle'] : []),
    '--config', config, '--env', environment, '--outfile', outfile], credentials: false, cloudWrites: false }
}

async function inputEvidence(input: Pick<Input, 'publicationDirectory' | 'publicationPin'>) {
  const publication = await verifyUnifiedPublication(input.publicationDirectory, input.publicationPin)
  assert.equal(publication.receipt.localScope, undefined, 'Genshin-only rehearsal cannot enter the formal transport pipeline')
  const workspace = path.resolve(projectRoot, '../..'), build = publication.receipt.buildDirectory
  assert.equal(digest(bytes(path.join(workspace, 'pnpm-lock.yaml'))), digest(bytes(path.join(build, 'source/pnpm-lock.yaml'))), 'Transport tool lock differs from frozen source')
  return { publication, build, workspace, tool: unifiedTransportTool(workspace) }
}

export async function prepareUnifiedTransport(input: Input, { serve = serveUnifiedWorker } = {}): Promise<{ directory: string; transportPin: string; receipt: Receipt }> {
  const evidence = await inputEvidence(input), root = path.resolve(input.directory), publication = evidence.publication.directory
  assert.equal(realpathSync(path.dirname(root)), path.dirname(root), 'Linked transport parent forbidden')
  const previous = JSON.parse(bytes(evidence.publication.receipt.previousPath).toString()) as UnifiedPrevious
  for (const source of [publication, evidence.build, ...Object.values(previous.owners).map(row => row.directory)]) {
    assert(root !== source && !root.startsWith(source + path.sep) && !source.startsWith(root + path.sep), 'Transport output overlaps input')
  }
  assertDiskBudget({ path: root, operation: 'unified exact module transport', estimatedBytes: 2 * GiB })
  mkdirSync(root, { mode: 0o700 })
  return withRunLock(root, async () => {
    const stateFile = path.join(root, 'state.json'), home = path.join(root, 'home'), owners: Receipt['owners'] = {}
    save(stateFile, { status: 'preparing', cloudWrites: false }); mkdirSync(home, { mode: 0o700 })
    try {
      for (const [owner, old] of Object.entries(evidence.publication.receipt.owners)) {
        const app = owner === 'main' ? 'web' : `game-${owner}`, cwd = path.join(evidence.build, 'source/apps', app)
        const target = unifiedTransportTarget(owner, bytes(path.join(cwd, 'wrangler.jsonc')).toString()), roles: Partial<Record<Role, RoleResult>> = {}
        mkdirSync(path.join(root, owner), { mode: 0o700 })
        for (const role of ['candidate', 'recovery'] as const) {
          const p = paths(root, publication, owner, role); mkdirSync(p.directory, { mode: 0o700 })
          mkdirSync(path.dirname(p.module), { mode: 0o700 })
          const sourceModule = path.join(p.artifact, 'worker.js'), inputModuleSHA256 = digest(bytes(sourceModule))
          // no-bundle discovers incidental SQL/HTML beside an OpenNext Worker.
          // Isolate the archived single module before invoking Wrangler.
          if (role === 'recovery') writeFileSync(p.module, bytes(sourceModule), { flag: 'wx', mode: 0o600 })
          const compile = unifiedUploadConfig(target, role === 'recovery' ? p.module : sourceModule, p.assets, role === 'recovery')
          const compileConfigPin = save(p.compile, compile), compileArchive = path.join(p.directory, 'compile.multipart')
          const compileLog = path.join(p.directory, 'compile.log')
          const compileInvocationPin = save(path.join(p.directory, 'compile-invocation.json'), unifiedDryRun(evidence.tool,
            { config: p.compile, environment: target.environment, outfile: compileArchive, exact: role === 'recovery', cwd, home, log: compileLog }))
          const compiled = await multipartModule(bytes(compileArchive)); assertUnifiedUploadMetadata(compiled.metadata, target)
          if (role === 'recovery') assert.equal(compiled.moduleSHA256, old.runtimeModuleSHA256, 'Recovery was rebundled')
          if (role === 'candidate') writeFileSync(p.module, compiled.code, { flag: 'wx', mode: 0o600 })
          const uploadConfigPin = save(p.upload, unifiedUploadConfig(target, p.module, p.assets, true))
          const semantics = unifiedConfigSemantics(evidence.tool, p.upload, target.environment)
          assert.equal(semantics.name, old.service); assert.equal(semantics.environment, target.environment)
          assert.deepEqual(semantics.vars, unifiedRuntimeConfig(target).vars); assert.deepEqual(semantics.tags, target.tags)
          const semanticsPin = save(path.join(p.directory, 'semantics.json'), semantics)
          const exactArchive = path.join(p.directory, 'exact.multipart'), exactLog = path.join(p.directory, 'exact.log')
          const exactInvocationPin = save(path.join(p.directory, 'exact-invocation.json'), unifiedDryRun(evidence.tool,
            { config: p.upload, environment: target.environment, outfile: exactArchive, exact: true, cwd: p.directory, home, log: exactLog }))
          const exact = await multipartModule(bytes(exactArchive))
          assert.equal(exact.moduleSHA256, compiled.moduleSHA256, 'No-bundle changed sealed module'); assertUnifiedUploadMetadata(exact.metadata, target)
          assert.deepEqual(exact.metadata, compiled.metadata, 'No-bundle metadata differs')
          const localConfigPin = save(p.local, localConfig(target, owner, role, p.module, p.assets)), refs: Reference[] = []
          const expected = unifiedPublicationRequests(evidence.build, owner, role, p.artifact, expectations(evidence.build, publication, role))
          const http = path.join(p.directory, 'http'); mkdirSync(http, { mode: 0o700 })
          await serve(cwd, p.local, home, path.join(p.directory, 'local.log'), async (origin: string) => {
            for (const wanted of expected) {
              const response = await fetch(origin + wanted.path, { redirect: 'error', credentials: 'omit',
                headers: { 'accept-language': wanted.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) })
              const body = await boundedBody(response), bodyFile = `${refs.length}.body`
              writeFileSync(path.join(http, bodyFile), body, { flag: 'wx', mode: 0o600 })
              refs.push({ path: wanted.path, status: response.status, headers: Object.fromEntries(response.headers), bytes: body.length, sha256: digest(body), bodyFile })
              validateUnifiedPublicationResponse(response, body, wanted)
            }
          })
          roles[role] = { inputModuleSHA256, moduleSHA256: compiled.moduleSHA256, compileConfigPin, uploadConfigPin, localConfigPin, semanticsPin,
            compileArchivePin: digest(bytes(compileArchive)), exactArchivePin: digest(bytes(exactArchive)), compileInvocationPin, exactInvocationPin,
            compileLogPin: digest(bytes(compileLog)), exactLogPin: digest(bytes(exactLog)), referencesPin: save(path.join(http, 'references.json'), refs), responses: refs.length }
        }
        owners[owner] = { service: old.service, environment: target.environment, tags: target.tags, candidate: roles.candidate!, recovery: roles.recovery! }
      }
      await inputEvidence(input)
      const receipt: Receipt = { schemaVersion: 1, kind: 'unified_no_bundle_transport', status: 'all_roles_sealing_and_local_acceptance_complete',
        publicationDirectory: publication, publicationPin: input.publicationPin, tool: evidence.tool, owners,
        preview: evidence.publication.receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false, credentials: false,
        rawUuidRollbackAuthorized: false, previousRuntimeVerification: evidence.publication.receipt.previousRuntimeVerification, pending }
      writeFileSync(stateFile, json({ status: 'complete', cloudWrites: false }), { mode: 0o600 })
      const transportPin = save(path.join(root, 'transport.json'), receipt)
      await verifyUnifiedTransport(root, transportPin)
      return { directory: root, transportPin, receipt }
    } catch (error) {
      writeFileSync(stateFile, json({ status: 'failed', error: (error as Error).message, cloudWrites: false }), { mode: 0o600 }); throw error
    }
  })
}

export async function verifyUnifiedTransport(directory: string, transportPin: string) {
  const root = path.resolve(directory); assert.equal(realpathSync(root), root, 'Linked transport directory forbidden')
  const receipt = pinned<Receipt>(path.join(root, 'transport.json'), transportPin)
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_no_bundle_transport')
  assert.equal(receipt.status, 'all_roles_sealing_and_local_acceptance_complete')
  for (const field of ['productionReady', 'activationSupported', 'cloudWrites', 'credentials', 'rawUuidRollbackAuthorized'] as const) assert.equal(receipt[field], false)
  assert.deepEqual(receipt.pending, pending)
  assert.deepEqual(JSON.parse(bytes(path.join(root, 'state.json')).toString()), { status: 'complete', cloudWrites: false }, 'Partial or failed transport')
  const evidence = await inputEvidence(receipt), publication = evidence.publication.directory
  assert.equal(receipt.preview, evidence.publication.receipt.preview)
  assert.equal(receipt.previousRuntimeVerification, evidence.publication.receipt.previousRuntimeVerification)
  assert.deepEqual(receipt.tool, evidence.tool); verifyUnifiedTool(receipt.tool)
  assert.deepEqual(Object.keys(receipt.owners).sort(), Object.keys(evidence.publication.receipt.owners).sort(), 'Incomplete transport owner set')
  for (const [owner, result] of Object.entries(receipt.owners)) {
    const app = owner === 'main' ? 'web' : `game-${owner}`, target = unifiedTransportTarget(owner, bytes(path.join(evidence.build, 'source/apps', app, 'wrangler.jsonc')).toString())
    assert.equal(result.service, evidence.publication.receipt.owners[owner].service)
    assert.equal(result.environment, target.environment); assert.deepEqual(result.tags, target.tags)
    for (const role of ['candidate', 'recovery'] as const) {
      const row = result[role], p = paths(root, publication, owner, role)
      assert.deepEqual(readdirSync(path.dirname(p.module)), ['worker.js'], 'Additional sealed modules forbidden')
      assert.equal(digest(bytes(path.join(p.artifact, 'worker.js'))), row.inputModuleSHA256)
      assert.equal(digest(bytes(p.module)), row.moduleSHA256, 'Sealed Worker changed')
      if (role === 'recovery') assert.equal(row.moduleSHA256, evidence.publication.receipt.owners[owner].runtimeModuleSHA256, 'Recovery module changed')
      const compile = unifiedUploadConfig(target, role === 'recovery' ? p.module : path.join(p.artifact, 'worker.js'), p.assets, role === 'recovery')
      assert.deepEqual(pinned(p.compile, row.compileConfigPin), compile)
      assert.deepEqual(pinned(p.upload, row.uploadConfigPin), unifiedUploadConfig(target, p.module, p.assets, true))
      assert.deepEqual(pinned(p.local, row.localConfigPin), localConfig(target, owner, role, p.module, p.assets))
      const semantics = unifiedConfigSemantics(receipt.tool, p.upload, target.environment)
      assert.deepEqual(pinned(path.join(p.directory, 'semantics.json'), row.semanticsPin), semantics)
      assert.equal(semantics.name, result.service); assert.deepEqual(semantics.tags, target.tags)
      assert.deepEqual(semantics.vars, unifiedRuntimeConfig(target).vars); assert.equal(semantics.environment, target.environment)
      const modules = []
      for (const phase of ['compile', 'exact'] as const) {
        const archive = bytes(path.join(p.directory, `${phase}.multipart`))
        assert.equal(digest(archive), row[`${phase}ArchivePin`], 'Dry-run archive changed')
        const module = await multipartModule(archive); assert.equal(module.moduleSHA256, row.moduleSHA256)
        assertUnifiedUploadMetadata(module.metadata, target); modules.push(module)
        assert.deepEqual(pinned(path.join(p.directory, `${phase}-invocation.json`), row[`${phase}InvocationPin`]),
          invocation(receipt.tool, phase === 'compile' ? p.compile : p.upload, target.environment, path.join(p.directory, `${phase}.multipart`), phase === 'exact' || role === 'recovery'))
        assert.equal(digest(bytes(path.join(p.directory, `${phase}.log`))), row[`${phase}LogPin`], 'Dry-run log changed')
      }
      assert.deepEqual(modules[0].metadata, modules[1].metadata)
      const expected = unifiedPublicationRequests(evidence.build, owner, role, p.artifact, expectations(evidence.build, publication, role))
      const http = path.join(p.directory, 'http'), refs = pinned<Reference[]>(path.join(http, 'references.json'), row.referencesPin)
      assert.equal(refs.length, expected.length, 'Incomplete sealed HTTP evidence'); assert.equal(row.responses, refs.length)
      for (const [index, reference] of refs.entries()) {
        assert.equal(reference.path, expected[index].path); assert.equal(reference.bodyFile, `${index}.body`)
        const body = bytes(path.join(http, reference.bodyFile))
        assert.equal(body.length, reference.bytes); assert.equal(digest(body), reference.sha256, 'Sealed HTTP body changed')
        validateUnifiedPublicationResponse({ status: reference.status, headers: new Headers(reference.headers) }, body, expected[index])
      }
    }
  }
  return { directory: root, transportPin, receipt }
}
