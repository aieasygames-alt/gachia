import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { assertModuleVersionIdentity, revalidateUploadedModule } from '../../../scripts/desktop-version-provenance.mjs'
import { readUnifiedHistoricalBytes, readUnifiedHistoricalSources, UNIFIED_SOURCE_OWNERS } from '../../../scripts/unified-historical-sources.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { advanceUnifiedSourceIndex, bindUnifiedNextSources, captureUnifiedNextBaseline, readUnifiedNextBaseline, readUnifiedSourceIndex, selectUnifiedNextPrevious } from '../../../scripts/unified-source-advance.mjs'
import { readUnifiedVersion, revalidateUnifiedSourceModule, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedExecutorVerifier } from './unified-production'
import { readUnifiedPublishedMain, unifiedPublishedMainRequest, verifyUnifiedPublishedMain } from './unified-published-main'
import { verifyUnifiedOwnerBuild, type ConsumerExpectation } from './unified-owner-build'
import { prepareUnifiedPublication } from './unified-publication'
import { digest } from './legacy-intake'

type Proof = { path: string; pin: string }
export type UnifiedSourceAdvanceRequest = {
  schemaVersion: 1; kind: 'unified_source_advance_request'; publication: Proof; executorRunID: number
}
export type UnifiedNextSourceRequest = {
  schemaVersion: 1; kind: 'unified_next_source_request'; publication: Proof; sourceIndex: Proof; executorRunID: number
}
export type UnifiedNextPublicationRequest = {
  schemaVersion: 1; kind: 'unified_next_publication_request'; publication: Proof; handoff: Proof; build: Proof; expectations: Proof; executorRunID: number
}
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
export function unifiedSourceRequest(value: unknown) {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  const request = value as UnifiedSourceAdvanceRequest | UnifiedNextSourceRequest | UnifiedNextPublicationRequest
  const next = request.kind === 'unified_next_source_request'
  const publication = request.kind === 'unified_next_publication_request'
  assert(next || publication || request.kind === 'unified_source_advance_request')
  const fields = [...(next ? ['sourceIndex'] : []), ...(publication ? ['handoff', 'build', 'expectations'] : [])]
  assert.deepEqual(Object.keys(request).sort(), ['schemaVersion', 'kind', 'publication', 'executorRunID', ...fields].sort())
  assert.equal(request.schemaVersion, 1); assert(Number.isSafeInteger(request.executorRunID) && request.executorRunID > 0)
  for (const proof of [request.publication, ...fields.map(key => (request as any)[key] as Proof)]) {
    assert(proof && typeof proof === 'object' && !Array.isArray(proof)); assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}

async function openPublication(proof: Proof, githubToken: string) {
  assert(typeof githubToken === 'string' && githubToken.length > 0, 'Authenticated ancestor CI verification required')
  return publicationSpec(proof, await verifyUnifiedPublishedMain(unifiedPublishedMainRequest(pinned(proof)), githubToken))
}

async function readPublication(proof: Proof) {
  return publicationSpec(proof, await readUnifiedPublishedMain(unifiedPublishedMainRequest(pinned(proof))))
}

function publicationSpec(proof: Proof, opened: Awaited<ReturnType<typeof readUnifiedPublishedMain>>) {
  const { historical, completed } = opened
  const { sources, value, transport, publication, plan, build } = historical
  assert.equal(plan.sources.length, 115, 'The complete registered source set is required')
  const ledger = JSON.parse(readUnifiedHistoricalBytes(path.join(build, 'source/packages/data/raw-content-review.json')).toString())
  assert.equal(ledger.pairs.length, 90)
  const rows: Record<string, any> = {}
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const old = (sources.owners as Record<string, any>)[owner], original = sources.provenance[owner]
    const { version, sourceIdentityPin: _pin, ...artifact } = old
    rows[owner] = { ...artifact, owner, version, moduleProof: original.moduleProof, mode: original.mode,
      ...(original.proofTransportPin === undefined ? {} : { proofTransportPin: original.proofTransportPin }),
      ...(original.moduleContext === undefined ? {} : { moduleContext: original.moduleContext }) }
  }
  const module = (completed.modules as Record<string, any>).candidate, accepted = opened.previews.receipt.accepted.candidate.main
  rows.main = { owner: 'main', service: 'gachia', versionId: accepted.versionId,
    directory: path.join(transport.receipt.publicationDirectory, 'main/candidate'), artifactSHA256: publication.owners.main.candidate.artifactSHA256,
    modulePath: module.receipt.archive.path, archiveSHA256: module.receipt.archive.pin, moduleSHA256: value.owners.main.candidate.moduleSHA256,
    version: module.version, mode: 'unified_upload_time_module_receipt', moduleProof: accepted.moduleProof, moduleContext: module.receipt.context }
  const spec = { kind: 'unified_completed_main_source_spec', publication: proof, releaseKey: value.releaseKey, transportPin: value.transportPin,
    planSHA256: plan.planSHA256, baseline: value.baseline, deploymentId: completed.original.rows[3].result.deploymentId,
    owners: rows, sources: historical.sealedSources, pairs: ledger.pairs, publicReferences: opened.publicReferences('candidate') }
  return { opened, spec }
}

