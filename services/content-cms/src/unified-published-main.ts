import assert from 'node:assert/strict'
import path from 'node:path'
import { readUnifiedCompletedMainPromotion } from '../../../scripts/unified-main-evidence.mjs'
import { unifiedMainPromotionAuthorizationAt } from '../../../scripts/unified-promotion-reconciliation.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { readUnifiedHistoricalMainPreviews, readUnifiedHistoricalPublication, unifiedHistoricalPublicationRequest, verifyUnifiedHistoricalPublicationEvidence } from './unified-historical-publication'
import { verifyUnifiedCI } from './unified-production'
import { readUnifiedPreflightBinding, RECONCILED_PREFLIGHT } from './unified-reconciled-preflight'
import { readUnifiedHistoricalPromotionSource } from './unified-promotion-source'

type Proof = { path: string; pin: string }
export type UnifiedHistoricalMainRequest = {
  schemaVersion: 1; kind: 'unified_historical_main_previews_request'; history: Proof; previews: Proof; previewExecution: Proof
}
export type UnifiedPublishedMainRequest = Omit<UnifiedHistoricalMainRequest, 'kind'> & { kind: 'unified_published_main_request'; promotion: Proof }
const pinned = (proof: Proof) => readPinnedUnifiedInput(proof.path, proof.pin) as any
function parse(value: unknown, kind: string, fields: string[]) {
  assert(value && typeof value === 'object' && !Array.isArray(value))
  const request = value as Record<string, any>
  assert.deepEqual(Object.keys(request).sort(), ['schemaVersion', 'kind', ...fields].sort())
  assert.equal(request.schemaVersion, 1); assert.equal(request.kind, kind)
  for (const field of fields) {
    const proof = request[field]; assert(proof && typeof proof === 'object' && !Array.isArray(proof))
    assert.deepEqual(Object.keys(proof).sort(), ['path', 'pin'])
    assert(typeof proof.path === 'string' && path.isAbsolute(proof.path) && /^[a-f0-9]{64}$/.test(proof.pin))
  }
  return request
}
export const unifiedHistoricalMainRequest = (value: unknown) => parse(value, 'unified_historical_main_previews_request', ['history', 'previews', 'previewExecution']) as UnifiedHistoricalMainRequest
export const unifiedPublishedMainRequest = (value: unknown) => parse(value, 'unified_published_main_request', ['history', 'previews', 'previewExecution', 'promotion']) as UnifiedPublishedMainRequest

export async function readUnifiedHistoricalMain(input: UnifiedHistoricalMainRequest) {
  const request = structuredClone(unifiedHistoricalMainRequest(input))
  const historical = await readUnifiedHistoricalPublication(unifiedHistoricalPublicationRequest(pinned(request.history)))
  const cloud = await readUnifiedHistoricalMainPreviews(historical, request.previews)
  const execution = pinned(request.previewExecution)
  const previewExecutorCI = execution.executorCI
  if (historical.audit.status === RECONCILED_PREFLIGHT) {
    const binding = readUnifiedPreflightBinding(historical.audit, historical.production, historical.request.production)!
    assert.deepEqual(request.previews, binding.previews, 'Historical preview differs from reconciled pair')
    assert.deepEqual(previewExecutorCI, binding.executorCI, 'Preview executor differs from reconciliation executor')
  }
  assert.deepEqual(execution, { ...cloud.previews.receipt, directory: cloud.previews.directory, receiptPin: cloud.previews.pin,
    sourceCI: historical.audit.sourceCI, originExecutorCI: historical.audit.executorCI, executorCI: previewExecutorCI }, 'Preview execution is not the exact sealed result')
  return { historical, ...cloud, previewExecutorCI, currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false, ciVerified: false } as const
}

async function verifyHistoricalMainEvidence(evidence: Awaited<ReturnType<typeof readUnifiedHistoricalMain>>, githubToken: string): Promise<any> {
  const historical = await verifyUnifiedHistoricalPublicationEvidence(evidence.historical, githubToken)
  const previewExecutorCI = await verifyUnifiedCI(evidence.previewExecutorCI.runID, evidence.previewExecutorCI.commit, githubToken)
  assert.deepEqual(previewExecutorCI, evidence.previewExecutorCI)
  return { ...evidence, historical, previewExecutorCI, ciVerified: true }
}

export async function verifyUnifiedHistoricalMain(request: UnifiedHistoricalMainRequest, githubToken: string) {
  return verifyHistoricalMainEvidence(await readUnifiedHistoricalMain(request), githubToken)
}

// Offline integrity reads retain original CI identities. The verified entry
// below rechecks every ancestor CI before any production adapter can use it.
export async function readUnifiedPublishedMain(input: UnifiedPublishedMainRequest): Promise<any> {
  const request = structuredClone(unifiedPublishedMainRequest(input))
  const opened = await readUnifiedHistoricalMain({ schemaVersion: 1, kind: 'unified_historical_main_previews_request', history: request.history,
    previews: request.previews, previewExecution: request.previewExecution })
  const receipt = pinned(request.promotion)
  const executorCI = receipt.executorCI
  const completed = await readUnifiedCompletedMainPromotion({ run: opened.historical.build, proof: request.promotion, value: opened.historical.value,
    previews: opened.previews, references: opened.references, publicReferences: opened.publicReferences('candidate'), runtimeConfig: opened.runtimeConfig,
    productionRequest: opened.historical.request.production, sourceCI: opened.historical.audit.sourceCI, originExecutorCI: opened.historical.audit.executorCI, executorCI })
  const promotionSources = receipt.sourceHandoff === undefined ? undefined : await readUnifiedHistoricalPromotionSource(opened.historical,
    receipt.sourceHandoff, unifiedMainPromotionAuthorizationAt(completed.original))
  return { ...opened, request, completed, executorCI, promotionSources, sourceAdvanced: false } as const
}

export async function verifyUnifiedPublishedMainEvidence(evidence: Awaited<ReturnType<typeof readUnifiedPublishedMain>>, githubToken: string): Promise<any> {
  const opened = await verifyHistoricalMainEvidence(evidence, githubToken)
  if (evidence.promotionSources?.ancestor) await verifyUnifiedPublishedMainEvidence(evidence.promotionSources.ancestor, githubToken)
  const executorCI = await verifyUnifiedCI(evidence.executorCI.runID, evidence.executorCI.commit, githubToken)
  assert.deepEqual(executorCI, evidence.executorCI)
  const promotionCI = evidence.completed.receipt.promotionExecutorCI
  if (promotionCI) assert.deepEqual(await verifyUnifiedCI(promotionCI.runID, promotionCI.commit, githubToken), promotionCI)
  return { ...opened, executorCI }
}

export async function verifyUnifiedPublishedMain(input: UnifiedPublishedMainRequest, githubToken: string) {
  return verifyUnifiedPublishedMainEvidence(await readUnifiedPublishedMain(input), githubToken)
}
