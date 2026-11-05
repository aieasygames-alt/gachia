import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { baselineDirectory } from '../src/inventory-baseline'
import { cmsEnvironment } from '../src/cms-environment'
import { projectRoot } from '../src/local-environment'
import { readUnifiedSources } from '../src/unified-sources'
import { importUnifiedPlan, unifiedPlan } from '../src/unified-plan'
import { objectValue, type UnifiedRecord } from '../src/unified-content'
import { freezeUnifiedContent } from '../src/unified-build'
import { buildUnifiedOwners, verifyUnifiedOwnerBuild, type ConsumerExpectation } from '../src/unified-owner-build'
import type { SourceBytes } from '../src/unified-export'

const args = process.argv.slice(2), options = new Map<string, string>()
for (let i = 0; i < args.length; i++) {
  assert(['--commit', '--pin', '--active', '--output'].includes(args[i]) && !options.has(args[i])
    && args[i + 1] && !args[i + 1].startsWith('--'), 'Invalid owner smoke arguments')
  options.set(args[i], args[++i])
}
assert.equal(options.size, 4, 'Require --commit SHA1 --pin PLAN_SHA256 --active FILE --output NEW_DIRECTORY')
assert(!process.env.CMS_MODE || process.env.CMS_MODE === 'sqlite-local', 'Never use an installed CMS for fixture edits')
assert(!process.env.DATABASE_URL && !process.env.CMS_DATA_DIR, 'Persistent database configuration forbidden')
process.env.CMS_LOCAL_ONLY = '1'
process.env.CMS_LOCAL_NAMESPACE = `unified-owner-${randomUUID()}`
process.env.PAYLOAD_SECRET = randomUUID() + randomUUID()
const runtime = cmsEnvironment()
assert.equal(runtime.mode, 'sqlite-local')
const repo = realpathSync(path.resolve(projectRoot, '../..')), directory = path.resolve(options.get('--output')!)
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
assert.equal(plan.planSHA256, options.get('--pin'), 'Explicit current plan pin required')
const activeSources = JSON.parse(readFileSync(path.resolve(options.get('--active')!), 'utf8')) as SourceBytes[]
mkdirSync(directory, { mode: 0o700 })
const save = (file: string, value: unknown) => writeFileSync(path.join(directory, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const records: UnifiedRecord[] = [], expectations: ConsumerExpectation[] = []
try {
  const password = randomUUID() + 'Aa1!'
  const editor = await payload.create({ collection: 'users', overrideAccess: true,
    data: { email: 'owner-editor@example.invalid', password, role: 'editor' } })
  const reviewer = await payload.create({ collection: 'users', overrideAccess: true,
    data: { email: 'owner-reviewer@example.invalid', password, role: 'reviewer' } })
  const imported = await importUnifiedPlan(payload, plan)
  save('import.json', imported)
  for (const game of ['azur-promilia', 'genshin', 'hi3', 'lvmeng', 'nte']) {
    const inline = game === 'lvmeng'
    const source = plan.sources.find(row => row.sourcePath === (inline
      ? `apps/game-${game}/lib/data.ts` : `packages/data/games/${game}/raw-characters.json`))!
    assert(source)
    const template = source.records.find(record => game === 'lvmeng' ? record.sourceRecord.locator.symbol === 'game'
      : objectValue(record.structuredValue) && typeof record.structuredValue.name === 'string'
        && record.structuredValue.upcoming !== true && record.structuredValue.status !== 'upcoming')!
    assert(template && objectValue(template.structuredValue))
    const row = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
      where: { stableKey: { equals: template.stableKey } }, limit: 1 })).docs[0]
    assert(row)
    const marker = `CMS-LOCAL-ONLY-${game}-R42`, field = game === 'lvmeng' ? 'launchDate' : 'name'
    const updated = { ...template.structuredValue, [field]: marker }
    await payload.update({ collection: 'content-records', id: row.id, user: editor, overrideAccess: false, draft: true,
      data: { structuredValue: updated } })
    await payload.update({ collection: 'content-records', id: row.id, user: reviewer, overrideAccess: false,
      data: { structuredValue: updated, _status: 'published', hold: false } })
    const published = await payload.findByID({ collection: 'content-records', id: row.id, user: reviewer,
      overrideAccess: false, draft: false, depth: 0 })
    assert.deepEqual(published.structuredValue, updated)
    assert.equal(published.hold, false)
    assert.equal(published._status, 'published')
    records.push(published as unknown as UnifiedRecord)
    expectations.push({ owner: game === 'hi3' ? 'main' : game,
      path: game === 'lvmeng' ? '/zh/lvmeng/version'
        : `/zh/${game}/characters/${template.sourceRecord.locator.identity!.id}`,
      status: 200, contains: [marker] })
  }
  save('cms-edits.json', { syntheticDatabaseOnly: true, publishedVersionsReadBack: true,
    keys: records.map(record => record.stableKey), expectations, persistentCMSChanged: false, cloudWrites: false })
} finally {
  await payload.destroy()
  rmSync(runtime.directory, { recursive: true, force: true })
}
try {
  const frozen = freezeUnifiedContent({ repo, commit: options.get('--commit')!, directory: path.join(directory, 'frozen'),
    plan, records, activeSources, preview: true })
  save('frozen.json', { manifestPin: frozen.manifestPin, owners: frozen.owners, sourceTreeSHA256: frozen.sourceTreeSHA256 })
  const built = await buildUnifiedOwners(frozen.directory, frozen.manifestPin, expectations)
  verifyUnifiedOwnerBuild(frozen.directory, built.buildPin)
  save('result.json', { ...built, syntheticDatabaseOnly: true, persistentCMSChanged: false, websiteChanged: false })
  console.log(JSON.stringify({ directory, buildPin: built.buildPin, owners: built.owners, preview: built.preview, cloudWrites: false }))
} catch (error) {
  save('failure.json', { error: (error as Error).message, preview: true, cloudWrites: false, websiteChanged: false })
  throw error
}
