import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { unifiedHistoricalPublicationRequest, verifyUnifiedHistoricalPublication } from '../src/unified-historical-publication'
import { unifiedHistoricalMainRequest, unifiedPublishedMainRequest, verifyUnifiedHistoricalMain, verifyUnifiedPublishedMain } from '../src/unified-published-main'

const [action, ...args] = process.argv.slice(2)
assert(['audit', 'previews', 'published'].includes(action), 'Usage: unified-history.ts audit|previews|published --request FILE --pin SHA256 --output NEW_FILE; read-only historical evidence, no renewal or activation')
const allowed = ['--request', '--pin', '--output'], options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid historical audit arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit historical audit arguments')
assert(!existsSync(options.get('--output')!), 'Historical audit output already exists')
const input = readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!)
const request = action === 'audit' ? unifiedHistoricalPublicationRequest(input) : action === 'previews' ? unifiedHistoricalMainRequest(input) : unifiedPublishedMainRequest(input)
const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8', maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const opened = request.kind === 'unified_historical_publication_request' ? undefined
  : request.kind === 'unified_historical_main_previews_request' ? await verifyUnifiedHistoricalMain(request, githubToken) : await verifyUnifiedPublishedMain(request, githubToken)
const evidence = opened?.historical ?? await verifyUnifiedHistoricalPublication(unifiedHistoricalPublicationRequest(input), githubToken)
const result = { schemaVersion: 1, kind: 'unified_historical_publication_audit',
  status: action === 'audit' ? 'sealed_publication_reverified' : action === 'previews' ? 'sealed_cloud_previews_reverified' : 'completed_main_publication_reverified', requestPin: options.get('--pin'),
  releaseKey: evidence.value.releaseKey, candidateSHA256: evidence.built.frozen.candidate.candidateSHA256, reviewPin: evidence.review.reviewPin,
  sourceCI: evidence.sourceCI, originExecutorCI: evidence.originExecutorCI, sources: evidence.sealedSources.length, owners: Object.keys(evidence.sources.owners).sort(),
  ...(opened ? { previewPin: opened.previews.pin, previewExecutorCI: opened.previewExecutorCI,
    versions: Object.fromEntries(['recovery', 'candidate'].map(role => [role, opened.previews.receipt.accepted[role].main.versionId])) } : {}),
  currentCMSRead: false, currentCloudRead: false, freshnessRenewed: false, approvalGranted: false, cloudWrites: false, promotionPerformed: false, sourceAdvanced: false }
const raw = JSON.stringify(result, null, 2) + '\n'; writeFileSync(options.get('--output')!, raw, { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ status: result.status, output: options.get('--output'), pin: digest(raw), sources: result.sources, owners: result.owners, cloudWrites: false }))
