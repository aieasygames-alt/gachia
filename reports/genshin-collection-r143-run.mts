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
const phase = process.argv[2]; mkdirSync(root, { recursive: true, mode: 0o700 })
console.log(JSON.stringify({ phase, at: new Date().toISOString() }))
if (phase === 'qualify') {
  const d = migrationPinned(delivery), executor = captureUnifiedExecutorSource(repo)
  assert.equal(digest(readFileSync(d.completeExport.path)), d.completeExport.pin)
  const exported = JSON.parse(gunzipSync(readFileSync(d.completeExport.path)).toString()).result
  const input = migrationPinned(d.input), result = assertGenshinReviewedExport(input, exported), sources = await readNteSourceIndex(parent)
  assert.deepEqual(exported.recoverySources, sources.sources); assert.equal(sources.allOwnersCurrent, true)
  const prep = fromOld('consumer-prepared.json'), sealed = fromOld('consumer-sealed.json'), direct = fromOld('consumer-direct.json'), graph = fromOld('consumer-graph.json')
  verifyMainConsumerSource(repo, prep.candidate, exported.sources); verifyMainConsumerSource(repo, prep.recovery, exported.recoverySources)
  const built = fromOld('game-built.json'); assert.equal(treePin(built.artifact), built.treePin)
  const compatibility = verifyUnifiedAssetPair({ owner: 'genshin', previous: sources.owners.genshin.directory, candidate: built.artifact,
    forward: sealed.roles.candidate.artifact, recovery: sealed.roles.recovery.artifact, runtimeSHA256: sources.owners.genshin.moduleSHA256 })
  const roles: any = {}
  for (const role of ['candidate', 'recovery']) {
    const row = sealed.roles[role], config = pinned(`sealed/genshin/${role}/upload.json`)
    assert.equal(config.pin, row.configPin)
    const expected = genshinContentAssets(migrationPinned(prep[role]).workspace)
    for (const [file, bytes] of expected.files) assert.equal(digest(readFileSync(path.join(row.artifact, 'assets/_games/genshin/content', file))), digest(bytes))
    roles[role] = { ...row, config, multipart: path.join(previousRoot, 'sealed/genshin', role, 'seal/exact.multipart'), local: direct[role] }
  }
  const liveCMS = cms('qualification', exported), before = await desktopCloudSnapshot(auth(), unifiedProductionRead)
  assertTopology(sources.baseline, before)
  const changedPaths = execFileSync('git', ['diff', '--name-only', prep.commit, executor.commit], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  assert(changedPaths.every(file => /^(?:reports\/|plans\/|services\/content-cms\/)/.test(file)))
  const active = save('active.json', exported.sources)
  save('qualification.json', { policy: GENSHIN_COLLECTION_POLICY, commit: executor.commit, compiledCommit: prep.commit, repo, parent, delivery,
    input: d.input, export: d.completeExport, exportKey: result.exportKey, active, liveCMS,
    workspace: migrationPinned(prep.candidate).workspace, workspaceProof: prep.candidate, recoveryWorkspace: prep.recovery,
    buildReuse: { built: pinned('game-built.json'), changedPaths, workerBuildInputsChanged: false },
    tool: sealed.tool, roles, finalReferences: graph.candidate, recoveryReferences: graph.recovery, compatibility,
    checks: d.checks, before, staging: await staging(auth()), qualifiedAt: new Date().toISOString() })
  await qualified(); executor.verify()
} else if (phase === 'preview') {
  const { q, executor, exported, sources } = await qualified(), ci = await ciFor(q), githubToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim()
  await verifyUnifiedPublishedSource({ publication: sources.originalPublication, sourceIndex: sources.originalSourceIndex, githubToken })
  for (const ancestor of sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  cms('before-preview', exported)
  const token = auth(25), before = await desktopCloudSnapshot(token, unifiedProductionRead)
  assertTopology(q.before, before); assert.deepEqual(await staging(token), q.staging)
  const network = await createUnifiedPreviewNetwork(proxy), accepted: any = {}
  try { for (const role of ['recovery', 'candidate']) {
    const row = q.roles[role], directory = path.join(root, 'cloud', role); mkdirSync(directory, { recursive: true }); mkdirSync(path.join(directory, 'home'))
    save(`cloud/${role}/intent.json`, { role, config: row.config, moduleSHA256: row.moduleSHA256, commit: q.commit, exportKey: q.exportKey, trafficMutation: false })
    const outfile = path.join(directory, 'uploaded.multipart'), log = path.join(directory, 'upload.log')
    await command(process.execPath, [q.tool.bin, 'versions', 'upload', '--no-bundle', '--config', row.config.path, '--env', '', '--outfile', outfile], directory,
      { ...isolatedEnvironment(path.join(directory, 'home')), CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: 'e6472b6c6172a3ac1e1596ef100543ae', HTTPS_PROXY: proxy, HTTP_PROXY: proxy }, log)
    const { versionId } = unifiedUploadResponse(readFileSync(log, 'utf8'), service)
    save(`cloud/${role}/uploaded.json`, { versionId, outfile, log })
    const version = await readUnifiedVersion({ service, versionId, token, request: unifiedProductionRead })
    assertUploadedVersion(version, versionId, migrationPinned(row.config), before.bindings[service])
    const moduleProof = await captureUnifiedUploadedModule({ service, versionId, moduleSHA256: row.moduleSHA256, context: { role, transportPin: bound('qualification.json').pin, configPin: row.config.pin }, directory: path.join(directory, 'module'),
      uploadPath: outfile, uploadLogPath: log, expectedVersion: version,
      readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }),
      readContent: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, binary: true, request: unifiedProductionRead }) })
    const origin = exactUnifiedPreviewOrigin(service, versionId)
    const preview = await verifyNteHTTP({ origin, references: recheckNteReferences(row.local), directory: path.join(directory, 'preview'), preview: true, request: network.request, owner: 'genshin' })
    accepted[role] = { versionId, version, moduleSHA256: row.moduleSHA256, moduleProof, preview: { path: path.join(directory, 'preview/result.json'), pin: preview.evidenceSHA256 }, origin, acceptedAt: Date.now() }
    save(`cloud/${role}/accepted.json`, accepted[role]); assertTopology(before, await desktopCloudSnapshot(token, unifiedProductionRead)); console.log(JSON.stringify({ role, versionId, preview: 'passed' }))
  } } finally { await network.close() }
  save('accepted.json', { commit: q.commit, exportKey: q.exportKey, executorCI: ci.executorCI, accepted, before }); ci.verify(); executor.verify()
} else if (phase === 'promote') {
  const { q, executor, exported } = await qualified(), a = load('accepted.json'), ci = await ciFor(q), token = auth(20)
  assert.equal(a.commit, q.commit); assert.equal(a.exportKey, q.exportKey); assert.deepEqual(a.executorCI, ci.executorCI)
  cms('before-promote', exported)
  assertTopology(a.before, await desktopCloudSnapshot(token, unifiedProductionRead)); assert.deepEqual(await staging(token), q.staging)
  const network = await createUnifiedPreviewNetwork(proxy), publicNetwork = await createGenshinPublicNetwork(proxy)
  try { for (const role of ['recovery', 'candidate']) {
    const row = a.accepted[role], receipt = migrationPinned(row.moduleProof)
    await revalidateUnifiedUploadedModule({ proof: row.moduleProof, service, versionId: row.versionId, moduleSHA256: row.moduleSHA256, context: receipt.context,
      readVersion: (name: string, id: string) => readUnifiedVersion({ service: name, versionId: id, token, request: unifiedProductionRead }) })
    await verifyNteHTTP({ origin: row.origin, references: recheckNteReferences(q.roles[role].local), directory: path.join(root, `fresh-${role}`), preview: true, request: network.request, owner: 'genshin' })
  }
  executor.verify(); assertTopology(a.before, await desktopCloudSnapshot(token, unifiedProductionRead))
  await withRunLock(root, async () => {
    const journal = path.join(root, 'production.jsonl'); writeFileSync(journal, '', { flag: 'wx', mode: 0o600 })
    const record = (value: any) => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n', { flush: true })
    const versionId = a.accepted.candidate.versionId, releaseKey = digest(JSON.stringify({ policy: GENSHIN_COLLECTION_POLICY, qualification: bound('qualification.json'), ci: a.executorCI }))
    record({ phase: 'deployment_intent', service, versionId, releaseKey })
    const writer = unifiedOwnerDeploymentWriter({ owner: 'genshin', releaseKey, versionId, token, request: fetch,
      recordResponse: async ({ kind, status, bytes }: any) => save(`deployment-${kind}.json`, { status, body: JSON.parse(bytes), raw: bytes.toString() }) })
    const deployment = await writer({ owner: 'genshin', service, versionId, releaseKey }); record({ phase: 'deployed', deployment })
    save('deployed.json', { deployment, versionId, releaseKey })
    const promoted = { [service]: versionId }, after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(a.before, after, promoted)
    const publicResult = await verifyNteHTTP({ origin: 'https://gachia.com', references: recheckNteReferences(q.finalReferences), directory: path.join(root, 'public'), request: publicNetwork.request, owner: 'router' })
    assert.deepEqual(await staging(token), q.staging); assertTopology(after, await desktopCloudSnapshot(token, unifiedProductionRead))
    record({ phase: 'production_accepted', evidenceSHA256: publicResult.evidenceSHA256 })
    save('completion.json', { policy: GENSHIN_COLLECTION_POLICY, status: 'production_accepted', commit: q.commit, parent, exportKey: q.exportKey,
      executorCI: a.executorCI, accepted: a.accepted, before: a.before, after, promoted, deployment,
      qualification: bound('qualification.json'), journal: bound('production.jsonl'), publicProof: { path: path.join(root, 'public/result.json'), pin: publicResult.evidenceSHA256 } })
  }) } finally { await network.close(); await publicNetwork.close() }
  ci.verify(); executor.verify()
} else if (phase === 'advance') {
  const { q, executor, exported, sources } = await qualified(), c = load('completion.json'), token = auth()
  assert.equal(c.status, 'production_accepted'); assertTopology(c.after, await desktopCloudSnapshot(token, unifiedProductionRead))
  cms('after-production', exported)
  const directory = path.join(root, 'published-sources'); mkdirSync(directory)
  const owners = structuredClone(sources.owners), row = c.accepted.candidate, receipt = migrationPinned(row.moduleProof), artifact = path.join(directory, 'genshin')
  execFileSync('/bin/cp', ['-cR', q.roles.candidate.artifact, artifact])
  const module = await multipartModule(readFileSync(receipt.archive.path)); writeFileSync(path.join(artifact, 'worker.js'), module.code)
  owners.genshin = { owner: 'genshin', service, versionId: row.versionId, directory: artifact, artifactSHA256: treePin(artifact), modulePath: receipt.archive.path,
    archiveSHA256: receipt.archive.pin, moduleSHA256: row.moduleSHA256, version: row.version, mode: 'unified_upload_time_module_receipt', moduleProof: row.moduleProof, moduleContext: receipt.context }
  const network = await createGenshinPublicNetwork(proxy)
  try { await verifyNteHTTP({ origin: 'https://gachia.com', references: recheckNteReferences(q.finalReferences), directory: path.join(directory, 'public'), request: network.request, owner: 'router' }) } finally { await network.close() }
  assertTopology(c.after, await desktopCloudSnapshot(token, unifiedProductionRead)); assert.deepEqual(await staging(token), q.staging)
  const active = migrationSave(directory, 'active.json', exported.sources)
  const proof = migrationSave(directory, 'source-index.json', { schemaVersion: 1, kind: 'nte_genshin_reviewed_collection_source_index_v1', status: 'published_sources_observed',
    previousSourceIndex: parent, completion: bound('completion.json'), sourceCommit: q.commit, executorCI: c.executorCI, owners, router: sources.router,
    active, baseline: c.after, workspace: q.workspace, cloudWrites: false, newPublicationAuthorized: false })
  const reopened = await readNteSourceIndex(proof); assert.equal(reopened.sources.length, 115); assert.equal(reopened.allOwnersCurrent, true)
  executor.verify(); save('source-result.json', proof)
} else throw Error('Expected qualify, preview, promote or advance')
console.log(JSON.stringify({ phase, completed: true, at: new Date().toISOString() }))
