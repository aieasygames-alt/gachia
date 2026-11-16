import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { activeVersion, desktopCloudSnapshot, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { genshinMigrationTransport } from '../../../scripts/genshin-migration-transport.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { executeNteMigration } from '../../../scripts/genshin-production-migration.mjs'
import { NTE_MIGRATION_POLICY } from '../../../scripts/nte-release-config.mjs'
import { NTE_INDEPENDENT_POLICY, executeNteIndependentRelease } from '../../../scripts/genshin-independent-release.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { createNteMigrationPreviewNetwork, createGenshinPublicNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { prepareNteMigrationSource } from './nte-migration-source'
import { buildNteMigration } from './nte-migration-build'
import { prepareNteReleaseBundle, verifyNteReleaseBundle } from './nte-release-bundle'
import { advanceNteSources, nteReleaseKey, readCompletedNteRelease, readNteSourceIndex } from './nte-release-history'
import { freezeUnifiedContent } from './unified-build'
import { buildUnifiedOwners } from './unified-owner-build'
import { loadUnifiedDesktopPlan, unifiedSelection } from './unified-desktop'
import { verifyUnifiedInstalledApplication } from './unified-installed-application'
import { projectRoot } from './local-environment'
import { createUnifiedExecutorVerifier, readUnifiedProductionReview, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'
import { NTE_PRODUCTION_SCOPE } from './unified-genshin-production-scope'
import { captureUnifiedExecutorSource } from './unified-executor-source'
import { baselineDirectory } from './inventory-baseline'
import { unifiedPlan } from './unified-plan'
import { readUnifiedSources } from './unified-sources'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'nte_release_request'; bundle: Proof; executorRunID: number; previewProxy?: string; publicProxy?: string }
const githubCredential = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 65536 }).trim()
export function nteProductionRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value)); const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['bundle', 'executorRunID', 'kind', 'schemaVersion', ...(Object.hasOwn(request, 'previewProxy') ? ['previewProxy'] : []), ...(Object.hasOwn(request, 'publicProxy') ? ['publicProxy'] : [])].sort())
  for (const key of ['previewProxy', 'publicProxy'] as const) if (Object.hasOwn(request, key)) assert.equal(unifiedPreviewProxy(request[key]), request[key])
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'nte_release_request')
  assert.deepEqual(Object.keys(request.bundle).sort(), ['path', 'pin']); assert(path.isAbsolute(request.bundle.path) && /^[a-f0-9]{64}$/.test(request.bundle.pin))
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0); return structuredClone(request)
}
function application(proof: Proof, repo: string, commit: string) {
  const value = migrationPinned(proof)
  execFileSync('git', ['merge-base', '--is-ancestor', value.sourceCommit, commit], { cwd: repo, stdio: 'pipe' })
  verifyUnifiedInstalledApplication(path.join(homedir(), 'Library/Application Support/GachiaCMS'), repo, value.sourceCommit, proof)
}
export async function prepareNteMigrationProduction(input: { sourceIndex: Proof; directory: string }) {
  assert.deepEqual(Object.keys(input).sort(), ['directory', 'sourceIndex']); assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS)
  const repo = path.resolve(projectRoot, '../..'), executor = captureUnifiedExecutorSource(repo), directory = path.resolve(input.directory)
  mkdirSync(directory, { mode: 0o700 })
  const source = await prepareNteMigrationSource({ repo, commit: executor.commit, sourceIndex: input.sourceIndex, directory: path.join(directory, 'published-A') })
  const built = await buildNteMigration(source.proof)
  const bundle = await prepareNteReleaseBundle({ build: built.proof, sourceIndex: input.sourceIndex, directory: path.join(directory, 'sealed'), migration: true })
  executor.verify(); return bundle
}
export async function prepareNteIndependentProduction(input: { sourceIndex: Proof; selection: Proof; application: Proof; directory: string; cmsToken: string }) {
  assert.deepEqual(Object.keys(input).sort(), ['application', 'cmsToken', 'directory', 'selection', 'sourceIndex'])
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS)
  const repo = path.resolve(projectRoot, '../..'), executor = captureUnifiedExecutorSource(repo), directory = path.resolve(input.directory)
  application(input.application, repo, executor.commit)
  const sources = await readNteSourceIndex(input.sourceIndex), inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((row: { id: string }) => row.id)), selected = unifiedSelection(migrationPinned(input.selection), plan)
  assert.equal(selected.length, 1); const review = await readUnifiedProductionReview(plan, selected, input.cmsToken)
  mkdirSync(directory, { mode: 0o700 })
  try {
    const frozen = freezeUnifiedContent({ repo, commit: executor.commit, directory: path.join(directory, 'build'), plan, records: review.records, activeSources: sources.sources, preview: false, productionScope: NTE_PRODUCTION_SCOPE })
    const editorial = migrationSave(directory, 'review.json', { sourceCommit: executor.commit, planSHA256: plan.planSHA256, selected, reviews: review.reviews, reviewPin: review.reviewPin, application: input.application })
    const built = await buildUnifiedOwners(frozen.directory, frozen.manifestPin, [])
    const bundle = await prepareNteReleaseBundle({ build: { path: path.join(built.directory, 'build.json'), pin: built.buildPin }, sourceIndex: input.sourceIndex, review: editorial, directory: path.join(directory, 'sealed'), migration: false })
    assert.equal((await readUnifiedProductionReview(plan, selected, input.cmsToken)).reviewPin, review.reviewPin); executor.verify(); return bundle
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
export async function auditNteProduction(input: unknown, tokens: { cmsToken?: string; cloudToken: string }) {
  const request = nteProductionRequest(input), githubToken = githubCredential(), executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const evidence = await verifyNteReleaseBundle(request.bundle), repo = path.resolve(projectRoot, '../..')
  assert.equal(evidence.value.sourceCommit, executor.executorCommit)
  await verifyUnifiedPublishedSource({ publication: evidence.sources.originalPublication, sourceIndex: evidence.sources.originalSourceIndex, githubToken })
  for (const ancestor of evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  const editorial = evidence.migration ? undefined : migrationPinned(evidence.value.review)
  const plan = editorial ? loadUnifiedDesktopPlan(repo, evidence.built.frozen.planSHA256).plan : undefined
  if (editorial) {
    assert.equal(editorial.sourceCommit, executor.executorCommit); assert.equal(editorial.planSHA256, plan!.planSHA256)
    assert.equal(editorial.selected.length, 1); assert.deepEqual(editorial.selected, evidence.built.frozen.candidate.changed)
    application(editorial.application, repo, executor.executorCommit); assert(tokens.cmsToken)
  }
  const review = editorial ? await readUnifiedProductionReview(plan!, editorial.selected, tokens.cmsToken!) : undefined
  if (review) { assert.deepEqual(review.reviews, editorial.reviews); assert.equal(review.reviewPin, editorial.reviewPin) }
  // Independently reconstruct the source from exact Git and complete verified A.
  const temporary = mkdtempSync(path.join(evidence.built.directory, '.nte-production-source-check-'))
  try {
    if (evidence.migration) {
      const reconstructed = await prepareNteMigrationSource({ repo, commit: executor.executorCommit, sourceIndex: evidence.value.sourceIndex, directory: path.join(temporary, 'source') })
      assert.deepEqual(migrationPinned(reconstructed.value.files), migrationPinned(evidence.built.source.value.files))
    } else {
      const reconstructed = freezeUnifiedContent({ repo, commit: executor.executorCommit, directory: path.join(temporary, 'freeze'), plan: plan!, records: review!.records, activeSources: evidence.sources.sources, preview: false, productionScope: NTE_PRODUCTION_SCOPE })
      assert.equal(reconstructed.sourceTreeSHA256, evidence.built.frozen.sourceTreeSHA256); assert.deepEqual(reconstructed.candidate, evidence.built.frozen.candidate)
    }
    rmSync(temporary, { recursive: true })
  } catch (error) { migrationSave(temporary, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
  const before = await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)
  // R121 is the immutable content source. Main, Azur, and Lvmeng were
  // independently advanced afterward; preserve those known versions while
  // protecting every other service and topology field from drift during this
  // NTE-only release.
  assertTopology(evidence.sources.baseline, before, {
    gachia: activeVersion(before, 'gachia'),
    'gachia-game-azur-promilia': activeVersion(before, 'gachia-game-azur-promilia'),
    'gachia-game-lvmeng': activeVersion(before, 'gachia-game-lvmeng'),
  })
  for (const row of Object.values(evidence.sources.owners) as any[]) assertModuleVersionIdentity(row.version, await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: tokens.cloudToken, request: unifiedProductionRead }))
  assertModuleVersionIdentity(evidence.sources.router.version, await readMigrationRouterVersion({ versionId: evidence.sources.router.versionId, token: tokens.cloudToken, request: unifiedProductionRead }))
  assertTopology(before, await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)); executor.verify()
  const releaseKey = nteReleaseKey(request, executor.executorCI, evidence.migration), policy = evidence.migration ? NTE_MIGRATION_POLICY : NTE_INDEPENDENT_POLICY
  const identity = { policy, releaseKey, sourceCommit: executor.executorCommit,
    ...(evidence.migration ? { sourceCI: executor.executorCI, sourceIndexPin: evidence.value.sourceIndex.pin, activePin: evidence.built.value.active.pin }
      : { executorCI: executor.executorCI, bundlePin: request.bundle.pin, reviewPin: review!.reviewPin }),
    baseline: evidence.migration ? evidence.sources.baseline : before, observedAt: Date.now(), owners: evidence.value.owners }
  const verify = async () => {
    executor.verify(); assert.deepEqual((await verifyNteReleaseBundle(request.bundle)).value, evidence.value)
    if (editorial) { assert.equal((await readUnifiedProductionReview(plan!, editorial.selected, tokens.cmsToken!)).reviewPin, review!.reviewPin); application(editorial.application, repo, executor.executorCommit) }
    executor.verify(); return { ...identity, observedAt: Date.now() }
  }
  return { request, evidence, identity, verify, executor }
}
export async function activateNteProduction(input: { request: unknown; cmsToken?: string; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditNteProduction(input.request, input); assert.equal(input.releaseKey, audited.identity.releaseKey)
  const directory = path.resolve(input.directory); assertDiskBudget({ path: directory, operation: 'NTE cloud evidence', estimatedBytes: 2 * GiB }); mkdirSync(directory, { mode: 0o700 })
  migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const network = audited.request.previewProxy ? await createNteMigrationPreviewNetwork(audited.request.previewProxy) : undefined
  const publicNetwork = audited.request.publicProxy ? await createGenshinPublicNetwork(audited.request.publicProxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  migrationSave(directory, 'public-network.json', publicNetwork?.route ?? { kind: 'direct_public_read', retries: 0 })
  let result
  try {
    const transport = genshinMigrationTransport({ evidence: audited.evidence, releaseKey: input.releaseKey, token: input.cloudToken, directory, ...(network ? { previewRequest: network.request } : {}), ...(publicNetwork ? { publicRequest: publicNetwork.request } : {}) })
    result = await (audited.evidence.migration ? executeNteMigration : executeNteIndependentRelease)({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport })
  } finally { await network?.close(); await publicNetwork?.close() }
  audited.executor.verify()
  const value = { schemaVersion: 1, kind: 'nte_release_completion', request: audited.request, bundle: audited.request.bundle, executorCI: audited.executor.executorCI,
    releaseKey: input.releaseKey, ...result, journal: { path: path.join(directory, `nte-${audited.evidence.migration ? 'migration' : 'independent'}-${input.releaseKey}.jsonl`), pin: result.journalPin } }
  return { proof: migrationSave(directory, 'completion.json', value), value }
}
export async function advanceNteProduction(input: { completion: Proof; executorRunID: number; directory: string; cloudToken: string }) {
  const githubToken = githubCredential(), executor = await createUnifiedExecutorVerifier(input.executorRunID, githubToken), completed = await readCompletedNteRelease(input.completion)
  assert.deepEqual(await verifyUnifiedCI(completed.value.executorCI.runID, completed.value.executorCI.commit, githubToken), completed.value.executorCI)
  if (completed.value.continuationExecutorCI) assert.deepEqual(await verifyUnifiedCI(completed.value.continuationExecutorCI.runID, completed.value.continuationExecutorCI.commit, githubToken), completed.value.continuationExecutorCI)
  if (completed.value.finalizationExecutorCI) assert.deepEqual(await verifyUnifiedCI(completed.value.finalizationExecutorCI.runID, completed.value.finalizationExecutorCI.commit, githubToken), completed.value.finalizationExecutorCI)
  await verifyUnifiedPublishedSource({ publication: completed.evidence.sources.originalPublication, sourceIndex: completed.evidence.sources.originalSourceIndex, githubToken })
  for (const ancestor of completed.evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  assertDiskBudget({ path: input.directory, operation: 'NTE complete source continuation', estimatedBytes: GiB })
  const reader = { snapshot: () => { executor.verify(); return desktopCloudSnapshot(input.cloudToken, unifiedProductionRead) }, version: (service: string, versionId: string) => service === 'gachia-router'
    ? readMigrationRouterVersion({ versionId, token: input.cloudToken, request: unifiedProductionRead }) : readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) }
  const network = completed.value.request.publicProxy ? await createGenshinPublicNetwork(completed.value.request.publicProxy) : undefined
  try { const result = await advanceNteSources({ completion: input.completion, directory: input.directory, reader: { ...reader, publicRequest: network?.request ?? unifiedProductionRead } }); executor.verify(); return result }
  finally { await network?.close() }
}
