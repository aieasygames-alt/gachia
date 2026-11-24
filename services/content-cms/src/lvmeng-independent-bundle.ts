import { sessionReadFileBytes } from '../../../scripts/artifact-verification-session.mjs'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, withLocalWorker } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, GiB, treeBytes } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertUploadMetadata, multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { captureNteHTTP, recheckNteReferences } from '../../../scripts/nte-release-http.mjs'
import { prepareUnifiedAssetPair, unifiedStaticFiles, verifyUnifiedAssetPair } from '../../../scripts/unified-release-assets.mjs'
import { unifiedDryRun, unifiedRuntimeConfig, unifiedTransportTarget, unifiedTransportTool, verifyUnifiedTool } from '../../../scripts/unified-cloud-module.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { readNteSourceIndex } from './nte-release-history'
import { frozenCharacterTextPairContract, validateUnifiedConsumer, verifyUnifiedOwnerBuild } from './unified-owner-build'
import { LVMENG_PRODUCTION_SCOPE } from './unified-genshin-production-scope'

type Proof = { path: string; pin: string }
const owner = 'lvmeng', service = 'gachia-game-lvmeng'
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
const sourceText = (directory: string, sourcePath: string) => readFileSync(path.join(directory, sourcePath), 'utf8')

function inputs(build: Proof, sourceIndex: Proof, depth = 0) {
  assert(depth < 32, 'Lvmeng independent bundle ancestry exceeds its bound')
  const built = verifyUnifiedOwnerBuild(path.dirname(build.path), build.pin)
  assert.equal(build.path, path.join(built.directory, 'build.json'))
  assert.equal(built.frozen.productionScope, LVMENG_PRODUCTION_SCOPE)
  assert.equal(built.frozen.localScope, undefined); assert.equal(built.receipt.preview, false)
  assert.deepEqual(built.frozen.owners, [owner])
  return readNteSourceIndex(sourceIndex, depth + 1).then(sources => {
    assert.deepEqual(JSON.parse(readFileSync(path.join(built.directory, 'active.json'), 'utf8')).map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)),
      sources.sources.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)))
    const workspace = path.join(built.directory, 'source'), candidateSources = sources.sources.map((row: any) => {
      const text = sourceText(workspace, row.sourcePath); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
    })
    const contract = frozenCharacterTextPairContract(built.directory, built.frozen)
    assert.equal(contract.candidate.changes.length, 1); assert.equal(contract.candidate.changes[0].game, owner)
    return { built, sources, workspace, candidateSources, contract }
  })
}

function localConfig(workspace: string, artifact: string, module: string) {
  const target = unifiedTransportTarget(owner, readFileSync(path.join(workspace, 'apps/game-lvmeng/wrangler.jsonc'), 'utf8'))
  const runtime = unifiedRuntimeConfig(target)
  return { name: 'lvmeng-independent-local', main: module, no_bundle: true, compatibility_date: runtime.compatibility_date,
    compatibility_flags: runtime.compatibility_flags ?? [], vars: runtime.vars,
    assets: { binding: runtime.assets.binding, directory: path.join(artifact, 'assets') } }
}

function requests(artifact: string, expectations: any[]) {
  const paths = ['', '/guides', '/starter-guide', '/characters', '/world', '/map', '/progression', '/news', '/version', '/launch-check', '/download', '/redeem-codes', '/faq', '/roadmap']
  const rows: any[] = [{ path: '/robots.txt', status: 200 }, { path: '/sitemap.xml', status: 200 }, ...paths.map(pathname => ({ path: `/zh/lvmeng${pathname}`, status: 200 })),
    ...['he-yulian', 'luoxi', 'lita', 'shilin', 'pannaxiya', 'take', 'ameng', 'beiyi', 'aiti', 'mata', 'fulizi', 'lilang', 'daliya'].map(slug => ({ path: `/zh/lvmeng/characters/${slug}`, status: 200 })),
    { path: '/en/lvmeng', status: 404 }, { path: '/ja/lvmeng', status: 404 }]
  for (const wanted of expectations) rows.push({ path: wanted.path, status: wanted.status, contains: wanted.contains })
  for (const file of unifiedStaticFiles(artifact, owner)) {
    const url = '/' + file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/')
    if (!rows.some(row => row.path === url)) rows.push({ path: url, status: 200, sha256: file.sha256 })
  }
  return rows.filter((row, index, all) => all.findIndex(other => other.path === row.path) === index)
}

