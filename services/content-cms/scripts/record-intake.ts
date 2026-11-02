import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment, projectRoot } from '../src/local-environment'
import { digest, readLegacySources } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'

const mode = process.argv.slice(2)
if (mode.length !== 1 || !['--plan', '--apply-local'].includes(mode[0])) throw new Error('Use --plan or --apply-local')
execFileSync(process.execPath, [path.join(projectRoot, 'node_modules/tsx/dist/cli.mjs'), 'scripts/inventory.ts', '--check'], { cwd: projectRoot, stdio: 'inherit' })
const root = path.resolve(projectRoot, '../..')
// Bind the mapping to actual reader and review policy code, without executing application modules.
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0')
const evidencePaths = tracked.filter(file => /^packages\/data\/games\/[^/]+\/(characters|guides|types)\.ts$/.test(file) || ['packages/core/route-ownership.json', 'apps/web/lib/retired-pages.ts', 'apps/web/lib/seo-metadata.ts', 'apps/game-genshin/lib/guide-policy.ts', 'packages/data/raw-content-review.json'].includes(file)).sort()
const policyEvidence = evidencePaths.map(file => ({ path: file, digest: digest(readFileSync(path.join(root, file), 'utf8')) }))
const { sources, sourceCommit } = readLegacySources()
const policy = { digest: digest(canonical(policyEvidence)), routes: JSON.parse(readFileSync(path.join(root, 'packages/core/route-ownership.json'), 'utf8')) }
const batch = mapBatch(sources, policy)
const counts: Record<string, { records: number; commonFields: number; identityOnly: number; structuredFields: number; sections: number; faqEntries: number; deferred: string[] }> = {}
for (const source of batch.sources) {
  if (source.gameKey === '_platform') continue
  counts[source.gameKey] ??= { records: 0, commonFields: 0, identityOnly: 0, structuredFields: 0, sections: 0, faqEntries: 0, deferred: [] }
  const scope = counts[source.gameKey]
  scope.records += source.records.length
  scope.commonFields += source.records.filter(record => record.mappingLevel === 'common-fields').length
  scope.identityOnly += source.records.filter(record => record.mappingLevel === 'identity-only').length
  scope.structuredFields += source.records.filter(record => record.mappingLevel === 'structured-fields').length
  scope.sections += source.records.filter(record => record.origin?.kind === 'section').length
  scope.faqEntries += source.records.reduce((n, record) => n + (record.faqs?.length ?? 0), 0)
  if (source.state === 'deferred') scope.deferred.push(source.sourcePath)
}
const plan = { sourceCommit, batchKey: batch.batchKey, mapperVersion: batch.mapperVersion, policyDigest: batch.policyDigest, policyEvidence, counts, total: batch.sources.reduce((n, source) => n + source.records.length, 0), publishable: false, authority: 'legacy', sources: batch.sources.map(({ records, ...source }) => ({ ...source, records: records.length, unmappedFields: [...new Set(records.flatMap(record => record.unmappedFields))].sort() })) }
const planText = JSON.stringify(plan, null, 2) + '\n'
const planPath = path.join(root, 'reports/payload-migration-2026-10-28/record-plan-v2.json')
if (mode[0] === '--plan') {
  writeFileSync(planPath, planText)
  console.log(JSON.stringify({ total: plan.total, counts, batchKey: batch.batchKey, publishable: false }))
} else {
  const local = localEnvironment()
  if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Only the migration namespace is allowed')
  if (readFileSync(planPath, 'utf8') !== planText) throw new Error('Plan drift; review the new plan before applying')
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const result = await importRecordBatch(payload, batch, policy)
    writeFileSync(path.join(local.directory, `records-${Date.now()}.json`), JSON.stringify({ ...result, planDigest: digest(planText) }, null, 2) + '\n')
    console.log(JSON.stringify(result))
  } finally { await payload.destroy() }
}
