import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { completeUnifiedUploadedPair, createUnifiedUploadedPairVerifier, unifiedUploadedPairRequest } from '../src/unified-uploaded-pair-completion'

const [action, ...args] = process.argv.slice(2)
assert(['audit', 'complete-previews'].includes(action), 'Expected audit or complete-previews')
const allowed = ['--request', '--pin', '--output', ...(action === 'complete-previews' ? ['--release-key'] : [])], options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid uploaded pair completion arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Explicit pinned request and new output required')
const request = unifiedUploadedPairRequest(readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!))
const input = { request, cmsToken: process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken: process.env.CLOUDFLARE_API_TOKEN! }
let result
if (action === 'complete-previews') {
  assert(/^[a-f0-9]{64}$/.test(options.get('--release-key')!))
  result = await completeUnifiedUploadedPair({ ...input, releaseKey: options.get('--release-key')! })
} else {
  const verified = await createUnifiedUploadedPairVerifier(input)
  result = { status: 'uploaded_pair_reverified_no_completion', releaseKey: verified.value.releaseKey, stopPin: verified.value.stopPin,
    sourceCI: verified.evidence.ci, executorCI: verified.evidence.executorCI, originExecutorCI: verified.evidence.originExecutorCI,
    cloudWrites: false, productionPromoted: false }
}
const raw = JSON.stringify(result, null, 2) + '\n'
writeFileSync(options.get('--output')!, raw, { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ status: result.status, output: options.get('--output'), pin: digest(raw), cloudWrites: false, productionPromoted: false }))
