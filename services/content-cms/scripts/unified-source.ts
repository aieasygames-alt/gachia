import assert from 'node:assert/strict'
import { advanceUnifiedPublishedSources, prepareUnifiedNextPublication, unifiedSourceRequest } from '../src/unified-source-advance'
import { readPinnedUnifiedInput } from '../src/unified-desktop'

const [action, ...args] = process.argv.slice(2), allowed = ['--request', '--pin', '--output'], options = new Map<string, string>()
assert(['advance', 'baseline', 'prepare'].includes(action), 'Usage: unified-source.ts advance|baseline|prepare --request FILE --pin SHA256 --output NEW_DIRECTORY; local evidence and read-only cloud observations only')
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid source arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit source arguments')
const request = unifiedSourceRequest(readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!))
assert.equal(request.kind, action === 'advance' ? 'unified_source_advance_request' : action === 'baseline' ? 'unified_next_source_request' : 'unified_next_publication_request')
const result = request.kind === 'unified_next_publication_request' ? await prepareUnifiedNextPublication({ request, directory: options.get('--output')! })
  : await advanceUnifiedPublishedSources({ request, directory: options.get('--output')!, cloudToken: process.env.CLOUDFLARE_API_TOKEN! })
console.log(JSON.stringify({ proof: result.proof, status: result.value.status,
  cloudWrites: false, activationSupported: false, newPublicationAuthorized: false }))
