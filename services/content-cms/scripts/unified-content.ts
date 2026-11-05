import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { realpathSync } from 'node:fs'
import { baselineDirectory } from '../src/inventory-baseline'
import { projectRoot } from '../src/local-environment'
import { cmsEnvironment } from '../src/cms-environment'
import { digest } from '../src/legacy-intake'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan, importUnifiedPlan } from '../src/unified-plan'
import { exportUnifiedContent, type SourceBytes } from '../src/unified-export'
import { isUnifiedRecord, type UnifiedRecord } from '../src/unified-content'
import { freezeUnifiedContent } from '../src/unified-build'

const [action, ...args] = process.argv.slice(2)
const allowed = ['plan', 'import-local', 'export-local', 'freeze-local']
if (!allowed.includes(action)) throw new Error(`Usage: unified-content.ts ${allowed.join('|')} [--pin SHA256] [--active FILE] [--preview] [--commit SHA1 --output NEW_DIRECTORY]`)
const options = new Map<string, string>(), flags = new Set<string>()
for (let i = 0; i < args.length; i++) {
  const key = args[i]
  if (key === '--preview' && !flags.has(key)) { flags.add(key); continue }
  if (!['--pin', '--active', '--commit', '--output'].includes(key) || options.has(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid unified content arguments')
  options.set(key, args[++i])
}
if (action === 'plan' && (options.size || flags.size)
  || action === 'import-local' && (options.size !== 1 || !options.has('--pin') || flags.size)
  || action !== 'freeze-local' && (options.has('--commit') || options.has('--output'))
  || action === 'freeze-local' && (!options.has('--commit') || !options.has('--output') || !options.has('--active'))) throw new Error('Arguments do not match action')
const repo = realpathSync(path.resolve(projectRoot, '../..'))
const inventory = JSON.parse(await readFile(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const { sources } = readUnifiedSources()
const plan = unifiedPlan(sources, inventory.scopes.map((scope: { id: string }) => scope.id))
if (action === 'plan') {
  console.log(JSON.stringify({ planSHA256: plan.planSHA256, scopes: plan.scopeCoverage,
    records: plan.sources.reduce((sum, source) => sum + source.records.length, 0),
    delegated: plan.sources.filter(source => source.delegated).map(({ sourcePath, delegated }) => ({ sourcePath, delegated })),
    blocked: plan.sources.flatMap(source => source.blocked.map(unit => ({ sourcePath: source.sourcePath, ...unit }))),
    excluded: ['page-inline facts and code-only/derived modules', 'new records and structural changes', 'media replacement', 'production activation'],
    websiteChanged: false, productionReady: false }, null, 2))
} else {
  if (options.get('--pin') !== plan.planSHA256) throw new Error('Recompute and explicitly pin the current unified plan')
  // Production installation/migration is deliberately a separate, audited action.
  const runtime = cmsEnvironment()
  if (runtime.mode !== 'sqlite-local' || !/^unified-[a-z0-9-]+$/.test(process.env.CMS_LOCAL_NAMESPACE ?? '')) throw new Error('Use an isolated unified-* SQLite namespace; installed CMS import is not enabled yet')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    if (action === 'import-local') console.log(JSON.stringify(await importUnifiedPlan(payload, plan)))
    else {
      if (!options.has('--active')) throw new Error('Explicit complete active-source baseline file required')
      const active: SourceBytes[] = JSON.parse(await readFile(path.resolve(options.get('--active')!), 'utf8'))
      const preview = flags.has('--preview')
      const rows = await payload.find({ collection: 'content-records', overrideAccess: true, draft: preview, locale: 'all', depth: 0,
        pagination: false, where: preview ? { stableKey: { like: 'unified:' } } : { and: [
          { stableKey: { like: 'unified:' } }, { _status: { equals: 'published' } }, { hold: { equals: false } }] } })
      const records = rows.docs.filter(isUnifiedRecord) as unknown as UnifiedRecord[]
      if (action === 'freeze-local') {
        const result = freezeUnifiedContent({ repo, commit: options.get('--commit')!, directory: options.get('--output')!,
          plan, records, activeSources: active, preview })
        console.log(JSON.stringify({ directory: result.directory, manifestPin: result.manifestPin, games: result.games, owners: result.owners,
          changed: result.candidate.changed.length, modifiedFiles: result.modified.length, sourceTreeSHA256: result.sourceTreeSHA256,
          productionReady: false, cloudWrites: false, websiteChanged: false }))
      } else {
        const originals = await Promise.all(plan.sources.map(async source => {
          const text = await readFile(path.join(repo, source.sourcePath), 'utf8')
          return { sourcePath: source.sourcePath, text, sha256: digest(text) }
        }))
        const candidate = exportUnifiedContent(records, originals, active, preview)
        const directory = path.join(runtime.directory, 'candidates', candidate.manifest.candidateSHA256)
        await mkdir(path.dirname(directory), { recursive: true, mode: 0o700 })
        await mkdir(directory, { mode: 0o700 })
        for (const [index, file] of candidate.files.entries()) await writeFile(path.join(directory, `${index}.candidate`), file.content, { flag: 'wx', mode: 0o600 })
        await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ ...candidate.manifest, files: candidate.manifest.files.map((file, index) =>
          ({ ...file, candidateFile: `${index}.candidate` })) }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
        console.log(JSON.stringify({ directory, ...candidate.manifest }))
      }
    }
  } finally { await payload.destroy() }
}
