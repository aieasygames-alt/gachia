import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { activeVersion, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertModuleVersionIdentity, scriptETag } from '../../../scripts/desktop-version-provenance.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { migrationRouterModule } from '../../../scripts/genshin-migration-router.mjs'
import { readUnifiedSourceOwner } from '../../../scripts/unified-source-advance.mjs'
import { readUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { UNIFIED_SOURCE_OWNERS } from '../../../scripts/unified-historical-sources.mjs'
import { sourceHistoryRepository } from './source-history-repository'
import { projectRoot } from './local-environment'
import { unifiedTree } from './unified-build'
import { captureUnifiedExecutorSource } from './unified-executor-source'

type Proof = { path: string; pin: string }
const repo = path.resolve(projectRoot, '../..')
const treePin = (directory: string) => digest(migrationJSON(artifactFiles(directory)))
const contractProof = () => {
  const contractPath = path.join(sourceHistoryRepository(), 'services/content-cms/recovery/nte-source-reconstruction-2026-11-17.json')
  return { path: contractPath, pin: digest(readFileSync(contractPath)) }
}

// This is a new, explicit trust checkpoint with a committed inventory. It never
// claims that the deleted R119 bundle was read or that an old journal changed.
export function assertReconstructedSources(sources: any[], expected: any[]) {
  assert.equal(sources.length, 115, 'Complete reconstructed source inventory required')
  assert.equal(new Set(sources.map(row => row.sourcePath)).size, sources.length)
  assert.deepEqual(sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), expected, 'Reconstructed source inventory changed')
  for (const row of sources) assert.equal(digest(row.text), row.sha256, `Reconstructed source bytes changed: ${row.sourcePath}`)
}

async function inputs() {
  const contract = migrationPinned(contractProof())
  assert.equal(contract.policy, 'nte-explicit-source-reconstruction-2026-11-17-v1')
  assert.equal(contract.purpose, 'read_only_source_reconstruction_not_release_authority')
  assert.equal(contract.historyComplete, false); assert.equal(contract.workerWrites, 0); assert.equal(contract.activationSupported, false)
  migrationPinned(contract.base)
  const parent = migrationPinned(contract.parent)
  assert.equal(parent.kind, 'nte_adsense_infrastructure_source_index'); assert.deepEqual(parent.active, contract.active)
  // Original completions and journals remain byte-for-byte pinned, including
  // the historical deployment ID that preceded the later rollback.
  for (const proof of contract.history) {
    assert.equal(digest(readFileSync(proof.path)), proof.pin, 'Retained production history changed')
  }
  const sources = migrationPinned(contract.active)
  for (const override of contract.overrides) {
    const row = sources.find((source: any) => source.sourcePath === override.sourcePath); assert(row)
    const text = readFileSync(override.path, 'utf8'); assert.equal(digest(text), override.pin)
    row.text = text; row.sha256 = override.pin
  }
  assertReconstructedSources(sources, contract.sources)
  assert.deepEqual(Object.keys(contract.owners).sort(), UNIFIED_SOURCE_OWNERS)
  const modules: Record<string, any> = {}
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const descriptor = contract.owners[owner]
    if (descriptor.sourceOwner) modules[owner] = await readUnifiedSourceOwner(descriptor.sourceOwner)
    else {
      assert.equal(treePin(descriptor.artifact), descriptor.artifactPin, 'Retained candidate artifact changed')
      const accepted = descriptor.accepted, receipt = migrationPinned(accepted.moduleProof)
      modules[owner] = await readUnifiedUploadedModule(accepted.moduleProof, { service: owner === 'main' ? 'gachia' : `gachia-game-${owner}`,
        versionId: accepted.versionId, moduleSHA256: accepted.moduleSHA256, context: receipt.context })
    }
  }
  const receipt = migrationPinned(contract.router.moduleProof), routerDirectory = path.dirname(contract.router.moduleProof.path)
  assert.equal(receipt.kind, 'genshin_migration_router_upload_module'); assert.equal(receipt.service, 'gachia-router')
  assert.equal(receipt.versionId, contract.router.versionId); assertModuleVersionIdentity(receipt.before, receipt.after)
  assertModuleVersionIdentity(receipt.before, contract.router.version); assert.equal(scriptETag(receipt.etag), receipt.before.resources.script.etag)
  const archive = readFileSync(path.join(routerDirectory, 'download.multipart')); assert.equal(digest(archive), receipt.archivePin)
  const routerModule = await migrationRouterModule(archive); assert.equal(routerModule.moduleSHA256, receipt.moduleSHA256)
  return { contract, sources, modules, routerCode: routerModule.code }
}

