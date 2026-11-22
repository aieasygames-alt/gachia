import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { desktopCloudSnapshot, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { migrationJSON, migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { executeLvmengIndependentRelease } from '../../../scripts/genshin-independent-release.mjs'
import { lvmengIndependentTransport } from '../../../scripts/lvmeng-independent-transport.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { unifiedPreviewProxy, createGenshinPublicNetwork } from '../../../scripts/unified-preview-network.mjs'
import { prepareLvmengIndependentBundle, verifyLvmengIndependentBundle } from './lvmeng-independent-bundle'
import { readNteSourceIndex } from './nte-release-history'
import { freezeUnifiedContent } from './unified-build'
import { buildUnifiedOwners } from './unified-owner-build'
import { loadUnifiedDesktopPlan, unifiedSelection } from './unified-desktop'
import { verifyUnifiedInstalledApplication } from './unified-installed-application'
import { projectRoot } from './local-environment'
import { createUnifiedExecutorVerifier, readUnifiedProductionReview, verifyUnifiedCI } from './unified-production'
import { verifyUnifiedPublishedSource } from './unified-source-advance'
import { LVMENG_PRODUCTION_SCOPE } from './unified-genshin-production-scope'
import { captureUnifiedExecutorSource } from './unified-executor-source'
import { baselineDirectory } from './inventory-baseline'
import { unifiedPlan } from './unified-plan'
import { readUnifiedSources } from './unified-sources'
import { digest } from './legacy-intake'

type Proof = { path: string; pin: string }
type Request = { schemaVersion: 1; kind: 'lvmeng_release_request'; bundle: Proof; executorRunID: number; previewProxy?: string; publicProxy?: string }
const githubCredential = () => execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 65536 }).trim()
export const LVMENG_INDEPENDENT_POLICY = 'lvmeng-independent-existing-character-text-production-v1'
export function assertLvmengProductionBaseline(sources: { allOwnersCurrent: boolean; baseline: unknown }, observed: unknown) {
  assert.equal(sources.allOwnersCurrent, true, 'Lvmeng publication requires a complete current source index')
  assertTopology(sources.baseline, observed)
}
export const lvmengReleaseKey = (request: Request, executorCI: any) => digest(migrationJSON({ policy: LVMENG_INDEPENDENT_POLICY, bundle: request.bundle, executorCI, ...(request.previewProxy ? { previewProxy: request.previewProxy } : {}), ...(request.publicProxy ? { publicProxy: request.publicProxy } : {}) }))

export function lvmengProductionRequest(value: unknown): Request {
  assert(value && typeof value === 'object' && !Array.isArray(value)); const request = value as Request
  assert.deepEqual(Object.keys(request).sort(), ['bundle', 'executorRunID', 'kind', 'schemaVersion', ...(Object.hasOwn(request, 'previewProxy') ? ['previewProxy'] : []), ...(Object.hasOwn(request, 'publicProxy') ? ['publicProxy'] : [])].sort())
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'lvmeng_release_request'); assert.deepEqual(Object.keys(request.bundle).sort(), ['path', 'pin'])
  assert(path.isAbsolute(request.bundle.path) && /^[a-f0-9]{64}$/.test(request.bundle.pin)); for (const key of ['previewProxy', 'publicProxy'] as const) if (Object.hasOwn(request, key)) assert.equal(unifiedPreviewProxy(request[key]), request[key])
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0); return structuredClone(request)
}
function application(proof: Proof, repo: string, commit: string) {
  const value = migrationPinned(proof); execFileSync('git', ['merge-base', '--is-ancestor', value.sourceCommit, commit], { cwd: repo, stdio: 'pipe' }); verifyUnifiedInstalledApplication(path.join(homedir(), 'Library/Application Support/GachiaCMS'), repo, value.sourceCommit, proof)
}
export async function prepareLvmengIndependentProduction(input: { sourceIndex: Proof; selection: Proof; application: Proof; directory: string; cmsToken: string }) {
  assert.deepEqual(Object.keys(input).sort(), ['application', 'cmsToken', 'directory', 'selection', 'sourceIndex']); assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS)
  const repo = path.resolve(projectRoot, '../..'), executor = captureUnifiedExecutorSource(repo), directory = path.resolve(input.directory); application(input.application, repo, executor.commit)
  const sources = await readNteSourceIndex(input.sourceIndex), inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((row: { id: string }) => row.id)), selected = unifiedSelection(migrationPinned(input.selection), plan); assert.equal(selected.length, 1)
  const review = await readUnifiedProductionReview(plan, selected, input.cmsToken); mkdirSync(directory, { mode: 0o700 })
  try {
    const frozen = freezeUnifiedContent({ repo, commit: executor.commit, directory: path.join(directory, 'build'), plan, records: review.records, activeSources: sources.sources, preview: false, productionScope: LVMENG_PRODUCTION_SCOPE })
    const editorial = migrationSave(directory, 'review.json', { sourceCommit: executor.commit, planSHA256: plan.planSHA256, selected, reviews: review.reviews, reviewPin: review.reviewPin, application: input.application })
    const built = await buildUnifiedOwners(frozen.directory, frozen.manifestPin, [])
    const bundle = await prepareLvmengIndependentBundle({ build: { path: path.join(built.directory, 'build.json'), pin: built.buildPin }, sourceIndex: input.sourceIndex, review: editorial, directory: path.join(directory, 'sealed') })
    assert.equal((await readUnifiedProductionReview(plan, selected, input.cmsToken)).reviewPin, review.reviewPin); executor.verify(); return bundle
  } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
