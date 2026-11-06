import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { createUnifiedProductionVerifier, unifiedProductionRequest, uploadUnifiedProductionPreviews, verifyUnifiedProductionLocal } from '../src/unified-production'

const [action, ...args] = process.argv.slice(2)
assert(['audit-local', 'audit', 'upload-previews'].includes(action), 'Usage: unified-production.ts audit-local|audit|upload-previews --request FILE --pin SHA256 --output NEW_FILE [--release-key SHA256]')
const options = new Map<string, string>(), allowed = ['--request', '--pin', '--output', ...(action === 'upload-previews' ? ['--release-key'] : [])]
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid production arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit production arguments')
const request = unifiedProductionRequest(readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!))
const cmsToken = process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken = process.env.CLOUDFLARE_API_TOKEN!
let result
if (action === 'upload-previews') {
  assert(/^[a-f0-9]{64}$/.test(options.get('--release-key')!))
  result = await uploadUnifiedProductionPreviews({ request, cmsToken, cloudToken, releaseKey: options.get('--release-key')! })
} else if (action === 'audit') {
  const evidence = await createUnifiedProductionVerifier(request, { cmsToken, cloudToken })
  result = { status: 'production_preview_preflight_passed_no_upload', requestPin: options.get('--pin'), scope: evidence.scope, qualification: evidence.qualification,
    scopeClosureRequired: evidence.scope.preservationOnlyOwners.length > 0,
    sourceCI: evidence.ci, executorCI: evidence.executorCI, ...evidence.value, cloudWrites: false, productionPromoted: false, productionReady: false, activationSupported: false }
} else {
  const evidence = await verifyUnifiedProductionLocal(request, cmsToken)
  result = { status: 'local_editorial_seal_reverified_not_cloud_authorized', requestPin: options.get('--pin'), scope: evidence.scope, qualification: evidence.qualification,
    sourceCommit: evidence.built.frozen.sourceCommit, candidateSHA256: evidence.built.frozen.candidate.candidateSHA256,
    reviewPin: evidence.review.reviewPin, transportPin: evidence.transport.transportPin, cloudWrites: false, productionPromoted: false,
    productionReady: false, activationSupported: false, pending: ['exact executor CI', 'fresh cloud source identities and topology', 'cloud previews and promotion'] }
}
const text = JSON.stringify(result, null, 2) + '\n'
writeFileSync(options.get('--output')!, text, { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ action, status: result.status, output: options.get('--output'), pin: digest(text), productionPromoted: false }))
