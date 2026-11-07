import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { auditUnifiedMainPreviewRenewal, openUnifiedPromotion, promoteUnifiedMain, unifiedPromotionRequest } from '../src/unified-promotion'

const [action, ...args] = process.argv.slice(2)
assert(['audit', 'renew', 'promote'].includes(action), 'Usage: unified-promotion.ts audit|renew|promote --request FILE --pin SHA256 --output NEW_FILE_OR_RENEWAL_DIRECTORY [--release-key SHA256 for promote]')
const allowed = ['--request', '--pin', '--output', ...(action === 'promote' ? ['--release-key'] : [])], options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid promotion arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit promotion arguments')
if (action === 'promote') assert(/^[a-f0-9]{64}$/.test(options.get('--release-key')!), 'Require explicit matching release key')
assert(!existsSync(options.get('--output')!), 'Promotion output already exists; reconcile without retry')
const request = unifiedPromotionRequest(readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!))
const input = { request, cmsToken: process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken: process.env.CLOUDFLARE_API_TOKEN! }
if (action === 'promote') {
  const result = await promoteUnifiedMain({ ...input, releaseKey: options.get('--release-key')! })
  const raw = JSON.stringify(result, null, 2) + '\n'; writeFileSync(options.get('--output')!, raw, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: result.status, output: options.get('--output'), pin: digest(raw), receiptPin: result.receiptPin }))
} else if (action === 'renew') {
  const result = await auditUnifiedMainPreviewRenewal({ ...input, directory: options.get('--output')! })
  console.log(JSON.stringify(result))
} else {
  const opened = await openUnifiedPromotion(input)
  const result = { status: 'unified_main_promotion_audit_passed_no_promotion', releaseKey: opened.evidence.value.releaseKey,
    previewPin: request.previews.pin, sourceCI: opened.evidence.ci, executorCI: opened.evidence.executorCI,
    originExecutorCI: opened.evidence.originExecutorCI, cloudWrites: false, productionPromoted: false }
  const raw = JSON.stringify(result, null, 2) + '\n'; writeFileSync(options.get('--output')!, raw, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ status: result.status, output: options.get('--output'), pin: digest(raw), productionPromoted: result.productionPromoted }))
}
