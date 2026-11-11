import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity } from '../../../scripts/desktop-version-provenance.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { genshinMigrationTransport } from '../../../scripts/genshin-migration-transport.mjs'
import { readMigrationRouterVersion } from '../../../scripts/genshin-migration-router.mjs'
import { GENSHIN_INDEPENDENT_POLICY, executeGenshinIndependentRelease } from '../../../scripts/genshin-independent-release.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { createGenshinMigrationPreviewNetwork, unifiedPreviewProxy } from '../../../scripts/unified-preview-network.mjs'
import { freezeUnifiedContent } from './unified-build'
import { loadUnifiedDesktopPlan, unifiedSelection } from './unified-desktop'
import { verifyUnifiedInstalledApplication } from './unified-installed-application'
import { projectRoot } from './local-environment'
import { createUnifiedExecutorVerifier, readUnifiedProductionReview, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'
import { prepareGenshinIndependentBundle, verifyGenshinIndependentBundle } from './genshin-independent-bundle'
import { advanceGenshinIndependentSources, readCompletedGenshinIndependentRelease, readGenshinIndependentSourceIndex } from './genshin-independent-history'
import { GENSHIN_PRODUCTION_SCOPE } from './unified-genshin-production-scope'
import { captureUnifiedExecutorSource } from './unified-executor-source'
import { baselineDirectory } from './inventory-baseline'
import { unifiedPlan } from './unified-plan'
import { readUnifiedSources } from './unified-sources'
import { buildUnifiedOwners } from './unified-owner-build'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'genshin_independent_editorial_request'; bundle: Proof; executorRunID: number; previewProxy?: string }
const githubCredential = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 65536 }).trim()
export function genshinIndependentRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value)); const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['bundle', 'executorRunID', 'kind', 'schemaVersion', ...(Object.hasOwn(request, 'previewProxy') ? ['previewProxy'] : [])].sort())
  if (Object.hasOwn(request, 'previewProxy')) assert.equal(unifiedPreviewProxy(request.previewProxy), request.previewProxy)
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'genshin_independent_editorial_request')
  assert.deepEqual(Object.keys(request.bundle).sort(), ['path', 'pin']); assert(path.isAbsolute(request.bundle.path) && /^[a-f0-9]{64}$/.test(request.bundle.pin))
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0); return structuredClone(request)
}
function application(proof: Proof, repo: string, commit: string) {
  const value = migrationPinned(proof)
  execFileSync('git', ['merge-base', '--is-ancestor', value.sourceCommit, commit], { cwd: repo, stdio: 'pipe' })
  verifyUnifiedInstalledApplication(path.join(homedir(), 'Library/Application Support/GachiaCMS'), repo, value.sourceCommit, proof)
}
export async function prepareGenshinIndependentProduction(input: { sourceIndex: Proof; selection: Proof; application: Proof; directory: string; cmsToken: string }) {
  assert.deepEqual(Object.keys(input).sort(), ['application', 'cmsToken', 'directory', 'selection', 'sourceIndex'])
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS)
  const repo = path.resolve(projectRoot, '../..'), executor = captureUnifiedExecutorSource(repo), directory = path.resolve(input.directory)
  application(input.application, repo, executor.commit)
  const sources = await readGenshinIndependentSourceIndex(input.sourceIndex)
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((row: { id: string }) => row.id))
  const selected = unifiedSelection(migrationPinned(input.selection), plan); assert.equal(selected.length, 1)
  const review = await readUnifiedProductionReview(plan, selected, input.cmsToken)
  mkdirSync(directory, { mode: 0o700 })
  try {
    const frozen = freezeUnifiedContent({ repo, commit: executor.commit, directory: path.join(directory, 'build'), plan, records: review.records,
      activeSources: sources.sources, preview: false, productionScope: GENSHIN_PRODUCTION_SCOPE })
    const editorial = migrationSave(directory, 'review.json', { sourceCommit: executor.commit, planSHA256: plan.planSHA256, selected,
      reviews: review.reviews, reviewPin: review.reviewPin, application: input.application })
    const built = await buildUnifiedOwners(frozen.directory, frozen.manifestPin, [])
    const sealed = await prepareGenshinIndependentBundle({ build: { path: path.join(built.directory, 'build.json'), pin: built.buildPin },
      sourceIndex: input.sourceIndex, review: editorial, directory: path.join(directory, 'sealed') })
    assert.equal((await readUnifiedProductionReview(plan, selected, input.cmsToken)).reviewPin, review.reviewPin); executor.verify()
    const value = { schemaVersion: 1, kind: 'genshin_independent_editorial_preparation', bundle: sealed.proof, sourceCommit: executor.commit,
      review: editorial, owners: ['genshin'], cloudWrites: false, productionReady: false }
    return { proof: migrationSave(directory, 'preparation.json', value), value }
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
export async function auditGenshinIndependentProduction(input: unknown, tokens: { cmsToken: string; cloudToken: string }) {
  const request = genshinIndependentRequest(input), githubToken = githubCredential(), executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const evidence = await verifyGenshinIndependentBundle(request.bundle), repo = path.resolve(projectRoot, '../..')
  assert.equal(evidence.value.sourceCommit, executor.executorCommit, 'Build and executor require the same full exact CI')
  await verifyUnifiedPublishedSource({ publication: evidence.sources.originalPublication, sourceIndex: evidence.sources.originalSourceIndex, githubToken })
  for (const ancestor of evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  const editorial = migrationPinned(evidence.value.review), frozen = evidence.built.frozen
  const { plan } = loadUnifiedDesktopPlan(repo, frozen.planSHA256)
  assert.equal(editorial.planSHA256, plan.planSHA256); assert.equal(editorial.sourceCommit, executor.executorCommit)
  assert.equal(editorial.selected.length, 1); assert.deepEqual(editorial.selected, frozen.candidate.changed)
  application(editorial.application, repo, executor.executorCommit)
  const review = await readUnifiedProductionReview(plan, editorial.selected, tokens.cmsToken)
  assert.deepEqual(review.reviews, editorial.reviews); assert.equal(review.reviewPin, editorial.reviewPin)
  // Recompile from exact Git and current approved CMS bytes. Artifact/tree pins
  // alone cannot prove that caller-supplied frozen application code is trusted.
  const temporary = mkdtempSync(path.join(evidence.built.directory, '.production-source-check-'))
  try {
    const reconstructed = freezeUnifiedContent({ repo, commit: executor.executorCommit, directory: path.join(temporary, 'freeze'), plan, records: review.records,
      activeSources: evidence.sources.sources, preview: false, productionScope: GENSHIN_PRODUCTION_SCOPE })
    assert.equal(reconstructed.sourceTreeSHA256, frozen.sourceTreeSHA256, 'Frozen code/data differs from exact Git plus approved CMS and complete A')
    assert.deepEqual(reconstructed.candidate, frozen.candidate)
    rmSync(temporary, { recursive: true })
  } catch (error) { migrationSave(temporary, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
  const before = await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)
  const { assertTopology } = await import('../../../scripts/desktop-cloud-release.mjs')
  assertTopology(evidence.sources.baseline, before)
  for (const row of Object.values(evidence.sources.owners) as any[]) assertModuleVersionIdentity(row.version,
    await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: tokens.cloudToken, request: unifiedProductionRead }))
  assertModuleVersionIdentity(evidence.sources.router.version, await readMigrationRouterVersion({ versionId: evidence.sources.router.versionId, token: tokens.cloudToken, request: unifiedProductionRead }))
  assertTopology(before, await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)); executor.verify()
  const releaseKey = digest(migrationJSON({ policy: GENSHIN_INDEPENDENT_POLICY, bundle: request.bundle, executorCI: executor.executorCI,
    ...(request.previewProxy ? { previewProxy: request.previewProxy } : {}) }))
  const identity = { policy: GENSHIN_INDEPENDENT_POLICY, releaseKey, sourceCommit: executor.executorCommit, executorCI: executor.executorCI, bundlePin: request.bundle.pin,
    reviewPin: review.reviewPin, baseline: evidence.sources.baseline, observedAt: Date.now(), owners: evidence.value.owners }
  const verify = async () => {
    executor.verify(); const reopened = await verifyGenshinIndependentBundle(request.bundle); assert.deepEqual(reopened.value, evidence.value)
    const current = await readUnifiedProductionReview(plan, editorial.selected, tokens.cmsToken); assert.equal(current.reviewPin, review.reviewPin)
    application(editorial.application, repo, executor.executorCommit); executor.verify(); return { ...identity, observedAt: Date.now() }
  }
  return { request, evidence, identity, verify, executor }
}

