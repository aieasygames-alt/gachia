import assert from 'node:assert/strict'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import { canonical } from './record-mapping'
import { digest } from './legacy-intake'
import type { SourceBytes } from './unified-export'

type Reference = { sourcePath: string; text: string; sha256: string }
type Identity = { id: string; name: string; nameEn?: string }
type Evidence = { numericId: number; name: string; nameEn: string; sources: { sourcePath: string; sha256: string }[] }
const relationPath = 'packages/data/games/genshin/raw-character-materials.json'
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

// This is a content review proposal, not a runtime alias table or release gate.
// Both locales must identify the same numeric game record. A lexical match
// alone never approves a target, a recipe, a quantity, or publication.
export function reviewGenshinMaterialIdentities(sources: SourceBytes[], reference: Reference[]) {
  for (const row of [...sources, ...reference]) assert.equal(digest(row.text), row.sha256, 'Corrupt identity review input')
  assert.equal(new Set(sources.map(row => row.sourcePath)).size, sources.length, 'Duplicate content input')
  assert.equal(new Set(reference.map(row => row.sourcePath)).size, reference.length, 'Duplicate reference input')
  const read = (family: string) => {
    const row = sources.find(row => row.sourcePath === `packages/data/games/genshin/raw-${family}.json`)
    assert(row, `Missing ${family} source`)
    return JSON.parse(row.text)
  }
  const before = auditMaterialReleaseDependencies('genshin', sources)
  const materials: Identity[] = read('materials'), characters: Identity[] = read('characters')
  const original = sources.find(row => row.sourcePath === relationPath)!
  const relations = JSON.parse(original.text)
  const pairs = new Map<string, Partial<Record<'English' | 'ChineseSimplified', Reference>>>()
  for (const row of reference) {
    const match = row.sourcePath.match(/^src\/data\/(English|ChineseSimplified)\/(materials|characters)\/([a-z0-9]+)\.json$/)
    assert(match, 'Unexpected identity reference path')
    const key = `${match[2]}/${match[3]}`
    const pair = pairs.get(key) ?? {}
    pair[match[1] as 'English' | 'ChineseSimplified'] = row
    pairs.set(key, pair)
  }
  const evidence = { materials: [] as Evidence[], characters: [] as Evidence[] }
  for (const [key, pair] of pairs) {
    if (!pair.English || !pair.ChineseSimplified) continue
    const en = JSON.parse(pair.English.text), zh = JSON.parse(pair.ChineseSimplified.text)
    assert(Number.isSafeInteger(en.id) && en.id > 0 && en.id === zh.id, 'Reference locale identity mismatch')
    assert(typeof en.name === 'string' && en.name.length && typeof zh.name === 'string' && zh.name.length, 'Missing reference name')
    const family = key.startsWith('materials/') ? 'materials' : 'characters'
    assert(!evidence[family].some(row => row.numericId === en.id), 'Ambiguous reference numeric identity')
    evidence[family].push({ numericId: en.id, name: zh.name, nameEn: en.name,
      sources: [pair.English, pair.ChineseSimplified].map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })) })
  }
  const decisions = (['material', 'character'] as const).flatMap(kind => {
    const ids = kind === 'material' ? before.missingMaterialIds : before.missingCharacterIds
    const targets = kind === 'material' ? materials : characters
    const refs = kind === 'material' ? evidence.materials : evidence.characters
    return ids.map(sourceId => {
      const matches = refs.flatMap(ref => targets.flatMap(target => {
        // The material reference spelling must also match the reference name.
        // Short character names need an explicit qualified existing identity.
        const spelling = kind === 'material' ? normalized(sourceId) === normalized(ref.nameEn)
          : target.id.endsWith('-' + sourceId) && normalized(target.id) === normalized(ref.nameEn)
        return spelling && target.name === ref.name && target.nameEn === ref.nameEn
          ? [{ targetId: target.id, evidence: ref }] : []
      }))
      const approved = matches.length === 1 ? matches[0] : null
      return { kind, sourceId, status: approved ? 'identity-reviewed' : 'held', approved,
        // Identity approval does not attest that a character uses this material.
        recipeReviewed: false, quantityReviewed: false }
    })
  })
  const patches: { pointer: string; before: string; after: string; numericId: number }[] = []
  for (const decision of decisions) {
    if (!decision.approved) continue
    const occurrences: string[] = decision.kind === 'material'
      ? before.edges.filter(edge => edge.materialId === decision.sourceId).map(edge => `${edge.sourcePointer}/id`)
      : relations.flatMap((row: { characterId: string }, i: number) => row.characterId === decision.sourceId ? [`/${i}/characterId`] : [])
    for (const pointer of occurrences) {
      const parts = pointer.slice(1).split('/'), field = parts.pop()!
      const row = parts.reduce((value: any, key) => value[key], relations)
      assert.equal(row[field], decision.sourceId, 'Identity pointer drift')
      row[field] = decision.approved.targetId
      patches.push({ pointer, before: decision.sourceId, after: decision.approved.targetId, numericId: decision.approved.evidence.numericId })
    }
  }
  const text = JSON.stringify(relations, null, 2) + '\n'
  const candidate = { sourcePath: relationPath, text, sha256: digest(text) }
  const after = auditMaterialReleaseDependencies('genshin', sources.map(row => row.sourcePath === relationPath ? candidate : row))
  const counts = (audit: typeof before) => ({ missingMaterialIds: audit.missingMaterialIds.length,
    missingMaterialReferences: audit.issues.filter(row => row.code === 'missing-material-definition').length,
    missingCharacterIds: audit.missingCharacterIds.length, materialReferences: audit.materialReferences })
  const data = { version: 'genshin-material-identity-review-v1', source: { sourcePath: relationPath, sha256: original.sha256 },
    inputSources: before.sources, decisions, patches, before: counts(before), after: counts(after), candidate,
    hold: true, publishable: false, recipeReviewed: false, quantityReviewed: false }
  return { ...data, reviewKey: digest(canonical(data)) }
}

export function verifyGenshinMaterialIdentityReview(plan: ReturnType<typeof reviewGenshinMaterialIdentities>, sources: SourceBytes[], reference: Reference[]) {
  const rebuilt = reviewGenshinMaterialIdentities(sources, reference)
  assert.equal(canonical(plan), canonical(rebuilt), 'Stale or altered material identity review')
  return rebuilt
}