function verifyWorkspace(value: any, sources: any[]) {
  assert(/^[a-f0-9]{40}$/.test(value.sourceCommit))
  const tree = execFileSync('git', ['--no-replace-objects', 'ls-tree', '-r', '-z', value.sourceCommit], { cwd: sourceHistoryRepository(), maxBuffer: 8 * 1024 * 1024 })
    .toString().split('\0').filter(Boolean).map(line => { const [metadata, file] = line.split('\t'); return { metadata: metadata.split(' '), file } })
  const files = migrationPinned(value.files)
  assert.deepEqual(unifiedTree(value.workspace, '', true), files, 'Checkpoint workspace changed')
  assert.deepEqual(files.map((row: any) => row.path).sort(), tree.map(row => row.file).sort(), 'Checkpoint Git inventory changed')
  const overlays = new Map(sources.map(row => [row.sourcePath, row.sha256]))
  for (const { metadata, file } of tree) {
    assert.equal(metadata[1], 'blob'); assert(['100644', '100755'].includes(metadata[0]), 'Linked checkpoint source forbidden')
    const bytes = readFileSync(path.join(value.workspace, file))
    if (overlays.has(file)) assert.equal(digest(bytes), overlays.get(file), 'Checkpoint source overlay changed')
    else if (!/^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(file)) {
      const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
      assert.equal(blob, metadata[2], `Checkpoint code differs from raw Git: ${file}`)
    }
  }
}

export function assertCheckpointVersions(baseline: any, owners: Record<string, any>, router: any) {
  assertTopology(baseline, baseline)
  assert.deepEqual(Object.keys(owners).sort(), UNIFIED_SOURCE_OWNERS)
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = owners[owner]; assert.equal(row.owner, owner)
    assert.equal(row.service, owner === 'main' ? 'gachia' : `gachia-game-${owner}`)
    assert.equal(activeVersion(baseline, row.service), row.versionId, 'Checkpoint cannot substitute an inactive source')
  }
  assert.equal(activeVersion(baseline, 'gachia-router'), router.versionId)
  assert.equal(baseline.services['gachia-router'].id, router.deploymentId)
}

export async function readNteSourceCheckpoint(proof: Proof): Promise<any> {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'source-index.json')); assert.equal(value.kind, 'nte_reconstructed_source_checkpoint')
  assert.equal(value.schemaVersion, 1)
  assert.equal(value.status, 'published_sources_observed'); assert.equal(value.cloudWrites, false); assert.equal(value.newPublicationAuthorized, false)
  assert.equal(value.historyComplete, false); assert.deepEqual(value.contract, contractProof())
  const opened = await inputs(), { contract, sources } = opened
  assert.deepEqual(value.parent, contract.parent); assert.deepEqual(value.missingOriginalBundle, contract.missingOriginalBundle)
  assert.deepEqual(migrationPinned(value.active), sources)
  verifyWorkspace(value, sources)
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const descriptor = contract.owners[owner], row = value.owners[owner]
    if (descriptor.sourceOwner) assert.deepEqual(row, descriptor.sourceOwner)
    else {
      const accepted = descriptor.accepted, module = opened.modules[owner]
      assert.equal(row.directory, path.join(directory, owner)); assert.equal(row.versionId, accepted.versionId)
      assert.deepEqual(row.moduleProof, accepted.moduleProof); assert.equal(row.moduleSHA256, accepted.moduleSHA256)
      assertModuleVersionIdentity(row.version, module.version)
      assert.deepEqual(artifactFiles(row.directory), artifactFiles(descriptor.artifact).map((file: any) => file.path === 'worker.js'
        ? { path: file.path, type: 'file', sha256: accepted.moduleSHA256 } : file))
    }
    await readUnifiedSourceOwner(row)
    assertModuleVersionIdentity(row.version, migrationPinned(value.observation.versions[owner]))
  }
  assert.deepEqual({ ...value.router, deploymentId: contract.router.deploymentId }, contract.router)
  assertModuleVersionIdentity(value.router.version, migrationPinned(value.observation.routerVersion))
  assert.deepEqual(migrationPinned(value.observation.before), value.baseline)
  assertTopology(value.baseline, migrationPinned(value.observation.after)); assertCheckpointVersions(value.baseline, value.owners, value.router)
  assert(Number.isSafeInteger(value.observation.observedAt) && value.observation.observedAt <= Date.now())
  return { value, owners: value.owners, router: value.router, baseline: value.baseline, sources, workspace: value.workspace, allOwnersCurrent: true,
    routerCode: opened.routerCode, ancestors: contract.ancestors, originalPublication: contract.originalPublication, originalSourceIndex: contract.originalSourceIndex }
}

