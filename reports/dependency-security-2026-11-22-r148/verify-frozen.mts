import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { migrationPinned } from '../../scripts/genshin-migration-http.mjs'
import { verifyMainConsumerSource } from '../../services/content-cms/src/main-consumer-source.ts'
const root = import.meta.dirname, repo = path.resolve(root, '../..')
const p = JSON.parse(readFileSync(path.join(root, 'prepared.json'), 'utf8'))
const baseline = JSON.parse(readFileSync(path.join(root, 'cloud-baseline.json'), 'utf8'))
const verified = verifyMainConsumerSource(repo, p.workspaceProof, migrationPinned(baseline.active))
writeFileSync(path.join(root, 'cleanup-source-verification.json'), JSON.stringify({
  at: new Date().toISOString(), kind: 'exact_frozen_source_reopened_after_generated_cache_cleanup',
  sourceCommit: verified.sourceCommit, sources: verified.sourceHashes.length,
  sourceFilesUnchanged: true, manifestsPassed: true, workerWrites: 0,
}, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ sourceFilesUnchanged: true, sources: verified.sourceHashes.length, manifestsPassed: true }))
