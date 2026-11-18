import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { artifactFiles, withLocalWorker } from '../../../scripts/desktop-publish.mjs'
import { activeVersion } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB, treeBytes } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertUploadMetadata, multipartModule, normalizedBindings } from '../../../scripts/desktop-cloud-transport.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs'
import { nteContentAssets } from '../../../scripts/nte-content-assets.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { sealMigrationOwner } from '../../../scripts/genshin-migration-prepare.mjs'
import { prepareNteMigrationRecovery, verifyNteMigrationRecovery } from '../../../scripts/genshin-migration-recovery.mjs'
import { assertMigrationRouterMetadata } from '../../../scripts/genshin-migration-router.mjs'
import { nteReleaseConfig, NTE_MIGRATION_ORDER, NTE_SERVICES } from '../../../scripts/nte-release-config.mjs'
import { captureNteHTTP, recheckNteReferences } from '../../../scripts/nte-release-http.mjs'
import { prepareUnifiedAssetPair, unifiedStaticFiles, verifyUnifiedAssetPair } from '../../../scripts/unified-release-assets.mjs'
import { unifiedTransportTool, verifyUnifiedTool } from '../../../scripts/unified-cloud-module.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { mainManifests } from '../../../packages/data/scripts/main-manifests.mjs'
import { verifyNteDataOnlyBuild, verifyNteMigrationBuild } from './nte-migration-build'
import { readNteSourceIndex } from './nte-release-history'
import { frozenNteMaterialTextPairContract, frozenCharacterTextPairContract, validateUnifiedConsumer, verifyUnifiedOwnerBuild } from './unified-owner-build'
import { NTE_MATERIAL_PRODUCTION_SCOPE, NTE_PRODUCTION_SCOPE } from './unified-genshin-production-scope'
import { nteCharacterDisplayIds } from '../../../packages/data/games/nte/character-identity'

