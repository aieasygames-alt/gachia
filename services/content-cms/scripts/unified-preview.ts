import assert from 'node:assert/strict'
import { prepareUnifiedPreviewContract, verifyUnifiedPreviewContract } from '../src/unified-preview'

const [command, ...args] = process.argv.slice(2), options = new Map<string, string>()
const allowed = command === 'prepare' ? ['--transport', '--transport-pin', '--output'] : command === 'verify' ? ['--directory', '--pin'] : []
assert(allowed.length, 'Usage: unified-preview.ts prepare|verify <explicit pinned inputs>')
for (let i = 0; i < args.length; i++) {
  assert(allowed.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid preview arguments')
  options.set(args[i], args[++i])
}
assert.equal(options.size, allowed.length, `Require ${allowed.join(', ')}`)
const result = command === 'prepare' ? await prepareUnifiedPreviewContract({ transportDirectory: options.get('--transport')!,
  transportPin: options.get('--transport-pin')!, directory: options.get('--output')! })
  : await verifyUnifiedPreviewContract(options.get('--directory')!, options.get('--pin')!)
console.log(JSON.stringify({ directory: result.directory, previewPin: result.previewPin, owners: Object.keys(result.receipt.owners),
  responses: Object.values(result.receipt.owners).reduce((n, row) => n + row.candidate.responses + row.recovery.responses, 0),
  preview: result.receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false, credentials: false,
  cloudIdentityVerified: false, syntheticVersion: true }))
