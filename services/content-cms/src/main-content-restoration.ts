import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, isolatedEnvironment, withLocalWorker } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertTopology, desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { assertUploadMetadata, multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { sealMigrationOwner } from '../../../scripts/genshin-migration-prepare.mjs'
import { genshinMigrationTransport } from '../../../scripts/genshin-migration-transport.mjs'
import { prepareNteMainCandidate, verifyNteMainCandidate } from '../../../scripts/nte-main-candidate.mjs'
import { captureNteHTTP, recheckNteHTTP, recheckNteReferences, verifyNteHTTP } from '../../../scripts/nte-release-http.mjs'
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair } from '../../../scripts/unified-release-assets.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { unifiedTransportTool, verifyUnifiedTool } from '../../../scripts/unified-cloud-module.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedUploadedModule, readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { executeMainContentRestoration, MAIN_CONTENT_RESTORATION_POLICY } from '../../../scripts/genshin-independent-release.mjs'
import { createNteMigrationPreviewNetwork, createGenshinPublicNetwork } from '../../../scripts/unified-preview-network.mjs'
import { captureUnifiedExecutorSource } from './unified-executor-source'
import { readNteSourceCheckpoint } from './nte-source-checkpoint'
import { nteLocalConfig, nteRequests, nteRuntimeConfig } from './nte-release-bundle'
import { projectRoot } from './local-environment'
import { freezeMainConsumerSource, verifyMainConsumerSource } from './main-consumer-source'
import { materialConsumerContract, assertMaterialPageConsumer, assertMaterialSearchConsumer } from './material-consumer-contract'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'

type Proof = { path: string; pin: string }
const repo = path.resolve(projectRoot, '../..'), service = 'gachia'
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
const consumerBundle = 'main_material_consumer_migration_bundle_v1'
const consumerIndex = 'nte_main_material_consumer_source_index_v1'
const isConsumer = (value: any) => value.kind === consumerBundle
const previousProof = (value: any) => isConsumer(value) ? value.sourceIndex : value.checkpoint
async function consumerSources(sourceIndex: Proof, workspace: Proof) {
  const sources = await (await import('./nte-release-history')).readNteSourceIndex(sourceIndex)
  assert.equal(sources.allOwnersCurrent, true, 'Main migration requires a complete current owner index')
  const frozen = verifyMainConsumerSource(repo, workspace, sources.sources)
  return { ...sources, workspace: frozen.workspace, consumerMigration: true, frozenCommit: frozen.sourceCommit }
}
const githubToken = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

export function assertRestorationJSON(sources: any[], pairs: string[], references: any[], read: (row: any) => Uint8Array,
  previous: (url: string) => Uint8Array, role: string) {
  assert(['candidate', 'recovery'].includes(role))
  for (const source of sources.filter(row => /^packages\/data\/games\/(?!genshin\/|nte\/)/.test(row.sourcePath) && pairs.includes(row.sourcePath.slice('packages/data/games/'.length)))) {
    const url = '/data/' + source.sourcePath.slice('packages/data/games/'.length), reference = references.find(row => row.path === url)
    assert(reference, 'Restoration omitted a protected public source'); assert.equal(reference.status, 200)
    const expected = role === 'candidate' ? JSON.parse(source.text) : JSON.parse(Buffer.from(previous(url)).toString())
    assert.deepEqual(JSON.parse(Buffer.from(read(reference)).toString()), expected, 'Restoration source JSON differs from preserved/current content')
  }
}

async function command(file: string, args: string[], cwd: string, home: string, log: string) {
  console.log(JSON.stringify({ kind: 'main_restoration_stage', command: [file, ...args], log, at: new Date().toISOString() }))
  await new Promise<void>((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...isolatedEnvironment(home, { PATH: process.env.PATH, npm_config_manage_package_manager_versions: 'false', CLOUDFLARE_ENV: '' }), NODE_ENV: 'production' }
    const child = spawn(file, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(Error(`Main restoration command exceeded 30 minutes: ${log}`)) }, 1800000)
    for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => appendFileSync(log, bytes))
    child.once('error', error => { clearTimeout(timer); reject(error) }); child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(Error(`Main restoration command ${code}: ${log}`)) })
  })
}

