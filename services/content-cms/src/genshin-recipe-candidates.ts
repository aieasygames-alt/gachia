import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { digest } from './legacy-intake'
import { parseMaterial } from './material-contract'
import { auditMaterialReleaseDependencies } from './material-release-dependencies'
import { canonical } from './record-mapping'
import type { SourceBytes } from './unified-export'

export type RecipeReference = SourceBytes & { gitBlob: string }
export type RecipeDecisions = {
  materials: { numericId: number; referenceKey: string; localId: string; localRecordSHA256: string | null; reason: string }[];
  characters: { localId: string; referenceKey: string; numericId: number; talentRecordId: number }[];
}
type Ingredient = { id: string; quantity: number }
const prefix = 'packages/data/games/genshin/raw-'
const paths = { materials: prefix + 'materials.json', characters: prefix + 'characters.json', relations: prefix + 'character-materials.json' }
const groups = [
  { group: 'ascensionMaterials', family: 'characters', label: 'levelRange', labels: ['20-40', '40-50', '50-60', '60-70', '70-80', '80-90'], first: 1, cost: 'ascend' },
  { group: 'talentMaterials', family: 'talents', label: 'talentLevel', labels: ['1→2', '2→3', '3→4', '4→5', '5→6', '6→7', '7→8', '8→9', '9→10'], first: 2, cost: 'lvl' },
] as const
const id = (value: string) => assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Unsafe candidate ID')
const object = (value: any) => assert(value && typeof value === 'object' && !Array.isArray(value), 'Expected reference object')
const text = (value: any) => assert(typeof value === 'string' && value.trim().length > 0, 'Missing reference text')
const positive = (value: any) => assert(Number.isSafeInteger(value) && value > 0, 'Expected positive safe integer')
const encoded = (sourcePath: string, value: unknown): SourceBytes => {
  const text = JSON.stringify(value, null, 2) + '\n'
  return { sourcePath, text, sha256: digest(text) }
}
const ingredientKey = (rows: Ingredient[]) => canonical([...rows].sort((a, b) => a.id.localeCompare(b.id)))

