import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { prepareUnifiedPublication, verifyUnifiedPublication } from '../src/unified-publication'
import type { ConsumerExpectation } from '../src/unified-owner-build'

const [command, ...args] = process.argv.slice(2), options = new Map<string, string>()
const allowed = command === 'prepare' ? ['--build', '--build-pin', '--previous', '--previous-pin', '--baseline', '--output']
  : command === 'verify' ? ['--directory', '--pin'] : []
assert(allowed.length, 'Usage: unified-publication.ts prepare|verify <explicit pinned inputs>')
for (let i = 0; i < args.length; i++) {
  assert(allowed.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid publication arguments')
  options.set(args[i], args[++i])
}
assert.equal(options.size, allowed.length, `Require ${allowed.join(', ')}`)
const value = command === 'prepare' ? await prepareUnifiedPublication({ buildDirectory: options.get('--build')!, buildPin: options.get('--build-pin')!,
  previousPath: options.get('--previous')!, previousPin: options.get('--previous-pin')!, directory: options.get('--output')!,
  baselineExpectations: JSON.parse(readFileSync(options.get('--baseline')!, 'utf8')) as ConsumerExpectation[] })
  : await verifyUnifiedPublication(options.get('--directory')!, options.get('--pin')!)
const receipt = 'receipt' in value ? value.receipt : value
console.log(JSON.stringify({ directory: value.directory, publicationPin: value.publicationPin, owners: Object.keys(receipt.owners),
  status: receipt.status, preview: receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false }))
