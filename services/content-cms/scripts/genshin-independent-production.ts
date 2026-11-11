import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { auditGenshinIndependentProduction, activateGenshinIndependentProduction, advanceGenshinIndependentProduction, prepareGenshinIndependentProduction,
  genshinIndependentRequest } from '../src/genshin-independent-production'
import { migrationJSON, migrationPinned } from '../../../scripts/genshin-migration-http.mjs'
const [action, ...args] = process.argv.slice(2)
assert(['prepare', 'audit', 'activate', 'source'].includes(action), 'Expected prepare, audit, activate or source')
const required = action === 'prepare' ? ['--source-index', '--source-pin', '--selection', '--selection-pin', '--application', '--application-pin', '--directory', '--output']
  : action === 'source' ? ['--completion', '--pin', '--executor-run-id', '--directory', '--output']
    : ['--request', '--pin', '--output', ...(action === 'activate' ? ['--directory', '--release-key'] : [])]
const options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  assert(required.includes(args[index]) && args[index + 1] && !args[index + 1].startsWith('--') && !options.has(args[index]), 'Invalid independent production arguments')
  options.set(args[index], args[index + 1])
}
assert.deepEqual([...options.keys()].sort(), [...required].sort(), 'Require every explicit independent production argument')
for (const [key, value] of options) if (key === '--pin' || key.endsWith('-pin') || key === '--release-key') assert(/^[a-f0-9]{64}$/.test(value))
const proof = (file: string, pin: string) => ({ path: options.get(file)!, pin: options.get(pin)! })
const cmsToken = process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken = process.env.CLOUDFLARE_API_TOKEN!
let result: any
if (action === 'prepare') result = await prepareGenshinIndependentProduction({ sourceIndex: proof('--source-index', '--source-pin'), selection: proof('--selection', '--selection-pin'),
  application: proof('--application', '--application-pin'), directory: options.get('--directory')!, cmsToken })
else if (action === 'source') result = await advanceGenshinIndependentProduction({ completion: proof('--completion', '--pin'), executorRunID: Number(options.get('--executor-run-id')),
  directory: options.get('--directory')!, cloudToken })
else {
  const request = genshinIndependentRequest(migrationPinned(proof('--request', '--pin')))
  result = action === 'activate' ? await activateGenshinIndependentProduction({ request, cmsToken, cloudToken, directory: options.get('--directory')!, releaseKey: options.get('--release-key')! })
    : await auditGenshinIndependentProduction(request, { cmsToken, cloudToken }).then(row => ({ status: 'audited_no_cloud_write', ...row.identity, cloudWrites: false }))
}
writeFileSync(options.get('--output')!, migrationJSON(result), { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ action, output: options.get('--output'), status: result.value?.status ?? result.status ?? 'prepared_no_cloud_write' }))
