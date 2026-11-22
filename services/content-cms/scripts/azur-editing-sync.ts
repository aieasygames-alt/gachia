import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { assertUnifiedDesktopEnvironment } from '../src/unified-desktop'
import { verifyUnifiedInstalledApplication } from '../src/unified-installed-application'
import { openAzurEditingSync, applyAzurEditingSync, planAzurEditingSync, verifyAzurEditingRows } from '../src/azur-editing-sync'
import { desktopCloudSnapshot, assertTopology } from '../../../scripts/desktop-cloud-release.mjs'
import { unifiedProductionRead } from '../../../scripts/unified-production-transport.mjs'

const [action, ...args] = process.argv.slice(2)
assert(['apply', 'verify'].includes(action))
const keys = ['--source-index', '--source-pin', '--snapshot', '--snapshot-pin', '--selection', '--selection-pin', '--application', '--application-pin', '--commit', '--repo', '--output', '--reviewer']
const options = new Map<string, string>()
for (let i = 0; i < args.length; i += 2) { assert(keys.includes(args[i]) && !options.has(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')); options.set(args[i], args[i + 1]) }
assert.deepEqual([...options.keys()].sort(), keys.sort())
const { root } = assertUnifiedDesktopEnvironment(), output = options.get('--output')!
assert(path.isAbsolute(output) && !existsSync(output))
const proof = (file: string, pin: string) => ({ path: options.get(file)!, pin: options.get(pin)! })
const application = proof('--application', '--application-pin')
verifyUnifiedInstalledApplication(root, options.get('--repo')!, options.get('--commit')!, application)
const input = { sourceIndex: proof('--source-index', '--source-pin'), snapshot: proof('--snapshot', '--snapshot-pin'), selection: proof('--selection', '--selection-pin') }
const opened = await openAzurEditingSync(input, options.get('--repo')!), plan = planAzurEditingSync(opened)
const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
assert(Date.parse(field('expiration_time')) > Date.now())
const token = field('oauth_token'), before = await desktopCloudSnapshot(token, unifiedProductionRead)
assertTopology(opened.sources.baseline, before)
if (action === 'apply') writeFileSync(output + '.intent.json', JSON.stringify({ action, input, application, syncKey: plan.syncKey, id: plan.before.id,
  before, at: new Date().toISOString(), reviewedContentPreserved: true, cloudWrites: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  let result: any
  if (action === 'apply') result = await applyAzurEditingSync(payload, opened, Number(options.get('--reviewer')))
  else {
    for (const draft of [true, false]) verifyAzurEditingRows(opened, plan, (await payload.find({ collection: 'content-records', overrideAccess: true,
      draft, locale: 'all', fallbackLocale: false, depth: 0, pagination: false })).docs, draft)
    result = { syncKey: plan.syncKey, verified: true, updated: 0, cloudWrites: false }
  }
  const after = await desktopCloudSnapshot(token, unifiedProductionRead); assertTopology(before, after)
  writeFileSync(output, JSON.stringify({ action, input, application, result, before, after, observedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ action, result }))
} finally { await payload.destroy() }
