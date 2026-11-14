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
import { azurPromiliaGuidePairContract, AZUR_PROMILIA_GUIDE_SOURCE, AZUR_PROMILIA_GUIDE_ID } from './azur-promilia-independent-text'
import { verifyUnifiedOwnerBuild } from './unified-owner-build'
import { AZUR_PROMILIA_PRODUCTION_SCOPE } from './unified-genshin-production-scope'

type Proof = { path: string; pin: string }
const service = 'gachia-game-azur-promilia'
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
const sourceText = (directory: string, sourcePath: string) => readFileSync(path.join(directory, sourcePath), 'utf8')

function inputs(build: Proof, sourceIndex: Proof, depth = 0) {
  assert(depth < 32, 'Azur independent bundle ancestry exceeds its bound')
  const built = verifyUnifiedOwnerBuild(path.dirname(build.path), build.pin)
  assert.equal(build.path, path.join(built.directory, 'build.json'))
  assert.equal(built.frozen.productionScope, AZUR_PROMILIA_PRODUCTION_SCOPE)
  assert.equal(built.frozen.localScope, undefined); assert.equal(built.receipt.preview, false)
  assert.deepEqual(built.frozen.owners, ['azur-promilia'])
  return readNteSourceIndex(sourceIndex, depth + 1).then(sources => {
    assert.deepEqual(JSON.parse(readFileSync(path.join(built.directory, 'active.json'), 'utf8')).map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)),
      sources.sources.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)))
    const workspace = path.join(built.directory, 'source'), candidateSources = sources.sources.map((row: any) => {
      const text = sourceText(workspace, row.sourcePath); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
    })
    const contract = azurPromiliaGuidePairContract(sources.sources, candidateSources)
    assert.notEqual(contract.candidate.changes[0].candidateSHA256, contract.candidate.changes[0].activeSHA256)
    return { built, sources, workspace, candidateSources, contract }
  })
}

function localConfig(workspace: string, artifact: string, module: string) {
  const target = unifiedTransportTarget('azur-promilia', readFileSync(path.join(workspace, 'apps/game-azur-promilia/wrangler.jsonc'), 'utf8'))
  return { name: 'azur-independent-local', main: module, no_bundle: true, compatibility_date: target.config.compatibility_date,
    compatibility_flags: target.config.compatibility_flags ?? [], vars: target.config.vars,
    assets: { binding: target.config.assets.binding, directory: path.join(artifact, 'assets') } }
}

function requests(artifact: string, expectation: any, contains: string) {
  const rows: any[] = [
    { path: '/robots.txt', status: 200 }, { path: '/sitemap.xml', status: 200 },
    { path: '/zh/azur-promilia', status: 200 }, { path: '/en/azur-promilia', status: 200 }, { path: '/ja/azur-promilia', status: 200 },
    { path: '/zh/azur-promilia/characters', status: 200 }, { path: '/en/azur-promilia/characters/abby', status: 200 },
    { path: '/en/azur-promilia/guides/kibo-battle-and-ecology', status: 200 },
    { path: '/zh/azur-promilia/guides/kibo-battle-and-ecology', status: 200 },
    { path: '/ja/azur-promilia/guides/kibo-battle-and-ecology', status: 200 },
    { path: '/en/azur-promilia/weapons', status: 200 }, { path: '/zh/azur-promilia/tier-list', status: 404 },
  ]
  const existingExpectation = rows.find(row => row.path === expectation.path)
  if (existingExpectation) existingExpectation.contains = [contains]
  else rows.push({ path: expectation.path, status: expectation.status, contains: [contains] })
  for (const file of unifiedStaticFiles(artifact, 'azur-promilia')) {
    const url = '/' + file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/')
    if (!rows.some(row => row.path === url)) rows.push({ path: url, status: 200, sha256: file.sha256 })
  }
  return rows
}