async function graph(sources: any, directory: string, owner: any, role: string, direct: boolean) {
  const workspace = sources.workspace, http = path.join(directory, direct ? `main/${role}/local-http` : `${role}-graph`)
  mkdirSync(http); mkdirSync(path.join(http, 'home'))
  const configs: Record<string, string> = {}, modules = path.join(directory, 'dependency-modules')
  for (const dependency of ['main', 'nte', 'genshin', 'router']) {
    const target = dependency === 'main' ? path.join(directory, 'main', role, 'artifact') : dependency === 'router' ? undefined : sources.owners[dependency].directory
    const module = dependency === 'main' ? path.join(directory, 'main', role, 'module/worker.js') : dependency === 'router' ? path.join(modules, 'router.js') : path.join(target, 'worker.js')
    const config = dependency === 'genshin' ? JSON.parse(readFileSync(path.join(workspace, 'apps/game-genshin/wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''))
      : nteRuntimeConfig(workspace, dependency, 'candidate', false)
    configs[dependency] = migrationSave(http, dependency + '.json', nteLocalConfig(config, dependency, target, module)).path
  }
  configs.unused = migrationSave(http, 'unused.json', { name: 'nte-release-unused', main: path.join(modules, 'unused.js'), compatibility_date: '2026-07-08' }).path
  const artifact = direct ? path.join(directory, 'main', role, 'artifact') : undefined
  const wanted = await nteRequests(workspace, direct ? 'main' : 'router', 'candidate', artifact, false, sources.sources, undefined, sources.consumerMigration && role === 'recovery' ? sources.owners.main.directory : undefined)
  if (sources.consumerMigration) for (const contract of materialContracts(sources)) for (const page of contract.pages) {
    if (!wanted.requests.some((row: any) => row.path === page.path)) wanted.requests.push({ path: page.path, status: 200 })
  }
  for (const url of ['/ads.txt', '/sitemaps/main/sitemap.xml', '/zh/ananta/guides/download-install-guide', '/zh/hi3/guides/new-returning-captain-route', '/zh/sea/guides/beginner-guide']) {
    if (!wanted.requests.some((row: any) => row.path === url)) wanted.requests.push({ path: url, status: 200 })
  }
  // Recovery binds exactly the current Main artifact, including the recorded
  // regression. Candidate binds all preserved approved JSON values instead.
  if (role === 'recovery') for (const [url] of wanted.values) {
    if (!url.startsWith('/data/') || /^\/data\/(genshin|nte)\//.test(url)) continue
    wanted.values.set(url, JSON.parse(readFileSync(path.join(sources.owners.main.directory, 'assets', url.slice(1)), 'utf8')))
  }
  let captured: any
  await withLocalWorker(path.join(workspace, 'apps/web'), configs[direct ? 'main' : 'router'], path.join(http, 'home'), path.join(http, 'worker.log'), async (origin: string) => {
    captured = await captureNteHTTP({ origin, requests: wanted.requests, directory: path.join(http, 'responses'), jsonValues: wanted.values })
  }, { wranglerEntrypoint: unifiedTransportTool(workspace).bin, additionalConfigs: Object.entries(configs).filter(([name]) => name !== (direct ? 'main' : 'router')).map(([, file]) => file) })
  if (sources.consumerMigration && role === 'candidate') assertMaterialReferences(sources, captured.proof)
  if (direct) owner[role].referencesPin = captured.proof.pin
  return captured.proof
}

const materialContracts = (sources: any) => ['endfield', 'starrail', 'roco-cn'].map(game => materialConsumerContract(game, sources.sources))
export function assertMaterialReferences(sources: any, proof: Proof) {
  const refs = recheckNteReferences(proof), directory = path.dirname(proof.path)
  for (const contract of materialContracts(sources)) {
    for (const page of contract.pages) {
      const row = refs.find((row: any) => row.path === page.path); assert(row, `Missing Main material page: ${page.path}`)
      assertMaterialPageConsumer(page, row.status, readFileSync(path.join(directory, row.bodyFile), 'utf8'))
    }
    for (const lang of ['zh', 'en', 'ja'] as const) {
      const row = refs.find((row: any) => row.path === `/data-manifest/search-${lang}.json`); assert(row)
      assertMaterialSearchConsumer(contract, lang, JSON.parse(readFileSync(path.join(directory, row.bodyFile), 'utf8')))
    }
  }
}
async function assertConsumerValues(sources: any, proof: Proof, role: string, direct: boolean) {
  const refs = recheckNteReferences(proof), directory = path.dirname(proof.path)
  const wanted = await nteRequests(sources.workspace, direct ? 'main' : 'router', 'candidate', undefined, false, sources.sources,
    undefined, role === 'recovery' ? sources.owners.main.directory : undefined)
  for (const [url, original] of wanted.values) {
    const expected = role === 'recovery' && url.startsWith('/data/') && !/^\/data\/(genshin|nte)\//.test(url)
      ? JSON.parse(readFileSync(path.join(sources.owners.main.directory, 'assets', url.slice(1)), 'utf8')) : original
    const row = refs.find((row: any) => row.path === url); assert(row, `Missing Main consumer JSON: ${url}`)
    assert.deepEqual(JSON.parse(readFileSync(path.join(directory, row.bodyFile), 'utf8')), expected, `Main consumer JSON drift: ${url}`)
  }
}
export async function prepareMainMaterialConsumerMigration(input: { sourceIndex: Proof; directory: string }) {
  const executor = captureUnifiedExecutorSource(repo), directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'Main material consumer migration build', estimatedBytes: BUILD_TEMP_BUDGET })
  const previous = await (await import('./nte-release-history')).readNteSourceIndex(input.sourceIndex)
  assert.equal(previous.allOwnersCurrent, true)
  mkdirSync(directory, { mode: 0o700 })
  const workspace = freezeMainConsumerSource(repo, executor.commit, previous.sources, path.join(directory, 'frozen'))
  const sources = await consumerSources(input.sourceIndex, workspace)
  return prepareMainBundle({ sourceIndex: input.sourceIndex, workspace }, directory, sources, executor)
}
export async function prepareMainContentRestoration(input: { checkpoint: Proof; directory: string }) {
  const executor = captureUnifiedExecutorSource(repo), sources = await readNteSourceCheckpoint(input.checkpoint), directory = path.resolve(input.directory)
  assert.equal(sources.value.sourceCommit, executor.commit, 'Restoration must build the exact checkpoint executor')
  assertDiskBudget({ path: directory, operation: 'Main preserved content restoration build', estimatedBytes: BUILD_TEMP_BUDGET })
  mkdirSync(directory, { mode: 0o700 })
  return prepareMainBundle({ checkpoint: input.checkpoint }, directory, sources, executor)
}
async function prepareMainBundle(parent: any, directory: string, sources: any, executor: ReturnType<typeof captureUnifiedExecutorSource>) {
  mkdirSync(path.join(directory, 'home'))
  const workspace = sources.workspace
  await command('pnpm', ['install', '--frozen-lockfile'], workspace, path.join(directory, 'home'), path.join(directory, 'install.log'))
  await command('pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', ''], path.join(workspace, 'apps/web'), path.join(directory, 'home'), path.join(directory, 'build.log'))
  const boundary = await prepareNteMainCandidate(path.join(directory, 'boundary'), workspace), old = sources.owners.main, runtime = await readUnifiedSourceOwner(old)
  mkdirSync(path.join(directory, 'main'))
  for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, 'main', role))
  prepareUnifiedAssetPair({ owner: 'main', previous: old.directory, candidate: boundary.artifact, forward: path.join(directory, 'main/candidate/artifact'), recovery: path.join(directory, 'main/recovery/artifact'), runtime: runtime.code })
  const tool = unifiedTransportTool(workspace), owner: any = { service, sourceVersionId: old.versionId, sourceIdentityPin: digest(migrationJSON(old.version)) }
  for (const role of ['recovery', 'candidate']) owner[role] = await sealMigrationOwner({ workspace, directory, owner: 'main', role, artifact: path.join(directory, 'main', role, 'artifact'), tool, runtimeConfig: nteRuntimeConfig(workspace, 'main', 'candidate', false) })
  const modules = path.join(directory, 'dependency-modules'); mkdirSync(modules)
  writeFileSync(path.join(modules, 'router.js'), sources.routerCode, { flag: 'wx' }); writeFileSync(path.join(modules, 'unused.js'), 'export default {fetch(){return new Response(null,{status:503})}}', { flag: 'wx' })
  let finalReferences, recoveryReferences
  for (const role of ['recovery', 'candidate']) {
    await graph(sources, directory, owner, role, true)
    const proof = await graph(sources, directory, owner, role, false)
    if (role === 'candidate') finalReferences = proof; else recoveryReferences = proof
  }
  const value = { schemaVersion: 1, kind: sources.consumerMigration ? consumerBundle : 'nte_main_content_restoration_bundle', ...parent, sourceCommit: executor.commit,
    baseline: sources.baseline, boundary: boundary.proof, owners: { main: owner }, tool, finalReferences, recoveryReferences, cloudWrites: false, productionReady: false }
  const proof = migrationSave(directory, 'bundle.json', value); await verifyMainContentRestoration(proof); executor.verify(); return { proof, value }
}

