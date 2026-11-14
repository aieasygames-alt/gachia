import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { migrationJSON, migrationPinned } from '../../../scripts/genshin-migration-http.mjs'
import { activateAzurPromiliaProduction, auditAzurPromiliaProduction, azurPromiliaProductionRequest, prepareAzurPromiliaIndependentProduction } from '../src/azur-promilia-independent-production'

const [action, ...args] = process.argv.slice(2)
assert(['prepare', 'audit', 'activate'].includes(action), 'Expected prepare, audit or activate')
const required = action === 'prepare' ? ['--source-index', '--source-pin', '--selection', '--selection-pin', '--application', '--application-pin', '--directory', '--output']
  : ['--request', '--pin', '--output', ...(action === 'activate' ? ['--directory', '--release-key'] : [])]
const options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  assert(required.includes(args[index]) && args[index + 1] && !args[index + 1].startsWith('--') && !options.has(args[index]), 'Invalid Azur production arguments')
  options.set(args[index], args[index + 1])
}
assert.deepEqual([...options.keys()].sort(), [...required].sort(), 'Require every explicit Azur production argument')
for (const [key, value] of options) if (key === '--pin' || key.endsWith('-pin') || key === '--release-key') assert(/^[a-f0-9]{64}$/.test(value))
const proof = (file: string, pin: string) => ({ path: options.get(file)!, pin: options.get(pin)! })
const cmsToken = process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken = process.env.CLOUDFLARE_API_TOKEN!
let result: any
if (action === 'prepare') result = await prepareAzurPromiliaIndependentProduction({ sourceIndex: proof('--source-index', '--source-pin'), selection: proof('--selection', '--selection-pin'), application: proof('--application', '--application-pin'), directory: options.get('--directory')!, cmsToken })
else {
  const request = azurPromiliaProductionRequest(migrationPinned(proof('--request', '--pin')))
  result = action === 'activate' ? await activateAzurPromiliaProduction({ request, cmsToken, cloudToken, directory: options.get('--directory')!, releaseKey: options.get('--release-key')! })
    : await auditAzurPromiliaProduction(request, { cmsToken, cloudToken }).then(row => ({ status: 'audited_no_cloud_write', ...row.identity, cloudWrites: false }))
}
writeFileSync(options.get('--output')!, migrationJSON(result), { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify({ action, output: options.get('--output'), status: result.value?.status ?? result.status ?? 'prepared_no_cloud_write' }))