async function sealOwner({ workspace, directory, role, artifact, tool }: { workspace: string; directory: string; role: 'candidate' | 'recovery'; artifact: string; tool: any }) {
  const local = path.join(directory, owner, role), temp = path.join(local, 'seal')
  mkdirSync(temp, { mode: 0o700 }); mkdirSync(path.join(temp, 'home'), { mode: 0o700 }); mkdirSync(path.join(local, 'module'), { mode: 0o700 })
  const modulePath = path.join(local, 'module/worker.js')
  if (role === 'recovery') writeFileSync(modulePath, readFileSync(path.join(artifact, 'worker.js')), { flag: 'wx', mode: 0o600 })
  const target = unifiedTransportTarget(owner, readFileSync(path.join(workspace, 'apps/game-lvmeng/wrangler.jsonc'), 'utf8'))
  const runtime = unifiedRuntimeConfig(target)
  const compile = { ...target.config, main: role === 'recovery' ? modulePath : path.join(artifact, 'worker.js'), assets: { ...runtime.assets, directory: path.join(artifact, 'assets') }, no_bundle: role === 'recovery', ...(role === 'recovery' ? { minify: false } : {}) }
  const compilePath = path.join(temp, 'compile.json'); migrationSave(temp, 'compile.json', compile)
  unifiedDryRun(tool, { config: compilePath, environment: target.environment, outfile: path.join(temp, 'compiled.multipart'), exact: role === 'recovery', cwd: temp, home: path.join(temp, 'home'), log: path.join(temp, 'compile.log') })
  const compiled = await multipartModule(readFileSync(path.join(temp, 'compiled.multipart'))); assertUploadMetadata(compiled.metadata, runtime)
  if (role === 'candidate') writeFileSync(modulePath, compiled.code, { flag: 'wx', mode: 0o600 })
  else assert(readFileSync(modulePath).equals(compiled.code), 'Archived Lvmeng recovery was rebundled')
  // Persist the selected production environment in the exact upload config.
  // Wrangler merges --env production at upload time, so retaining the
  // top-level preview vars here would make the sealed config disagree with
  // the outbound multipart metadata even though the upload is valid.
  const exactConfig = { ...compile, vars: runtime.vars, main: modulePath, no_bundle: true, minify: false }, configPath = path.join(local, 'upload.json')
  const configPin = migrationSave(local, 'upload.json', exactConfig).pin
  unifiedDryRun(tool, { config: configPath, environment: target.environment, outfile: path.join(temp, 'exact.multipart'), exact: true, cwd: temp, home: path.join(temp, 'home'), log: path.join(temp, 'exact.log') })
  const exact = await multipartModule(readFileSync(path.join(temp, 'exact.multipart'))); assert.equal(exact.moduleSHA256, compiled.moduleSHA256); assertUploadMetadata(exact.metadata, { ...exactConfig, vars: runtime.vars })
  return { moduleSHA256: compiled.moduleSHA256, configPin, artifactPin: treePin(artifact) }
}

async function captureLocal({ workspace, directory, role, artifact, expectations }: { workspace: string; directory: string; role: 'candidate' | 'recovery'; artifact: string; expectations: any[] }) {
  const local = path.join(directory, owner, role), http = path.join(local, 'local-http'); mkdirSync(http); mkdirSync(path.join(http, 'home'))
  const configPath = path.join(http, 'lvmeng.json'); migrationSave(http, 'lvmeng.json', localConfig(workspace, artifact, path.join(local, 'module/worker.js')))
  let captured: any
  await withLocalWorker(path.join(workspace, 'apps/game-lvmeng'), configPath, path.join(http, 'home'), path.join(http, 'worker.log'), async (origin: string) => {
    captured = await captureNteHTTP({ origin, requests: requests(artifact, expectations), directory: path.join(http, 'responses') })
  }, { wranglerEntrypoint: unifiedTransportTool(workspace).bin })
  return captured.proof
}

