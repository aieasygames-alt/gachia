// Fixed R139 code/resource publication. Content comes exclusively from published R134 A.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
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
import { GENSHIN_COLLECTION_POLICY, assertGenshinReviewedExport } from '../services/content-cms/src/genshin-collection-publication.ts'
import { readNteSourceIndex } from '../services/content-cms/src/nte-release-history.ts'
import { freezeMainConsumerSource, verifyMainConsumerSource } from '../services/content-cms/src/main-consumer-source.ts'
import { captureUnifiedExecutorSource } from '../services/content-cms/src/unified-executor-source.ts'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from '../services/content-cms/src/unified-production.ts'
import { verifyUnifiedPublishedSource } from '../services/content-cms/src/unified-source-advance.ts'
import { nteLocalConfig, nteRequests, nteRuntimeConfig } from '../services/content-cms/src/nte-release-bundle.ts'

const repo = path.resolve(import.meta.dirname, '..'), root = path.join(repo, 'reports/genshin-collection-production-2026-11-21-r143')
const parent = { path: path.join(repo, 'reports/genshin-code-production-2026-11-20-r139/published-sources/source-index.json'), pin: '59b5831d8547d02b37c4052506e777a11d6d75fbfc1d604a0a3412010cb99fca' }
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
const previousRoot = path.join(repo, 'reports/genshin-collection-review-2026-11-21-r142')
const delivery = { path: path.join(previousRoot, 'delivery-final.json'), pin: '6e3ae59eb8f2e6d4284ea88d59f20837ca87a2c328e6adbcb7834d4f46276907' }
const bound = (file: string) => ({ path: path.join(root, file), pin: digest(readFileSync(path.join(root, file))) })
const fromOld = (file: string) => JSON.parse(readFileSync(path.join(previousRoot, file), 'utf8'))
const pinned = (file: string) => ({ path: path.join(previousRoot, file), pin: digest(readFileSync(path.join(previousRoot, file))) })
function cms(stage: string, exported: any) {
  execFileSync('python3', [path.join(repo, 'reports/genshin-collection-r143-cms.py'), stage], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] })
  assert.deepEqual(load(`cms-${stage}.json`).result, exported, 'Live installed review/export drift')
  return bound(`cms-${stage}.json`)
}
async function qualified() {
  const q = load('qualification.json'), executor = captureUnifiedExecutorSource(repo)
  assert.equal(q.commit, executor.commit); migrationPinned(delivery)
  const bytes = readFileSync(q.export.path); assert.equal(digest(bytes), q.export.pin)
  const exported = JSON.parse(gunzipSync(bytes).toString()).result
  assertGenshinReviewedExport(migrationPinned(q.input), exported)
  assert.deepEqual(exported.sources, migrationPinned(q.active))
  const sources = await readNteSourceIndex(parent)
  assert.deepEqual(exported.recoverySources, sources.sources)
  verifyMainConsumerSource(repo, q.workspaceProof, exported.sources)
  const diff = execFileSync('git', ['diff', '--name-only', q.compiledCommit, q.commit], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  assert(diff.every(file => /^(?:reports\/|plans\/|services\/content-cms\/)/.test(file)), 'Worker build inputs changed since R142')
  assert.deepEqual(diff, q.buildReuse.changedPaths)
  for (const role of ['candidate', 'recovery']) {
    const row = q.roles[role]; assert.equal(treePin(row.artifact), row.artifactPin)
    const cfg = migrationPinned(row.config), exact = await multipartModule(readFileSync(row.multipart))
    assert.equal(cfg.name, service); assertUploadMetadata(exact.metadata, cfg); assert.equal(exact.moduleSHA256, row.moduleSHA256)
    recheckNteReferences(row.local)
  }
  recheckNteReferences(q.finalReferences); recheckNteReferences(q.recoveryReferences); executor.verify()
  return { q, executor, exported, sources }
}
async function ciFor(q: any) {
  const run = Number(process.env.GENSHIN_EXECUTOR_RUN_ID || load('executor-ci.json').runID)
  const ci = await createUnifiedExecutorVerifier(run, execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim())
  assert.equal(ci.executorCommit, q.commit); return ci
}
// Read-only finalization after the deployment and all 1,960 public checks passed.
const executor = captureUnifiedExecutorSource(repo), q = load('qualification.json'), a = load('accepted.json'), d = load('deployed.json')
assert.equal(executor.commit, q.commit); assert.equal(a.commit, q.commit)
const ci = await ciFor(q); assert.deepEqual(ci.executorCI, a.executorCI)
const token = auth(15), versionId = a.accepted.candidate.versionId, promoted = { [service]: versionId }
assert.equal(d.versionId, versionId); assert.equal(d.deployment.versionId, versionId)
const creation = load('deployment-creation.json'), detail = load('deployment-verification.json')
assert.equal(creation.status, 200); assert.equal(detail.status, 200)
assert.equal(creation.body.result.id, d.deployment.deploymentId)
assert.equal(detail.body.result.id, d.deployment.deploymentId)
assert.deepEqual(detail.body.result.versions, [{ version_id: versionId, percentage: 100 }])
for (const role of ['candidate', 'recovery']) {
 const row = a.accepted[role], freshFile = `fresh-${role}/result.json`
 assert.equal(treePin(q.roles[role].artifact), q.roles[role].artifactPin)
 recheckNteHTTP({ proof: bound(freshFile), origin: row.origin, references: recheckNteReferences(q.roles[role].local), preview: true })
}
const publicProof = bound('public/result.json')
recheckNteHTTP({ proof: publicProof, origin: 'https://gachia.com', references: recheckNteReferences(q.finalReferences) })
const after = await desktopCloudSnapshot(token, unifiedProductionRead)
assertTopology(a.before, after, promoted); assert.equal(after.services[service].id, d.deployment.deploymentId)
assert.deepEqual(await staging(token), q.staging)
assertTopology(after, await desktopCloudSnapshot(token, unifiedProductionRead))
const reconciliation = save('post-public-reconciliation.json', { kind: 'read_only_controlplane_finalization', at: new Date().toISOString(),
 originalLog: bound('../r143-promote-01.log'), failure: 'Router subdomain GET connect timeout after deployment and complete public acceptance',
 cloudWrites: 0, deploymentPOSTs: 0, publicRequestsReplayed: 0,
 network: { nodeUseEnvProxy: process.env.NODE_USE_ENV_PROXY, HTTPS_PROXY: process.env.HTTPS_PROXY, NO_PROXY: process.env.NO_PROXY, tlsVerification: true },
 procedure: { path: import.meta.filename, pin: digest(readFileSync(import.meta.filename)) }, after })
await withRunLock(root, async () => {
 const journal = path.join(root, 'production.jsonl'), rows = readFileSync(journal, 'utf8').trim().split('\n').map(JSON.parse)
 assert.deepEqual(rows.map((row: any) => row.phase), ['deployment_intent', 'deployed'])
 assert.deepEqual(rows[1].deployment, d.deployment); assert.equal(rows[0].versionId, versionId)
 executor.verify()
 appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), phase: 'production_accepted', evidenceSHA256: publicProof.pin }) + '\n', { flush: true })
 save('completion.json', { policy: GENSHIN_COLLECTION_POLICY, status: 'production_accepted', commit: q.commit, parent, exportKey: q.exportKey,
 executorCI: a.executorCI, accepted: a.accepted, before: a.before, after, promoted, deployment: d.deployment,
 qualification: bound('qualification.json'), journal: bound('production.jsonl'), publicProof, reconciliation })
})
ci.verify(); executor.verify(); console.log(JSON.stringify({ completed: true, cloudWrites: 0, deploymentPOSTs: 0, versionId, publicChecksPassed: 1960 }))
