import assert from 'node:assert/strict'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { completeStoppedMainPromotion } from '../src/unified-promotion-completion'

const [action, ...args] = process.argv.slice(2), allowed = ['--request', '--pin'], options = new Map<string, string>()
assert.equal(action, 'complete', 'Usage: unified-promotion-completion.ts complete --request FILE --pin SHA256 (read-only)')
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid completion arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit completion arguments')
const request = readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!) as any
assert.deepEqual(Object.keys(request).sort(), ['directory', 'executorRunID', 'history', 'journal', 'promotionCI'])
console.log(JSON.stringify(await completeStoppedMainPromotion({ ...request, cloudToken: process.env.CLOUDFLARE_API_TOKEN! })))