export async function activateGenshinIndependentProduction(input: { request: unknown; cmsToken: string; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditGenshinIndependentProduction(input.request, input); assert.equal(input.releaseKey, audited.identity.releaseKey, 'Explicit audited independent release key required')
  const directory = path.resolve(input.directory); assertDiskBudget({ path: directory, operation: 'single Genshin cloud evidence', estimatedBytes: 2 * GiB }); mkdirSync(directory, { mode: 0o700 })
  migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const network = audited.request.previewProxy ? await createGenshinMigrationPreviewNetwork(audited.request.previewProxy) : undefined
  migrationSave(directory, 'preview-network.json', network?.route ?? { kind: 'direct_exact_version_read', retries: 0 })
  let result
  try {
    const transport = genshinMigrationTransport({ evidence: audited.evidence, releaseKey: input.releaseKey, token: input.cloudToken, directory,
      ...(network ? { previewRequest: network.request } : {}) })
    result = await executeGenshinIndependentRelease({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport })
  } finally { await network?.close() }
  audited.executor.verify()
  const value = { schemaVersion: 1, kind: 'genshin_independent_editorial_completion', request: audited.request, bundle: audited.request.bundle,
    executorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result,
    journal: { path: path.join(directory, `genshin-independent-${input.releaseKey}.jsonl`), pin: result.journalPin } }
  assert.equal(digest(readFileSync(value.journal.path)), value.journal.pin)
  return { proof: migrationSave(directory, 'completion.json', value), value }
}

export async function advanceGenshinIndependentProduction(input: { completion: Proof; executorRunID: number; directory: string; cloudToken: string }) {
  const githubToken = githubCredential(), executor = await createUnifiedExecutorVerifier(input.executorRunID, githubToken)
  const completed = await readCompletedGenshinIndependentRelease(input.completion)
  assert.deepEqual(await verifyUnifiedCI(completed.value.executorCI.runID, completed.value.executorCI.commit, githubToken), completed.value.executorCI)
  await verifyUnifiedPublishedSource({ publication: completed.evidence.sources.originalPublication, sourceIndex: completed.evidence.sources.originalSourceIndex, githubToken })
  for (const ancestor of completed.evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  assertDiskBudget({ path: input.directory, operation: 'independent published source continuation', estimatedBytes: GiB })
  const reader = { snapshot: () => { executor.verify(); return desktopCloudSnapshot(input.cloudToken, unifiedProductionRead) },
    version: (service: string, versionId: string) => service === 'gachia-router' ? readMigrationRouterVersion({ versionId, token: input.cloudToken, request: unifiedProductionRead })
      : readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) }
  const result = await advanceGenshinIndependentSources({ completion: input.completion, directory: input.directory, reader }); executor.verify(); return result
}
