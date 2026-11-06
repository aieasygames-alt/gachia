import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { readUnifiedHistoricalBytes, UNIFIED_SOURCE_OWNERS } from '../../../scripts/unified-historical-sources.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { advanceUnifiedSourceIndex, captureUnifiedNextBaseline, readUnifiedNextBaseline, readUnifiedSourceIndex, selectUnifiedNextPrevious } from '../../../scripts/unified-source-advance.mjs'
import { readUnifiedVersion } from '../../../scripts/unified-version-identity.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedExecutorVerifier } from './unified-production'
import { unifiedPublishedMainRequest, verifyUnifiedPublishedMain } from './unified-published-main'
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
  const opened = await verifyUnifiedPublishedMain(unifiedPublishedMainRequest(pinned(proof)), githubToken)
  const { historical, completed } = opened
  const { sources, value, transport, publication, plan, build } = historical
  assert.equal(plan.sources.length, 115, 'The complete registered source set is required')
  const ledger = JSON.parse(readUnifiedHistoricalBytes(path.join(build, 'source/packages/data/raw-content-review.json')).toString())
  assert.equal(ledger.pairs.length, 90)
  const rows: Record<string, any> = {}
  for (const owner of UNIFIED_SOURCE_OWNERS) {
    const old = (sources.owners as Record<string, any>)[owner], original = sources.handoff.owners[owner]
    const { version, sourceIdentityPin: _pin, ...artifact } = old
    rows[owner] = { ...artifact, owner, version, moduleProof: original.moduleProof, mode: original.mode, proofTransportPin: sources.handoff.transportPin }
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
  const { spec } = await openPublication(input.publication, input.githubToken)
  return readUnifiedSourceIndex({ spec, proof: input.sourceIndex })
}

export async function verifyUnifiedNextSource(input: { publication: Proof; handoff: Proof; githubToken: string }) {
  const { spec } = await openPublication(input.publication, input.githubToken)
  return readUnifiedNextBaseline({ spec, handoff: input.handoff, fresh: true })
}

// No caller-provided readers, snapshots or success flags enter this adapter.
// It performs authenticated GETs and creates local evidence, never cloud writes.
export async function advanceUnifiedPublishedSources(input: {
  request: UnifiedSourceAdvanceRequest | UnifiedNextSourceRequest; directory: string; cloudToken: string
}) {
  const request = unifiedSourceRequest(input.request)
  assert(request.kind !== 'unified_next_publication_request')
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const { spec } = await openPublication(request.publication, githubToken)
  assertDiskBudget({ path: input.directory, operation: 'unified source index and next-batch evidence', estimatedBytes: GiB })
  const reader = { snapshot: async () => { executor.verify(); return desktopCloudSnapshot(input.cloudToken, unifiedProductionRead) },
    version: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: input.cloudToken, request: unifiedProductionRead }) }
  const result = request.kind === 'unified_source_advance_request'
    ? await advanceUnifiedSourceIndex({ spec, directory: input.directory, reader, request: unifiedProductionRead })
    : await captureUnifiedNextBaseline({ spec, proof: request.sourceIndex, directory: input.directory, reader, request: unifiedProductionRead })
  executor.verify()
  return { ...result, executorCI: executor.executorCI, cloudWrites: false, newPublicationAuthorized: false }
}

export async function prepareUnifiedNextPublication(input: { request: UnifiedNextPublicationRequest; directory: string }) {
  const request = unifiedSourceRequest(input.request); assert.equal(request.kind, 'unified_next_publication_request')
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const { spec } = await openPublication(request.publication, githubToken)
  const next = await readUnifiedNextBaseline({ handoff: input.request.handoff, spec, fresh: true })
  const built = verifyUnifiedOwnerBuild(path.dirname(input.request.build.path), input.request.build.pin)
  assert.equal(input.request.build.path, path.join(built.directory, 'build.json'))
  const previous = selectUnifiedNextPrevious(next, built.frozen)
  const directory = path.resolve(input.directory); assert.equal(realpathSync(path.dirname(directory)), path.dirname(directory))
  mkdirSync(directory, { mode: 0o700 })
  const save = (name: string, value: unknown) => {
    const text = JSON.stringify(value, null, 2) + '\n', file = path.join(directory, name)
    writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(text) }
  }
  try {
    const selected = save('previous.json', previous)
    const result = await prepareUnifiedPublication({ buildDirectory: built.directory, buildPin: built.buildPin,
      previousPath: selected.path, previousPin: selected.pin, baselineExpectations: pinned(input.request.expectations) as ConsumerExpectation[],
      directory: path.join(directory, 'publication') })
    await readUnifiedNextBaseline({ handoff: input.request.handoff, spec, fresh: true }); executor.verify()
    const value = { schemaVersion: 1, kind: 'unified_next_publication_preparation', status: 'next_candidate_and_recovery_locally_accepted', request: input.request,
      sourceIndex: next.value.sourceIndex, active: next.value.active, previous: selected,
      publication: { path: path.join(result.directory, 'publication.json'), pin: result.publicationPin }, executorCI: executor.executorCI,
      cloudWrites: false, activationSupported: false, newPublicationAuthorized: false }
    return { proof: save('next-publication.json', value), value }
  } catch (error) { save('failure.json', { error: (error as Error).message, cloudWrites: false }); throw error }
}
