import { structuredEditableLeaves } from './unified-content'
import { isDeepStrictEqual } from 'node:util'
import { UNIFIED_PILOT_SCOPE } from './unified-production-scope'
import { verifyUnifiedPlan, type UnifiedPlan } from './unified-plan'

// This is source capability coverage, not a claim about the installed database or live consumers.
export function unifiedCoverage(plan: UnifiedPlan, ownership: { games: Record<string, unknown> }, publicPairs: string[]) {
  verifyUnifiedPlan(plan)
  const rows = plan.sources.flatMap(source => {
    const families = [...new Set(source.records.map(record => record.kind))].sort()
    if (!families.length) families.push(source.delegated ?? 'unmapped')
    return families.map(family => {
      const records = source.records.filter(record => record.kind === family)
      const leaves = records.map(record => structuredEditableLeaves(record.structuredValue))
      const qualified = records.filter((record, index) => source.game === UNIFIED_PILOT_SCOPE.game
        && source.sourcePath === UNIFIED_PILOT_SCOPE.sourcePath
        && isDeepStrictEqual(record.sourceRecord.locator, { identity: { id: UNIFIED_PILOT_SCOPE.id } })
        && leaves[index].some(leaf => leaf.pointer === UNIFIED_PILOT_SCOPE.field && typeof leaf.value === 'string'))
        .map(record => ({ stableKey: record.stableKey, fields: [UNIFIED_PILOT_SCOPE.field], locale: UNIFIED_PILOT_SCOPE.locale }))
      return { game: source.game, family, sourcePath: source.sourcePath, sourceSHA256: source.sourceSHA256,
        records: records.length, leafEditableRecords: leaves.filter(row => row.length > 0).length,
        editableLeaves: leaves.reduce((count, row) => count + row.length, 0),
        structureOnlyRecords: records.filter((_, index) => !leaves[index].length).map(record => record.stableKey),
        delegated: source.delegated ?? null, blocked: source.blocked,
        owners: Object.hasOwn(ownership.games, source.game) ? [source.game, 'main'] : ['main'],
        publicMirror: publicPairs.includes(source.sourcePath.replace(/^packages\/data\/games\//, ''))
          ? source.sourcePath.replace('packages/data/games/', 'apps/web/public/data/') : null,
        editor: source.delegated ?? (records.length ? '/admin/collections/content-records' : null),
        installedCMS: 'not-observed', consumerAcceptance: 'not-established-by-source-audit',
        productionQualifiedEdits: qualified,
        lifecycle: source.delegated ? null : { create: false, remove: false, reshape: false, replaceMedia: false } }
    })
  }).sort((a, b) => a.game.localeCompare(b.game) || a.sourcePath.localeCompare(b.sourcePath) || a.family.localeCompare(b.family))
  return { schemaVersion: 1, kind: 'unified_content_coverage', planSHA256: plan.planSHA256,
    summary: { scopes: plan.games.length, sources: plan.sources.length, rows: rows.length,
      records: rows.reduce((count, row) => count + row.records, 0),
      leafEditableRecords: rows.reduce((count, row) => count + row.leafEditableRecords, 0),
      productionQualifiedRecords: rows.reduce((count, row) => count + row.productionQualifiedEdits.length, 0),
      delegatedSources: plan.sources.filter(source => source.delegated).length },
    rows, exclusions: ['page-inline facts', 'unadapted code content', 'entity lifecycle', 'media replacement'],
    persistentCMSChanged: false, cloudWrites: false, productionReady: false }
}

export function coverageMarkdown(report: ReturnType<typeof unifiedCoverage>) {
  const lines = ['# CMS Existing Content Coverage', '', `Plan SHA-256: \`${report.planSHA256}\``, '',
    'Source capability only. Installed CMS state and public consumer acceptance are not inferred.',
    'A public mirror is a data output, not proof that a page consumes it.',
    'Production qualification refers only to the unified publisher; delegated guide publishers are separate.', '',
    '| Game | Family | Records | Leaf-editable | Unified production-qualified | Owners | Delegation |',
    '|---|---|---:|---:|---:|---|---|']
  for (const row of report.rows) lines.push(`| ${row.game} | ${row.family} | ${row.records} | ${row.leafEditableRecords} | ${row.productionQualifiedEdits.length} | ${row.owners.join(', ')} | ${row.delegated ?? '-'} |`)
  lines.push('', '## Remaining Work', '',
    '- Observe installed CMS coverage before importing missing scopes; preserve existing edits.',
    '- Accept actual consumers and domain rules before expanding production qualification.',
    '- Close multi-owner promotion for independent game sites; do not remove scope guards.',
    '- Add explicit contracts for creation, withdrawal, structural edits and media changes.',
    '- Map page-inline and unadapted code content separately.', '')
  return lines.join('\n')
}