export async function prepareLvmengIndependentBundle(input: { build: Proof; sourceIndex: Proof; review: Proof; directory: string }) {
  const opened = await inputs(input.build, input.sourceIndex), { built, sources, workspace, contract } = opened, directory = path.resolve(input.directory)
  const old = sources.owners[owner], candidate = path.join(built.directory, 'artifacts', owner)
  assertDiskBudget({ path: directory, operation: 'independent Lvmeng compatible pair', estimatedBytes: GiB + 2 * (treeBytes(old.directory) + treeBytes(candidate)) })
  mkdirSync(directory, { mode: 0o700 }); mkdirSync(path.join(directory, owner))
  for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, owner, role))
  try {
    const forward = path.join(directory, `${owner}/candidate/artifact`), recovery = path.join(directory, `${owner}/recovery/artifact`), runtime = (await readUnifiedSourceOwner(old)).code
    prepareUnifiedAssetPair({ owner, previous: old.directory, candidate, forward, recovery, runtime })
    const tool = unifiedTransportTool(workspace), row: any = { service, sourceVersionId: old.versionId, sourceIdentityPin: digest(migrationJSON(old.version)) }
    for (const role of ['recovery', 'candidate'] as const) row[role] = await sealOwner({ workspace, directory, role, artifact: path.join(directory, owner, role, 'artifact'), tool })
    row.recovery.referencesPin = (await captureLocal({ workspace, directory, role: 'recovery', artifact: recovery, expectations: contract.recovery.expectations })).pin
    row.candidate.referencesPin = (await captureLocal({ workspace, directory, role: 'candidate', artifact: forward, expectations: contract.candidate.expectations })).pin
    const value = { schemaVersion: 1, kind: 'lvmeng_independent_bundle', build: input.build, sourceIndex: input.sourceIndex, review: input.review,
      sourceCommit: built.frozen.sourceCommit, baseline: sources.baseline, owners: { [owner]: row }, tool,
      finalReferences: { path: path.join(directory, `${owner}/candidate/local-http/responses/references.json`), pin: row.candidate.referencesPin },
      contentVersion: digest(sourceText(workspace, 'apps/game-lvmeng/lib/data.ts')), previousContentVersion: digest(sourceText(sources.workspace, 'apps/game-lvmeng/lib/data.ts')),
      cloudWrites: false, productionReady: false }
    const proof = migrationSave(directory, 'bundle.json', value); await verifyLvmengIndependentBundle(proof); return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}

export async function verifyLvmengIndependentBundle(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'bundle.json')); assert.equal(value.kind, 'lvmeng_independent_bundle'); assert.equal(value.schemaVersion, 1)
  assert(!existsSync(path.join(directory, 'failure.json'))); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  const opened = await inputs(value.build, value.sourceIndex, depth), { built, sources, workspace, contract } = opened
  assert.equal(value.sourceCommit, built.frozen.sourceCommit); assert.deepEqual(value.baseline, sources.baseline); assert.deepEqual(Object.keys(value.owners), [owner])
  verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(workspace))
  const old = sources.owners[owner], row = value.owners[owner]
  assert.equal(row.service, service); assert.equal(row.sourceVersionId, old.versionId); assert.equal(row.sourceIdentityPin, digest(migrationJSON(old.version)))
  verifyUnifiedAssetPair({ owner, previous: old.directory, candidate: path.join(built.directory, 'artifacts', owner), forward: path.join(directory, `${owner}/candidate/artifact`), recovery: path.join(directory, `${owner}/recovery/artifact`), runtimeSHA256: old.moduleSHA256 })
  for (const role of ['recovery', 'candidate'] as const) {
    const local = path.join(directory, owner, role), artifact = path.join(local, 'artifact'), sealed = row[role]
    assert.equal(treePin(artifact), sealed.artifactPin); assert.equal(digest(readFileSync(path.join(local, 'module/worker.js'))), sealed.moduleSHA256)
    const target = unifiedTransportTarget(owner, readFileSync(path.join(workspace, 'apps/game-lvmeng/wrangler.jsonc'), 'utf8')), runtime = unifiedRuntimeConfig(target), config = migrationPinned({ path: path.join(local, 'upload.json'), pin: sealed.configPin })
    assert.deepEqual(config, { ...target.config, vars: runtime.vars, main: path.join(local, 'module/worker.js'), assets: { ...runtime.assets, directory: path.join(artifact, 'assets') }, no_bundle: true, minify: false })
    const outbound = await multipartModule(readFileSync(path.join(local, 'seal/exact.multipart'))); assert.equal(outbound.moduleSHA256, sealed.moduleSHA256); assertUploadMetadata(outbound.metadata, config)
    const refs = { path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin }, references = recheckNteReferences(refs), wanted = requests(artifact, role === 'candidate' ? contract.candidate.expectations : contract.recovery.expectations)
    assert.deepEqual(references.map((ref: any) => ({ path: ref.path, status: ref.status })), wanted.map(row => ({ path: row.path, status: row.status })))
    for (const wantedRow of role === 'candidate' ? contract.candidate.expectations : contract.recovery.expectations) { const ref = references.find((item: any) => item.path === wantedRow.path); assert(ref); validateUnifiedConsumer({ status: ref.status, headers: new Headers(ref.headers) }, sessionReadFileBytes(path.join(path.dirname(refs.path), ref.bodyFile)), wantedRow) }
  }
  assert.equal(value.contentVersion, digest(sourceText(workspace, 'apps/game-lvmeng/lib/data.ts'))); assert.equal(value.previousContentVersion, digest(sourceText(sources.workspace, 'apps/game-lvmeng/lib/data.ts')))
  return { directory, value, ...opened }
}
