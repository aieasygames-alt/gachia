import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, withLocalWorker } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, GiB, treeBytes } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { multipartModule, assertUploadMetadata } from '../../../scripts/desktop-cloud-transport.mjs'
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs'
import { migrationAggregateBases, migrationJSON, migrationPinned, migrationRequests, migrationSave, captureMigrationHTTP, recheckMigrationReferences } from '../../../scripts/genshin-migration-http.mjs'
import { migrationRuntimeConfig, migrationLocalConfig, sealMigrationOwner } from '../../../scripts/genshin-migration-prepare.mjs'
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair } from '../../../scripts/unified-release-assets.mjs'
import { unifiedTransportTool, verifyUnifiedTool } from '../../../scripts/unified-cloud-module.mjs'
import { readGenshinIndependentSourceIndex } from './genshin-independent-history'
import { frozenCharacterTextPairContract, validateUnifiedConsumer, verifyUnifiedOwnerBuild } from './unified-owner-build'
import { GENSHIN_PRODUCTION_SCOPE } from './unified-genshin-production-scope'

type Proof = { path: string; pin: string }
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
function inputs(build: Proof) {
  const built = verifyUnifiedOwnerBuild(path.dirname(build.path), build.pin)
  assert.equal(build.path, path.join(built.directory, 'build.json')); assert.equal(built.frozen.productionScope, GENSHIN_PRODUCTION_SCOPE)
  assert.equal(built.frozen.localScope, undefined); assert.equal(built.receipt.preview, false); assert.deepEqual(built.frozen.owners, ['genshin'])
  return built
}
function requests(input: { owner: string; role: string; artifact: string | undefined; expected: any; sources: any[]; pairs: string[] }, contract: any) {
  const rows = migrationRequests(input)
  for (const wanted of contract.expectations) if (!rows.some((row: any) => row.path === wanted.path)) rows.push({ path: wanted.path, status: wanted.status })
  return rows
}
function assertCharacterReferences(proof: Proof, contract: any) {
  const references = migrationPinned(proof)
  for (const expected of contract.expectations) {
    const row = references.find((row: any) => row.path === expected.path); assert(row, 'Missing actual edited character consumer')
    validateUnifiedConsumer({ status: row.status, headers: new Headers(row.headers) }, readFileSync(path.join(path.dirname(proof.path), row.bodyFile)), expected)
  }
}
async function verifyInputs(build: Proof, sourceIndex: Proof, depth = 0) {
  const built = inputs(build), sources = await readGenshinIndependentSourceIndex(sourceIndex, depth + 1)
  assert.deepEqual(JSON.parse(readFileSync(path.join(built.directory, 'active.json'), 'utf8')).map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })),
    sources.sources.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 })).sort((a: any, b: any) => a.sourcePath.localeCompare(b.sourcePath)))
  const workspace = path.join(built.directory, 'source'), expected = genshinContentAssets(workspace), previous = genshinContentAssets(sources.workspace)
  assert.notEqual(expected.manifest.version, previous.manifest.version, 'An actual approved content edit is required')
  const contract = frozenCharacterTextPairContract(built.directory, built.frozen)
  assert.equal(contract.candidate.changes.length, 1); assert.equal(contract.candidate.changes[0].game, 'genshin')
  const candidateSources = sources.sources.map((row: any) => {
    const text = readFileSync(path.join(workspace, row.sourcePath), 'utf8'); return { sourcePath: row.sourcePath, text, sha256: digest(text) }
  })
  return { built, sources, candidateSources, workspace, expected, previous, contract, bases: migrationAggregateBases(workspace),
    pairs: JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8')).pairs }
}

