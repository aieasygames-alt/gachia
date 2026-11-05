import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildUnifiedOwners, type ConsumerExpectation } from '../src/unified-owner-build'

const args = process.argv.slice(2), options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  const key = args[index], value = args[index + 1]
  assert(['--directory', '--pin', '--expectations'].includes(key) && value && !value.startsWith('--') && !options.has(key), 'Usage: unified-owners.ts --directory FROZEN_DIRECTORY --pin FROZEN_SHA256 --expectations JSON_FILE')
  options.set(key, value)
}
assert.equal(options.size, 3)
const expectations = JSON.parse(readFileSync(options.get('--expectations')!, 'utf8')) as ConsumerExpectation[]
const result = await buildUnifiedOwners(options.get('--directory')!, options.get('--pin')!, expectations)
console.log(JSON.stringify({ directory: result.directory, buildPin: result.buildPin, owners: result.owners,
  productionReady: false, cloudWrites: false }))