export async function verifyMainContentRestoration(proof: Proof) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'bundle.json')); assert([consumerBundle, 'nte_main_content_restoration_bundle'].includes(value.kind))
  assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  const sources = isConsumer(value) ? await consumerSources(value.sourceIndex, value.workspace) : await readNteSourceCheckpoint(value.checkpoint); assert.equal(value.sourceCommit, isConsumer(value) ? sources.frozenCommit : sources.value.sourceCommit); assert.deepEqual(value.baseline, sources.baseline)
  assert.deepEqual(Object.keys(value.owners), ['main']); const owner = value.owners.main, old = sources.owners.main
  assert.equal(owner.service, service); assert.equal(owner.sourceVersionId, old.versionId); assert.equal(owner.sourceIdentityPin, digest(migrationJSON(old.version)))
  const boundary = verifyNteMainCandidate(value.boundary); verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(sources.workspace))
  verifyUnifiedAssetPair({ owner: 'main', previous: old.directory, candidate: boundary.artifact, forward: path.join(directory, 'main/candidate/artifact'), recovery: path.join(directory, 'main/recovery/artifact'), runtimeSHA256: old.moduleSHA256 })
  for (const role of ['candidate', 'recovery']) {
    const local = path.join(directory, 'main', role), sealed = owner[role]
    assert.equal(treePin(path.join(local, 'artifact')), sealed.artifactPin); assert.equal(digest(readFileSync(path.join(local, 'module/worker.js'))), sealed.moduleSHA256)
    const config = migrationPinned({ path: path.join(local, 'upload.json'), pin: sealed.configPin })
    const expectedConfig = nteRuntimeConfig(sources.workspace, 'main', 'candidate', false)
    assert.deepEqual(config, { ...expectedConfig, main: path.join(local, 'module/worker.js'), assets: { ...expectedConfig.assets, directory: path.join(local, 'artifact/assets') }, no_bundle: true, minify: false })
    const exact = await multipartModule(readFileSync(path.join(local, 'seal/exact.multipart')))
    assert.equal(exact.moduleSHA256, sealed.moduleSHA256); assertUploadMetadata(exact.metadata, config)
    if (role === 'recovery') assert.equal(sealed.moduleSHA256, old.moduleSHA256)
    const refs = recheckNteReferences({ path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin })
    const graphRefs = recheckNteReferences(role === 'candidate' ? value.finalReferences : value.recoveryReferences)
    const pairs = JSON.parse(readFileSync(path.join(sources.workspace, 'packages/data/raw-content-review.json'), 'utf8')).pairs
    const graphDirectory = path.dirname((role === 'candidate' ? value.finalReferences : value.recoveryReferences).path)
    assertRestorationJSON(sources.sources, pairs, graphRefs, row => readFileSync(path.join(graphDirectory, row.bodyFile)),
      url => readFileSync(path.join(old.directory, 'assets', url.slice(1))), role)
    if (isConsumer(value)) {
      await assertConsumerValues(sources, { path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin }, role, true)
      await assertConsumerValues(sources, role === 'candidate' ? value.finalReferences : value.recoveryReferences, role, false)
    }
    if (isConsumer(value) && role === 'candidate') {
      assertMaterialReferences(sources, { path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin })
      assertMaterialReferences(sources, value.finalReferences)
    }
    assert(refs.some((row: any) => row.path === '/sitemaps/main/sitemap.xml'))
  }
  return { value, directory, sources }
}