// Local packaging only. Production authority comes from the fixed live-review
// and exact-CI adapter, never from this receipt or a caller-selected transport.
export async function prepareGenshinIndependentBundle(input: { build: Proof; sourceIndex: Proof; review: Proof; directory: string }) {
  const opened = await verifyInputs(input.build, input.sourceIndex), { built, sources, candidateSources, workspace, expected, previous, contract, bases, pairs } = opened
  const directory = path.resolve(input.directory), old = sources.owners.genshin, candidate = path.join(built.directory, 'artifacts/genshin')
  assertDiskBudget({ path: directory, operation: 'independent Genshin compatible pair', estimatedBytes: GiB + 2 * (treeBytes(old.directory) + treeBytes(candidate)) })
  mkdirSync(directory, { mode: 0o700 }); mkdirSync(path.join(directory, 'genshin'))
  for (const role of ['candidate', 'recovery']) mkdirSync(path.join(directory, 'genshin', role))
  try {
    const forward = path.join(directory, 'genshin/candidate/artifact'), recovery = path.join(directory, 'genshin/recovery/artifact')
    prepareUnifiedAssetPair({ owner: 'genshin', previous: old.directory, candidate, forward, recovery, runtime: sources.genshinCode })
    const tool = unifiedTransportTool(workspace), owner: any = { service: old.service, sourceVersionId: old.versionId, sourceIdentityPin: digest(migrationJSON(old.version)) }
    for (const role of ['recovery', 'candidate']) owner[role] = await sealMigrationOwner({ workspace, directory, owner: 'genshin', role, artifact: path.join(directory, 'genshin', role, 'artifact'), tool })
    let finalReferences: Proof | undefined, recoveryReferences: Proof | undefined
    for (const role of ['recovery', 'candidate']) {
      const current = role === 'candidate' ? expected : previous, roleContract = contract[role as 'candidate' | 'recovery']
      const local = path.join(directory, 'genshin', role), artifact = path.join(local, 'artifact')
      for (const graph of ['direct', 'router']) {
        const http = graph === 'direct' ? path.join(local, 'local-http') : path.join(directory, `${role}-graph`)
        mkdirSync(http); mkdirSync(path.join(http, 'home'))
        const selected: Record<string, string> = {}
        for (const dependency of ['genshin', 'main', 'router']) {
          const target = dependency === 'genshin' ? artifact : dependency === 'main' ? sources.owners.main.directory : undefined
          const module = dependency === 'genshin' ? path.join(local, 'module/worker.js') : dependency === 'main'
            ? path.join(sources.owners.main.directory, 'worker.js') : path.join(http, 'router-worker.js')
          if (dependency === 'router') {
            writeFileSync(module, sources.routerCode, { flag: 'wx', mode: 0o600 })
          }
          const config = migrationLocalConfig(migrationRuntimeConfig(workspace, dependency, 'candidate'), dependency, target, module)
          selected[dependency] = migrationSave(http, dependency + '.json', config).path
        }
        writeFileSync(path.join(http, 'unused.mjs'), 'export default {fetch(){return new Response(null,{status:503})}};\n', { flag: 'wx' })
        const unused = migrationSave(http, 'unused.json', { name: 'migration-unused', main: path.join(http, 'unused.mjs'), compatibility_date: '2026-07-08' })
        let captured: any
        await withLocalWorker(path.join(workspace, 'apps/web'), selected[graph === 'direct' ? 'genshin' : 'router'], path.join(http, 'home'), path.join(http, 'worker.log'), async (origin: string) => {
          captured = await captureMigrationHTTP({ origin, requests: requests({ owner: graph === 'direct' ? 'genshin' : 'router', role: 'candidate', artifact, expected: current,
            sources: role === 'candidate' ? candidateSources : sources.sources, pairs }, roleContract), directory: path.join(http, 'responses'), owner: graph === 'direct' ? 'genshin' : 'router', role: 'candidate', expected: current, bases })
        }, { wranglerEntrypoint: tool.bin, additionalConfigs: [...Object.entries(selected).filter(([name]) => name !== (graph === 'direct' ? 'genshin' : 'router')).map(([, file]) => file), unused.path] })
        assertCharacterReferences(captured.proof, roleContract)
        if (graph === 'direct') owner[role].referencesPin = captured.proof.pin
        else if (role === 'candidate') finalReferences = captured.proof
        else recoveryReferences = captured.proof
      }
    }
    const value = { schemaVersion: 1, kind: 'genshin_independent_editorial_bundle', build: input.build, sourceIndex: input.sourceIndex, review: input.review,
      sourceCommit: built.frozen.sourceCommit, baseline: sources.baseline, owners: { genshin: owner }, tool, finalReferences, recoveryReferences,
      contentVersion: expected.manifest.version, previousContentVersion: previous.manifest.version, cloudWrites: false, productionReady: false }
    const proof = migrationSave(directory, 'bundle.json', value); await verifyGenshinIndependentBundle(proof); return { proof, value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}

export async function verifyGenshinIndependentBundle(proof: Proof, depth = 0) {
  assert(depth < 32, 'Independent publication ancestry exceeds its bound')
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'bundle.json')); assert.equal(value.kind, 'genshin_independent_editorial_bundle'); assert.equal(value.schemaVersion, 1)
  assert(!existsSync(path.join(directory, 'failure.json')), 'Failed independent bundle cannot authorize a release')
  assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  const opened = await verifyInputs(value.build, value.sourceIndex, depth), { built, sources, candidateSources, workspace, expected, previous, contract, bases, pairs } = opened
  assert.equal(value.sourceCommit, built.frozen.sourceCommit); assert.equal(value.contentVersion, expected.manifest.version); assert.equal(value.previousContentVersion, previous.manifest.version)
  assert.deepEqual(value.baseline, sources.baseline); assert.deepEqual(Object.keys(value.owners), ['genshin'])
  const owner = value.owners.genshin, old = sources.owners.genshin
  assert.equal(owner.service, old.service); assert.equal(owner.sourceVersionId, old.versionId); assert.equal(owner.sourceIdentityPin, digest(migrationJSON(old.version)))
  verifyUnifiedTool(value.tool); assert.deepEqual(value.tool, unifiedTransportTool(workspace))
  verifyUnifiedAssetPair({ owner: 'genshin', previous: old.directory, candidate: path.join(built.directory, 'artifacts/genshin'), forward: path.join(directory, 'genshin/candidate/artifact'),
    recovery: path.join(directory, 'genshin/recovery/artifact'), runtimeSHA256: old.moduleSHA256 })
  for (const role of ['candidate', 'recovery'] as const) {
    const local = path.join(directory, 'genshin', role), sealed = owner[role], artifact = path.join(local, 'artifact'), current = role === 'candidate' ? expected : previous
    assert.equal(treePin(artifact), sealed.artifactPin); assert.equal(digest(readFileSync(path.join(local, 'module/worker.js'))), sealed.moduleSHA256)
    if (role === 'recovery') assert.equal(sealed.moduleSHA256, old.moduleSHA256)
    const config = migrationPinned({ path: path.join(local, 'upload.json'), pin: sealed.configPin })
    const base = migrationRuntimeConfig(workspace, 'genshin', role)
    assert.deepEqual(config, { ...base, main: path.join(local, 'module/worker.js'), assets: { ...base.assets, directory: path.join(artifact, 'assets') }, no_bundle: true, minify: false })
    const outbound = await multipartModule(readFileSync(path.join(local, 'seal/exact.multipart'))); assert.equal(outbound.moduleSHA256, sealed.moduleSHA256); assertUploadMetadata(outbound.metadata, config)
    for (const graph of ['direct', 'router']) {
      const refs = graph === 'direct' ? { path: path.join(local, 'local-http/responses/references.json'), pin: sealed.referencesPin }
        : role === 'candidate' ? value.finalReferences : value.recoveryReferences
      if (graph === 'router') assert.equal(refs.path, path.join(directory, `${role}-graph/responses/references.json`))
      recheckMigrationReferences({ proof: refs, requests: requests({ owner: graph === 'direct' ? 'genshin' : 'router', role: 'candidate', artifact, expected: current, sources: role === 'candidate' ? candidateSources : sources.sources, pairs }, contract[role]),
        owner: graph === 'direct' ? 'genshin' : 'router', role: 'candidate', expected: current, bases })
      assertCharacterReferences(refs, contract[role])
    }
  }
  return { directory, value, ...opened }
}
