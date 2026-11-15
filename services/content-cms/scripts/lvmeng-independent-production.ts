import { readFileSync } from 'node:fs'
import { migrationPinned } from '../../../scripts/genshin-migration-http.mjs'
import { activateLvmengProduction, auditLvmengProduction, lvmengProductionRequest, prepareLvmengIndependentProduction } from '../src/lvmeng-independent-production'

const args = process.argv.slice(2), action = args[0], options = new Map(args.slice(1).flatMap((value, index, all) => value.startsWith('--') && all[index + 1] && !all[index + 1].startsWith('--') ? [[value, all[index + 1]]] : []))
const proof = (...keys: string[]) => { const path = options.get(keys[0]); const pin = options.get(keys[1]); if (!path || !pin) throw new Error(`Missing ${keys.join('/')}`); return { path, pin } }
const request = () => migrationPinned(proof('--request', '--pin'))
const cmsToken = process.env.GACHIA_CMS_REVIEW_TOKEN!, cloudToken = process.env.CLOUDFLARE_API_TOKEN!
let result: unknown
if (action === 'prepare') result = await prepareLvmengIndependentProduction({ sourceIndex: proof('--source-index', '--source-pin'), selection: proof('--selection', '--selection-pin'), application: proof('--application', '--application-pin'), directory: options.get('--directory')!, cmsToken })
else if (action === 'audit') result = await auditLvmengProduction(request(), { cmsToken, cloudToken }).then(row => ({ status: 'audited_no_cloud_write', ...row.identity, cloudWrites: false }))
else if (action === 'activate') result = await activateLvmengProduction({ request: request(), cmsToken, cloudToken, directory: options.get('--directory')!, releaseKey: options.get('--release-key')! })
else throw new Error('Usage: lvmeng-independent-production.ts prepare|audit|activate')
console.log(JSON.stringify(result, null, 2))