async function sealOwner({ workspace, directory, role, artifact, tool }: { workspace: string; directory: string; role: 'candidate' | 'recovery'; artifact: string; tool: any }) {
  const local = path.join(directory, 'azur-promilia', role), temp = path.join(local, 'seal')
  mkdirSync(temp, { mode: 0o700 }); mkdirSync(path.join(temp, 'home'), { mode: 0o700 }); mkdirSync(path.join(local, 'module'), { mode: 0o700 })
  const modulePath = path.join(local, 'module/worker.js')
  if (role === 'recovery') writeFileSync(modulePath, readFileSync(path.join(artifact, 'worker.js')), { flag: 'wx', mode: 0o600 })
  const base = unifiedTransportTarget('azur-promilia', readFileSync(path.join(workspace, 'apps/game-azur-promilia/wrangler.jsonc'), 'utf8')).config
  const compile = { ...base, main: role === 'recovery' ? modulePath : path.join(artifact, 'worker.js'), assets: { ...base.assets, directory: path.join(artifact, 'assets') },
    ...(role === 'recovery' ? { no_bundle: true, minify: false } : {}) }
  const compilePath = path.join(temp, 'compile.json'); migrationSave(temp, 'compile.json', compile)
  unifiedDryRun(tool, { config: compilePath, environment: '', outfile: path.join(temp, 'compiled.multipart'), exact: role === 'recovery', cwd: temp, home: path.join(temp, 'home'), log: path.join(temp, 'compile.log') })
  const compiled = await multipartModule(readFileSync(path.join(temp, 'compiled.multipart'))); assertUploadMetadata(compiled.metadata, unifiedRuntimeConfig(unifiedTransportTarget('azur-promilia', readFileSync(path.join(workspace, 'apps/game-azur-promilia/wrangler.jsonc'), 'utf8'))))
  if (role === 'candidate') writeFileSync(modulePath, compiled.code, { flag: 'wx', mode: 0o600 })
  else assert(readFileSync(modulePath).equals(compiled.code), 'Archived Azur recovery was rebundled')
  const exactConfig = { ...compile, main: modulePath, no_bundle: true, minify: false }, configPath = path.join(local, 'upload.json')
  const configPin = migrationSave(local, 'upload.json', exactConfig).pin
  unifiedDryRun(tool, { config: configPath, environment: '', outfile: path.join(temp, 'exact.multipart'), exact: true, cwd: temp, home: path.join(temp, 'home'), log: path.join(temp, 'exact.log') })
  const exact = await multipartModule(readFileSync(path.join(temp, 'exact.multipart'))); assert.equal(exact.moduleSHA256, compiled.moduleSHA256); assertUploadMetadata(exact.metadata, exactConfig)
  return { moduleSHA256: compiled.moduleSHA256, configPin, artifactPin: treePin(artifact) }
}

async function captureLocal({ workspace, directory, role, artifact, expectation, contains }: { workspace: string; directory: string; role: 'candidate' | 'recovery'; artifact: string; expectation: any; contains: string }) {
  const local = path.join(directory, 'azur-promilia', role), http = path.join(local, 'local-http'); mkdirSync(http); mkdirSync(path.join(http, 'home'))
  const configPath = path.join(http, 'azur-promilia.json'); migrationSave(http, 'azur-promilia.json', localConfig(workspace, artifact, path.join(local, 'module/worker.js')))
  let captured: any
  await withLocalWorker(path.join(workspace, 'apps/game-azur-promilia'), configPath, path.join(http, 'home'), path.join(http, 'worker.log'), async (origin: string) => {
    captured = await captureNteHTTP({ origin, requests: requests(artifact, expectation, contains), directory: path.join(http, 'responses') })
  }, { wranglerEntrypoint: unifiedTransportTool(workspace).bin })
  return captured.proof
}

