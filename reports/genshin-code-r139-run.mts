// Fixed R139 code/resource publication. Content comes exclusively from published R134 A.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { artifactFiles, isolatedEnvironment, withLocalWorker, withRunLock } from '../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET } from '../scripts/desktop-disk-preflight.mjs'
import { activeVersion, assertTopology, desktopCloudSnapshot } from '../scripts/desktop-cloud-release.mjs'
import { digest } from '../scripts/desktop-release-assets.mjs'
import { assertUploadMetadata, assertUploadedVersion, multipartModule } from '../scripts/desktop-cloud-transport.mjs'
import { migrationPinned, migrationSave, migrationRequests } from '../scripts/genshin-migration-http.mjs'
import { genshinContentAssets } from '../scripts/genshin-content-assets.mjs'
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair } from '../scripts/unified-release-assets.mjs'
import { sealMigrationOwner } from '../scripts/genshin-migration-prepare.mjs'
import { unifiedTransportTool } from '../scripts/unified-cloud-module.mjs'
import { unifiedProductionRead, unifiedUploadResponse } from '../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, captureUnifiedUploadedModule, revalidateUnifiedUploadedModule } from '../scripts/unified-version-identity.mjs'
import { exactUnifiedPreviewOrigin } from '../scripts/unified-version-preview.mjs'
import { readUnifiedSourceOwner } from '../scripts/unified-source-advance.mjs'
import { unifiedOwnerDeploymentWriter } from '../scripts/unified-owner-deployment.mjs'
import { captureNteHTTP, verifyNteHTTP, recheckNteHTTP, recheckNteReferences } from '../scripts/nte-release-http.mjs'
import { createUnifiedPreviewNetwork, createGenshinPublicNetwork } from '../scripts/unified-preview-network.mjs'
import { GENSHIN_CODE_POLICY } from '../scripts/genshin-code-history.mjs'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'
import { freezeMainConsumerSource, verifyMainConsumerSource } from '../services/content-cms/src/main-consumer-source.ts'
import { captureUnifiedExecutorSource } from '../services/content-cms/src/unified-executor-source.ts'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from '../services/content-cms/src/unified-production.ts'
import { verifyUnifiedPublishedSource } from '../services/content-cms/src/unified-source-advance.ts'
import { nteLocalConfig, nteRequests, nteRuntimeConfig } from '../services/content-cms/src/nte-release-bundle.ts'