type Proof = { path: string; pin: string }
const appFor: Record<string, string> = { nte: 'game-nte', router: 'router', main: 'web' }
const services: Record<string, string> = NTE_SERVICES
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
export function nteRuntimeConfig(workspace: string, owner: string, role: string, migration: boolean) {
  return nteReleaseConfig(owner, readFileSync(path.join(workspace, 'apps', appFor[owner], 'wrangler.jsonc'), 'utf8'), role, migration)
}
function assertBaselineConfiguration(workspace: string, baseline: any, migration: boolean) {
  for (const owner of NTE_MIGRATION_ORDER) {
    const config = nteRuntimeConfig(workspace, owner, 'recovery', migration), service = services[owner], settings = baseline.settings[service]
    const bindings: any[] = [...(owner === 'router' ? [] : [{ name: 'ASSETS', type: 'assets' }]),
      ...Object.entries(config.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
      ...(config.services ?? []).map((row: any) => ({ name: row.binding, type: 'service', service: row.service })),
      ...(config.d1_databases ?? []).map((row: any) => ({ name: row.binding, type: 'd1', id: row.database_id })),
      ...(config.r2_buckets ?? []).map((row: any) => ({ name: row.binding, type: 'r2_bucket', bucket_name: row.bucket_name }))]
    const secrets = owner === 'main' ? ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'INDEXNOW_AUTH_TOKEN'] : owner === 'router' ? ['GENSHIN_CANARY_TOKEN'] : []
    bindings.push(...secrets.map(name => ({ name, type: 'secret_text' })))
    assert.deepEqual(normalizedBindings(settings.bindings), normalizedBindings(bindings)); assert.deepEqual(normalizedBindings(baseline.bindings[service]), normalizedBindings(bindings))
    assert.equal(settings.compatibility_date, config.compatibility_date); assert.deepEqual(settings.compatibility_flags ?? [], config.compatibility_flags ?? [])
    assert.deepEqual(settings.tags, owner === 'nte' ? [] : ['cf:service=' + service]); assert.deepEqual(baseline.subdomains[service], { enabled: true, previews_enabled: true })
  }
}
export function nteLocalConfig(config: any, owner: string, artifact: string | undefined, module: string) {
  const service: Record<string, string> = { ...NTE_SERVICES, genshin: 'gachia-game-genshin' }
  const local = { name: 'nte-release-' + owner, main: module, no_bundle: true, compatibility_date: config.compatibility_date,
    compatibility_flags: config.compatibility_flags ?? [], vars: config.vars,
    services: (config.services ?? []).map((row: any) => ({ binding: row.binding,
      service: Object.entries(service).find(([, name]) => name === row.service) ? 'nte-release-' + Object.entries(service).find(([, name]) => name === row.service)![0] : 'nte-release-unused' })) } as any
  if (owner !== 'router') local.assets = { binding: 'ASSETS', directory: path.join(artifact!, 'assets') }
  if (owner === 'main') Object.assign(local, { d1_databases: [{ binding: 'DB', database_name: 'nte-release-local-only', database_id: '00000000-0000-0000-0000-000000000000' }], r2_buckets: [{ binding: 'IMAGES', bucket_name: 'nte-release-local-only' }] })
  return local
}
async function inputs(build: Proof, sourceIndex: Proof, migration: boolean, depth = 0) {
  const sources = await readNteSourceIndex(sourceIndex, depth + 1)
  const dataOnly = !migration && migrationPinned(build).kind === 'nte_data_only_build'
  const built: any = migration ? verifyNteMigrationBuild(build) : dataOnly ? verifyNteDataOnlyBuild(build) : verifyUnifiedOwnerBuild(path.dirname(build.path), build.pin)
  const workspace = migration ? built.workspace : dataOnly ? built.workspace : path.join(built.directory, 'source')
  assertBaselineConfiguration(workspace, sources.baseline, migration)
  if (!migration) {
    if (!dataOnly) {
      assert.equal(build.path, path.join(built.directory, 'build.json')); assert([NTE_PRODUCTION_SCOPE, NTE_MATERIAL_PRODUCTION_SCOPE].includes(built.frozen.productionScope))
      assert.equal(built.frozen.localScope, undefined); assert.equal(built.receipt.preview, false); assert.deepEqual(built.frozen.owners, ['nte'])
    }
    assert.equal(sources.value.kind.startsWith('nte_'), true, 'NTE editorial release requires the completed one-time migration')
  }
  const active = migrationPinned(migration ? built.value.active : dataOnly ? built.value.baseline : { path: path.join(built.directory, 'active.json'), pin: built.frozen.activePin })
  assert.deepEqual(active.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)),
    sources.sources.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)))
  const expected = nteContentAssets(workspace), candidateSources = dataOnly ? built.candidateSources.map((row: any) => ({ ...row, text: readFileSync(path.join(path.dirname(build.path), row.file), 'utf8') })) : sources.sources.map((row: any) => {
    const text = readFileSync(path.join(workspace, row.sourcePath), 'utf8'); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
  })
  const contract = migration || dataOnly ? undefined : built.frozen.productionScope === NTE_MATERIAL_PRODUCTION_SCOPE ? frozenNteMaterialTextPairContract(built.directory, built.frozen) : frozenCharacterTextPairContract(built.directory, built.frozen)
  if (migration) assert.deepEqual(candidateSources, sources.sources)
  else if (!dataOnly) {
    assert(contract)
    assert.equal(contract.candidate.changes.length, 1); assert.equal(contract.candidate.changes[0].game, 'nte')
    assert.notEqual(expected.manifest.version, nteContentAssets(sources.workspace).manifest.version)
  } else assert(built.value.changedPaths.length > 0) // verifyNteDataOnlyBuild enforces the exact source/reader correction.
  return { sources, built, workspace, expected, candidateSources, contract, dataOnly }
}
export async function nteRequests(workspace: string, owner: string, role: string, artifact: string | undefined, migration: boolean, sources: any[], contract?: any) {
  const requests: any[] = [], values = new Map<string, any>(), add = (url: string, status = 200, value?: any) => {
    if (!requests.some(row => row.path === url)) requests.push({ path: url, status })
    if (value !== undefined) values.set(url, value)
  }
  add('/sitemap.xml'); add('/robots.txt')
  const nte = nteContentAssets(workspace), genshin = genshinContentAssets(workspace)
  if (owner === 'nte') for (const [file, bytes] of nte.files) add(nte.contract.prefix + '/' + file, 200, JSON.parse(bytes))
  if (owner !== 'nte') {
    for (const url of ['/zh', '/en', '/ja', '/en/starrail/version', '/zh/ananta/guides/download-install-guide']) add(url)
    add('/api/auth/get-session', 404)
    const pairs = JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8')).pairs
    for (const pair of pairs) {
      const source = sources.find(row => row.sourcePath === 'packages/data/games/' + pair); assert(source)
      const absent = owner === 'main' && (pair.startsWith('genshin/') || (role === 'candidate' && pair.startsWith('nte/')))
        || owner === 'router' && pair === 'nte/raw-image-sources.json' && (!migration || role === 'candidate')
      add('/data/' + pair, absent ? 404 : 200, absent ? undefined : JSON.parse(source.text))
    }
    if (owner === 'router' && (!migration || role === 'candidate')) add('/data/nte/raw-character-summaries.json', 200, JSON.parse(nte.files.get('data/raw-character-summaries.json')))
    for (const [file, value] of await mainManifests(pathToFileURL(path.join(workspace, 'packages/data/games/')))) {
      const next: any = structuredClone(value), data = file === 'games.json' ? next.games : next
      if (owner === 'main') { delete data.genshin; if (role === 'candidate') delete data.nte }
      add('/data-manifest/' + file, 200, next)
    }
    for (const [url, value] of [['/data-client/genshin-platform.json', JSON.parse(genshin.files.get('platform.json'))],
      ['/data-client/tier-list-genshin.json', JSON.parse(genshin.files.get('tier-list.json')).data],
      ['/data-client/nte-platform.json', JSON.parse(nte.files.get('platform.json'))]] as const) {
      const absent = owner === 'main' || (migration && owner === 'router' && role === 'recovery' && url.includes('nte-platform'))
      add(url, absent ? 404 : 200, absent ? undefined : value)
    }
  }
  if (owner !== 'main') {
    const materials = JSON.parse(nte.files.get('data/raw-materials.json'))
    const ownership = JSON.parse(readFileSync(path.join(workspace, 'packages/core/route-ownership.json'), 'utf8')).games.nte
    for (const lang of ['zh', 'en', 'ja']) {
      for (const page of ['', ...ownership.pages, 'characters/nanally']) add(`/${lang}/nte/${page}`.replace(/\/$/, ''))
      for (const item of materials) add(`/${lang}/nte/items/${item.id}`, migration && owner === 'nte' && role === 'recovery' ? 404 : 200)
      add(`/${lang}/nte/items/nonexistent-material`, 404)
      if (owner === 'router') for (const page of ['characters/hu-tao', 'items/silk-flower', 'guides/banner-schedule-guide']) add(`/${lang}/genshin/${page}`)
    }
    // Historical bundles keep their original graph. Corrected readers must prove every
    // material consumer, including both canonical Zero display variants, before upload.
    if (readFileSync(path.join(workspace, 'apps/game-nte/lib/data.ts'), 'utf8').includes('const relationId = nteCharacterMaterialRelationId(id);')) {
      const relations = JSON.parse(nte.files.get('data/raw-character-materials.json')!.toString())
      for (const row of relations) for (const id of nteCharacterDisplayIds(row.characterId)) for (const lang of ['zh', 'en', 'ja']) {
        const url = `/${lang}/nte/characters/${id}`; add(url)
        requests.find(request => request.path === url).contains = ['class="material-table"']
      }
    }
  } else for (const lang of ['zh', 'en', 'ja']) add(`/${lang}/nte/items/tri-key`, role === 'candidate' ? 404 : 200)
  if (artifact && owner !== 'router') for (const file of unifiedStaticFiles(artifact, owner)) {
    const url = '/' + file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/'); add(url)
    requests.find(row => row.path === url).sha256 = file.sha256
  }
  for (const wanted of contract?.expectations ?? []) { add(wanted.path, wanted.status); const request = requests.find(row => row.path === wanted.path); request.contains = wanted.contains }
  return { requests, values }
}
function assertConsumers(proof: Proof, contract: any) {
  if (!contract) return
  const references = recheckNteReferences(proof)
  for (const wanted of contract.expectations) {
    const row = references.find((row: any) => row.path === wanted.path); assert(row)
    validateUnifiedConsumer({ status: row.status, headers: new Headers(row.headers) }, readFileSync(path.join(path.dirname(proof.path), row.bodyFile)), wanted)
  }
}
async function captureGraph(opened: any, directory: string, owners: any, owner: string, role: string, migration: boolean, final = false, recoveryGraph = false) {
  const { workspace, sources, contract, candidateSources } = opened, http = final ? path.join(directory, recoveryGraph ? 'recovery-http' : 'final-http') : path.join(directory, owner, role, 'local-http')
  mkdirSync(http); mkdirSync(path.join(http, 'home')); const configs: Record<string, string> = {}
  // Immutable modules live outside Wrangler's watched log/config directories.
  const modules = path.join(directory, 'dependency-modules')
  if (!existsSync(modules)) { mkdirSync(modules); writeFileSync(path.join(modules, 'router.js'), sources.routerCode, { flag: 'wx' }); writeFileSync(path.join(modules, 'unused.js'), 'export default {fetch(){return new Response(null,{status:503})}}', { flag: 'wx' }) }
  for (const dependency of ['nte', 'router', 'main', 'genshin']) {
    const dependencyRole = recoveryGraph && dependency === 'nte' ? 'recovery' : final ? 'candidate' : dependency === owner ? role : dependency === 'nte' ? 'candidate' : 'recovery'
    const selected = migration && dependency !== 'genshin' || !migration && dependency === 'nte'
    const target = selected ? path.join(directory, dependency, dependencyRole) : undefined
    const artifact = target ? path.join(target, 'artifact') : dependency === 'router' ? undefined : sources.owners[dependency].directory
    const module = target ? path.join(target, 'module/worker.js') : dependency === 'router' ? path.join(modules, 'router.js') : path.join(artifact!, 'worker.js')
    const config = dependency === 'genshin' ? { ...JSON.parse(readFileSync(path.join(workspace, 'apps/game-genshin/wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, '')), env: undefined }
      : nteRuntimeConfig(workspace, dependency, dependencyRole, migration)
    configs[dependency] = migrationSave(http, dependency + '.json', nteLocalConfig(config, dependency, artifact, module)).path
  }
  configs.unused = migrationSave(http, 'unused.json', { name: 'nte-release-unused', main: path.join(modules, 'unused.js'), compatibility_date: '2026-07-08' }).path
  const artifact = owner === 'router' ? undefined : path.join(directory, owner, role, 'artifact')
  const currentWorkspace = !migration && role === 'recovery' ? sources.workspace : workspace
  const currentSources = !migration && role === 'recovery' ? sources.sources : candidateSources
  const roleContract = contract?.[role], wanted = await nteRequests(currentWorkspace, final ? 'router' : owner, final ? 'candidate' : role, artifact, migration, currentSources, roleContract)
  let captured: any
  await withLocalWorker(path.join(workspace, 'apps/web'), configs[final ? 'router' : owner], path.join(http, 'home'), path.join(http, 'worker.log'), async (origin: string) => {
    captured = await captureNteHTTP({ origin, requests: wanted.requests, jsonValues: wanted.values, directory: path.join(http, 'responses') })
  }, { wranglerEntrypoint: unifiedTransportTool(workspace).bin, additionalConfigs: Object.entries(configs).filter(([name]) => name !== (final ? 'router' : owner)).map(([, file]) => file) })
  assertConsumers(captured.proof, roleContract); return captured.proof
}
export async function prepareNteReleaseBundle(input: { build: Proof; sourceIndex: Proof; review?: Proof; directory: string; migration: boolean }) {
  const opened = await inputs(input.build, input.sourceIndex, input.migration), { sources, workspace, built } = opened, directory = path.resolve(input.directory)
  const order = input.migration ? NTE_MIGRATION_ORDER : ['nte'], tool = unifiedTransportTool(workspace), owners: any = {}
  assertDiskBudget({ path: directory, operation: 'NTE sealed compatible artifact pairs', estimatedBytes: GiB + 2 * order.filter((owner: string) => owner !== 'router').reduce((sum: number, owner: string) => sum + treeBytes(sources.owners[owner].directory) + treeBytes(input.migration ? built.value.artifacts[owner].directory : path.join(built.directory, 'artifacts', owner)), 0) })
  mkdirSync(directory, { mode: 0o700 })
  try {
    for (const owner of order) {
      mkdirSync(path.join(directory, owner)); for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, owner, role))
      const forward = path.join(directory, owner, 'candidate/artifact'), recovery = path.join(directory, owner, 'recovery/artifact')
      if (owner === 'router') { mkdirSync(forward); mkdirSync(recovery); writeFileSync(path.join(recovery, 'worker.js'), sources.routerCode, { flag: 'wx' }) }
      else {
        const old = sources.owners[owner], runtime = (await readUnifiedSourceOwner(old)).code
        const pair = { owner, source: workspace, previous: old.directory, candidate: input.migration || opened.dataOnly ? built.value.artifacts[owner].directory : path.join(built.directory, 'artifacts', owner), forward, recovery, runtime }
        if (input.migration && owner === 'nte') prepareNteMigrationRecovery(pair); else prepareUnifiedAssetPair(pair)
      }
      const old = owner === 'router' ? sources.router : sources.owners[owner]
      owners[owner] = { service: services[owner], sourceVersionId: activeVersion(sources.baseline, services[owner]), sourceIdentityPin: digest(migrationJSON(old.version)) }
      for (const role of ['recovery', 'candidate']) owners[owner][role] = await sealMigrationOwner({ workspace, directory, owner, role, artifact: path.join(directory, owner, role, 'artifact'), tool, runtimeConfig: nteRuntimeConfig(workspace, owner, role, input.migration) })
    }
    for (const owner of order) for (const role of ['recovery', 'candidate']) owners[owner][role].referencesPin = (await captureGraph(opened, directory, owners, owner, role, input.migration)).pin
    const finalReferences = await captureGraph(opened, directory, owners, 'router', 'candidate', input.migration, true)
    const recoveryReferences = input.migration ? undefined : await captureGraph(opened, directory, owners, 'router', 'recovery', false, true, true)
    const value = { schemaVersion: 1, kind: input.migration ? 'nte_migration_bundle' : opened.dataOnly ? 'nte_independent_data_bundle' : 'nte_independent_bundle', build: input.build, sourceIndex: input.sourceIndex,
      ...(input.review ? { review: input.review } : {}), sourceCommit: input.migration ? built.value.sourceCommit : opened.dataOnly ? built.value.sourceCommit : built.frozen.sourceCommit,
      baseline: sources.baseline, owners, tool, finalReferences, ...(recoveryReferences ? { recoveryReferences } : {}),
      stepReferences: input.migration ? { path: path.join(directory, 'router/recovery/local-http/responses/references.json'), pin: owners.router.recovery.referencesPin } : finalReferences,
      contentVersion: opened.expected.manifest.version, cloudWrites: false, productionReady: false }
    const proof = migrationSave(directory, 'bundle.json', value); await verifyNteReleaseBundle(proof); return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
export async function verifyNteReleaseBundle(proof: Proof, depth = 0): Promise<any> {
  assert(depth < 32); const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'bundle.json')); assert(!existsSync(path.join(directory, 'failure.json')))
  assert.equal(value.schemaVersion, 1); assert(['nte_migration_bundle', 'nte_independent_bundle', 'nte_independent_data_bundle'].includes(value.kind)); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  const migration = value.kind === 'nte_migration_bundle', dataOnly = value.kind === 'nte_independent_data_bundle', opened = await inputs(value.build, value.sourceIndex, migration, depth), { sources, workspace, built } = opened
  assert.equal(value.sourceCommit, migration ? built.value.sourceCommit : dataOnly ? built.value.sourceCommit : built.frozen.sourceCommit); assert.equal(value.contentVersion, opened.expected.manifest.version)
  assert.deepEqual(value.baseline, sources.baseline); assert.deepEqual(Object.keys(value.owners), migration ? NTE_MIGRATION_ORDER : ['nte'])
  verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(workspace))
  for (const owner of Object.keys(value.owners)) {
    const old = owner === 'router' ? sources.router : sources.owners[owner], row = value.owners[owner]
    assert.equal(row.service, services[owner]); assert.equal(row.sourceVersionId, old.versionId); assert.equal(row.sourceIdentityPin, digest(migrationJSON(old.version)))
    if (owner !== 'router') {
      const pair = { owner, source: workspace, previous: old.directory, candidate: migration || dataOnly ? built.value.artifacts[owner].directory : path.join(built.directory, 'artifacts', owner),
        forward: path.join(directory, owner, 'candidate/artifact'), recovery: path.join(directory, owner, 'recovery/artifact'), runtime: (await readUnifiedSourceOwner(old)).code, runtimeSHA256: old.moduleSHA256 }
      if (migration && owner === 'nte') verifyNteMigrationRecovery(pair); else verifyUnifiedAssetPair(pair)
    }
    for (const role of ['candidate', 'recovery'] as const) {
      const local = path.join(directory, owner, role), artifact = path.join(local, 'artifact'), sealed = row[role]
      assert.equal(sealed.artifactPin, owner === 'router' ? digest(readFileSync(path.join(artifact, 'worker.js'))) : treePin(artifact))
      assert.equal(digest(readFileSync(path.join(local, 'module/worker.js'))), sealed.moduleSHA256)
      if (role === 'recovery') assert.equal(sealed.moduleSHA256, owner === 'router' ? digest(sources.routerCode) : old.moduleSHA256)
      const config = migrationPinned({ path: path.join(local, 'upload.json'), pin: sealed.configPin }), base = nteRuntimeConfig(workspace, owner, role, migration)
      assert.deepEqual(config, { ...base, main: path.join(local, 'module/worker.js'), ...(owner === 'router' ? {} : { assets: { ...base.assets, directory: path.join(artifact, 'assets') } }), no_bundle: true, minify: false })
      const outbound = await multipartModule(readFileSync(path.join(local, 'seal/exact.multipart'))); assert.equal(outbound.moduleSHA256, sealed.moduleSHA256)
      ;(owner === 'router' ? assertMigrationRouterMetadata : assertUploadMetadata)(outbound.metadata, config)
      const currentWorkspace = !migration && role === 'recovery' ? sources.workspace : workspace, roleContract = opened.contract?.[role]
      const wanted = await nteRequests(currentWorkspace, owner, role, artifact, migration, !migration && role === 'recovery' ? sources.sources : opened.candidateSources, roleContract)
      const refs = { path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin }, references = recheckNteReferences(refs)
      assert.deepEqual(references.map((ref: any) => ({ path: ref.path, status: ref.status })), wanted.requests.map(row => ({ path: row.path, status: row.status })))
      for (const [index, ref] of references.entries()) {
        if (wanted.values.has(ref.path)) assert.deepEqual(JSON.parse(readFileSync(path.join(path.dirname(refs.path), ref.bodyFile), 'utf8')), wanted.values.get(ref.path))
        if (wanted.requests[index].sha256) assert.equal(ref.sha256, wanted.requests[index].sha256)
      }
      assertConsumers(refs, roleContract)
    }
  }
  for (const role of migration ? ['candidate'] : ['candidate', 'recovery']) {
    const proof = role === 'candidate' ? value.finalReferences : value.recoveryReferences
    assert.equal(proof.path, path.join(directory, role === 'candidate' ? 'final-http/responses/references.json' : 'recovery-http/responses/references.json'))
    const references = recheckNteReferences(proof), wanted = await nteRequests(role === 'recovery' ? sources.workspace : workspace, 'router', 'candidate', undefined, migration,
      role === 'recovery' ? sources.sources : opened.candidateSources, opened.contract?.[role as 'candidate' | 'recovery'])
    assert.deepEqual(references.map((ref: any) => ({ path: ref.path, status: ref.status })), wanted.requests.map(row => ({ path: row.path, status: row.status })))
    for (const ref of references) if (wanted.values.has(ref.path)) assert.deepEqual(JSON.parse(readFileSync(path.join(path.dirname(proof.path), ref.bodyFile), 'utf8')), wanted.values.get(ref.path))
    assertConsumers(proof, opened.contract?.[role as 'candidate' | 'recovery'])
  }
  assert.deepEqual(value.stepReferences, migration ? { path: path.join(directory, 'router/recovery/local-http/responses/references.json'), pin: value.owners.router.recovery.referencesPin } : value.finalReferences)
  return { directory, value, migration, ...opened }
}