export async function verifyUnifiedPublishedSource(input: { publication: Proof; sourceIndex: Proof; githubToken: string }) {
  const { publication, sourceIndex, githubToken } = structuredClone(input)
  const { spec } = await openPublication(publication, githubToken)
  return readUnifiedSourceIndex({ spec, proof: sourceIndex })
}

export async function verifyUnifiedNextSource(input: { publication: Proof; handoff: Proof; githubToken: string }) {
  const { publication, handoff, githubToken } = structuredClone(input)
  const { spec } = await openPublication(publication, githubToken)
  return readUnifiedNextBaseline({ spec, handoff, fresh: true })
}

type SourceBinding = { baseline: any; active: any; frozen: any; previous: any }

// Historical reads never renew freshness or consult today's CMS/cloud state.
// Production uses the same complete binding plus fresh handoff and ancestor CI.
export async function readUnifiedPublicationSources(proof: Proof, binding: SourceBinding & { identityObservedAt: number }): Promise<any> {
  proof = structuredClone(proof)
  binding = structuredClone(binding)
  const handoff = pinned(proof)
  if (handoff.kind !== 'unified_next_batch_baseline') return readUnifiedHistoricalSources(proof, binding.baseline)
  const { opened: ancestor, spec } = await readPublication(handoff.publication)
  const next = await readUnifiedNextBaseline({ spec, handoff: proof })
  assert(Number.isSafeInteger(binding.identityObservedAt) && binding.identityObservedAt >= next.value.observation.observedAt
    && binding.identityObservedAt - next.value.observation.startedAt < 900000, 'Historical publication did not use its next baseline while fresh')
  return { ...bindUnifiedNextSources(next, binding), ancestor }
}

export async function verifyUnifiedProductionSources(proof: Proof, binding: SourceBinding,
  { githubToken, cloudToken }: { githubToken: string; cloudToken: string }): Promise<any> {
  assert(typeof githubToken === 'string' && githubToken.length > 0, 'Authenticated ancestor CI verification required')
  assert(typeof cloudToken === 'string' && cloudToken.length > 0, 'Authenticated immutable-version reads required')
  proof = structuredClone(proof)
  binding = structuredClone(binding)
  const handoff = pinned(proof)
  const sources: any = handoff.kind !== 'unified_next_batch_baseline' ? await readUnifiedHistoricalSources(proof, binding.baseline)
    : bindUnifiedNextSources(await verifyUnifiedNextSource({ publication: handoff.publication, handoff: proof, githubToken }), binding)
  const readVersion = (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead })
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const source = sources.provenance[owner], old = sources.owners[owner]
    const common = { proof: source.moduleProof, service: old.service, versionId: old.versionId, moduleSHA256: old.moduleSHA256, readVersion }
    const saved = source.mode === 'unified_upload_time_module_receipt'
      ? await revalidateUnifiedUploadedModule({ ...common, context: source.moduleContext })
      : source.mode === 'original_upload_time_receipt_fresh_immutable_identity'
        ? await revalidateUploadedModule({ ...common, context: undefined })
        : await revalidateUnifiedSourceModule({ ...common, transportPin: source.proofTransportPin })
    assertModuleVersionIdentity(old.version, saved.version)
  }
  if (handoff.kind === 'unified_next_batch_baseline') assert(Date.now() - handoff.observation.startedAt < 900000, 'Next-batch source handoff expired during identity reads')
  assert.deepEqual(pinned(proof), handoff, 'Source handoff changed during identity reads')
  return sources
}