const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-code-production-2026-11-20-r139')
const parent = { path: path.join(repo, 'reports/main-material-migration-2026-11-19-r134/published-sources/source-index.json'), pin: '401834ddb8412bbf45072d9c2c54e4e1176ea03f9bc2b5950fabe53937c16750' }
const service = 'gachia-game-genshin', proxy = 'http://127.0.0.1:1087'
const save = (file: string, value: any) => migrationSave(root, file, value)
const load = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const treePin = (directory: string) => digest(JSON.stringify(artifactFiles(directory), null, 2) + '\n')
const buildNode = '/opt/homebrew/opt/node@22/bin/node'
function auth(minutes = 10) {
  const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
  const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
  assert(Date.parse(field('expiration_time')) > Date.now() + minutes * 60000, 'Refresh existing Wrangler auth before the stage')
  return field('oauth_token') as string
}
async function command(exe: string, args: string[], cwd: string, env: any, log: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    for (const stream of [child.stdout, child.stderr]) stream!.on('data', bytes => appendFileSync(log, bytes))
    child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(Error(`Command ${code}: ${log}`)))
  })
}
async function staging(token: string) {
  const out: any = {}
  for (const name of ['gachia-game-genshin-staging', 'gachia-game-azur-promilia-staging', 'gachia-router-staging']) {
    const base = `https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${name}`
    out[name] = {}
    for (const endpoint of ['deployments', 'settings']) {
      const response = await unifiedProductionRead(base + '/' + endpoint, { method: 'GET', headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) })
      const body = await response.json(); assert(response.ok && body.success)
      out[name][endpoint] = body.result
    }
  }
  return out
}
function config(workspace: string, owner = 'genshin') {
  if (owner === 'main' || owner === 'router') return nteRuntimeConfig(workspace, owner, 'candidate', false)
  const raw = readFileSync(path.join(workspace, owner === 'router' ? 'apps/router/wrangler.jsonc' : owner === 'main' ? 'apps/web/wrangler.jsonc' : `apps/game-${owner}/wrangler.jsonc`), 'utf8')
  const parsed = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '')); delete parsed.env; parsed.find_additional_modules = false; return parsed
}
function prepared() {
  const p = load('prepared.json'), executor = captureUnifiedExecutorSource(repo)
  assert.equal(p.commit, executor.commit); verifyMainConsumerSource(repo, p.workspaceProof, migrationPinned(load('baseline.json').active))
  return { p, executor }
}
async function localGraph(sources: any, p: any, sealed: any, role: string, direct: boolean) {
  const directory = path.join(root, `${role}-${direct ? 'direct' : 'graph'}`); mkdirSync(directory); mkdirSync(path.join(directory, 'home'))
  const configs: any = {}
  for (const owner of ['main', 'nte', 'genshin', 'router']) {
    const row = owner === 'genshin' ? sealed.roles[role] : sources.owners[owner]
    const artifact = owner === 'router' ? undefined : owner === 'genshin' ? row.artifact : row.directory
    const module = owner === 'router' ? path.join(root, 'router.js') : owner === 'genshin' ? path.join(root, 'sealed/genshin', role, 'module/worker.js') : path.join(artifact, 'worker.js')
    configs[owner] = migrationSave(directory, owner + '.json', { ...nteLocalConfig(config(p.workspace, owner), owner, artifact, module), find_additional_modules: false }).path
  }
  configs.unused = migrationSave(directory, 'unused.json', { name: 'nte-release-unused', main: path.join(root, 'unused.js'), compatibility_date: '2026-07-08', find_additional_modules: false }).path
  const row = sealed.roles[role], expected = genshinContentAssets(p.workspace)
  const wanted = direct ? { requests: migrationRequests({ owner: 'genshin', role: 'candidate', artifact: row.artifact, expected }), values: new Map() }
    : await nteRequests(p.workspace, 'router', 'candidate', undefined, false, sources.sources, undefined, sources.owners.main.directory)
  // Both owner paths and the public Router path must serve the exact new image bytes.
  if (role === 'candidate') for (const name of ['mualani', 'ororon']) wanted.requests.push({ path: `/images/genshin/characters/${name}.webp`, status: 200,
    sha256: digest(readFileSync(path.join(p.workspace, `apps/game-genshin/public/images/genshin/characters/${name}.webp`))) })
  let result: any
  await withLocalWorker(path.join(p.workspace, 'apps/game-genshin'), configs[direct ? 'genshin' : 'router'], path.join(directory, 'home'), path.join(directory, 'worker.log'), async (origin: string) => {
    result = await captureNteHTTP({ origin, requests: wanted.requests, jsonValues: wanted.values, directory: path.join(directory, 'responses') })
  }, { wranglerEntrypoint: sealed.tool.bin, additionalConfigs: direct ? [] : Object.entries(configs).filter(([name]) => name !== 'router').map(([, file]) => file) })
  console.log(JSON.stringify({ stage: 'local', role, direct, requests: wanted.requests.length })); return result.proof
}
async function verifySealed() {
  const { p, executor } = prepared(), s = load('sealed.json'), sources = await readNteSourceIndex(parent)
  assert.equal(s.commit, p.commit)
  verifyUnifiedAssetPair({ owner: 'genshin', previous: sources.owners.genshin.directory, candidate: load('built.json').artifact,
    forward: s.roles.candidate.artifact, recovery: s.roles.recovery.artifact, runtimeSHA256: sources.owners.genshin.moduleSHA256 })
  for (const role of ['candidate', 'recovery']) {
    const row = s.roles[role]; assert.equal(treePin(row.artifact), row.artifactPin)
    const c = migrationPinned(row.config); assert.equal(c.name, service)
    const module = await multipartModule(readFileSync(path.join(root, 'sealed/genshin', role, 'seal/exact.multipart')))
    assertUploadMetadata(module.metadata, c); assert.equal(module.moduleSHA256, row.moduleSHA256)
    recheckNteReferences(row.local)
  }
  recheckNteReferences(s.finalReferences); recheckNteReferences(s.recoveryReferences); executor.verify()
  return { p, s, sources, executor }
}
const phase = process.argv[2]; mkdirSync(root, { recursive: true, mode: 0o700 }); console.log(JSON.stringify({ phase, at: new Date().toISOString() }))
if (phase === 'baseline') {
  const sources = await readNteSourceIndex(parent), token = auth(); assert.equal(sources.allOwnersCurrent, true); assert.equal(sources.sources.length, 115)
  const before = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(sources.baseline, before)
  const stages = await staging(token); assertTopology(before, await desktopCloudSnapshot(token, unifiedProductionRead))
  save('baseline.json', { parent, active: sources.value.active, before, staging: stages, budget: assertDiskBudget({ path: root, operation: 'R139 Genshin build', estimatedBytes: BUILD_TEMP_BUDGET }) })
  console.log(JSON.stringify({ active: activeVersion(before, service), sources: sources.sources.length }))
} else if (phase === 'prepare') {
  const executor = captureUnifiedExecutorSource(repo), sources = await readNteSourceIndex(parent)
  const workspaceProof = freezeMainConsumerSource(repo, executor.commit, sources.sources, path.join(root, 'frozen')), workspace = migrationPinned(workspaceProof).workspace
  save('prepared.json', { commit: executor.commit, parent, active: sources.value.active, workspaceProof, workspace, contentChanges: [] }); executor.verify()
} else if (phase === 'build') {
  const { p, executor } = prepared(); assertDiskBudget({ path: root, operation: 'R139 isolated OpenNext build', estimatedBytes: BUILD_TEMP_BUDGET })
  const home = path.join(root, 'build-home'); mkdirSync(home)
  const env = { ...isolatedEnvironment(home), PATH: path.dirname(buildNode) + path.delimiter + process.env.PATH, npm_config_manage_package_manager_versions: 'false', NODE_OPTIONS: '--max-old-space-size=4096', GENSHIN_DEPLOYMENT_MODE: 'production' }
  const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim()
  await command('pnpm', ['install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--prod=false', '--store-dir', store], p.workspace, env, path.join(root, 'install.log'))
  await command('pnpm', ['run', 'build:worker'], path.join(p.workspace, 'apps/game-genshin'), env, path.join(root, 'build.log'))
  const artifact = path.join(p.workspace, 'apps/game-genshin/.open-next'); executor.verify()
  save('built.json', { commit: p.commit, artifact, treePin: treePin(artifact), node: execFileSync(buildNode, ['--version'], { encoding: 'utf8' }).trim() })
} else if (phase === 'seal') {
  const { p, executor } = prepared(), sources = await readNteSourceIndex(parent), built = load('built.json'), tool = unifiedTransportTool(p.workspace)
  assert.equal(built.commit, p.commit); assert.equal(treePin(built.artifact), built.treePin)
  const directory = path.join(root, 'sealed'); mkdirSync(directory); mkdirSync(path.join(directory, 'genshin'))
  for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, 'genshin', role))
  prepareUnifiedAssetPair({ owner: 'genshin', previous: sources.owners.genshin.directory, candidate: built.artifact,
    forward: path.join(directory, 'genshin/candidate/artifact'), recovery: path.join(directory, 'genshin/recovery/artifact'), runtime: (await readUnifiedSourceOwner(sources.owners.genshin)).code })
  const sealed: any = { commit: p.commit, parent, tool, roles: {} }
  for (const role of ['recovery', 'candidate']) {
    const artifact = path.join(directory, 'genshin', role, 'artifact'), row = await sealMigrationOwner({ workspace: p.workspace, directory, owner: 'genshin', role, artifact, tool, runtimeConfig: config(p.workspace) })
    sealed.roles[role] = { ...row, artifact, config: { path: path.join(directory, 'genshin', role, 'upload.json'), pin: row.configPin } }
  }
  writeFileSync(path.join(root, 'router.js'), sources.routerCode, { flag: 'wx' }); writeFileSync(path.join(root, 'unused.js'), 'export default {fetch(){return new Response(null,{status:503})}}', { flag: 'wx' })
  for (const role of ['recovery', 'candidate']) {
    sealed.roles[role].local = await localGraph(sources, p, sealed, role, true)
    const graph = await localGraph(sources, p, sealed, role, false)
    sealed[role === 'candidate' ? 'finalReferences' : 'recoveryReferences'] = graph
  }
  save('sealed.json', sealed); await verifySealed(); executor.verify()
} else if (phase === 'preview') {
  const { p, s, sources, executor } = await verifySealed(), githubToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim()
  const ci = await createUnifiedExecutorVerifier(Number(process.env.GENSHIN_EXECUTOR_RUN_ID), githubToken); assert.equal(ci.executorCommit, p.commit)
  await verifyUnifiedPublishedSource({ publication: sources.originalPublication, sourceIndex: sources.originalSourceIndex, githubToken })
  for (const ancestor of sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  const token = auth(20), before = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(sources.baseline, before); assert.deepEqual(await staging(token), load('baseline.json').staging)
  const network = await createUnifiedPreviewNetwork(proxy), accepted: any = {}
  try { for (const role of ['recovery', 'candidate']) {
    const row = s.roles[role], directory = path.join(root, 'cloud', role); mkdirSync(directory, { recursive: true }); mkdirSync(path.join(directory, 'home'))
    save(`cloud/${role}/intent.json`, { role, config: row.config, moduleSHA256: row.moduleSHA256, commit: p.commit, trafficMutation: false })
    const outfile = path.join(directory, 'uploaded.multipart'), log = path.join(directory, 'upload.log')
    await command(process.execPath, [s.tool.bin, 'versions', 'upload', '--no-bundle', '--config', row.config.path, '--env', '', '--outfile', outfile], directory,
      { ...isolatedEnvironment(path.join(directory, 'home')), CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: 'e6472b6c6172a3ac1e1596ef100543ae', HTTPS_PROXY: proxy, HTTP_PROXY: proxy }, log)
    const { versionId } = unifiedUploadResponse(readFileSync(log, 'utf8'), service), version = await readUnifiedVersion({ service, versionId, token, request: unifiedProductionRead })
    assertUploadedVersion(version, versionId, migrationPinned(row.config), before.bindings[service])
    const moduleProof = await captureUnifiedUploadedModule({ service, versionId, moduleSHA256: row.moduleSHA256, context: { role, transportPin: digest(JSON.stringify(s)), configPin: row.config.pin }, directory: path.join(directory, 'module'),
      uploadPath: outfile, uploadLogPath: log, expectedVersion: version, readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }),
      readContent: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, binary: true, request: unifiedProductionRead }) })
    const origin = exactUnifiedPreviewOrigin(service, versionId), preview = await verifyNteHTTP({ origin, references: recheckNteReferences(row.local), directory: path.join(directory, 'preview'), preview: true, request: network.request, owner: 'genshin' })
    accepted[role] = { versionId, version, moduleSHA256: row.moduleSHA256, moduleProof, preview: { path: path.join(directory, 'preview/result.json'), pin: preview.evidenceSHA256 }, origin, acceptedAt: Date.now() }
    save(`cloud/${role}/accepted.json`, accepted[role]); assertTopology(before, await desktopCloudSnapshot(token, unifiedProductionRead)); console.log(JSON.stringify({ role, versionId, preview: 'passed' }))
  } } finally { await network.close() }
  save('accepted.json', { commit: p.commit, executorCI: ci.executorCI, accepted, before }); ci.verify(); executor.verify()
} else if (phase === 'promote') {
  const { p, s, executor } = await verifySealed(), a = load('accepted.json'), token = auth(15)
  const ci = await createUnifiedExecutorVerifier(a.executorCI.runID, execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim()); assert.equal(ci.executorCommit, p.commit)
  assert.equal(a.commit, p.commit); assertTopology(a.before, await desktopCloudSnapshot(token, unifiedProductionRead)); assert.deepEqual(await staging(token), load('baseline.json').staging)
  const network = await createUnifiedPreviewNetwork(proxy), publicNetwork = await createGenshinPublicNetwork(proxy)
  try { for (const role of ['recovery', 'candidate']) {
    const row = a.accepted[role], receipt = migrationPinned(row.moduleProof)
    await revalidateUnifiedUploadedModule({ proof: row.moduleProof, service, versionId: row.versionId, moduleSHA256: row.moduleSHA256, context: receipt.context,
      readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }), readContent: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, binary: true, request: unifiedProductionRead }) })
    await verifyNteHTTP({ origin: row.origin, references: recheckNteReferences(s.roles[role].local), directory: path.join(root, `fresh-${role}`), preview: true, request: network.request, owner: 'genshin' })
  }
  executor.verify(); assertTopology(a.before, await desktopCloudSnapshot(token, unifiedProductionRead))
  await withRunLock(root, async () => {
    const journal = path.join(root, 'production.jsonl'); writeFileSync(journal, '', { flag: 'wx', mode: 0o600 })
    const record = (value: any) => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n', { flush: true })
    const versionId = a.accepted.candidate.versionId, releaseKey = digest(JSON.stringify({ policy: GENSHIN_CODE_POLICY, sealed: s, ci: a.executorCI }))
    record({ phase: 'deployment_intent', service, versionId, releaseKey })
    const writer = unifiedOwnerDeploymentWriter({ owner: 'genshin', releaseKey, versionId, token, request: fetch, recordResponse: async ({ kind, status, bytes }: any) => save(`deployment-${kind}.json`, { status, body: JSON.parse(bytes) }) })
    const deployment = await writer({ owner: 'genshin', service, versionId, releaseKey }); record({ phase: 'deployed', deployment })
    const promoted = { [service]: versionId }, after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(a.before, after, promoted)
    const publicResult = await verifyNteHTTP({ origin: 'https://gachia.com', references: recheckNteReferences(s.finalReferences), directory: path.join(root, 'public'), request: publicNetwork.request, owner: 'router' })
    assert.deepEqual(await staging(token), load('baseline.json').staging); assertTopology(after, await desktopCloudSnapshot(token, unifiedProductionRead))
    record({ phase: 'production_accepted', evidenceSHA256: publicResult.evidenceSHA256 })
    save('completion.json', { policy: GENSHIN_CODE_POLICY, status: 'production_accepted', commit: p.commit, parent, active: p.active, executorCI: a.executorCI, accepted: a.accepted, before: a.before, after, promoted, deployment,
      prepared: { path: path.join(root, 'prepared.json'), pin: digest(readFileSync(path.join(root, 'prepared.json'))) }, sealed: { path: path.join(root, 'sealed.json'), pin: digest(readFileSync(path.join(root, 'sealed.json'))) },
      journal: { path: journal, pin: digest(readFileSync(journal)) }, publicProof: { path: path.join(root, 'public/result.json'), pin: publicResult.evidenceSHA256 } })
  }) } finally { await network.close(); await publicNetwork.close() }
} else if (phase === 'advance') {
  const { p, s, sources, executor } = await verifySealed(), c = load('completion.json'), token = auth()
  assert.equal(c.status, 'production_accepted'); assertTopology(c.after, await desktopCloudSnapshot(token, unifiedProductionRead))
  const directory = path.join(root, 'published-sources'); mkdirSync(directory)
  const owners = structuredClone(sources.owners), row = c.accepted.candidate, receipt = migrationPinned(row.moduleProof), artifact = path.join(directory, 'genshin')
  cpSync(s.roles.candidate.artifact, artifact, { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false })
  const module = await multipartModule(readFileSync(receipt.archive.path)); writeFileSync(path.join(artifact, 'worker.js'), module.code)
  owners.genshin = { owner: 'genshin', service, versionId: row.versionId, directory: artifact, artifactSHA256: treePin(artifact), modulePath: receipt.archive.path, archiveSHA256: receipt.archive.pin, moduleSHA256: row.moduleSHA256,
    version: row.version, mode: 'unified_upload_time_module_receipt', moduleProof: row.moduleProof, moduleContext: receipt.context }
  const network = await createGenshinPublicNetwork(proxy)
  try { await verifyNteHTTP({ origin: 'https://gachia.com', references: recheckNteReferences(s.finalReferences), directory: path.join(directory, 'public'), request: network.request, owner: 'router' }) } finally { await network.close() }
  assertTopology(c.after, await desktopCloudSnapshot(token, unifiedProductionRead)); assert.deepEqual(await staging(token), load('baseline.json').staging)
  const proof = migrationSave(directory, 'source-index.json', { schemaVersion: 1, kind: 'nte_genshin_preserved_code_source_index_v1', status: 'published_sources_observed', previousSourceIndex: parent,
    completion: { path: path.join(root, 'completion.json'), pin: digest(readFileSync(path.join(root, 'completion.json'))) }, sourceCommit: p.commit, executorCI: c.executorCI, owners, router: sources.router,
    active: sources.value.active, baseline: c.after, workspace: p.workspace, cloudWrites: false, newPublicationAuthorized: false })
  const reopened = await readNteSourceIndex(proof); assert.equal(reopened.sources.length, 115); assert.equal(reopened.allOwnersCurrent, true); executor.verify(); save('source-result.json', proof)
} else throw Error('Unknown fixed R139 phase')
console.log(JSON.stringify({ phase, completed: true, at: new Date().toISOString() }))
