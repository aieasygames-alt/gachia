import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { verifyGenshinContentDelivery } from '../../../scripts/genshin-content-delivery.mjs'
import { digest } from '../src/legacy-intake'
import { baselineDirectory } from '../src/inventory-baseline'
import { cmsEnvironment } from '../src/cms-environment'
import { readUnifiedSources } from '../src/unified-sources'
import { importUnifiedPlan, unifiedPlan } from '../src/unified-plan'
import { objectValue, type UnifiedRecord } from '../src/unified-content'
import { freezeUnifiedContent } from '../src/unified-build'
import { GENSHIN_LOCAL_SCOPE } from '../src/unified-genshin-local-scope'
import { buildUnifiedOwners, verifyUnifiedOwnerBuild } from '../src/unified-owner-build'

const args = process.argv.slice(2), options = new Map<string, string>()
let fetchMissing = false
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--fetch-missing' && !fetchMissing) { fetchMissing = true; continue }
  assert(['--source', '--commit', '--output', '--previous', '--main', '--main-pin'].includes(args[i]) && !options.has(args[i])
    && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid Genshin smoke arguments')
  options.set(args[i], args[++i])
}
assert.equal(options.size, 6, 'Require --source --commit --output --previous --main --main-pin')
assert(/^[a-f0-9]{40}$/.test(options.get('--commit')!)); assert(/^[a-f0-9]{64}$/.test(options.get('--main-pin')!))
assert(!process.env.CMS_MODE || process.env.CMS_MODE === 'sqlite-local', 'Only an isolated CMS may be edited by a smoke test')
assert(!process.env.DATABASE_URL && !process.env.CMS_DATA_DIR, 'Persistent CMS configuration forbidden')
const repo = realpathSync(options.get('--source')!), directory = path.resolve(options.get('--output')!)
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), options.get('--commit'))
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources(repo).sources, inventory.scopes.map((row: { id: string }) => row.id))
const active = plan.sources.map(row => {
  const text = readFileSync(path.join(repo, row.sourcePath), 'utf8'); assert.equal(digest(text), row.sourceSHA256)
  return { sourcePath: row.sourcePath, text, sha256: row.sourceSHA256 }
})
mkdirSync(directory, { mode: 0o700 })
const save = (file: string, value: unknown) => writeFileSync(path.join(directory, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
process.env.CMS_LOCAL_ONLY = '1'; process.env.CMS_LOCAL_NAMESPACE = `unified-genshin-${randomUUID()}`
process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
const runtime = cmsEnvironment(), { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
let record: UnifiedRecord
try {
  const password = randomUUID() + 'Aa1!'
  const editor = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'genshin-editor@example.invalid', password, role: 'editor' } })
  const reviewer = await payload.create({ collection: 'users', overrideAccess: true, data: { email: 'genshin-reviewer@example.invalid', password, role: 'reviewer' } })
  save('import.json', await importUnifiedPlan(payload, plan, ['genshin']))
  const template = plan.sources.find(row => row.sourcePath === 'packages/data/games/genshin/raw-characters.json')!.records
    .find(row => row.sourceRecord.locator.identity?.id === 'hu-tao')!
  assert(template && objectValue(template.structuredValue))
  const row = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
    where: { stableKey: { equals: template.stableKey } }, limit: 1 })).docs[0]
  const updated = { ...template.structuredValue, nameEn: 'Hu Tao CMS Delivery' }
  await payload.update({ collection: 'content-records', id: row.id, user: editor, overrideAccess: false, draft: true, data: { structuredValue: updated } })
  await payload.update({ collection: 'content-records', id: row.id, user: reviewer, overrideAccess: false,
    data: { structuredValue: updated, _status: 'published', hold: false } })
  const published = await payload.findByID({ collection: 'content-records', id: row.id, user: reviewer, overrideAccess: false, draft: false, depth: 0 })
  assert.deepEqual(published.structuredValue, updated); assert.equal(published._status, 'published'); assert.equal(published.hold, false)
  record = published as unknown as UnifiedRecord
  save('cms-edit.json', { stableKey: template.stableKey, before: template.structuredValue.nameEn, after: updated.nameEn,
    editorWrite: true, reviewerPublished: true, publishedVersionReadBack: true, isolatedCMSOnly: true, persistentCMSChanged: false })
  save('record.json', record)
} finally { await payload.destroy(); rmSync(runtime.directory, { recursive: true, force: true }) }
try {
  const frozen = freezeUnifiedContent({ repo, commit: options.get('--commit')!, directory: path.join(directory, 'build'),
    plan, records: [record], activeSources: active, preview: true, localScope: GENSHIN_LOCAL_SCOPE })
  save('frozen.json', { directory: frozen.directory, manifestPin: frozen.manifestPin, owners: frozen.owners, sourceCommit: frozen.sourceCommit })
  const built = await buildUnifiedOwners(frozen.directory, frozen.manifestPin, [], { allowNetworkInstall: fetchMissing })
  verifyUnifiedOwnerBuild(built.directory, built.buildPin)
  save('built.json', { directory: built.directory, buildPin: built.buildPin, owners: Object.keys(built.owners) })
  const delivery = await verifyGenshinContentDelivery({ root: path.resolve(import.meta.dirname, '../../..'), output: path.join(directory, 'http'),
    candidateSource: frozen.workspace, baselineSource: repo, candidateArtifact: path.join(frozen.directory, 'artifacts/genshin'),
    previousArtifact: options.get('--previous')!, mainCandidate: options.get('--main')!, mainPin: options.get('--main-pin')! })
  save('result.json', { buildPin: built.buildPin, deliveryPin: delivery.pin, responses: delivery.responses,
    ownersBuilt: ['genshin'], persistentCMSChanged: false, cloudWrites: false, productionReady: false })
  console.log(JSON.stringify({ directory, buildPin: built.buildPin, deliveryPin: delivery.pin, responses: delivery.responses, actualOpenNextBuild: true, cloudWrites: false }))
} catch (error) {
  save('failure.json', { error: (error as Error).message, cloudWrites: false, productionReady: false }); throw error
}
