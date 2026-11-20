import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { reconcileGenshinIntake, prepareGenshinIntakeBatch, type GenshinIntakeInput, type GenshinIntakePlan } from '../src/genshin-bounded-intake'
const [action, ...args] = process.argv.slice(2)
assert(['plan', 'batch'].includes(action), 'Expected plan or batch')
const required = ['--input', '--input-pin', '--output', ...(action === 'batch' ? ['--plan', '--plan-pin', '--selection', '--selection-pin'] : [])]
const options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  assert(required.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'), 'Unknown, duplicate or missing intake argument')
  options.set(args[i], args[i + 1])
}
assert(required.every(key => options.has(key)), 'Complete pinned intake arguments required')
const input = readPinnedUnifiedInput(options.get('--input')!, options.get('--input-pin')!) as GenshinIntakeInput
const value = action === 'plan' ? reconcileGenshinIntake(input) : prepareGenshinIntakeBatch(
  readPinnedUnifiedInput(options.get('--plan')!, options.get('--plan-pin')!) as GenshinIntakePlan, input,
  readPinnedUnifiedInput(options.get('--selection')!, options.get('--selection-pin')!) as { keys: string[] })
const directory = path.resolve(options.get('--output')!)
await mkdir(directory, { mode: 0o700 })
const text = JSON.stringify(value, null, 2) + '\n', file = path.join(directory, `${action}.json`)
await writeFile(file, text, { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ action, proof: { path: file, pin: digest(text) }, hold: true, publishable: false, cmsWrites: false, cloudWrites: false }))
