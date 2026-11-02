import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildContentLedger, root } from '../src/content-ledger'
import { canonical } from '../src/record-mapping'
import { digest } from '../src/legacy-intake'
const mode = process.argv[2], directory = process.argv[3]
if (!['--write', '--check'].includes(mode) || !directory) throw new Error('Use --write|--check <repository-relative output directory>')
const output = path.resolve(root, directory)
if (!output.startsWith(root + path.sep)) throw new Error('Output must stay in repository')
const ledger = buildContentLedger(), ledgerKey = digest(canonical(ledger))
const json = JSON.stringify({ ...ledger, ledgerKey }, null, 2) + '\n'
if (mode === '--check') {
  if (readFileSync(path.join(output, 'content-ledger.json'), 'utf8') !== json) throw new Error('Ledger drift: write a NEW report, do not overwrite historical evidence')
} else {
  mkdirSync(output, { recursive: true }); writeFileSync(path.join(output, 'content-ledger.json'), json, { flag: 'wx' })
  const lines = ['# Content and media ledger', '', 'Date: 2026-11-01. Read-only source audit; no DB access, downloads, approvals or authority transfer.', '', '```json', JSON.stringify(ledger.counts, null, 2), '```', '',
    `Historical batch matches: ${ledger.historicalBatchMatches}. All media rights remain unverified.`, '', '| Scope/type | Units | Identity only | Sections | Candidate URLs | Unmapped fields |', '|---|---:|---:|---:|---:|---:|',
    ...ledger.families.map(row => `| ${row.key} | ${row.records} | ${row.identityOnly} | ${row.sections} | ${row.candidateURLs} | ${row.unmappedFields.length} |`), '', '## Limits and next actions', '',
    '- Candidate URLs are not verified aliases or index permission. Missing translations remain missing.', '- Static import reachability is not complete runtime or semantic coverage. Inline facts and dynamic readers remain pending.',
    '- Local asset byte hashes do not prove origin, MIME, HTTP delivery or rights. Historical HTTP matches are not new probes.', '- Assign editorial owners/freeze boundaries, reconcile aliases and derived content, review type-specific dependencies.',
    '- Obtain explicit media rights receipts; no automated download or approval is performed.', '', `Raw files outside baseline: ${ledger.gaps.rawFilesOutsideBaseline.length}. Missing historical manifest files: ${ledger.gaps.missingManifestFiles.length}.`, '']
  writeFileSync(path.join(output, 'README.md'), lines.join('\n'), { flag: 'wx' })
}
console.log(JSON.stringify({ mode, ledgerKey, ...ledger.counts, historicalBatchMatches: ledger.historicalBatchMatches, publishable: false }, null, 2))
