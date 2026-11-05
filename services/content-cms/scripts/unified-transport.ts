import assert from 'node:assert/strict'
import { prepareUnifiedTransport, verifyUnifiedTransport } from '../src/unified-transport'

const [command, ...args] = process.argv.slice(2), options = new Map<string, string>()
const allowed = command === 'prepare' ? ['--publication', '--publication-pin', '--output']
  : command === 'verify' ? ['--directory', '--pin'] : []
assert(allowed.length, 'Usage: unified-transport.ts prepare|verify <explicit pinned inputs>')
for (let i = 0; i < args.length; i++) {
  assert(allowed.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid transport arguments')
  options.set(args[i], args[++i])
}
assert.equal(options.size, allowed.length, `Require ${allowed.join(', ')}`)
const result = command === 'prepare' ? await prepareUnifiedTransport({ publicationDirectory: options.get('--publication')!,
  publicationPin: options.get('--publication-pin')!, directory: options.get('--output')! })
  : await verifyUnifiedTransport(options.get('--directory')!, options.get('--pin')!)
console.log(JSON.stringify({ directory: result.directory, transportPin: result.transportPin, owners: Object.keys(result.receipt.owners),
  responses: Object.values(result.receipt.owners).reduce((n, row) => n + row.candidate.responses + row.recovery.responses, 0),
  preview: result.receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false, credentials: false }))