export async function prepareNteSourceCheckpoint(input: { directory: string; reader: any }) {
  const executor = captureUnifiedExecutorSource(repo)
  const { contract, sources, modules } = await inputs(), directory = path.resolve(input.directory)
  assertDiskBudget({ path: directory, operation: 'explicit NTE source reconstruction', estimatedBytes: 2 * GiB })
  mkdirSync(directory, { mode: 0o700 }); const baseline = await input.reader.snapshot(), owners: Record<string, any> = {}
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const descriptor = contract.owners[owner]
    if (descriptor.sourceOwner) owners[owner] = descriptor.sourceOwner
    else {
      const target = path.join(directory, owner), module = modules[owner], accepted = descriptor.accepted
      cpSync(descriptor.artifact, target, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true })
      writeFileSync(path.join(target, 'worker.js'), module.code, { mode: 0o600 })
      owners[owner] = { owner, service: owner === 'main' ? 'gachia' : `gachia-game-${owner}`, versionId: accepted.versionId,
        directory: target, artifactSHA256: treePin(target), modulePath: module.receipt.archive.path, archiveSHA256: module.receipt.archive.pin,
        moduleSHA256: accepted.moduleSHA256, version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context }
    }
  }
  const router = { ...contract.router, deploymentId: baseline.services['gachia-router'].id }
  assertCheckpointVersions(baseline, owners, router)
  const workspace = path.join(directory, 'source'); mkdirSync(workspace)
  const archive = path.join(directory, 'source.tar'), commit = executor.commit
  execFileSync('git', ['--no-replace-objects', 'archive', '--format=tar', `--output=${archive}`, commit], { cwd: repo })
  execFileSync('tar', ['-xf', archive, '-C', workspace]); unlinkSync(archive)
  const pairs = JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8')).pairs
  for (const row of sources) {
    writeFileSync(path.join(workspace, row.sourcePath), row.text)
    const pair = row.sourcePath.slice('packages/data/games/'.length)
    if (row.sourcePath.startsWith('packages/data/games/') && pairs.includes(pair)) writeFileSync(path.join(workspace, 'apps/web/public/data', pair), row.text)
  }
  // These generators are part of the exact executor commit. They never replace
  // the preserved source inventory or write to a deployed service.
  for (const script of ['generate-character-summaries.mjs', 'generate-manifests.mjs', 'verify-manifests.mjs']) {
    execFileSync(process.execPath, [path.join(workspace, 'packages/data/scripts', script)], { cwd: workspace, stdio: 'pipe' })
  }
  const versions: Record<string, Proof> = {}
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const row = owners[owner], version = await input.reader.version(row.service, row.versionId)
    assertModuleVersionIdentity(row.version, version); versions[owner] = migrationSave(directory, `${owner}-version.json`, version)
  }
  const routerVersion = await input.reader.version('gachia-router', router.versionId); assertModuleVersionIdentity(router.version, routerVersion)
  const after = await input.reader.snapshot(); assertTopology(baseline, after)
  const value = { schemaVersion: 1, kind: 'nte_reconstructed_source_checkpoint', status: 'published_sources_observed', contract: contractProof(), parent: contract.parent,
    missingOriginalBundle: contract.missingOriginalBundle, historyComplete: false, sourceCommit: commit, owners, router, workspace,
    files: migrationSave(directory, 'files.json', unifiedTree(workspace)), active: migrationSave(directory, 'active.json', sources), baseline,
    observation: { before: migrationSave(directory, 'before.json', baseline), after: migrationSave(directory, 'after.json', after), versions,
      routerVersion: migrationSave(directory, 'router-version.json', routerVersion), observedAt: Date.now() }, cloudWrites: false, newPublicationAuthorized: false }
  const proof = migrationSave(directory, 'source-index.json', value); await readNteSourceCheckpoint(proof); executor.verify(); return { proof, value }
}
