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
const oldPrepared = load('prepared.json'), oldBuilt = load('built.json'), executor = captureUnifiedExecutorSource(repo)
assert.notEqual(oldPrepared.commit, executor.commit)
const unchanged = execFileSync('git', ['diff', '--name-only', oldPrepared.commit, executor.commit, '--', '.', ':(exclude)reports/genshin-code-r139-run.mts', ':(exclude)services/content-cms/src/character-dependency-preview.ts'], { cwd: repo, encoding: 'utf8' })
assert.equal(unchanged, '', 'Build reuse permits only the reviewed CMS pin and loopback-config change')
assert.equal(treePin(oldBuilt.artifact), oldBuilt.treePin)
const sources = await readNteSourceIndex(parent)
const workspaceProof = freezeMainConsumerSource(repo, executor.commit, sources.sources, path.join(root, 'frozen-02'))
const workspace = migrationPinned(workspaceProof).workspace
// Reuse installed dependencies without changing either frozen source inventory.
for (const app of ['web', 'game-genshin', 'game-nte']) {
  const target = path.join(workspace, 'apps', app, 'node_modules')
  execFileSync('ln', ['-s', path.join(oldPrepared.workspace, 'apps', app, 'node_modules'), target])
}
const oldPreparedProof = { path: path.join(root, 'prepared-5b5ff68.json'), pin: digest(readFileSync(path.join(root, 'prepared.json'))) }
const oldBuiltProof = { path: path.join(root, 'built-5b5ff68.json'), pin: digest(readFileSync(path.join(root, 'built.json'))) }
execFileSync('mv', [path.join(root, 'prepared.json'), oldPreparedProof.path]); execFileSync('mv', [path.join(root, 'built.json'), oldBuiltProof.path])
const p = { ...oldPrepared, commit: executor.commit, workspaceProof, workspace, previousPreparation: oldPreparedProof }
save('prepared.json', p)
save('built.json', { ...oldBuilt, commit: executor.commit, compiledCommit: oldPrepared.commit, reusedBuild: oldBuiltProof, unchangedWorkerBuildInputs: true })
save('build-reuse.json', { commit: executor.commit, compiledCommit: oldPrepared.commit, oldPreparedProof, oldBuiltProof, workspaceProof,
  allowedDifferences: ['reports/genshin-code-r139-run.mts', 'services/content-cms/src/character-dependency-preview.ts'], workerBuildInputDiff: unchanged, sourcesPreserved: sources.sources.length })
const tool = unifiedTransportTool(p.workspace), sealed: any = { commit: p.commit, parent, tool, roles: {} }
for (const role of ['recovery', 'candidate']) {
  const directory = path.join(root, 'sealed/genshin', role), artifact = path.join(directory, 'artifact')
  const upload = path.join(directory, 'upload.json'), exact = await multipartModule(readFileSync(path.join(directory, 'seal/exact.multipart')))
  const configPin = digest(readFileSync(upload)); assertUploadMetadata(exact.metadata, JSON.parse(readFileSync(upload, 'utf8')))
  sealed.roles[role] = { artifact, artifactPin: treePin(artifact), configPin, moduleSHA256: exact.moduleSHA256, config: { path: upload, pin: configPin } }
}
for (const role of ['recovery', 'candidate']) {
  sealed.roles[role].local = await localGraph(sources, p, sealed, role, true)
  sealed[role === 'candidate' ? 'finalReferences' : 'recoveryReferences'] = await localGraph(sources, p, sealed, role, false)
}
save('sealed.json', sealed); await verifySealed(); executor.verify(); console.log('R139 build reuse and local acceptance passed; no cloud write')