// No caller-provided readers, snapshots or success flags enter this adapter.
// It performs authenticated GETs and creates local evidence, never cloud writes.
export async function advanceUnifiedPublishedSources(input: {
  request: UnifiedSourceAdvanceRequest | UnifiedNextSourceRequest; directory: string; cloudToken: string
}) {
  const request = structuredClone(unifiedSourceRequest(input.request)), directory = path.resolve(input.directory), cloudToken = input.cloudToken
  assert(request.kind !== 'unified_next_publication_request')
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const { spec } = await openPublication(request.publication, githubToken)
  assertDiskBudget({ path: directory, operation: 'unified source index and next-batch evidence', estimatedBytes: GiB })
  const reader = { snapshot: async () => { executor.verify(); return desktopCloudSnapshot(cloudToken, unifiedProductionRead) },
    version: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: cloudToken, request: unifiedProductionRead }) }
  const result = request.kind === 'unified_source_advance_request'
    ? await advanceUnifiedSourceIndex({ spec, directory, reader, request: unifiedProductionRead })
    : await captureUnifiedNextBaseline({ spec, proof: request.sourceIndex, directory, reader, request: unifiedProductionRead })
  try { executor.verify() }
  catch (error) {
    // A protocol receipt must not survive failure of the fixed executor gate.
    writeFileSync(path.join(directory, 'failure.json'), JSON.stringify({ status: 'failed', error: (error as Error).message,
      cloudWrites: false, automaticRetry: false }) + '\n', { flag: 'wx', mode: 0o600 })
    throw error
  }
  return { ...result, executorCI: executor.executorCI, cloudWrites: false, newPublicationAuthorized: false }
}

export async function prepareUnifiedNextPublication(input: { request: UnifiedNextPublicationRequest; directory: string }) {
  const request = structuredClone(unifiedSourceRequest(input.request)), directory = path.resolve(input.directory)
  assert(request.kind === 'unified_next_publication_request')
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const { spec } = await openPublication(request.publication, githubToken)
  const next = await readUnifiedNextBaseline({ handoff: request.handoff, spec, fresh: true })
  const built = verifyUnifiedOwnerBuild(path.dirname(request.build.path), request.build.pin)
  assert.equal(request.build.path, path.join(built.directory, 'build.json'))
  const previous = selectUnifiedNextPrevious(next, built.frozen)
  assert.equal(realpathSync(path.dirname(directory)), path.dirname(directory))
  mkdirSync(directory, { mode: 0o700 })
  const save = (name: string, value: unknown) => {
    const text = JSON.stringify(value, null, 2) + '\n', file = path.join(directory, name)
    writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(text) }
  }
  try {
    const selected = save('previous.json', previous)
    const result = await prepareUnifiedPublication({ buildDirectory: built.directory, buildPin: built.buildPin,
      previousPath: selected.path, previousPin: selected.pin, baselineExpectations: pinned(request.expectations) as ConsumerExpectation[],
      directory: path.join(directory, 'publication') })
    await readUnifiedNextBaseline({ handoff: request.handoff, spec, fresh: true }); executor.verify()
    const value = { schemaVersion: 1, kind: 'unified_next_publication_preparation', status: 'next_candidate_and_recovery_locally_accepted', request,
      sourceIndex: next.value.sourceIndex, active: next.value.active, previous: selected,
      publication: { path: path.join(result.directory, 'publication.json'), pin: result.publicationPin }, executorCI: executor.executorCI,
      cloudWrites: false, activationSupported: false, newPublicationAuthorized: false }
    return { proof: save('next-publication.json', value), value }
  } catch (error) { save('failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