export async function prepareAzurPromiliaIndependentBundle(input: { build: Proof; sourceIndex: Proof; review: Proof; directory: string }) {
  const opened = await inputs(input.build, input.sourceIndex), { built, sources, workspace, contract } = opened, directory = path.resolve(input.directory)
  const old = sources.owners['azur-promilia'], candidate = path.join(built.directory, 'artifacts/azur-promilia')
  assertDiskBudget({ path: directory, operation: 'independent Azur compatible pair', estimatedBytes: GiB + 2 * (treeBytes(old.directory) + treeBytes(candidate)) })
  mkdirSync(directory, { mode: 0o700 }); mkdirSync(path.join(directory, 'azur-promilia'))
  for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, 'azur-promilia', role))
  try {
    const forward = path.join(directory, 'azur-promilia/candidate/artifact'), recovery = path.join(directory, 'azur-promilia/recovery/artifact')
    const runtime = (await readUnifiedSourceOwner(old)).code
    prepareUnifiedAssetPair({ owner: 'azur-promilia', previous: old.directory, candidate, forward, recovery, runtime })
    const tool = unifiedTransportTool(workspace), owner: any = { service, sourceVersionId: old.versionId, sourceIdentityPin: digest(migrationJSON(old.version)) }
    for (const role of ['recovery', 'candidate'] as const) owner[role] = await sealOwner({ workspace, directory, role, artifact: path.join(directory, 'azur-promilia', role, 'artifact'), tool })
    const expectation = contract.candidate.expectations[0], oldExpectation = contract.recovery.expectations[0]
    owner.recovery.referencesPin = (await captureLocal({ workspace, directory, role: 'recovery', artifact: recovery, expectation: oldExpectation, contains: oldExpectation.contains[0] })).pin
    owner.candidate.referencesPin = (await captureLocal({ workspace, directory, role: 'candidate', artifact: forward, expectation, contains: expectation.contains[0] })).pin
    const value = { schemaVersion: 1, kind: 'azur_promilia_independent_bundle', build: input.build, sourceIndex: input.sourceIndex, review: input.review,
      sourceCommit: built.frozen.sourceCommit, baseline: sources.baseline, owners: { 'azur-promilia': owner }, tool,
      finalReferences: { path: path.join(directory, 'azur-promilia/candidate/local-http/responses/references.json'), pin: owner.candidate.referencesPin },
      contentVersion: digest(sourceText(workspace, AZUR_PROMILIA_GUIDE_SOURCE)), previousContentVersion: digest(sourceText(sources.workspace, AZUR_PROMILIA_GUIDE_SOURCE)),
      cloudWrites: false, productionReady: false }
    const proof = migrationSave(directory, 'bundle.json', value); await verifyAzurPromiliaIndependentBundle(proof); return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}

export async function verifyAzurPromiliaIndependentBundle(proof: Proof, depth = 0) {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'bundle.json')); assert.equal(value.kind, 'azur_promilia_independent_bundle'); assert.equal(value.schemaVersion, 1)
  assert(!existsSync(path.join(directory, 'failure.json'))); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  const opened = await inputs(value.build, value.sourceIndex, depth), { built, sources, workspace, candidateSources, contract } = opened
  assert.equal(value.sourceCommit, built.frozen.sourceCommit); assert.deepEqual(value.baseline, sources.baseline); assert.deepEqual(Object.keys(value.owners), ['azur-promilia'])
  const owner = value.owners['azur-promilia'], old = sources.owners['azur-promilia']; assert.equal(owner.service, service); assert.equal(owner.sourceVersionId, old.versionId); assert.equal(owner.sourceIdentityPin, digest(migrationJSON(old.version)))
  verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(workspace))
  verifyUnifiedAssetPair({ owner: 'azur-promilia', previous: old.directory, candidate: path.join(built.directory, 'artifacts/azur-promilia'), forward: path.join(directory, 'azur-promilia/candidate/artifact'), recovery: path.join(directory, 'azur-promilia/recovery/artifact'), runtimeSHA256: digest((await readUnifiedSourceOwner(old)).code) })
  for (const role of ['recovery', 'candidate'] as const) {
    const local = path.join(directory, 'azur-promilia', role), sealed = owner[role], artifact = path.join(local, 'artifact')
    assert.equal(treePin(artifact), sealed.artifactPin); assert.equal(digest(readFileSync(path.join(local, 'module/worker.js'))), sealed.moduleSHA256)
    const config = migrationPinned({ path: path.join(local, 'upload.json'), pin: sealed.configPin }), target = unifiedTransportTarget('azur-promilia', readFileSync(path.join(workspace, 'apps/game-azur-promilia/wrangler.jsonc'), 'utf8'))
    assert.deepEqual(config, { ...target.config, main: path.join(local, 'module/worker.js'), assets: { ...target.config.assets, directory: path.join(artifact, 'assets') }, no_bundle: true, minify: false })
    const outbound = await multipartModule(readFileSync(path.join(local, 'seal/exact.multipart'))); assert.equal(outbound.moduleSHA256, sealed.moduleSHA256); assertUploadMetadata(outbound.metadata, config)
    const expected = role === 'candidate' ? contract.candidate.expectations[0] : contract.recovery.expectations[0]
    recheckNteReferences({ path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin })
    const references = migrationPinned({ path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin })
    const edited = references.find((row: any) => row.path === expected.path); assert(edited); assert(readFileSync(path.join(local, 'local-http/responses', edited.bodyFile), 'utf8').includes(expected.contains[0]))
  }
  assert.equal(value.contentVersion, digest(sourceText(workspace, AZUR_PROMILIA_GUIDE_SOURCE))); assert.equal(value.previousContentVersion, digest(sourceText(sources.workspace, AZUR_PROMILIA_GUIDE_SOURCE)))
  return { directory, value, ...opened }
}

