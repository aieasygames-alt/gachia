import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { digest } from '../src/legacy-intake'
import { readPinnedUnifiedInput } from '../src/unified-desktop'
import { openUnifiedRecovery, unifiedRecoveryRequest } from '../src/unified-recovery'

const [action, ...args] = process.argv.slice(2)
assert.equal(action, 'audit', 'Usage: unified-recovery.ts audit --request FILE --pin SHA256 --output NEW_FILE; recovery writer awaits next-batch source qualification')
const allowed = ['--request', '--pin', '--output'], options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  const [key, value] = args.slice(i, i + 2)
  assert(allowed.includes(key) && value && !value.startsWith('--') && !options.has(key), 'Invalid recovery audit arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Require explicit recovery audit arguments')
assert(!existsSync(options.get('--output')!), 'Recovery audit output already exists')
const request = unifiedRecoveryRequest(readPinnedUnifiedInput(options.get('--request')!, options.get('--pin')!))
const opened = await openUnifiedRecovery({ request, cloudToken: process.env.CLOUDFLARE_API_TOKEN! })
const result = { schemaVersion: 1, kind: 'unified_fixed_recovery_audit', status: 'known_candidate_recovery_preflight_passed_no_write', requestPin: options.get('--pin'),
  releaseKey: opened.historical.value.releaseKey, candidate: opened.original.expected.candidate, recovery: opened.original.expected.recovery,
  executorCI: opened.executor.executorCI, sourceCI: opened.historical.sourceCI, originExecutorCI: opened.historical.originExecutorCI,
  currentCMSRead: false, freshnessRenewed: false, cloudWrites: false, recoveryPerformed: false, sourceAdvanced: false }
const raw = JSON.stringify(result, null, 2) + '\n'; writeFileSync(options.get('--output')!, raw, { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ status: result.status, output: options.get('--output'), pin: digest(raw), cloudWrites: false }))