export async function activateMainContentRestoration(input: { bundle: Proof; executorRunID: number; cloudToken: string; directory: string; proxy: string }) {
  const token = githubToken(), executor = await createUnifiedExecutorVerifier(input.executorRunID, token), evidence = await verifyMainContentRestoration(input.bundle)
  assert.equal(evidence.value.sourceCommit, executor.executorCommit)
  await verifyUnifiedPublishedSource({ publication: evidence.sources.originalPublication, sourceIndex: evidence.sources.originalSourceIndex, githubToken: token })
  for (const ancestor of evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, token), ancestor)
  const baseline = await desktopCloudSnapshot(input.cloudToken, unifiedProductionRead); assertTopology(evidence.value.baseline, baseline)
  for (const row of Object.values(evidence.sources.owners) as any[]) assertModuleVersionIdentity(row.version, await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: input.cloudToken, request: unifiedProductionRead }))
  assertModuleVersionIdentity(evidence.sources.router.version, await readMigrationRouterVersion({ versionId: evidence.sources.router.versionId, token: input.cloudToken, request: unifiedProductionRead }))
  const directory = path.resolve(input.directory); mkdirSync(directory, { mode: 0o700 })
  const preview = await createNteMigrationPreviewNetwork(input.proxy), publicNetwork = await createGenshinPublicNetwork(input.proxy)
  const releaseKey = digest(migrationJSON({ policy: MAIN_CONTENT_RESTORATION_POLICY, bundle: input.bundle, executorCI: executor.executorCI, proxy: input.proxy }))
  const identity = { policy: MAIN_CONTENT_RESTORATION_POLICY, releaseKey, sourceCommit: executor.executorCommit, executorCI: executor.executorCI,
    bundlePin: input.bundle.pin, reviewPin: isConsumer(evidence.value) ? evidence.value.sourceIndex.pin : evidence.sources.value.contract.pin, baseline, observedAt: Date.now(), owners: evidence.value.owners }
  migrationSave(directory, 'identity.json', identity)
  try {
    await verifyNteHTTP({ origin: 'https://gachia.com', references: migrationPinned(evidence.value.recoveryReferences), directory: path.join(directory, 'preflight'), request: publicNetwork.request })
    const verify = async () => { executor.verify(); assert.deepEqual((await verifyMainContentRestoration(input.bundle)).value, evidence.value); return { ...identity, observedAt: Date.now() } }
    const transport = genshinMigrationTransport({ evidence, releaseKey, token: input.cloudToken, directory, previewRequest: preview.request, publicRequest: publicNetwork.request })
    const result = await executeMainContentRestoration({ run: directory, releaseKey, verify, transport }); executor.verify()
    const value = { schemaVersion: 1, kind: 'main_preserved_content_restoration_completion', bundle: input.bundle, executorCI: executor.executorCI, proxy: input.proxy, releaseKey, ...result,
      journal: { path: path.join(directory, `main-independent-${releaseKey}.jsonl`), pin: result.journalPin } }
    return { proof: migrationSave(directory, 'completion.json', value), value }
  } finally { await preview.close(); await publicNetwork.close() }
}

