import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'
import { projectRoot } from './local-environment'

export type SourceKind = 'registry' | 'raw-json' | 'review-contract' | 'inline-code'
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024
export type SourceSnapshot = {
  snapshotKey: string; gameKey: string; sourcePath: string; sourceDigest: string; sourceKind: SourceKind; rawText: string
}
export const digest = (text: string) => createHash('sha256').update(text).digest('hex')
export function snapshot(gameKey: string, sourcePath: string, sourceKind: SourceKind, rawText: string): SourceSnapshot {
  if (!rawText) throw new Error(`Empty source: ${sourcePath}`)
  if (Buffer.byteLength(rawText) > MAX_SNAPSHOT_BYTES) throw new Error(`Source exceeds local snapshot limit: ${sourcePath}`)
  const sourceDigest = digest(rawText)
  return { snapshotKey: digest(`${sourcePath}\0${sourceDigest}`), gameKey, sourcePath, sourceDigest, sourceKind, rawText }
}

export function profileJSON(text: string) {
  const value: unknown = JSON.parse(text)
  const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []
  const objects = rows.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object' && !Array.isArray(row))
  const fields = [...new Set(objects.flatMap(row => Object.keys(row)))].sort()
  const identityCandidates = ['id', 'slug', 'code', 'name'].map(field => {
    const values = objects.map(row => row[field]).filter(value => typeof value === 'string' || typeof value === 'number').map(String)
    return { field, present: values.length, unique: new Set(values).size, duplicates: values.length - new Set(values).size }
  }).filter(candidate => candidate.present)
  return { rootShape: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value, rowCount: rows.length, objectRows: objects.length, fields, identityCandidates, localeFieldCandidates: fields.filter(field => /(?:Zh|En|Ja)$/.test(field) || ['zh', 'en', 'ja'].includes(field)), mappingStatus: 'unmapped' }
}

export function readLegacySources() {
  const root = realpathSync(path.resolve(projectRoot, '../..'))
  const inventory = JSON.parse(readFileSync(path.join(root, 'reports/payload-migration-2026-10-28/inventory.json'), 'utf8'))
  const readChecked = (file: { path: string; sha256: string }) => {
    const resolved = realpathSync(path.resolve(root, file.path))
    if (!resolved.startsWith(root + path.sep)) throw new Error(`Source escapes repository: ${file.path}`)
    const bytes = readFileSync(resolved)
    const text = bytes.toString('utf8')
    if (!Buffer.from(text).equals(bytes) || digest(text) !== file.sha256) throw new Error(`Source drift or invalid UTF-8: ${file.path}`)
    return text
  }
  const sources: SourceSnapshot[] = []
  for (const scope of inventory.scopes) {
    sources.push(snapshot(scope.id, `registry/${scope.id}.json`, 'registry', JSON.stringify(scope.registry)))
    for (const file of scope.sourceFiles as { path: string; sha256: string }[]) {
      if (/\/raw-[^/]+\.json$/.test(file.path)) {
        const text = readChecked(file)
        profileJSON(text)
        sources.push(snapshot(scope.id, file.path, 'raw-json', text))
      }
    }
    // Preserve known independent-app data modules without executing or pretending to map them.
    for (const file of scope.appCandidates as { path: string; sha256: string }[]) {
      if (file.path === `apps/game-${scope.id}/lib/data.ts`) sources.push(snapshot(scope.id, file.path, 'inline-code', readChecked(file)))
    }
  }
  sources.push(snapshot('_platform', inventory.reviewContract.path, 'review-contract', readChecked(inventory.reviewContract)))
  if (new Set(sources.map(source => source.sourcePath)).size !== sources.length) throw new Error('Duplicate source path')
  return { sources, sourceCommit: inventory.sourceCommit }
}

// This is a quarantine importer, not an editorial or publication write path.
export async function importSnapshots(payload: Payload, sources: SourceSnapshot[]) {
  for (const source of sources) {
    if (!source.rawText || Buffer.byteLength(source.rawText) > MAX_SNAPSHOT_BYTES) throw new Error('Snapshot size failure')
    if (source.sourceDigest !== digest(source.rawText) || source.snapshotKey !== digest(`${source.sourcePath}\0${source.sourceDigest}`)) throw new Error('Snapshot integrity failure')
  }
  let created = 0
  let unchanged = 0
  for (const source of sources) {
    const existing = await payload.find({ collection: 'migration-sources', overrideAccess: true, limit: 1, where: { snapshotKey: { equals: source.snapshotKey } } })
    if (existing.docs[0]) {
      for (const key of Object.keys(source) as (keyof SourceSnapshot)[]) {
        if (existing.docs[0][key] !== source[key]) throw new Error(`Stored snapshot mismatch: ${source.sourcePath}`)
      }
      unchanged++
    } else {
      await payload.create({ collection: 'migration-sources', overrideAccess: true, data: source })
      created++
    }
  }
  return { created, unchanged, total: sources.length }
}
