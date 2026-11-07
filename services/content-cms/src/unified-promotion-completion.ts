import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { desktopCloudSnapshot, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { readUnifiedStoppedMainPromotion, readUnifiedCompletedMainPromotion } from '../../../scripts/unified-main-evidence.mjs'
import { readUnifiedMainPromotionJournal } from '../../../scripts/unified-promotion-reconciliation.mjs'
import { verifyUnifiedMainPublic } from '../../../scripts/unified-main-public.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, revalidateUnifiedUploadedModule } from '../../../scripts/unified-version-identity.mjs'
import { createUnifiedExecutorVerifier, verifyUnifiedCI } from './unified-production'
import { readPinnedUnifiedInput } from './unified-desktop'
import { unifiedHistoricalMainRequest, verifyUnifiedHistoricalMain } from './unified-published-main'

type Proof = { path: string; pin: string }
export async function completeStoppedMainPromotion(input: {
  history: Proof; journal: Proof; promotionCI: Proof; executorRunID: number; directory: string; cloudToken: string
}) {
  const request = structuredClone(input)
  assert.deepEqual(Object.keys(request).sort(), ['cloudToken', 'directory', 'executorRunID', 'history', 'journal', 'promotionCI'])
  for (const proof of [request.history, request.journal, request.promotionCI]) {
    assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  assert(path.isAbsolute(request.directory)); assert(request.cloudToken)
  const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
  const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const executor = await createUnifiedExecutorVerifier(request.executorRunID, githubToken)
  const opened = await verifyUnifiedHistoricalMain(unifiedHistoricalMainRequest(pinned(request.history)), githubToken)
  const { historical, previews, references, runtimeConfig } = opened, { value, build: run } = historical
  const promotionExecutorCI = pinned(request.promotionCI).ci
  assert.deepEqual(await verifyUnifiedCI(promotionExecutorCI.runID, promotionExecutorCI.commit, githubToken), promotionExecutorCI)
  const original = readUnifiedMainPromotionJournal({ run, pin: request.journal.pin, releaseKey: value.releaseKey, transportPin: value.transportPin })
  assert.equal(original.file, request.journal.path)
  assert.equal(path.dirname(request.directory), run)
  const publicBytes = readFileSync(path.join(original.first.directory, 'public-acceptance.json'))
  const publicProof = { ...JSON.parse(publicBytes.toString()), evidenceSHA256: digest(publicBytes) }
  const receipt = { schemaVersion: 1, kind: 'unified_readonly_promotion_completion', status: 'production_accepted',
    productionPromoted: true, sourceAdvanced: false, cloudWrites: false, releaseKey: value.releaseKey, transportPin: value.transportPin,
    previewPin: previews.pin, renewalPin: original.first.renewalPin, journalPin: request.journal.pin,
    directory: original.first.directory, completionDirectory: request.directory,
    productionRequest: historical.request.production, preview: requestProof(previews), sourceCI: historical.audit.sourceCI,
    originExecutorCI: historical.audit.executorCI, executorCI: executor.executorCI, promotionExecutorCI,
    versions: { gachia: original.expected.candidate }, publicProof }
  const spec = { run, value, previews, references, publicReferences: opened.publicReferences('candidate'), runtimeConfig,
    productionRequest: historical.request.production, sourceCI: receipt.sourceCI, originExecutorCI: receipt.originExecutorCI, executorCI: receipt.executorCI }
  await readUnifiedStoppedMainPromotion({ ...spec, receipt })
  executor.verify()
  mkdirSync(request.directory, { mode: 0o700 })
  const save = (name: string, value: unknown) => {
    const raw = JSON.stringify(value, null, 2) + '\n', file = path.join(request.directory, name)
    writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return { path: file, pin: digest(raw) }
  }
  try {
    const startedAt = Date.now()
    const snapshot = async () => {
      const current = await desktopCloudSnapshot(request.cloudToken, unifiedProductionRead)
      assertTopology(value.baseline, current, receipt.versions)
      assert.equal((current.services as Record<string, any>).gachia.id, original.rows[3].result.deploymentId)
      return current
    }
    const modules = async () => {
      const versions: Record<string, any> = {}
      for (const role of ['recovery', 'candidate']) {
        const proof = previews.receipt.accepted[role].main, row = value.owners.main[role]
        const saved = await revalidateUnifiedUploadedModule({ proof: proof.moduleProof, service: 'gachia', versionId: proof.versionId,
          moduleSHA256: row.moduleSHA256, context: { role, transportPin: value.transportPin, configPin: row.configPin },
          readVersion: (service: string, versionId: string) => readUnifiedVersion({ service, versionId, token: request.cloudToken, request: unifiedProductionRead }) })
        versions[role] = saved.version
      }
      return versions
    }
    const before = await snapshot(), versions = await modules()
    const publicHTTP = await verifyUnifiedMainPublic({ references: spec.publicReferences, directory: path.join(request.directory, 'public'), request: unifiedProductionRead })
    assert.deepEqual(await modules(), versions)
    const after = await snapshot(), finishedAt = Date.now()
    assert(finishedAt - startedAt < 900000, 'Completion observations expired')
    executor.verify(); assert.equal(digest(readFileSync(original.file)), request.journal.pin)
    const observations = save('observations.json', { startedAt, finishedAt, before, after, versions })
    const result = { ...receipt, observationsPin: observations.pin, publicEvidencePin: publicHTTP.evidenceSHA256 }
    const proof = save('receipt.json', result)
    await readUnifiedCompletedMainPromotion({ ...spec, proof })
    executor.verify()
    return { proof, status: result.status, cloudWrites: false, sourceAdvanced: false }
  } catch (error) {
    save('failure.json', { error: (error as Error).message, cloudWrites: false }); throw error
  }
}

function requestProof(previews: any): Proof { return { path: path.join(previews.directory, 'receipt.json'), pin: previews.pin } }