// Offline, source-bound proposals only. Missing fields stay missing; neither a
// well-formed recipe nor a community reference grants CMS/publication approval.
export function prepareGenshinRecipeCandidates(sources: SourceBytes[], references: RecipeReference[], decisions: RecipeDecisions) {
  const input = new Map<string, SourceBytes>(), refs = new Map<string, RecipeReference>()
  for (const row of sources) {
    assert.equal(digest(row.text), row.sha256, 'Corrupt candidate input')
    assert(!input.has(row.sourcePath), 'Duplicate candidate input'); input.set(row.sourcePath, row)
  }
  for (const row of references) {
    assert(/^src\/data\/(English|ChineseSimplified)\/(materials|characters|talents)\/[a-z0-9]+\.json$/.test(row.sourcePath), 'Unexpected recipe reference path')
    assert.equal(digest(row.text), row.sha256, 'Corrupt recipe reference')
    assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.text)}\0`).update(row.text).digest('hex'), row.gitBlob, 'Reference Git blob mismatch')
    assert(!refs.has(row.sourcePath), 'Duplicate recipe reference'); refs.set(row.sourcePath, row)
  }
  const read = (sourcePath: string) => { const row = input.get(sourcePath); assert(row, `Missing candidate input: ${sourcePath}`); return JSON.parse(row.text) }
  const reference = (locale: string, family: string, key: string) => {
    assert(/^[a-z0-9]+$/.test(key), 'Unsafe reference key')
    const sourcePath = `src/data/${locale}/${family}/${key}.json`, row = refs.get(sourcePath)
    assert(row, `Missing recipe reference: ${sourcePath}`)
    const value = JSON.parse(row.text); object(value); positive(value.id); text(value.name)
    return { row, value }
  }
  const beforeAudit = auditMaterialReleaseDependencies('genshin', sources)
  const localMaterials: any[] = read(paths.materials), localCharacters: any[] = read(paths.characters), relations: any[] = read(paths.relations)
  const materialById = new Map(localMaterials.map(row => [row.id, row]))
  const characterById = new Map(localCharacters.map(row => [row.id, row]))
  const materialDecisions = new Map<number, RecipeDecisions['materials'][number]>()
  const targets = new Set<string>()
  for (const decision of decisions.materials) {
    positive(decision.numericId); id(decision.localId); text(decision.reason)
    assert(!materialDecisions.has(decision.numericId) && !targets.has(decision.localId), 'Ambiguous numeric/local material mapping')
    const local = materialById.get(decision.localId)
    assert.equal(local ? digest(canonical(local)) : null, decision.localRecordSHA256, 'Stale local material decision')
    materialDecisions.set(decision.numericId, decision); targets.add(decision.localId)
  }
  const characterDecisions = new Map<string, RecipeDecisions['characters'][number]>()
  const characterKeys = new Set<string>(), characterIds = new Set<number>(), talentIds = new Set<number>()
  for (const decision of decisions.characters) {
    id(decision.localId); positive(decision.numericId); positive(decision.talentRecordId)
    assert(!characterDecisions.has(decision.localId) && !characterKeys.has(decision.referenceKey)
      && !characterIds.has(decision.numericId) && !talentIds.has(decision.talentRecordId), 'Ambiguous character mapping')
    characterDecisions.set(decision.localId, decision); characterKeys.add(decision.referenceKey)
    characterIds.add(decision.numericId); talentIds.add(decision.talentRecordId)
  }
  assert.equal(characterDecisions.size, relations.length, 'Unbounded character decisions')
  const usage = new Map<number, Set<string>>()
  const materialEvidence = new Map<number, { en: any; zh: any; sources: { sourcePath: string; sha256: string }[] }>()
  const referenceEnglishIds = new Map<string, number>()
  for (const row of references.filter(row => /^src\/data\/English\/materials\//.test(row.sourcePath))) {
    const value = JSON.parse(row.text)
    assert(!referenceEnglishIds.has(value.name), 'Ambiguous English material reference')
    referenceEnglishIds.set(value.name, value.id)
  }
  const materialRef = (numericId: number) => {
    const cached = materialEvidence.get(numericId); if (cached) return cached
    const decision = materialDecisions.get(numericId); assert(decision, `Missing numeric material mapping: ${numericId}`)
    const en = reference('English', 'materials', decision.referenceKey), zh = reference('ChineseSimplified', 'materials', decision.referenceKey)
    assert.equal(en.value.id, numericId, 'Material numeric identity mismatch')
    assert.equal(zh.value.id, numericId, 'Material locale identity mismatch')
    const local = materialById.get(decision.localId)
    if (local) {
      assert(local.nameEn === en.value.name || local.name === zh.value.name, 'Unanchored local material mapping')
      const existingEnglishIdentity = referenceEnglishIds.get(local.nameEn)
      assert(existingEnglishIdentity === undefined || existingEnglishIdentity === numericId, 'Conflicting English numeric material identity')
    }
    assert.equal(en.value.rarity, zh.value.rarity, 'Material locale rarity mismatch')
    if (en.value.rarity !== undefined) assert(Number.isInteger(en.value.rarity) && en.value.rarity >= 1 && en.value.rarity <= 5, 'Invalid reference rarity')
    const value = { en: en.value, zh: zh.value, sources: [en.row, zh.row].map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })) }
    materialEvidence.set(numericId, value); return value
  }
  const patches: { pointer: string; before: Ingredient[]; after: Ingredient[]; referencePath: string; referenceSHA256: string; costKey: string }[] = []
  const stageEvidence: { pointer: string; characterId: string; referencePath: string; referenceSHA256: string; referenceRecordId: number; costKey: string; expected: { numericId: number; localId: string; quantity: number }[] }[] = []
  const candidateRelations = structuredClone(relations)
  for (const [i, relation] of candidateRelations.entries()) {
    const decision = characterDecisions.get(relation.characterId); assert(decision, 'Missing character decision')
    const character = reference('English', 'characters', decision.referenceKey), talent = reference('English', 'talents', decision.referenceKey)
    assert.equal(character.value.id, decision.numericId, 'Character numeric identity mismatch')
    // Talent records have their own ID namespace, not the avatar's numeric ID.
    assert.equal(talent.value.id, decision.talentRecordId, 'Talent numeric identity mismatch')
    assert.equal(talent.value.name, character.value.name, 'Character/talent name mismatch')
    const local = characterById.get(relation.characterId)
    if (local) assert.equal(local.nameEn, character.value.name, 'Local/reference character mismatch')
    for (const group of groups) {
      const ref = group.family === 'characters' ? character : talent
      object(ref.value.costs)
      assert.deepEqual(Object.keys(ref.value.costs).sort(), group.labels.map((_, j) => group.cost + (j + group.first)).sort(), 'Unknown/missing cost stages')
      assert.equal(relation[group.group].length, group.labels.length, 'Missing/extra local stages')
      for (const [j, stage] of relation[group.group].entries()) {
        assert.equal(stage[group.label], group.labels[j], 'Stage label/order mismatch')
        const costKey = group.cost + (j + group.first), costs = ref.value.costs[costKey]
        assert(Array.isArray(costs) && costs.length > 0, 'Missing stage costs')
        const seen = new Set<number>()
        const expected = costs.map((cost: any) => {
          object(cost); assert.deepEqual(Object.keys(cost).sort(), ['count', 'id', 'name'])
          positive(cost.id); positive(cost.count); assert(!seen.has(cost.id), 'Duplicate cost material'); seen.add(cost.id)
          const evidence = materialRef(cost.id)
          assert.equal(cost.name, evidence.en.name, 'Cost/material identity mismatch')
          if (!usage.has(cost.id)) usage.set(cost.id, new Set())
          usage.get(cost.id)!.add(group.group)
          return { numericId: cost.id as number, localId: materialDecisions.get(cost.id)!.localId, quantity: cost.count as number }
        })
        const pointer = `/${i}/${group.group}/${j}/materials`
        stageEvidence.push({ pointer, characterId: relation.characterId, referencePath: ref.row.sourcePath,
          referenceSHA256: ref.row.sha256, referenceRecordId: ref.value.id, costKey, expected })
        const after = expected.map((row: typeof expected[number]) => ({ id: row.localId, quantity: row.quantity }))
        // Keep display order for existing ingredients; append newly required ones.
        const order = stage.materials.map((row: Ingredient) => row.id)
        after.sort((a: Ingredient, b: Ingredient) => {
          const rank = (key: string) => order.includes(key) ? order.indexOf(key) : order.length + expected.findIndex((row: typeof expected[number]) => row.localId === key)
          return rank(a.id) - rank(b.id)
        })
        assert.equal(new Set(stage.materials.map((row: Ingredient) => row.id)).size, stage.materials.length, 'Duplicate local stage ingredient')
        if (ingredientKey(stage.materials) !== ingredientKey(after)) {
          patches.push({ pointer, before: stage.materials, after, referencePath: ref.row.sourcePath, referenceSHA256: ref.row.sha256, costKey })
          stage.materials = after
        }
      }
    }
  }
  assert.equal(usage.size, materialDecisions.size, 'Unused/unbounded material decisions')
  const proposals = [...materialDecisions.values()].sort((a, b) => a.numericId - b.numericId).map(decision => {
    const { en, zh, sources: evidence } = materialRef(decision.numericId), local = materialById.get(decision.localId)
    const draft: any = local ? structuredClone(local) : { id: decision.localId }
    draft.name = zh.name; draft.nameEn = en.name
    if (en.rarity !== undefined) draft.rarity = en.rarity
    const missingFields: string[] = []
    if (!local) {
      const used = usage.get(decision.numericId)!
      draft.type = en.typeText === 'Common Currency' ? 'currency'
        : /^Local Specialty \([A-Za-z]+\)$/.test(en.typeText) ? 'local-specialty'
        : en.typeText === 'Character Ascension Material' ? 'character-ascension'
        : en.typeText === 'Character and Weapon Enhancement Material' ? 'common-drop'
        : en.typeText === 'Character Talent Material' ? (en.dropDomainId ? 'talent-book' : 'talent-material')
        : en.typeText === 'Character Level-Up Material' && used.size === 1 ? (used.has('ascensionMaterials') ? 'boss-drop' : 'weekly-boss') : undefined
      if (!draft.type) { delete draft.type; missingFields.push('type') }
      text(zh.typeText); draft.typeZh = zh.typeText
      for (const [ref, suffix] of [[zh, ''], [en, 'En']] as const) {
        text(ref.description); assert(Array.isArray(ref.sources) && ref.sources.every((value: any) => typeof value === 'string'), 'Invalid acquisition sources')
        draft['description' + suffix] = ref.description
        draft['acquisition' + suffix] = [...ref.sources, ...(ref.dropDomainName ? [ref.dropDomainName] : [])]
        draft['source' + suffix] = draft['acquisition' + suffix].join('\n')
      }
      if (en.rarity === undefined) missingFields.push('rarity')
    }
    // Mixed treasure-hoarder/Fatui definitions need source text repaired too.
    if (local && [112032, 112033, 112034].includes(decision.numericId)) {
      draft.source = zh.sources.join('\n'); draft.sourceEn = en.sources.join('\n')
    }
    if (!missingFields.length) parseMaterial(draft)
    const changedFields = local ? Object.keys(draft).filter(key => canonical(draft[key]) !== canonical(local[key])) : Object.keys(draft)
    return { ...decision, action: local ? (changedFields.length ? 'correct-existing' : 'reuse-existing') : 'new-definition',
      evidence, changedFields, before: local ?? null, draft, missingFields,
      rarityEvidence: en.rarity === undefined ? (local ? 'retained-local-unverified' : 'missing') : 'bilingual-reference',
      hold: true as const, publishable: false as const }
  })
  const complete = new Map(proposals.filter(row => !row.missingFields.length).map(row => [row.localId, row.draft]))
  const candidateMaterials = localMaterials.map(row => complete.get(row.id) ?? row)
  candidateMaterials.push(...proposals.filter(row => row.action === 'new-definition' && !row.missingFields.length).map(row => row.draft))
  const overlays = [encoded(paths.materials, candidateMaterials), encoded(paths.relations, candidateRelations)]
  const afterAudit = auditMaterialReleaseDependencies('genshin', sources.map(row => overlays.find(overlay => overlay.sourcePath === row.sourcePath) ?? row))
  const counts = (audit: typeof beforeAudit) => ({ materialDefinitions: audit.materialDefinitions, materialReferences: audit.materialReferences,
    missingMaterialIds: audit.missingMaterialIds.length, missingMaterialReferences: audit.issues.filter(row => row.code === 'missing-material-definition').length,
    missingCharacterIds: audit.missingCharacterIds, dependencyClosureComplete: audit.dependencyClosureComplete })
  const data = { kind: 'genshin-recipe-definition-candidates-v1', inputSources: sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })),
    referenceSources: references.map(({ sourcePath, sha256, gitBlob }) => ({ sourcePath, sha256, gitBlob })), decisions,
    referenceClassification: 'community-maintained corroboration; not official approval',
    talentQuantityScope: 'one talent per level; not the sum of three talents',
    stages: stageEvidence, patches, proposals, overlays, before: counts(beforeAudit), after: counts(afterAudit),
    remainingMaterialIds: afterAudit.missingMaterialIds, beforeAuditKey: beforeAudit.auditKey, afterAuditKey: afterAudit.auditKey,
    hold: true as const, publishable: false as const, draftIntakeEnabled: false as const }
  return { ...data, candidateKey: digest(canonical(data)) }
}

export function verifyGenshinRecipeCandidates(plan: ReturnType<typeof prepareGenshinRecipeCandidates>, sources: SourceBytes[], references: RecipeReference[], decisions: RecipeDecisions) {
  const rebuilt = prepareGenshinRecipeCandidates(sources, references, decisions)
  assert.equal(canonical(plan), canonical(rebuilt), 'Stale or altered recipe candidates')
  return rebuilt
}
