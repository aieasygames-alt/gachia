import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { boundedBody } from '../../../scripts/desktop-version-preview.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { executeUnifiedPreviewProtocol } from '../../../scripts/unified-preview-protocol.mjs'
import { unifiedProductionRead, unifiedProductionTransport } from '../../../scripts/unified-production-transport.mjs'
import { projectRoot } from './local-environment'
import { loadUnifiedDesktopPlan, readPinnedUnifiedInput, unifiedSelection, verifyUnifiedPublishedDocuments } from './unified-desktop'
import { verifyUnifiedInstalledApplication } from './unified-installed-application'
import { exportUnifiedContent, type SourceBytes } from './unified-export'
import { captureUnifiedExecutorSource } from './unified-executor-source'
import { verifyUnifiedOwnerBuild } from './unified-owner-build'
import { verifyUnifiedPreviewContract } from './unified-preview'
import { assertUnifiedProductionOwnerClosure, unifiedEditorialScope, unifiedProductionQualification } from './unified-production-scope'
import { readUnifiedPreservationCatalogs, unifiedPreservationSelection, verifyUnifiedPreservedMainResources } from './unified-preservation'
import { verifyUnifiedTransport } from './unified-transport'

type Proof = { path: string; pin: string }
export type UnifiedProductionRequest = {
  schemaVersion: 1; kind: 'unified_production_preview_request'; repo: string
  localPreview: Proof; editorial: Proof; selection: Proof; active: Proof; application: Proof; sourceHandoff: Proof
  sourceRunID: number; executorRunID: number
  preservation?: Proof
}
const keys = (value: object, expected: string[]) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Unknown production request fields')
export function unifiedProductionRequest(value: unknown): UnifiedProductionRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  keys(value, ['schemaVersion', 'kind', 'repo', 'localPreview', 'editorial', 'selection', 'active', 'application', 'sourceHandoff', 'sourceRunID', 'executorRunID',
    ...(Object.hasOwn(value, 'preservation') ? ['preservation'] : [])])
  const request = value as UnifiedProductionRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_production_preview_request')
  assert(typeof request.repo === 'string' && path.isAbsolute(request.repo))
  for (const field of ['localPreview', 'editorial', 'selection', 'active', 'application', 'sourceHandoff',
    ...(Object.hasOwn(value, 'preservation') ? ['preservation' as const] : [])] as const) {
    const proof = request[field]; assert(proof && typeof proof === 'object'); keys(proof, ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  assert(Number.isSafeInteger(request.sourceRunID) && request.sourceRunID > 0)
  assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  return request
}
const pinned = <T>(proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as T
const readJSON = async (url: string, headers: Record<string, string> = {}) => {
  const response = await unifiedProductionRead(url, { method: 'GET', redirect: 'error', credentials: 'omit', headers, signal: AbortSignal.timeout(30000) })
  assert(response.ok, `Read-only production preflight HTTP ${response.status}`)
  return JSON.parse((await boundedBody(response)).toString())
}

export async function verifyUnifiedCI(runID: number, commit: string, githubToken = process.env.GITHUB_TOKEN) {
  assert(Number.isSafeInteger(runID) && runID > 0 && /^[a-f0-9]{40}$/.test(commit))
  assert(typeof githubToken === 'string' && githubToken.length > 0, 'Private repository CI requires an authenticated GitHub read')
  const base = `https://api.github.com/repos/aieasygames-alt/gachia/actions/runs/${runID}`
  const headers = { accept: 'application/vnd.github+json', authorization: `Bearer ${githubToken}` }
  const run = await readJSON(base, headers)
  assert.equal(run.repository?.full_name, 'aieasygames-alt/gachia'); assert.equal(run.id, runID)
  assert.equal(run.path, '.github/workflows/payload-verify.yml'); assert.equal(run.head_branch, 'codex/payload-unified-maintenance')
  assert.equal(run.head_sha, commit); assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success')
  const jobs = await readJSON(base + '/jobs?per_page=100', headers)
  assert.equal(jobs.total_count, 1); assert.equal(jobs.jobs[0].conclusion, 'success')
  for (const name of ['Verify CMS types without deployment credentials', 'Test isolated CMS', 'Verify current content inventory and Router contracts',
    'Test release tooling without deployment credentials', 'Test public Web and Data consumers', 'Typecheck public consumers without builds', 'Test documentation and verification scope gates']) {
    assert(jobs.jobs[0].steps.some((step: { name: string; conclusion: string }) => step.name === name && step.conclusion === 'success'), `Full exact-CI step required: ${name}`)
  }
  return { runID, commit, runAttempt: run.run_attempt, status: 'full_exact_ci_passed' }
}

type ExecutorIdentity = { commit: string; runID: number }
function assertExecutorIdentity(value: ExecutorIdentity) {
  assert(value && typeof value === 'object' && !Array.isArray(value)); keys(value, ['commit', 'runID'])
  assert(typeof value.commit === 'string' && /^[a-f0-9]{40}$/.test(value.commit))
  assert(Number.isSafeInteger(value.runID) && value.runID > 0)
}

export async function verifyUnifiedExecutorCI(current: ExecutorIdentity, githubToken: string, origin?: ExecutorIdentity) {
  assertExecutorIdentity(current)
  if (origin !== undefined) assertExecutorIdentity(origin)
  const executorCI = await verifyUnifiedCI(current.runID, current.commit, githubToken)
  const originExecutorCI = origin ? await verifyUnifiedCI(origin.runID, origin.commit, githubToken) : executorCI
  return { executorCI, originExecutorCI }
}

export async function readUnifiedProductionReview(plan: Parameters<typeof verifyUnifiedPublishedDocuments>[0], selected: string[], cmsToken: string) {
  assert(typeof cmsToken === 'string' && cmsToken.length > 0, 'Authenticated loopback CMS credential required')
  // Long synchronous historical verification must not reuse a loopback socket
  // whose idle close could not be processed while the event loop was blocked.
  const base = 'http://127.0.0.1:3100', headers = { authorization: `JWT ${cmsToken}`, origin: base, connection: 'close' }
  const user = await readJSON(base + '/api/users/me', headers)
  assert(['admin', 'reviewer'].includes(user.user?.role), 'Production review requires reviewer access')
  const docs: Record<string, unknown>[] = [], games = new Map<unknown, { id: unknown; key: unknown }>()
  for (const key of selected) {
    const query = new URLSearchParams({ 'where[stableKey][equals]': key, draft: 'false', locale: 'all', 'fallback-locale': 'none', depth: '0', limit: '2' })
    const result = await readJSON(base + '/api/content-records?' + query, headers)
    assert.equal(result.totalDocs, 1); assert.equal(result.docs.length, 1); assert.equal(result.hasNextPage, false)
    const doc = result.docs[0]; docs.push(doc)
    assert(typeof doc.game === 'number' || typeof doc.game === 'string', 'Depth-zero game relation required')
    if (!games.has(doc.game)) games.set(doc.game, await readJSON(base + '/api/games/' + encodeURIComponent(doc.game), headers))
  }
  return verifyUnifiedPublishedDocuments(plan, selected, docs, [...games.values()])
}

export async function verifyUnifiedProductionLocal(request: UnifiedProductionRequest, cmsToken: string) {
  request = structuredClone(unifiedProductionRequest(request))
  const repo = path.resolve(projectRoot, '../..'); assert.equal(realpathSync(request.repo), repo, 'Production executor must use this reviewed checkout')
  const preview = await verifyUnifiedPreviewContract(path.dirname(request.localPreview.path), request.localPreview.pin)
  assert.equal(request.localPreview.path, path.join(preview.directory, 'preview.json'))
  const transport = await verifyUnifiedTransport(preview.receipt.transportDirectory, preview.receipt.transportPin)
  assert.equal(transport.receipt.preview, false, 'Never upload fixture/rehearsal content')
  const publication = JSON.parse(readFileSync(path.join(transport.receipt.publicationDirectory, 'publication.json'), 'utf8'))
  const built = verifyUnifiedOwnerBuild(publication.buildDirectory, publication.buildPin)
  const frozen = built.frozen, build = built.directory
  assert.equal(request.editorial.path, path.join(build, 'editorial.json'))
  const editorial = pinned<Record<string, any>>(request.editorial)
  assert.equal(editorial.schemaVersion, 1); assert.equal(editorial.kind, 'unified_desktop_editorial_selection')
  assert.equal(editorial.preview, false); assert.equal(editorial.cmsMode, 'desktop')
  assert.equal(editorial.frozenManifestPin, built.receipt.frozenPin)
  assert.equal(editorial.selectionPin, request.selection.pin); assert.equal(editorial.activePin, request.active.pin)
  const { plan, originals } = loadUnifiedDesktopPlan(repo, frozen.planSHA256)
  assert.equal(editorial.planSHA256, plan.planSHA256)
  const selected = unifiedSelection(pinned(request.selection), plan), active = pinned<SourceBytes[]>(request.active)
  const review = await readUnifiedProductionReview(plan, selected, cmsToken)
  assert.deepEqual(review.reviews, editorial.reviews, 'CMS formal review changed since freezing')
  assert.equal(review.reviewPin, editorial.reviewPin)
  const candidate = exportUnifiedContent(review.records, originals, active, false)
  assert.deepEqual(candidate.manifest, frozen.candidate, 'Live approved candidate differs from sealed source')
  assert.equal(editorial.candidateSHA256, candidate.manifest.candidateSHA256); assert.deepEqual(editorial.changed, candidate.manifest.changed)
  for (const row of active) {
    const original = execFileSync('git', ['show', `${frozen.sourceCommit}:${row.sourcePath}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 })
    assert.equal(digest(originals.find(source => source.sourcePath === row.sourcePath)!.text), digest(original), 'Frozen import differs from exact source commit')
  }
  const ownership = JSON.parse(readFileSync(path.join(build, 'source/packages/core/route-ownership.json'), 'utf8'))
  const scope = unifiedEditorialScope(candidate.manifest, plan, ownership)
  const qualification = unifiedProductionQualification(review.records, active, candidate)
  assert.deepEqual(frozen.owners, scope.build.owners)
  const root = path.join(homedir(), 'Library/Application Support/GachiaCMS')
  verifyUnifiedInstalledApplication(root, repo, frozen.sourceCommit, request.application)
  const preservation = request.preservation ? readUnifiedPreservationCatalogs(unifiedPreservationSelection(pinned(request.preservation), scope.preservationOnlyOwners),
    scope, plan, active, repo) : undefined
  if (preservation) verifyUnifiedPreservedMainResources(transport, Object.keys(preservation))
  assert.equal((await readUnifiedProductionReview(plan, selected, cmsToken)).reviewPin, review.reviewPin, 'Formal CMS review changed during preflight')
  verifyUnifiedInstalledApplication(root, repo, frozen.sourceCommit, request.application)
  return { preview, transport, publication, built, build, editorial, review, scope, qualification, preservation, request }
}

export async function createUnifiedExecutorVerifier(runID: number, githubToken: string) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Unified production is single-Mac desktop only')
  return verifyUnifiedExecutorCheckout(path.resolve(projectRoot, '../..'), runID, githubToken)
}

// Read-only integrity verification; desktop eligibility remains at the fixed entry.
export async function verifyUnifiedExecutorCheckout(repo: string, runID: number, githubToken: string) {
  const source = captureUnifiedExecutorSource(repo), executorCommit = source.commit
  const executorCI = await verifyUnifiedCI(runID, executorCommit, githubToken)
  source.verify()
  return { executorCommit, executorCI, verify: source.verify }
}

export async function createUnifiedProductionVerifier(request: UnifiedProductionRequest, { cmsToken, cloudToken }: { cmsToken: string; cloudToken: string },
  options: { originExecutor?: ExecutorIdentity } = {}) {
  keys(options, Object.hasOwn(options, 'originExecutor') ? ['originExecutor'] : [])
  if (Object.hasOwn(options, 'originExecutor')) assertExecutorIdentity(options.originExecutor!)
  request = structuredClone(unifiedProductionRequest(request))
  options = structuredClone(options)
  const { verifyUnifiedProductionState } = await import('./unified-production-verifier')
  return verifyUnifiedProductionState(request, { cmsToken, cloudToken }, options)
}

// This is the only production upload entry. Neither request JSON nor CLI flags
// can inject a verifier/transport or request promotion; unknown results stop.
export async function uploadUnifiedProductionPreviews(input: { request: UnifiedProductionRequest; cmsToken: string; cloudToken: string; releaseKey: string }) {
  const evidence = await createUnifiedProductionVerifier(input.request, input)
  assert.equal(input.releaseKey, evidence.value.releaseKey, 'Explicit matching reviewed release key required')
  assertUnifiedProductionOwnerClosure(evidence.scope)
  const run = evidence.build, directory = path.join(run, `unified-cloud-preview-${evidence.value.transportPin}`)
  assertDiskBudget({ path: run, operation: 'unified cloud preview evidence', estimatedBytes: 2 * GiB })
  const result = await executeUnifiedPreviewProtocol({ run, directory, transportPin: evidence.value.transportPin, verify: evidence.verify,
    authorize: async () => input.releaseKey, transport: unifiedProductionTransport({ evidence, token: input.cloudToken, directory, parserVersion: 'streaming-v2' }) })
  return { ...result, sourceCI: evidence.ci, originExecutorCI: evidence.originExecutorCI, executorCI: evidence.executorCI }
}
