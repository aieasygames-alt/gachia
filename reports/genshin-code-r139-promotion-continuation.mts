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

// Read-only acceptance after the original POST succeeded and its first detail
// GET returned 404. Reconciliation observed the same deployment via a 200 GET.
const { p, executor } = prepared(), s = load('sealed.json'), a = load('accepted.json'), token = auth(15);
assert.equal(digest(readFileSync(path.join(root, 'sealed.json'))), 'ea780b7635b89018ab1d95a8921b604501e330ae2114e356c7a365934e5329db');
assert.equal(s.commit, p.commit); assert.equal(a.commit, p.commit); migrationPinned(parent);
for (const role of ['recovery', 'candidate']) {
  assert.equal(treePin(s.roles[role].artifact), s.roles[role].artifactPin); migrationPinned(s.roles[role].config);
  const accepted = a.accepted[role], receipt = migrationPinned(accepted.moduleProof);
  await revalidateUnifiedUploadedModule({ proof: accepted.moduleProof, service, versionId: accepted.versionId,
    moduleSHA256: s.roles[role].moduleSHA256, context: receipt.context,
    readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }) });
  const file = path.join(root, `fresh-${role}/result.json`);
  recheckNteHTTP({ proof: { path: file, pin: digest(readFileSync(file)) }, origin: accepted.origin,
    references: recheckNteReferences(s.roles[role].local), preview: true });
}
const ci = await createUnifiedExecutorVerifier(a.executorCI.runID, execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim());
assert.equal(ci.executorCommit, p.commit);
const creation = load('deployment-creation.json'), verified = load('deployment-verification-02.json'), versionId = a.accepted.candidate.versionId;
assert.equal(creation.status, 200); assert.equal(creation.body.success, true);
assert.equal(verified.status, 200); assert.equal(verified.body.success, true);
assert.equal(verified.body.result.id, creation.body.result.id); assert.equal(verified.body.result.strategy, 'percentage');
assert.deepEqual(verified.body.result.versions, [{ version_id: versionId, percentage: 100 }]);
const bound = (name: string) => ({ path: path.join(root, name), pin: digest(readFileSync(path.join(root, name))) });
const promoted = { [service]: versionId }, beforeAcceptance = await desktopCloudSnapshot(token, unifiedProductionRead);
assertTopology(a.before, beforeAcceptance, promoted); assert.equal(beforeAcceptance.services[service].id, creation.body.result.id);
assert.deepEqual(await staging(token), load('baseline.json').staging);
const journal = path.join(root, 'production.jsonl'), rows = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(rows.length, 1); assert.equal(rows[0].phase, 'deployment_intent'); assert.equal(rows[0].versionId, versionId);
assert.equal(rows[0].releaseKey, digest(JSON.stringify({ policy: GENSHIN_CODE_POLICY, sealed: s, ci: a.executorCI })));
const reconciliation = save('promotion-reconciliation.json', { at: new Date().toISOString(), status: 'created_deployment_confirmed_active',
  creation: bound('deployment-creation.json'), initialDetailFailure: bound('deployment-verification.json'), successfulDetail: bound('deployment-verification-02.json'),
  controlplane: bound('deployment-reconciliation-snapshot.json'), freshControlplane: beforeAcceptance,
  executorCI: ci.executorCI, procedure: { path: import.meta.filename, pin: digest(readFileSync(import.meta.filename)) }, cloudWrites: false,
  deploymentPOSTsThisContinuation: 0, rollbackAttempted: false });
const deployment = { deploymentId: creation.body.result.id, service, versionId, releaseKey: rows[0].releaseKey,
  responses: { creation: { status: 200, structuredReceipt: bound('deployment-creation.json') },
    verification: { status: 200, sha256: digest(verified.raw), bytes: Buffer.byteLength(verified.raw), receipt: bound('deployment-verification-02.json') } }, reconciliation };
const publicNetwork = await createGenshinPublicNetwork(proxy);
try { await withRunLock(root, async () => {
  assert.equal(readFileSync(journal, 'utf8').trim().split('\n').length, 1);
  const record = (value: any) => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n', { flush: true });
  executor.verify(); record({ phase: 'deployed', deployment });
  const publicResult = await verifyNteHTTP({ origin: 'https://gachia.com', references: recheckNteReferences(s.finalReferences),
    directory: path.join(root, 'public'), request: publicNetwork.request, owner: 'router' });
  const after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(a.before, after, promoted);
  assert.deepEqual(await staging(token), load('baseline.json').staging); assertTopology(after, await desktopCloudSnapshot(token, unifiedProductionRead));
  record({ phase: 'production_accepted', evidenceSHA256: publicResult.evidenceSHA256 });
  save('completion.json', { policy: GENSHIN_CODE_POLICY, status: 'production_accepted', commit: p.commit, parent, active: p.active,
    executorCI: a.executorCI, accepted: a.accepted, before: a.before, after, promoted, deployment,
    prepared: bound('prepared.json'), sealed: bound('sealed.json'), journal: bound('production.jsonl'),
    publicProof: { path: path.join(root, 'public/result.json'), pin: publicResult.evidenceSHA256 } });
  ci.verify(); executor.verify();
}) } finally { await publicNetwork.close() }
console.log(JSON.stringify({ phase: 'promotion_reconciled', completed: true, versionId, deploymentId: deployment.deploymentId, cloudWrites: false }));
