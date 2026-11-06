import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { assertUnifiedOwnerSettings, unifiedRuntimeConfig, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { readUnifiedHistoricalBytes } from '../../../scripts/unified-historical-sources.mjs'
import { readUnifiedMainPreviewModules } from '../../../scripts/unified-main-evidence.mjs'
import { unifiedMainPublicReferences } from '../../../scripts/unified-main-public.mjs'
import { readUnifiedCloudPreviews } from '../../../scripts/unified-promotion-protocol.mjs'
import { unifiedPreviewReferences } from '../../../scripts/unified-version-preview.mjs'
import { baselineDirectory } from './inventory-baseline'
import { digest, snapshot } from './legacy-intake'
import { canonical } from './record-mapping'
import { readPinnedUnifiedInput, unifiedSelection } from './unified-desktop'
import type { SourceBytes } from './unified-export'
import { verifyUnifiedHistoricalReview } from './unified-historical-review'
import { withUnifiedHistoryChain } from './unified-history-chain'
import { verifyUnifiedOwnerBuild } from './unified-owner-build'
import { unifiedPlan } from './unified-plan'
import { verifyUnifiedPreviewContract } from './unified-preview'
import { unifiedProductionRequest, verifyUnifiedCI } from './unified-production'
import { assertUnifiedProductionOwnerClosure, closeUnifiedProductionOwnerScope, unifiedEditorialScope, unifiedPilotQualification } from './unified-production-scope'
import { bindUnifiedPreservedRuntime, readUnifiedPreservationCatalogs, unifiedPreservationSelection, verifyUnifiedPreservedMainResources, type PreservedRuntime } from './unified-preservation'

type Proof = { path: string; pin: string }
export type UnifiedHistoricalPublicationRequest = {
  schemaVersion: 1; kind: 'unified_historical_publication_request'; production: Proof; audit: Proof
}
const pinned = <T = any>(proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as T
const keys = (value: object, expected: string[]) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort())
export function unifiedHistoricalPublicationRequest(value: unknown): UnifiedHistoricalPublicationRequest {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  keys(value, ['schemaVersion', 'kind', 'production', 'audit'])
  const request = value as UnifiedHistoricalPublicationRequest
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, 'unified_historical_publication_request')
  for (const proof of [request.production, request.audit]) {
    assert(proof && typeof proof === 'object' && !Array.isArray(proof)); keys(proof, ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}

type Baseline = { sourcePath: string; originalSHA256: string }
export function readUnifiedHistoricalPlan(repo: string, commit: string, planPin: string, baselines: Baseline[]) {
  assert(/^[a-f0-9]{40}$/.test(commit) && /^[a-f0-9]{64}$/.test(planPin))
  const git = (file: string) => {
    assert(!path.isAbsolute(file) && file.split('/').every(part => part && part !== '.' && part !== '..') && !file.includes('\\'))
    const bytes = execFileSync('git', ['show', `${commit}:${file}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }), text = bytes.toString('utf8')
    assert(Buffer.from(text).equals(bytes), 'Historical Git source must be UTF-8'); return text
  }
  const inventory = JSON.parse(git(path.join(baselineDirectory, 'inventory.json')))
  const originals = baselines.map(row => {
    const text = git(row.sourcePath); assert.equal(digest(text), row.originalSHA256, 'Historical Git import differs from frozen O')
    return { sourcePath: row.sourcePath, text, sha256: row.originalSHA256 }
  })
  const sources = originals.map(row => {
    const raw = row.sourcePath.match(/^packages\/data\/games\/([a-z0-9-]+)\/raw-[a-z-]+\.json$/)
    const inline = row.sourcePath.match(/^(?:apps\/game-([a-z0-9-]+)\/lib\/data|packages\/data\/games\/([a-z0-9-]+)\/(?:tier-lists|progression))\.ts$/)
    assert(raw || inline, 'Unregistered historical content path')
    return snapshot(raw?.[1] ?? inline![1] ?? inline![2], row.sourcePath, raw ? 'raw-json' : 'inline-code', row.text)
  })
  const plan = unifiedPlan(sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  assert.equal(plan.planSHA256, planPin, 'Historical plan must reproduce its original pin')
  return { plan, originals }
}

// Reopen the sealed publication after CMS documents, installed releases or the
// active Main have advanced. No current CMS/cloud state is used as historical O.
export async function readUnifiedHistoricalPublication(input: UnifiedHistoricalPublicationRequest) {
  const request = structuredClone(unifiedHistoricalPublicationRequest(input))
  return withUnifiedHistoryChain(request.production.path, () => readHistoricalPublication(request))
}

async function readHistoricalPublication(request: UnifiedHistoricalPublicationRequest) {
  const production = unifiedProductionRequest(pinned(request.production)), audit = pinned(request.audit)
  assert.equal(audit.requestPin, request.production.pin); assert.equal(audit.status, 'production_preview_preflight_passed_no_upload')
  assert.equal(audit.scopeClosureRequired, false); assert.equal(audit.productionPromoted, false); assert.equal(audit.cloudWrites, false)
  assert.deepEqual(audit.ownerOrder, ['main']); assert.equal(audit.executorCI.runID, production.executorRunID)
  const preview = await verifyUnifiedPreviewContract(path.dirname(production.localPreview.path), production.localPreview.pin)
  assert.equal(production.localPreview.path, path.join(preview.directory, 'preview.json'))
  const transport = { directory: preview.receipt.transportDirectory, transportPin: preview.receipt.transportPin,
    receipt: pinned({ path: path.join(preview.receipt.transportDirectory, 'transport.json'), pin: preview.receipt.transportPin }) }
  assert.equal(transport.receipt.preview, false)
  const publication = pinned({ path: path.join(transport.receipt.publicationDirectory, 'publication.json'), pin: transport.receipt.publicationPin })
  const built = verifyUnifiedOwnerBuild(publication.buildDirectory, publication.buildPin), build = built.directory
  assert.equal(production.editorial.path, path.join(build, 'editorial.json'))
  const editorial = pinned(production.editorial), active = pinned<SourceBytes[]>(production.active)
  assert.equal(editorial.selectionPin, production.selection.pin); assert.equal(editorial.activePin, production.active.pin)
  const { plan, originals } = readUnifiedHistoricalPlan(production.repo, built.frozen.sourceCommit, built.frozen.planSHA256, built.frozen.candidate.baselines)
  const selected = unifiedSelection(pinned(production.selection), plan)
  assert.deepEqual(active.map(row => row.sourcePath).sort(), plan.sources.map(source => source.sourcePath).sort(), 'Complete historical active sources required')
  const sealedSources = active.map(row => {
    const text = readUnifiedHistoricalBytes(path.join(build, 'source', row.sourcePath)).toString('utf8')
    return { sourcePath: row.sourcePath, text, sha256: digest(text) }
  })
  const review = verifyUnifiedHistoricalReview({ plan, originals, active, selected, editorial, sealedSources,
    frozen: built.frozen, frozenPin: built.receipt.frozenPin })
  const ownership = JSON.parse(readUnifiedHistoricalBytes(path.join(build, 'source/packages/core/route-ownership.json')).toString())
  const initialScope = unifiedEditorialScope(review.candidate.manifest, plan, ownership)
  const qualification = unifiedPilotQualification(review.records, active, review.candidate)
  assert.deepEqual(built.frozen.owners, initialScope.build.owners); assert.deepEqual(qualification, audit.qualification)
  const previous = pinned({ path: publication.previousPath, pin: publication.previousPin })
  const { readUnifiedPublicationSources } = await import('./unified-source-advance')
  const sources = await readUnifiedPublicationSources(production.sourceHandoff, { baseline: audit.baseline, active, frozen: built.frozen, previous,
    identityObservedAt: audit.identityObservedAt })
  assert.deepEqual(Object.keys(previous.owners).sort(), [...built.frozen.owners].sort())
  const preservation = readUnifiedPreservationCatalogs(unifiedPreservationSelection(pinned(production.preservation!), initialScope.preservationOnlyOwners),
    initialScope, plan, active, production.repo)
  verifyUnifiedPreservedMainResources(transport, Object.keys(preservation))
  const owners: Record<string, any> = {}, preservedOwners: Record<string, PreservedRuntime> = {}
  for (const owner of built.frozen.owners) {
    const old = (sources.owners as Record<string, any>)[owner]
    const { version, sourceIdentityPin, ...original } = old
    assert.deepEqual(previous.owners[owner], original, 'Publication must use the exact source handoff')
    const sealed = transport.receipt.owners[owner], row = publication.owners[owner]
    assert.equal(row.service, old.service); assert.equal(row.sourceVersionId, old.versionId); assert.equal(row.runtimeModuleSHA256, old.moduleSHA256)
    const target = unifiedTransportTarget(owner, readUnifiedHistoricalBytes(path.join(build, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`, 'wrangler.jsonc')).toString())
    const metadata = (await multipartModule(readUnifiedHistoricalBytes(path.join(transport.directory, owner, 'recovery/exact.multipart')))).metadata
    assertUnifiedOwnerSettings(owner, target, metadata, sources.baseline)
    owners[owner] = { service: old.service, sourceVersionId: old.versionId, sourceIdentityPin,
      ...Object.fromEntries(['candidate', 'recovery'].map(role => [role, { moduleSHA256: sealed[role].moduleSHA256, configPin: sealed[role].uploadConfigPin,
        artifactPin: row[role].artifactSHA256, referencesPin: sealed[role].referencesPin }])) }
    if (preservation[owner]) preservedOwners[owner] = bindUnifiedPreservedRuntime(preservation[owner], { ...owners[owner], moduleSHA256: old.moduleSHA256 }, sources.baseline)
  }
  const scope = closeUnifiedProductionOwnerScope(initialScope, preservedOwners)
  assertUnifiedProductionOwnerClosure(scope); assert.deepEqual(scope, audit.scope)
  const releaseKey = digest(canonical({ candidate: review.candidate.manifest.candidateSHA256, review: review.reviewPin, transport: transport.transportPin,
    executorCommit: audit.executorCI.commit, sourceCommit: built.frozen.sourceCommit, owners: scope.uploadOwners,
    preservation: production.preservation!.pin, preservedOwners }))
  const value = { preview: false, transportPin: transport.transportPin, releaseKey, changed: review.candidate.manifest.changed, ownerOrder: scope.uploadOwners,
    owners: Object.fromEntries(scope.uploadOwners.map(owner => [owner, owners[owner]])), preservedOwners, baseline: sources.baseline, identityObservedAt: audit.identityObservedAt }
  for (const [key, expected] of Object.entries(value)) assert.deepEqual(audit[key], expected, `Historical audit differs: ${key}`)
  assert.equal(audit.sourceCI.runID, production.sourceRunID); assert.equal(audit.sourceCI.commit, built.frozen.sourceCommit)
  return { request, production, audit, preview, transport, publication, built, build, plan, originals, active, sealedSources, review, scope, qualification, sources, value,
    currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false, ciVerified: false, productionReady: false } as const
}

export async function verifyUnifiedHistoricalPublication(request: UnifiedHistoricalPublicationRequest, githubToken: string) {
  const evidence = await readUnifiedHistoricalPublication(request)
  return verifyUnifiedHistoricalPublicationEvidence(evidence, githubToken)
}

export async function verifyUnifiedHistoricalPublicationEvidence(evidence: Awaited<ReturnType<typeof readUnifiedHistoricalPublication>>, githubToken: string): Promise<any> {
  if (evidence.sources.ancestor) {
    const { verifyUnifiedPublishedMainEvidence } = await import('./unified-published-main')
    await verifyUnifiedPublishedMainEvidence(evidence.sources.ancestor, githubToken)
  }
  const sourceCI = await verifyUnifiedCI(evidence.production.sourceRunID, evidence.built.frozen.sourceCommit, githubToken)
  const originExecutorCI = await verifyUnifiedCI(evidence.production.executorRunID, evidence.audit.executorCI.commit, githubToken)
  assert.deepEqual(sourceCI, evidence.audit.sourceCI); assert.deepEqual(originExecutorCI, evidence.audit.executorCI)
  return { ...evidence, sourceCI, originExecutorCI, ciVerified: true } as const
}

export async function readUnifiedHistoricalMainPreviews(evidence: Pick<Awaited<ReturnType<typeof readUnifiedHistoricalPublication>>, 'build' | 'transport' | 'value'>, proof: Proof) {
  const references = (owner: string, role: string) => {
    assert.equal(owner, 'main'); assert(['candidate', 'recovery'].includes(role))
    const root = path.join(evidence.transport.directory, owner, role, 'http')
    const rows = pinned({ path: path.join(root, 'references.json'), pin: evidence.value.owners.main[role].referencesPin })
    return unifiedPreviewReferences(rows, (row: { bodyFile: string }, index: number) => {
      assert.equal(row.bodyFile, `${index}.body`); return readUnifiedHistoricalBytes(path.join(root, row.bodyFile))
    }, 'streaming-v2')
  }
  const previews = readUnifiedCloudPreviews({ run: evidence.build, directory: path.dirname(proof.path), pin: proof.pin, value: evidence.value, references })
  assert.equal(proof.path, path.join(previews.directory, 'receipt.json'))
  const target = unifiedTransportTarget('main', readUnifiedHistoricalBytes(path.join(evidence.build, 'source/apps/web/wrangler.jsonc')).toString())
  const runtimeConfig = unifiedRuntimeConfig(target)
  const modules = await readUnifiedMainPreviewModules({ value: evidence.value, previews, runtimeConfig })
  const publicReferences = (role: string) => unifiedMainPublicReferences(references('main', role), (row: { bodyFile: string }) =>
    readUnifiedHistoricalBytes(path.join(evidence.transport.directory, 'main', role, 'http', row.bodyFile)))
  return { previews, references, modules, runtimeConfig, publicReferences }
}
