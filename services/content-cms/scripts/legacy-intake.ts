import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { importSnapshots, digest, profileJSON, readLegacySources } from '../src/legacy-intake'
import { localEnvironment, projectRoot } from '../src/local-environment'

const args = process.argv.slice(2)
if (args.length !== 1 || !['--plan', '--apply-local'].includes(args[0])) throw new Error('Use --plan or --apply-local.')
execFileSync(process.execPath, [path.join(projectRoot, 'node_modules/tsx/dist/cli.mjs'), 'scripts/inventory.ts', '--check'], { cwd: projectRoot, stdio: 'inherit' })
const { sources, sourceCommit } = readLegacySources()
const manifest = sources.map(({ rawText, ...source }) => ({ ...source, profile: source.sourceKind === 'raw-json' ? profileJSON(rawText) : null }))
const report = { schemaVersion: 1, sourceCommit, authority: 'legacy', publishable: false, semanticMappingComplete: false, sources: manifest }
if (args[0] === '--plan') {
  writeFileSync(path.join(projectRoot, '../../reports/payload-migration-2026-10-28/intake-plan.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(`Prepared ${sources.length} immutable source snapshots; no database writes, no semantic mapping.`)
} else {
  const local = localEnvironment()
  if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Intake writes require the dedicated migration namespace.')
  const approvedPlan = readFileSync(path.join(projectRoot, '../../reports/payload-migration-2026-10-28/intake-plan.json'), 'utf8')
  if (approvedPlan !== JSON.stringify(report, null, 2) + '\n') throw new Error('Intake plan drift; regenerate and review before applying.')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const result = await importSnapshots(payload, sources)
    mkdirSync(local.directory, { recursive: true })
    const receipt = { ...result, planDigest: digest(approvedPlan), authority: 'legacy', complete: true, publishable: false, entries: sources.map(({ snapshotKey, sourcePath, gameKey }) => ({ snapshotKey, sourcePath, gameKey })) }
    // Append-only snapshots survive interruption; a complete receipt is written only after the full pass.
    writeFileSync(path.join(local.directory, `intake-${Date.now()}.json`), JSON.stringify(receipt, null, 2) + '\n')
    console.log(JSON.stringify({ ...result, authority: 'legacy', publishable: false }))
  } finally {
    await payload.destroy()
  }
}