async function readCompletedRestoration(proof: Proof) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path), evidence = await verifyMainContentRestoration(value.bundle)
  assert.equal(proof.path, path.join(directory, 'completion.json')); assert.equal(value.kind, 'main_preserved_content_restoration_completion')
  assert.equal(value.status, 'production_accepted'); assert.equal(value.sourceAdvanced, false); assert.equal(value.policy, MAIN_CONTENT_RESTORATION_POLICY)
  assert.equal(value.executorCI.commit, evidence.value.sourceCommit); assert.equal(value.executorCI.status, 'full_exact_ci_passed')
  assert.equal(value.releaseKey, digest(migrationJSON({ policy: MAIN_CONTENT_RESTORATION_POLICY, bundle: value.bundle, executorCI: value.executorCI, proxy: value.proxy })))
  const bytes = readFileSync(value.journal.path); assert.equal(digest(bytes), value.journal.pin); assert.equal(value.journal.pin, value.journalPin)
  assert.equal(value.journal.path, path.join(directory, `main-independent-${value.releaseKey}.jsonl`)); assert(bytes.toString().endsWith('\n'))
  const rows = bytes.toString().trimEnd().split('\n').map((row: string) => JSON.parse(row))
  assert.deepEqual(rows.map((row: any) => row.phase), ['baseline', 'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'production_accepted'])
  assert.deepEqual(rows[0].baseline, evidence.value.baseline); assert.deepEqual(rows[0].owners, evidence.value.owners)
  let at = -Infinity
  for (const row of rows) { assert.equal(row.releaseKey, value.releaseKey); assert.equal(row.policy, value.policy); const next = Date.parse(row.at); assert(next >= at && next <= Date.now()); at = next }
  const modules: Record<string, any> = {}
  for (const [index, role] of ['recovery', 'candidate'].entries()) {
    const offset = 1 + index * 3, accepted = value.accepted[role], sealed = evidence.value.owners.main[role]
    assert.deepEqual(rows[offset].sealed, sealed); assert.equal(rows[offset].owner, 'main'); assert.equal(rows[offset].service, service)
    assert.equal(rows[offset + 1].versionId, accepted.versionId); assert.deepEqual(rows[offset + 2].proof, accepted)
    assert.equal(accepted.moduleSHA256, sealed.moduleSHA256)
    modules[role] = await readUnifiedUploadedModule(accepted.moduleProof, { service, versionId: accepted.versionId, moduleSHA256: sealed.moduleSHA256,
      context: { role, transportPin: value.releaseKey, configPin: sealed.configPin } })
    assertModuleVersionIdentity(modules[role].version, migrationPinned({ path: path.join(directory, `main-${role}/version.json`), pin: accepted.versionPin }))
    const references = migrationPinned({ path: path.join(evidence.directory, `main/${role}/local-http/responses/references.json`), pin: sealed.referencesPin })
    recheckNteHTTP({ proof: { path: path.join(directory, `main-${role}/preview/result.json`), pin: accepted.evidenceSHA256 },
      origin: `https://${accepted.versionId.slice(0, 8)}-gachia.aieasygames.workers.dev`, references, preview: true })
    assert(accepted.acceptedAt <= Date.parse(rows[7].at) && Date.parse(rows[7].at) - accepted.acceptedAt < 900000)
  }
  assert.notEqual(value.accepted.recovery.versionId, value.accepted.candidate.versionId)
  assert.equal(rows[7].versionId, value.accepted.candidate.versionId); assert.equal(rows[7].owner, 'main'); assert.equal(rows[7].service, service)
  assert.deepEqual(rows[8].result, value.deployment); assert.equal(value.deployment.versionId, value.accepted.candidate.versionId)
  assert.equal(value.deployment.service, service); assert.equal(value.deployment.releaseKey, value.releaseKey)
  for (const kind of ['creation', 'verification']) {
    const bytes = readFileSync(path.join(directory, `deployment-main-${kind}.body`)), metadata = JSON.parse(readFileSync(path.join(directory, `deployment-main-${kind}.json`), 'utf8'))
    assert.equal(metadata.sha256, digest(bytes)); assert.equal(metadata.bytes, bytes.length); assert(metadata.status >= 200 && metadata.status < 300)
    const body = JSON.parse(bytes.toString()); assert.equal(body.success, true); assert.equal(body.result.id, value.deployment.deploymentId)
    if (kind === 'verification' || body.result.versions) assert.deepEqual(body.result.versions, [{ version_id: value.accepted.candidate.versionId, percentage: 100 }])
  }
  assert.equal(rows[9].proof.evidenceSHA256, value.publicEvidencePin); assert.equal(rows[9].proof.status, 'passed')
  assert.deepEqual(value.versions, { gachia: value.accepted.candidate.versionId }); assert.deepEqual(rows[9].proof.versions, value.versions)
  recheckNteHTTP({ proof: { path: path.join(directory, 'public-0-router/result.json'), pin: value.publicEvidencePin }, origin: 'https://gachia.com', references: migrationPinned(evidence.value.finalReferences) })
  return { value, evidence, directory, modules }
}

export async function readRestoredMainSources(proof: Proof): Promise<any> {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'source-index.json')); assert(['nte_restored_main_source_index', consumerIndex].includes(value.kind))
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  const completed = await readCompletedRestoration(value.completion), sources = completed.evidence.sources, accepted = completed.value.accepted.candidate
  assert.equal(value.kind, isConsumer(completed.evidence.value) ? consumerIndex : 'nte_restored_main_source_index');
  assert.deepEqual(value.previousSourceIndex, previousProof(completed.evidence.value)); assert.deepEqual(value.executorCI, completed.value.executorCI)
  assert.deepEqual(value.active, sources.value.active); assert.equal(value.workspace, sources.workspace)
  assert.deepEqual(value.router, sources.router); assert.deepEqual(Object.keys(value.owners).sort(), Object.keys(sources.owners).sort())
  for (const owner of Object.keys(sources.owners)) {
    if (owner !== 'main') assert.deepEqual(value.owners[owner], sources.owners[owner])
    else {
      const row = value.owners.main; assert.equal(row.directory, path.join(directory, 'main')); assert.equal(row.versionId, accepted.versionId)
      assert.deepEqual(row.moduleProof, accepted.moduleProof); assert.equal(row.moduleSHA256, accepted.moduleSHA256)
      assertModuleVersionIdentity(row.version, completed.modules.candidate.version)
      assert.deepEqual(artifactFiles(row.directory), artifactFiles(path.join(completed.evidence.directory, 'main/candidate/artifact')).map((file: any) => file.path === 'worker.js' ? { path: file.path, type: 'file', sha256: accepted.moduleSHA256 } : file))
    }
    await readUnifiedSourceOwner(value.owners[owner])
  }
  assertTopology(sources.baseline, value.baseline, completed.value.versions); assert.equal(value.baseline.services.gachia.id, completed.value.deployment.deploymentId)
  assert.deepEqual(migrationPinned(value.observation.before), value.baseline); assertTopology(value.baseline, migrationPinned(value.observation.after))
  recheckNteHTTP({ proof: { path: path.join(directory, 'public/result.json'), pin: value.observation.publicAcceptance.evidenceSHA256 }, origin: 'https://gachia.com', references: migrationPinned(completed.evidence.value.finalReferences) })
  return { ...sources, value, owners: value.owners, baseline: value.baseline, allOwnersCurrent: true, ancestors: [...sources.ancestors, completed.value.executorCI] }
}

