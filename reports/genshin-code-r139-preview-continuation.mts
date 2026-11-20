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

// Bounded continuation after the recovery module GET timed out. Reuse its UUID;
// the candidate has no prior intent. No retry of either remote write.
const { p, s, sources, executor } = await verifySealed();
const githubToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const ci = await createUnifiedExecutorVerifier(44739474406, githubToken); assert.equal(ci.executorCommit, p.commit);
await verifyUnifiedPublishedSource({ publication: sources.originalPublication, sourceIndex: sources.originalSourceIndex, githubToken });
for (const ancestor of sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor);
const token = auth(20), before = await desktopCloudSnapshot(token, unifiedProductionRead);
assertTopology(sources.baseline, before); assert.deepEqual(await staging(token), load('baseline.json').staging);
const network = await createUnifiedPreviewNetwork(proxy), accepted: any = {};
const { request: playwright } = await import('@playwright/test');
const binaryClient = await playwright.newContext({ proxy: { server: proxy }, ignoreHTTPSErrors: false,
  timeout: 180000, storageState: { cookies: [], origins: [] } });
const binaryRead = async (name: string, id: string) => {
  assert.equal(name, service); exactUnifiedPreviewOrigin(name, id);
  const response = await binaryClient.get(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${name}/content/v2?version=${id}`,
    { headers: { authorization: 'Bearer ' + token, connection: 'close', cookie: '' }, maxRedirects: 0, maxRetries: 0, timeout: 180000 });
  try { assert.equal(response.status(), 200); const archive = await response.body(); assert(archive.length <= 16 * 1024 * 1024);
    return { archive, etag: response.headers().etag }; } finally { await response.dispose() }
};
save('preview-continuation-intent.json', { at: new Date().toISOString(), previousFailure: { path: path.join(root, 'cloud/recovery/module/failure.json'), pin: digest(readFileSync(path.join(root, 'cloud/recovery/module/failure.json'))) },
  recoveryVersionId: '7a582287-242c-4b6a-8364-1aa9e311ba89', noRecoveryReupload: true, binaryReadRoute: 'isolated Playwright client through explicit loopback HTTP proxy; GET only; zero automatic retries',
  procedure: { path: import.meta.filename, pin: digest(readFileSync(import.meta.filename)) }, commit: p.commit, executorCI: ci.executorCI, before });
try { for (const role of ['recovery', 'candidate']) {
  const row = s.roles[role], directory = path.join(root, 'cloud', role), outfile = path.join(directory, 'uploaded.multipart'), log = path.join(directory, 'upload.log');
  if (role === 'recovery') {
    assert.deepEqual(load('cloud/recovery/intent.json'), { role, config: row.config, moduleSHA256: row.moduleSHA256, commit: p.commit, trafficMutation: false });
    assert.equal(unifiedUploadResponse(readFileSync(log, 'utf8'), service).versionId, '7a582287-242c-4b6a-8364-1aa9e311ba89');
    assert.equal((await multipartModule(readFileSync(outfile))).moduleSHA256, row.moduleSHA256);
  } else {
    assert(!existsSync(directory), 'Existing candidate intent must be reconciled, never replayed');
    mkdirSync(directory); mkdirSync(path.join(directory, 'home'));
    save(`cloud/${role}/intent.json`, { role, config: row.config, moduleSHA256: row.moduleSHA256, commit: p.commit, trafficMutation: false });
    await command(process.execPath, [s.tool.bin, 'versions', 'upload', '--no-bundle', '--config', row.config.path, '--env', '', '--outfile', outfile], directory,
      { ...isolatedEnvironment(path.join(directory, 'home')), CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: 'e6472b6c6172a3ac1e1596ef100543ae', HTTPS_PROXY: proxy, HTTP_PROXY: proxy }, log);
  }
  const { versionId } = unifiedUploadResponse(readFileSync(log, 'utf8'), service);
  const version = await readUnifiedVersion({ service, versionId, token, request: unifiedProductionRead });
  assertUploadedVersion(version, versionId, migrationPinned(row.config), before.bindings[service]);
  const moduleProof = await captureUnifiedUploadedModule({ service, versionId, moduleSHA256: row.moduleSHA256,
    context: { role, transportPin: digest(JSON.stringify(s)), configPin: row.config.pin }, directory: path.join(directory, role === 'recovery' ? 'module-02' : 'module'),
    uploadPath: outfile, uploadLogPath: log, expectedVersion: version,
    readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }), readContent: binaryRead });
  const origin = exactUnifiedPreviewOrigin(service, versionId);
  const preview = await verifyNteHTTP({ origin, references: recheckNteReferences(row.local), directory: path.join(directory, 'preview'), preview: true, request: network.request, owner: 'genshin' });
  accepted[role] = { versionId, version, moduleSHA256: row.moduleSHA256, moduleProof, preview: { path: path.join(directory, 'preview/result.json'), pin: preview.evidenceSHA256 }, origin, acceptedAt: Date.now() };
  save(`cloud/${role}/accepted.json`, accepted[role]); assertTopology(before, await desktopCloudSnapshot(token, unifiedProductionRead));
  console.log(JSON.stringify({ role, versionId, preview: 'passed', existingRecoveryUploadReused: role === 'recovery' }));
} } finally { await network.close(); await binaryClient.dispose() }
save('accepted.json', { commit: p.commit, executorCI: ci.executorCI, accepted, before }); ci.verify(); executor.verify();
console.log(JSON.stringify({ phase: 'preview_continuation', completed: true, at: new Date().toISOString() }));
