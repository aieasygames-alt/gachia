import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { reviewGenshinMaterialIdentities, verifyGenshinMaterialIdentityReview } from '../../services/content-cms/src/material-identity-review.ts'
import { auditMaterialReleaseDependencies } from '../../services/content-cms/src/material-release-dependencies.ts'
import { canonical } from '../../services/content-cms/src/record-mapping.ts'
import type { SourceBytes } from '../../services/content-cms/src/unified-export.ts'
const root = import.meta.dirname, repo = path.resolve(root, '../..')
const sha = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')
const load = (name: string) => JSON.parse(readFileSync(path.join(root, name), 'utf8'))
const save = (name: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n', file = path.join(root, name)
  writeFileSync(file, text, { flag: 'wx', mode: 0o600 }); return { path: file, pin: sha(text) }
}
const sourceProof = { path: path.join(root, 'baseline/review-sources.json'), pin: '403336d6efd978faba32fdd95b293126e2607b47f3701051b0753e9cc7bf9933' }
assert.equal(sha(readFileSync(sourceProof.path)), sourceProof.pin)
const snapshot = load('baseline/review-sources.json'), sources = snapshot.sources as SourceBytes[]
assert.equal(snapshot.sourceReader, 'readNteSourceIndex')
assert.equal(snapshot.sourceIndex.pin, '401834ddb8412bbf45072d9c2c54e4e1176ea03f9bc2b5950fabe53937c16750')
const ref = load('reference-index.json')
assert.equal(ref.commit, '8e5badd60b5d894284ccc927a56c9683529d2592')
const allReference = ref.files.map((row: any) => {
  assert(row.sourcePath === 'LICENSE' || /^src\/data\/(English|ChineseSimplified)\/(materials|characters|talents)\/[a-z0-9]+\.json$/.test(row.sourcePath))
  const text = readFileSync(path.join(root, 'reference', row.sourcePath), 'utf8')
  assert.equal(sha(text), row.sha256)
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex'), row.gitBlob)
  return { sourcePath: row.sourcePath, text, sha256: row.sha256 }
})
const reference = allReference.filter((row: any) => /\/(materials|characters)\//.test(row.sourcePath))
const plan = reviewGenshinMaterialIdentities(sources, reference)
verifyGenshinMaterialIdentityReview(plan, sources, reference)
const proof = save('identity-review.json', { sourceIndex: snapshot.sourceIndex, sourceProof,
  referenceIndex: { path: path.join(root, 'reference-index.json'), pin: sha(readFileSync(path.join(root, 'reference-index.json'))) }, plan })
const candidate = JSON.parse(plan.candidate.text)
const inputs = sources.map(row => row.sourcePath === plan.candidate.sourcePath ? plan.candidate : row)
const audit = auditMaterialReleaseDependencies('genshin', inputs)
const materialById = new Map(JSON.parse(sources.find(row => row.sourcePath === 'packages/data/games/genshin/raw-materials.json')!.text).map((row: any) => [row.id, row]))
const readRef = (p: string) => JSON.parse(allReference.find((row: any) => row.sourcePath === p)!.text)
const refMaterials = Object.entries(ref.materialFilesByNumericId).map(([id, key]) => ({ id: Number(id),
  en: readRef(`src/data/English/materials/${key}.json`).name, zh: readRef(`src/data/ChineseSimplified/materials/${key}.json`).name }))
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const numericId = (id: string) => {
  const local = materialById.get(id) as any
  const options = refMaterials.filter(row => normalize(id) === normalize(row.en) || (local && local.nameEn === row.en && local.name === row.zh))
  return options.length === 1 ? options[0].id : null
}
const stageComparisons: any[] = []
for (const row of candidate) {
  const oldCharacterId = plan.patches.find(p => p.after === row.characterId && p.pointer.endsWith('/characterId'))?.before ?? row.characterId
  const key = ref.characterFiles[oldCharacterId]; assert(key)
  for (const [group, family, prefix, label, labels] of [
    ['ascensionMaterials', 'characters', 'ascend', 'levelRange', ['20-40','40-50','50-60','60-70','70-80','80-90']],
    ['talentMaterials', 'talents', 'lvl', 'talentLevel', ['1→2','2→3','3→4','4→5','5→6','6→7','7→8','8→9','9→10']],
  ] as const) {
    const referencePath = `src/data/English/${family}/${key}.json`, costs = readRef(referencePath).costs
    for (const [index, stage] of row[group].entries()) {
      assert.equal(stage[label], labels[index], 'Stage cannot be inferred from an unknown label')
      const stageKey = `${prefix}${index + (family === 'characters' ? 1 : 2)}`
      const expected = costs[stageKey].map((m: any) => ({ id: m.id, name: m.name, quantity: m.count }))
      const actual = stage.materials.map((m: any) => ({ sourceId: m.id, id: numericId(m.id), quantity: m.quantity }))
      const expectedMap = new Map(expected.map((m: any) => [m.id, m]))
      const missing = expected.filter((m: any) => !actual.some((a: any) => a.id === m.id))
      const extra = actual.filter((m: any) => m.id === null || !expectedMap.has(m.id))
      const quantities = actual.flatMap((m: any) => {
        const e = expectedMap.get(m.id) as any
        return e && e.quantity !== m.quantity ? [{ sourceId: m.sourceId, numericId: m.id, actual: m.quantity, expected: e.quantity }] : []
      })
      stageComparisons.push({ characterId: row.characterId, sourcePointer: `/${candidate.indexOf(row)}/${group}/${index}`,
        referencePath, stageKey, stageLabel: stage[label], exact: !missing.length && !extra.length && !quantities.length,
        missing, extra, quantityDifferences: quantities })
    }
  }
}
const facts = save('recipe-review.json', { sourceIndex: snapshot.sourceIndex, identityReview: proof,
  referenceClassification: ref.classification, comparedCharacters: candidate.length, comparedStages: stageComparisons.length,
  exactStages: stageComparisons.filter(row => row.exact).length,
  affectedCharacters: [...new Set(stageComparisons.filter(row => !row.exact).map(row => row.characterId))],
  quantityDifferences: stageComparisons.reduce((n, row) => n + row.quantityDifferences.length, 0),
  hold: true, publishable: false, comparisons: stageComparisons })
const guihuan = auditMaterialReleaseDependencies('guihuan', sources)
const guihuanRelations = JSON.parse(sources.find(row => row.sourcePath === 'packages/data/games/guihuan/raw-character-materials.json')!.text)
const held = save('guihuan-held.json', { sourceIndex: snapshot.sourceIndex,
  introducingCommit: '50f82b366d873106e06a9e702e72911ee270efe4',
  finding: 'All 108 anonymous entries were already missing IDs in the introducing commit. No lost ID is recoverable from Git.',
  decision: 'held; do not infer a currency, invent an ID, or delete quantities',
  references: guihuan.edges.filter(edge => edge.materialId === null).map(edge => {
    const parts = edge.sourcePointer.slice(1).split('/'); const stage = (guihuanRelations as any)[parts[0]][parts[1]][parts[2]]
    return { ...edge, stage: stage.levelRange ?? stage.talentLevel }
  }), hold: true, publishable: false })
// Preserve reviewed source bytes as a candidate, not as a new published source.
const candidateProof = save('candidate-source.json', { sourceIndex: snapshot.sourceIndex, identityReview: proof,
  source: plan.candidate, auditKey: audit.auditKey, hold: true, publishable: false })
if (process.argv[2] === 'apply-local') {
  for (const file of [plan.candidate.sourcePath, plan.candidate.sourcePath.replace('packages/data/games/', 'apps/web/public/data/')]) {
    const full = path.join(repo, file)
    assert.equal(sha(readFileSync(full)), plan.source.sha256, `Local input drift: ${file}`)
  }
  assert(plan.patches.length > 0)
  // The two writes are local, reversible, and use the already reviewed identical bytes.
  for (const file of [plan.candidate.sourcePath, plan.candidate.sourcePath.replace('packages/data/games/', 'apps/web/public/data/')]) writeFileSync(path.join(repo, file), plan.candidate.text)
}
const summary = { sourceIndex: snapshot.sourceIndex, sourceProof, identityReview: proof, candidate: candidateProof, recipeReview: facts,
  guihuanHeld: held, identityChanges: plan.decisions.filter(row => row.approved), changedPointers: plan.patches.length,
  before: plan.before, after: plan.after, locallyApplied: process.argv[2] === 'apply-local', cmsWrites: false, cloudWrites: false,
  sourceAdvanced: false, publishable: false, remainingMaterialIds: audit.missingMaterialIds, remainingCharacterIds: audit.missingCharacterIds }
save('summary.json', summary)
console.log(JSON.stringify({ before: summary.before, after: summary.after, changedPointers: summary.changedPointers,
  approved: summary.identityChanges.map(row => ({ source: row.sourceId, target: row.approved!.targetId })),
  stages: stageComparisons.length, exactStages: stageComparisons.filter(row => row.exact).length,
  quantityDifferences: stageComparisons.reduce((n, row) => n + row.quantityDifferences.length, 0) }))