export async function advanceMainContentRestoration(input: { completion: Proof; directory: string; cloudToken: string; proxy: string }) {
  const completed = await readCompletedRestoration(input.completion), sources = completed.evidence.sources
  const executor = await createUnifiedExecutorVerifier(completed.value.executorCI.runID, githubToken()), directory = path.resolve(input.directory)
  mkdirSync(directory, { mode: 0o700 }); const before: any = await desktopCloudSnapshot(input.cloudToken, unifiedProductionRead)
  assertTopology(sources.baseline, before, completed.value.versions); assert.equal(before.services.gachia.id, completed.value.deployment.deploymentId)
  const owners = structuredClone(sources.owners), accepted = completed.value.accepted.candidate, module = completed.modules.candidate, artifact = path.join(directory, 'main')
  cpSync(path.join(completed.evidence.directory, 'main/candidate/artifact'), artifact, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false })
  writeFileSync(path.join(artifact, 'worker.js'), module.code, { mode: 0o600 })
  owners.main = { owner: 'main', service, versionId: accepted.versionId, directory: artifact, artifactSHA256: treePin(artifact), modulePath: module.receipt.archive.path,
    archiveSHA256: module.receipt.archive.pin, moduleSHA256: accepted.moduleSHA256, version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context }
  for (const row of Object.values(owners) as any[]) assertModuleVersionIdentity(row.version, await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: input.cloudToken, request: unifiedProductionRead }))
  assertModuleVersionIdentity(sources.router.version, await readMigrationRouterVersion({ versionId: sources.router.versionId, token: input.cloudToken, request: unifiedProductionRead }))
  const network = await createGenshinPublicNetwork(input.proxy)
  try {
    const publicAcceptance = await verifyNteHTTP({ origin: 'https://gachia.com', references: migrationPinned(completed.evidence.value.finalReferences), directory: path.join(directory, 'public'), request: network.request })
    const after = await desktopCloudSnapshot(input.cloudToken, unifiedProductionRead); assertTopology(before, after)
    const value = { schemaVersion: 1, kind: isConsumer(completed.evidence.value) ? consumerIndex : 'nte_restored_main_source_index', status: 'published_sources_observed', completion: input.completion,
      previousSourceIndex: previousProof(completed.evidence.value), executorCI: completed.value.executorCI, active: sources.value.active, workspace: sources.workspace,
      historyComplete: false, ...(sources.value.missingOriginalBundle ? { missingOriginalBundle: sources.value.missingOriginalBundle } : {}),
      owners, router: sources.router, baseline: after, observation: { before: migrationSave(directory, 'before.json', before), after: migrationSave(directory, 'after.json', after), publicAcceptance, observedAt: Date.now() }, cloudWrites: false, newPublicationAuthorized: false }
    const proof = migrationSave(directory, 'source-index.json', value); await readRestoredMainSources(proof); executor.verify(); return { proof, value }
  } finally { await network.close() }
}
