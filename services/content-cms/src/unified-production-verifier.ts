import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createArtifactVerificationSession } from '../../../scripts/artifact-verification-session.mjs'
import { assertTopology, desktopCloudSnapshot } from '../../../scripts/desktop-cloud-release.mjs'
import { multipartModule } from '../../../scripts/desktop-cloud-transport.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertUnifiedOwnerSettings, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { assertUnifiedPreviewUploadScope } from '../../../scripts/unified-preview-protocol.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { canonical } from './record-mapping'
import { readPinnedUnifiedInput } from './unified-desktop'
import { createUnifiedExecutorVerifier, verifyUnifiedCI, verifyUnifiedProductionLocal, type UnifiedProductionRequest } from './unified-production'
import { closeUnifiedProductionOwnerScope } from './unified-production-scope'
import { bindUnifiedPreservedRuntime, type PreservedRuntime } from './unified-preservation'

type Proof = { path: string; pin: string }
const pinned = <T = any>(proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as T

// The fixed entry validates and snapshots input before loading this module.
// Keep desktop/local checks and cloud identity composition independently testable.
export async function verifyUnifiedProductionState(request: UnifiedProductionRequest, { cmsToken, cloudToken }: { cmsToken: string; cloudToken: string },
  options: { originExecutor?: { runID: number; commit: string } }) {
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const artifacts = createArtifactVerificationSession()
  const executorCI = executor.executorCI
  // Keep the original release identity while independently checking the current executor.
  const originExecutorCI = options.originExecutor ? await verifyUnifiedCI(options.originExecutor.runID, options.originExecutor.commit, githubToken) : executorCI
  const handoff = pinned<Record<string, any>>(request.sourceHandoff)
  const baseline = await desktopCloudSnapshot(cloudToken, unifiedProductionRead)
  const { verifyUnifiedProductionSources, verifyUnifiedAuthorizedProductionSources } = await import('./unified-source-advance')
  const check = (authorizedAt?: number) => artifacts.run(async () => {
    executor.verify()
    assert.deepEqual(pinned(request.sourceHandoff), handoff, 'Source handoff changed')
    const fresh = await verifyUnifiedProductionLocal(request, cmsToken)
    const previous = pinned({ path: fresh.publication.previousPath, pin: fresh.publication.previousPin })
    const binding = { baseline, active: pinned(request.active), frozen: fresh.built.frozen, previous }
    const sources = authorizedAt === undefined
      ? await verifyUnifiedProductionSources(request.sourceHandoff, binding, { githubToken, cloudToken })
      : await verifyUnifiedAuthorizedProductionSources(request.sourceHandoff, { ...binding, identityObservedAt: authorizedAt }, { githubToken, cloudToken })
    const identityObservedAt = Date.now()
    const owners: Record<string, any> = {}
    const preservedOwners: Record<string, PreservedRuntime> = {}
    for (const owner of fresh.scope.build.owners) {
      const source = sources.provenance[owner], old = previous.owners[owner], service = old.service
      assert.equal(source.service, service); assert.equal(source.sourceVersionId, old.versionId)
      const { version: _version, sourceIdentityPin: _pin, ...expected } = sources.owners[owner]
      assert.deepEqual(old, expected, 'Production previous artifacts differ from verified sources')
      assert.equal(source.moduleSHA256, old.moduleSHA256)
      const archive = readFileSync(old.modulePath); assert.equal(digest(archive), old.archiveSHA256)
      const module = await multipartModule(archive); assert.equal(module.moduleSHA256, source.moduleSHA256)
      const sealed = fresh.transport.receipt.owners[owner]
      const target = unifiedTransportTarget(owner, readFileSync(path.join(fresh.build, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`, 'wrangler.jsonc'), 'utf8'))
      const metadata = (await multipartModule(readFileSync(path.join(fresh.transport.directory, owner, 'recovery/exact.multipart')))).metadata
      assertUnifiedOwnerSettings(owner, target, metadata, baseline)
      assert.equal(fresh.publication.owners[owner].sourceVersionId, old.versionId)
      owners[owner] = { service, sourceVersionId: old.versionId, sourceIdentityPin: sources.owners[owner].sourceIdentityPin,
        ...Object.fromEntries(['candidate', 'recovery'].map(role => [role, { moduleSHA256: sealed[role as 'candidate' | 'recovery'].moduleSHA256,
          configPin: sealed[role as 'candidate' | 'recovery'].uploadConfigPin, artifactPin: fresh.publication.owners[owner][role].artifactSHA256,
          referencesPin: sealed[role as 'candidate' | 'recovery'].referencesPin }])) }
      if (fresh.preservation?.[owner]) preservedOwners[owner] = bindUnifiedPreservedRuntime(fresh.preservation[owner],
        { ...owners[owner], moduleSHA256: source.moduleSHA256 }, baseline)
    }
    const scope = fresh.preservation ? closeUnifiedProductionOwnerScope(fresh.scope, preservedOwners) : fresh.scope
    const releaseKey = digest(canonical({ candidate: fresh.built.frozen.candidate.candidateSHA256, review: fresh.review.reviewPin,
      transport: fresh.transport.transportPin, executorCommit: originExecutorCI.commit, sourceCommit: fresh.built.frozen.sourceCommit, owners: scope.uploadOwners,
      ...(fresh.preservation ? { preservation: request.preservation!.pin, preservedOwners } : {}) }))
    if (authorizedAt === undefined && handoff.kind === 'unified_next_batch_baseline') assert(Date.now() - handoff.observation.startedAt < 900000, 'Next-batch source handoff expired during preflight')
    executor.verify()
    return { local: fresh, value: { preview: false, transportPin: fresh.transport.transportPin, releaseKey, changed: fresh.built.frozen.candidate.changed,
      ownerOrder: scope.uploadOwners, owners: Object.fromEntries(scope.uploadOwners.map(owner => [owner, owners[owner]])),
      preservedOwners, baseline, identityObservedAt } }
  })
  const { local, value } = await check()
  const ci = await verifyUnifiedCI(request.sourceRunID, local.built.frozen.sourceCommit, githubToken)
  assertTopology(baseline, await desktopCloudSnapshot(cloudToken, unifiedProductionRead))
  assertUnifiedPreviewUploadScope(value, value.transportPin)
  if (handoff.kind === 'unified_next_batch_baseline') assert(Date.now() - handoff.observation.startedAt < 900000, 'Next-batch source handoff expired during preflight')
  executor.verify()
  const scope = local.preservation ? closeUnifiedProductionOwnerScope(local.scope, value.preservedOwners) : local.scope
  let lastFreshObservation = value.identityObservedAt
  let freshVerificationValid = true
  let authorization: { authorizedAt: number; identityObservedAt: number } | undefined
  const verify = async () => {
    assert(!authorization, 'A write-authorized verifier cannot authorize another operation')
    freshVerificationValid = false
    const current = (await check()).value
    lastFreshObservation = current.identityObservedAt
    freshVerificationValid = true
    return current
  }
  const authorizePromotionSource = () => {
    assert(!authorization, 'Promotion source already authorized')
    assert(freshVerificationValid, 'A complete successful fresh verification is required before write')
    assert.deepEqual(pinned(request.sourceHandoff), handoff, 'Source handoff changed before write')
    executor.verify()
    const authorizedAt = Date.now()
    assert(authorizedAt >= lastFreshObservation && authorizedAt - lastFreshObservation < 900000, 'Source identity expired before write')
    if (handoff.kind === 'unified_next_batch_baseline') assert(authorizedAt >= handoff.observation.observedAt
      && authorizedAt - handoff.observation.startedAt < 900000, 'Next-batch source handoff expired before write')
    authorization = { authorizedAt, identityObservedAt: lastFreshObservation }
    return { ...authorization }
  }
  const verifyAfterPromotion = async () => {
    assert(authorization, 'Fresh write authorization required before post-promotion verification')
    return (await check(authorization.authorizedAt)).value
  }
  return { ...local, scope, ci, executorCI, originExecutorCI, baseline, value, verify, authorizePromotionSource, verifyAfterPromotion }
}
