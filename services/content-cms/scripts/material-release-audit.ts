import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readNteSourceIndex } from '../src/nte-release-history'
import { auditMaterialReleaseDependencies } from '../src/material-release-dependencies'
import { canonical } from '../src/record-mapping'
import { digest } from '../src/legacy-intake'
import type { SourceBytes } from '../src/unified-export'

// Explicit source proof, offline history validation, no CMS or cloud API calls.
assert.equal(process.env.CMS_LOCAL_ONLY, '1', 'Local read-only audit only')
const args = process.argv.slice(2)
assert.deepEqual(args.filter((_, i) => i % 2 === 0), ['--source-index', '--pin', '--output'])
assert.equal(args.length, 6)
const proof = { path: args[1], pin: args[3] }, directory = args[5]
assert(path.isAbsolute(proof.path) && path.isAbsolute(directory) && /^[a-f0-9]{64}$/.test(proof.pin))
const root = fileURLToPath(new URL('../../../', import.meta.url))
const published = await readNteSourceIndex(proof)
const sources = published.sources as SourceBytes[]
assert.equal(sources.length, 115)
const publishedMap = new Map(sources.map(row => [row.sourcePath, row]))
const games = sources.filter(row => /\/raw-materials\.json$/.test(row.sourcePath)).map(row => row.sourcePath.split('/')[3]).sort()
// Guard against accidentally auditing only the three old pilot games.
assert.deepEqual(games, readdirSync(path.join(root, 'packages/data/games')).filter(game => {
  try { readFileSync(path.join(root, `packages/data/games/${game}/raw-materials.json`)); return true } catch { return false }
}).sort())
const audits = games.map(game => auditMaterialReleaseDependencies(game, sources))
const mirrors = audits.flatMap(audit => audit.sources.filter(row => /raw-(?:materials|character-materials)\.json$/.test(row.sourcePath)).map(row => {
  const mirrorPath = row.sourcePath.replace('packages/data/games/', 'apps/web/public/data/')
  const text = readFileSync(path.join(root, mirrorPath), 'utf8')
  return { game: audit.game, sourcePath: row.sourcePath, mirrorPath, publishedSHA256: row.sha256,
    mirrorSHA256: digest(text), equal: canonical(JSON.parse(text)) === canonical(JSON.parse(publishedMap.get(row.sourcePath)!.text)) }
}))
// A Git checkout can legitimately predate published CMS overlays. Keep auditing
// published A and retain the drift evidence instead of losing a completed
// history read to an assertion about the local checkout.
const localMirrorParity = mirrors.every(row => row.equal)
const report = { schemaVersion: 1, kind: 'material_release_dependency_audit', sourceIndex: proof, sourceCount: sources.length,
  observedAt: new Date().toISOString(), games: audits, mirrors, localMirrorParity, cloudWrites: false, cmsWrites: false,
  productionQualified: false, publicationSourceAdvanced: false }
mkdirSync(directory, { mode: 0o700 })
const save = (name: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n', file = path.join(directory, name)
  writeFileSync(file, text, { flag: 'wx', mode: 0o600 })
  return { path: file, pin: digest(text) }
}
save('published-source-hashes.json', sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })))
save('review-sources.json', { sourceIndex: proof, sourceReader: 'readNteSourceIndex',
  sources: sources.filter(row => /\/raw-(?:materials|character-materials|characters)\.json$/.test(row.sourcePath)) })
const result = save('dependency-audit.json', report)
const genshin = audits.find(row => row.game === 'genshin')!, characters = JSON.parse(publishedMap.get('packages/data/games/genshin/raw-characters.json')!.text)
const materials = JSON.parse(publishedMap.get('packages/data/games/genshin/raw-materials.json')!.text)
const review = { sourceIndex: proof, auditKey: genshin.auditKey, policy: 'Exact local naming candidates only; no implicit correction or factual approval.',
  missingMaterials: genshin.missingMaterialIds.map(id => ({ id,
    occurrences: genshin.edges.filter(row => row.materialId === id),
    namingCandidates: materials.filter((row: { id: string }) => row.id.replace(/[-_]/g, '').toLowerCase() === id.replace(/[-_]/g, '').toLowerCase()).map((row: { id: string; name: string; nameEn: string }) => ({ id: row.id, name: row.name, nameEn: row.nameEn })),
    decision: 'requires-source-review', publishable: false })),
  missingCharacters: genshin.missingCharacterIds.map(id => ({ id,
    namingCandidates: characters.filter((row: { id: string }) => row.id.endsWith('-' + id)).map((row: { id: string; name: string; nameEn: string }) => ({ id: row.id, name: row.name, nameEn: row.nameEn })),
    decision: 'requires-identity-review', publishable: false })), dataChanges: [] }
save('genshin-review-queue.json', review)
console.log(JSON.stringify({ proof: result, sourceIndex: proof, sourceCount: sources.length, localMirrorParity,
  mirrorDrift: mirrors.filter(row => !row.equal).map(row => row.mirrorPath),
  games: audits.map(({ game, materialDefinitions, materialReferences, missingMaterialIds, missingCharacterIds, anonymousMaterialReferences, status }) =>
    ({ game, materialDefinitions, materialReferences, missingMaterials: missingMaterialIds.length, missingCharacters: missingCharacterIds.length, anonymousMaterialReferences, status })), cloudWrites: false }))
