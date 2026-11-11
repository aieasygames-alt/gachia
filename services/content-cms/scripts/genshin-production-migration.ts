import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { auditGenshinProductionMigration, activateGenshinProductionMigration, advanceGenshinProductionMigration, genshinProductionMigrationRequest,
  auditGenshinMigrationContinuation, activateGenshinMigrationContinuation, genshinMigrationContinuationRequest } from '../src/genshin-production-migration'
import { migrationPinned, migrationJSON } from '../../../scripts/genshin-migration-http.mjs'
import { auditGenshinMainFinalization, activateGenshinMainFinalization, genshinMainFinalizationRequest } from '../src/genshin-migration-main-finalization'
import { auditGenshinReadonlyCompletion, completeGenshinMigrationReadonly, genshinReadonlyCompletionRequest } from '../src/genshin-migration-readonly-completion'

const [action, ...args] = process.argv.slice(2)
assert(['audit', 'activate', 'source', 'audit-continuation', 'activate-continuation', 'audit-finalization', 'activate-finalization', 'audit-readonly', 'complete-readonly'].includes(action), 'Unknown migration action')
const activating = action.startsWith('activate') || action === 'complete-readonly'
const required = action === 'source' ? ['--completion', '--pin', '--output', '--directory', '--executor-run-id']
  : ['--request', '--pin', '--output', ...(activating ? ['--directory', '--release-key'] : [])]
const options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  assert(required.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--') && !options.has(args[i]), 'Invalid migration arguments')
  options.set(args[i], args[i + 1])
}
assert.deepEqual([...options.keys()].sort(), [...required].sort())
const cloudToken = process.env.CLOUDFLARE_API_TOKEN!
let result: unknown
if (action === 'source') result = await advanceGenshinProductionMigration({ completion: { path: options.get('--completion')!, pin: options.get('--pin')! },
  executorRunID: Number(options.get('--executor-run-id')), directory: options.get('--directory')!, cloudToken })
else {
  const continued = action.endsWith('-continuation')
  const finalizing = action.endsWith('-finalization')
  const readonly = action.endsWith('-readonly')
  const request = (readonly ? genshinReadonlyCompletionRequest : finalizing ? genshinMainFinalizationRequest : continued ? genshinMigrationContinuationRequest : genshinProductionMigrationRequest)(migrationPinned({ path: options.get('--request'), pin: options.get('--pin') }))
  result = activating
    ? await (readonly ? completeGenshinMigrationReadonly : finalizing ? activateGenshinMainFinalization : continued ? activateGenshinMigrationContinuation : activateGenshinProductionMigration)({ request, cloudToken, directory: options.get('--directory')!, releaseKey: options.get('--release-key')! })
    : await (readonly ? auditGenshinReadonlyCompletion(request) : (finalizing ? auditGenshinMainFinalization : continued ? auditGenshinMigrationContinuation : auditGenshinProductionMigration)(request, cloudToken)).then(row => ({ status: 'migration_audited_no_cloud_write', ...row.identity, cloudWrites: false, productionPromoted: false }))
}
writeFileSync(options.get('--output')!, migrationJSON(result), { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ action, output: options.get('--output'), status: action.startsWith('audit') ? 'audited_no_cloud_write' : action === 'source' ? 'published_sources_observed' : 'production_accepted' }))