export async function auditLvmengProduction(input: unknown, tokens: { cmsToken?: string; cloudToken: string }) {
  const request = lvmengProductionRequest(input), githubToken = githubCredential(), executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken), evidence = await verifyLvmengIndependentBundle(request.bundle), repo = path.resolve(projectRoot, '../..')
  assert.equal(evidence.value.sourceCommit, executor.executorCommit); await verifyUnifiedPublishedSource({ publication: evidence.sources.originalPublication, sourceIndex: evidence.sources.originalSourceIndex, githubToken }); for (const ancestor of evidence.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
  const editorial = migrationPinned(evidence.value.review), plan = loadUnifiedDesktopPlan(repo, evidence.built.frozen.planSHA256).plan; assert.equal(editorial.sourceCommit, executor.executorCommit); assert.deepEqual(editorial.selected, evidence.built.frozen.candidate.changed); application(editorial.application, repo, executor.executorCommit); assert(tokens.cmsToken)
  const review = await readUnifiedProductionReview(plan, editorial.selected, tokens.cmsToken); assert.deepEqual(review.reviews, editorial.reviews); assert.equal(review.reviewPin, editorial.reviewPin)
  const temporary = mkdtempSync(path.join(evidence.built.directory, '.lvmeng-production-source-check-'))
  try { const reconstructed = freezeUnifiedContent({ repo, commit: executor.executorCommit, directory: path.join(temporary, 'freeze'), plan, records: review.records, activeSources: evidence.sources.sources, preview: false, productionScope: LVMENG_PRODUCTION_SCOPE }); assert.equal(reconstructed.sourceTreeSHA256, evidence.built.frozen.sourceTreeSHA256); assert.deepEqual(reconstructed.candidate, evidence.built.frozen.candidate); rmSync(temporary, { recursive: true }) }
  catch (error) { migrationSave(temporary, 'failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
  const before: any = await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)
  assertLvmengProductionBaseline(evidence.sources, before)
  const row: any = (evidence.sources.owners as any).lvmeng; assert.equal(row.versionId, before.services[row.service].versions[0].version_id); await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: tokens.cloudToken, request: unifiedProductionRead }); assertTopology(before, await desktopCloudSnapshot(tokens.cloudToken, unifiedProductionRead)); executor.verify()
  const releaseKey = lvmengReleaseKey(request, executor.executorCI), identity = { policy: LVMENG_INDEPENDENT_POLICY, releaseKey, sourceCommit: executor.executorCommit, executorCI: executor.executorCI, bundlePin: request.bundle.pin, reviewPin: review.reviewPin, baseline: before, observedAt: Date.now(), owners: evidence.value.owners }
  const verify = async () => { executor.verify(); assert.deepEqual((await verifyLvmengIndependentBundle(request.bundle)).value, evidence.value); assert.equal((await readUnifiedProductionReview(plan, editorial.selected, tokens.cmsToken!)).reviewPin, review.reviewPin); application(editorial.application, repo, executor.executorCommit); return { ...identity, observedAt: Date.now() } }
  return { request, evidence, identity, verify, executor }
}
export async function activateLvmengProduction(input: { request: unknown; cmsToken: string; cloudToken: string; directory: string; releaseKey: string }) {
  const audited = await auditLvmengProduction(input.request, input); assert.equal(input.releaseKey, audited.identity.releaseKey); const directory = path.resolve(input.directory); assertDiskBudget({ path: directory, operation: 'Lvmeng cloud evidence', estimatedBytes: 2 * GiB }); mkdirSync(directory, { mode: 0o700 }); migrationSave(directory, 'request.json', audited.request); migrationSave(directory, 'identity.json', audited.identity)
  const publicNetwork = audited.request.publicProxy ? await createGenshinPublicNetwork(audited.request.publicProxy) : undefined; migrationSave(directory, 'public-network.json', publicNetwork?.route ?? { kind: 'direct_public_read' })
  let result: any; try { result = await executeLvmengIndependentRelease({ run: directory, releaseKey: input.releaseKey, verify: audited.verify, transport: lvmengIndependentTransport({ evidence: audited.evidence, baseline: audited.identity.baseline, releaseKey: input.releaseKey, token: input.cloudToken, directory, publicRequest: publicNetwork?.request ?? unifiedProductionRead }) }) } finally { await publicNetwork?.close() }
  audited.executor.verify(); const value = { schemaVersion: 1, kind: 'lvmeng_release_completion', request: audited.request, bundle: audited.request.bundle, executorCI: audited.executor.executorCI, releaseKey: input.releaseKey, ...result, journal: { path: path.join(directory, `lvmeng-independent-${input.releaseKey}.jsonl`), pin: result.journalPin } }; return { proof: migrationSave(directory, 'completion.json', value), value }
}
