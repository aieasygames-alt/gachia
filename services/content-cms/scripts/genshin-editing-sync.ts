import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { assertUnifiedDesktopEnvironment, readPinnedUnifiedInput } from '../src/unified-desktop'
import { verifyUnifiedInstalledApplication } from '../src/unified-installed-application'
import { openGenshinEditingSync, applyGenshinEditingSync, planGenshinEditingSync, verifyEditingSyncRows } from '../src/genshin-editing-sync'

const [action, ...args] = process.argv.slice(2)
assert(['apply', 'verify'].includes(action))
const keys = ['--delivery', '--delivery-pin', '--application', '--application-pin', '--commit', '--repo', '--output', '--reviewer']
const options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) {
  assert(keys.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--'))
  options.set(args[i], args[i + 1])
}
assert(keys.every(k => options.has(k)))
const { root } = assertUnifiedDesktopEnvironment(), output = options.get('--output')!
assert(path.isAbsolute(output))
const application = { path: options.get('--application')!, pin: options.get('--application-pin')! }
verifyUnifiedInstalledApplication(root, options.get('--repo')!, options.get('--commit')!, application)
const proof = { path: options.get('--delivery')!, pin: options.get('--delivery-pin')! }
readPinnedUnifiedInput(proof.path, proof.pin)
const opened = await openGenshinEditingSync(proof, options.get('--repo')!), plan = planGenshinEditingSync(opened)
const cfg = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
const token = JSON.parse(cfg.match(/^oauth_token\s*=\s*("[^"\r\n]*")\s*$/m)![1])
async function deployments() {
  const expected = [...Object.values(opened.sources.owners), opened.sources.router] as any[]
  return Promise.all(expected.map(async row => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${row.service}/deployments`,
      { method: 'GET', redirect: 'error', headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) })
    const body = await response.json(); assert(response.ok && body.success, 'Read-only production observation failed')
    const d = body.result.deployments.toSorted((a: any, b: any) => Date.parse(a.created_on) - Date.parse(b.created_on)).at(-1)
    assert.deepEqual(d.versions, [{ version_id: row.versionId, percentage: 100 }], 'Production source drift')
    return { service: row.service, deploymentId: d.id, versions: d.versions }
  }))
}
const beforeDeployments = await deployments()
if (action === 'apply') writeFileSync(output + '.intent.json', JSON.stringify({ kind: 'genshin-editing-sync-intent-v1', action, proof, application,
  syncKey: plan.syncKey, existing: plan.changes.filter(c => c.before).length, newEntities: plan.changes.filter(c => !c.before).length,
  beforeDeployments, at: new Date().toISOString(), workerUploads: 0, productionDeployments: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  let result: unknown
  if (action === 'apply') result = await applyGenshinEditingSync(payload, opened, Number(options.get('--reviewer')))
  else {
    const after = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true,
      locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs
    verifyEditingSyncRows(plan, opened.before.draft, after)
    result = { syncKey: plan.syncKey, records: after.length, verified: true, contentWrites: 0 }
  }
  const afterDeployments = await deployments(); assert.deepEqual(afterDeployments, beforeDeployments)
  writeFileSync(output, JSON.stringify({ action, application, sourceCommit: options.get('--commit'), proof, result,
    observedAt: new Date().toISOString(), beforeDeployments, afterDeployments, workerUploads: 0, productionDeployments: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ action, result, productionDeployments: 0 }))
} finally { await payload.destroy() }
