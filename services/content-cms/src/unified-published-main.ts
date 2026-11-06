import assert from 'node:assert/strict'
import path from 'node:path'
import { readUnifiedCompletedMainPromotion } from '../../../scripts/unified-main-evidence.mjs'
import { readPinnedUnifiedInput } from './unified-desktop'
import { readUnifiedHistoricalMainPreviews, unifiedHistoricalPublicationRequest, verifyUnifiedHistoricalPublication } from './unified-historical-publication'
import { verifyUnifiedCI } from './unified-production'

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

export async function verifyUnifiedHistoricalMain(request: UnifiedHistoricalMainRequest, githubToken: string) {
  unifiedHistoricalMainRequest(request)
  const historical = await verifyUnifiedHistoricalPublication(unifiedHistoricalPublicationRequest(pinned(request.history)), githubToken)
  const cloud = await readUnifiedHistoricalMainPreviews(historical, request.previews)
  const execution = pinned(request.previewExecution)
  const previewExecutorCI = await verifyUnifiedCI(execution.executorCI.runID, execution.executorCI.commit, githubToken)
  assert.deepEqual(execution, { ...cloud.previews.receipt, directory: cloud.previews.directory, receiptPin: cloud.previews.pin,
    sourceCI: historical.sourceCI, originExecutorCI: historical.originExecutorCI, executorCI: previewExecutorCI }, 'Preview execution is not the exact sealed result')
  return { historical, ...cloud, previewExecutorCI, currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false } as const
}

// This fixed reader accepts no verifier, transport, current CMS document or
// caller-supplied "passed" flag. Every CI and every transitive receipt is read.
export async function verifyUnifiedPublishedMain(input: UnifiedPublishedMainRequest, githubToken: string) {
  const request = unifiedPublishedMainRequest(input)
  const opened = await verifyUnifiedHistoricalMain({ schemaVersion: 1, kind: 'unified_historical_main_previews_request', history: request.history,
    previews: request.previews, previewExecution: request.previewExecution }, githubToken)
  const receipt = pinned(request.promotion)
  const executorCI = await verifyUnifiedCI(receipt.executorCI.runID, receipt.executorCI.commit, githubToken)
  const completed = await readUnifiedCompletedMainPromotion({ run: opened.historical.build, proof: request.promotion, value: opened.historical.value,
    previews: opened.previews, references: opened.references, publicReferences: opened.publicReferences('candidate'), runtimeConfig: opened.runtimeConfig,
    productionRequest: opened.historical.request.production, sourceCI: opened.historical.sourceCI, originExecutorCI: opened.historical.originExecutorCI, executorCI })
  return { ...opened, request, completed, executorCI, sourceAdvanced: false } as const
}
