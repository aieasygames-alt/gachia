import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { parseMaterial } from './material-contract'
import { auditMaterialReleaseDependencies, assertMaterialCandidateDependencies } from './material-release-dependencies'
import type { SourceBytes } from './unified-export'
import type { prepareGenshinRecipeCandidates } from './genshin-recipe-candidates'
import type { GenshinCharacter, GenshinSkillBase } from '../../../packages/data/games/genshin/types'

export type CompletionEvidence = SourceBytes & { url: string; gitBlob?: string }
type Parent = ReturnType<typeof prepareGenshinRecipeCandidates>
type CompleteCharacter = Omit<GenshinCharacter, 'skills'> & {
  skills: GenshinCharacter['skills'] & { passive3: GenshinSkillBase; specialJump?: GenshinSkillBase };
}
const prefix = 'packages/data/games/genshin/raw-'
const materialPath = prefix + 'materials.json', characterPath = prefix + 'characters.json', relationPath = prefix + 'character-materials.json'
const ids = ['mualani', 'ororon'] as const
const nonempty = (value: any) => assert(typeof value === 'string' && value.trim().length > 0, 'Missing character evidence text')
const encode = (sourcePath: string, rows: any[]): SourceBytes => {
  const text = JSON.stringify(rows, null, 2) + '\n'; return { sourcePath, text, sha256: digest(text) }
}

// Completes only the R136 specialty/character gaps. Display rank from the API
// and an absent game rankLevel are distinct evidence, never an official star
// attestation. New-entity/media/editorial publication qualification stays held.
export function completeGenshinCandidates(parent: Parent, parentKey: string, sources: SourceBytes[], evidence: CompletionEvidence[]) {
  const { candidateKey, ...sealed } = parent
  assert.equal(candidateKey, parentKey, 'Unexpected parent candidate')
  assert.equal(digest(canonical(sealed)), candidateKey, 'Corrupt parent candidate')
  assert.equal(parent.kind, 'genshin-recipe-definition-candidates-v1')
  assert(parent.hold && !parent.publishable && !parent.draftIntakeEnabled, 'Parent is not a held candidate')
  assert.deepEqual(sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), parent.inputSources, 'Stale completion source set')
  const inputs = new Map<string, SourceBytes>(), refs = new Map<string, CompletionEvidence>()
  for (const row of sources) {
    assert.equal(digest(row.text), row.sha256, 'Corrupt completion source')
    assert(!inputs.has(row.sourcePath), 'Duplicate completion source'); inputs.set(row.sourcePath, row)
  }
  for (const row of evidence) {
    assert(/^(?:api\/(?:materials\/[0-9]+|avatars\/(?:mualani|ororon))|wiki\/(?:mualani|ororon)(?:-rendered)?|ExcelBinOutput\/MaterialExcelConfigData|src\/data\/(?:English|ChineseSimplified|Japanese)\/(?:characters|talents|constellations)\/(?:mualani|ororon))\.json$/.test(row.sourcePath), 'Unbounded completion evidence')
    assert.equal(digest(row.text), row.sha256, 'Corrupt completion evidence')
    if (row.sourcePath.startsWith('src/') || row.sourcePath.startsWith('ExcelBinOutput/')) {
      assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.text)}\0`).update(row.text).digest('hex'), row.gitBlob, 'Completion Git blob mismatch')
      const repository = row.sourcePath.startsWith('src/') ? 'theBowja/genshin-db/8e5badd60b5d894284ccc927a56c9683529d2592' : 'DimbreathBot/AnimeGameData/bd35e243fa436f141f015cf221a6e19d0c34b7ca'
      assert.equal(row.url, `https://raw.githubusercontent.com/${repository}/${row.sourcePath}`, 'Unpinned completion Git reference')
    }
    assert(!refs.has(row.sourcePath), 'Duplicate completion evidence'); refs.set(row.sourcePath, row)
  }
  const read = (sourcePath: string) => { const row = refs.get(sourcePath); assert(row, `Missing completion evidence: ${sourcePath}`); return JSON.parse(row.text) }
  const proof = (sourcePath: string) => { const row = refs.get(sourcePath)!; return { sourcePath, sha256: row.sha256, url: row.url, ...(row.gitBlob ? { gitBlob: row.gitBlob } : {}) } }
  assert.deepEqual(parent.overlays.map(row => row.sourcePath), [materialPath, relationPath])
  for (const row of parent.overlays) assert.equal(digest(row.text), row.sha256, 'Corrupt parent overlay')
  const materialRows: any[] = JSON.parse(parent.overlays[0].text)
  const materialIndex = new Map(materialRows.map(row => [row.id, row]))
  const targets = parent.proposals.filter(row => row.rarityEvidence === 'missing' || row.rarityEvidence === 'retained-local-unverified')
  assert.equal(targets.length, 49, 'Unexpected specialty completion scope')
  assert.equal(targets.filter(row => row.action === 'new-definition').length, 16)
  const gamePath = 'ExcelBinOutput/MaterialExcelConfigData.json', game: any[] = read(gamePath)
  assert(Array.isArray(game))
  const rankReviews = targets.map(target => {
    assert.equal(target.draft.type, 'local-specialty', 'Only local specialties may use the display-rank completion')
    assert(target.missingFields.every(field => field === 'rarity'), 'Unreviewed definition fields')
    const apiPath = `api/materials/${target.numericId}.json`, response = read(apiPath)
    assert.equal(refs.get(apiPath)!.url, `https://gi.yatta.moe/api/v2/en/material/${target.numericId}`, 'Wrong material evidence endpoint')
    assert.equal(response.response, 200)
    assert.equal(response.data.icon, `UI_ItemIcon_${target.numericId}`, 'Material API numeric identity mismatch')
    assert.equal(response.data.name, target.draft.nameEn, 'Material API name mismatch')
    assert.equal(response.data.rank, 1, 'Unexpected specialty API display rank')
    const matches = game.flatMap((row, i) => row.id === target.numericId ? [{ row, i }] : [])
    assert.equal(matches.length, 1, 'Ambiguous/missing game material identity')
    const { row, i } = matches[0]
    assert.equal(row.icon, response.data.icon, 'Game/API material identity mismatch')
    assert.equal(row.itemType, 'ITEM_MATERIAL'); assert.equal(row.materialType, 'MATERIAL_EXCHANGE')
    assert(!Object.hasOwn(row, 'rankLevel'), 'Game rarity evidence changed; review before applying API display convention')
    const previous = materialIndex.get(target.localId)
    const previousRarity = previous?.rarity ?? null
    assert.equal(Boolean(previous), target.action !== 'new-definition', 'Candidate material membership drift')
    if (previous) assert.equal(canonical(previous), canonical(target.draft), 'Stale existing specialty candidate')
    const draft = { ...target.draft, rarity: response.data.rank }
    parseMaterial(draft)
    if (previous) Object.assign(previous, draft)
    else { materialRows.push(draft); materialIndex.set(target.localId, draft) }
    return { numericId: target.numericId, localId: target.localId, previousRarity,
      action: previous ? 'existing-display-rank-verified' : 'new-definition-completed', displayRank: 1,
      evidenceMeaning: 'community API display rank; game rankLevel absent; not official one-star certification',
      gameSortRank: row.rank, gamePointer: `/${i}`, sources: [proof(apiPath), proof(gamePath)],
      officialRarityCertified: false, hold: true, publishable: false }
  })
  assert.equal(evidence.filter(row => row.sourcePath.startsWith('api/materials/')).length, targets.length, 'Extra material rank evidence')
  const originalCharacters: any[] = JSON.parse(inputs.get(characterPath)!.text)
  assert.deepEqual(parent.after.missingCharacterIds, [...ids], 'Unexpected missing character scope')
  const characterReviews = ids.map(localId => {
    assert(!originalCharacters.some(row => row.id === localId), 'Character candidate already exists')
    const decision = parent.decisions.characters.find(row => row.localId === localId)!
    assert(decision && decision.referenceKey === localId, 'Missing exact character identity decision')
    const paths = (locale: string, family: string) => `src/data/${locale}/${family}/${localId}.json`
    const en = read(paths('English', 'characters')), zh = read(paths('ChineseSimplified', 'characters')), ja = read(paths('Japanese', 'characters'))
    for (const row of [en, zh, ja]) assert.equal(row.id, decision.numericId, 'Character locale numeric identity mismatch')
    assert.equal(en.rarity, zh.rarity); assert.equal(en.rarity, ja.rarity); assert([4, 5].includes(en.rarity))
    assert.equal(en.elementType, zh.elementType); assert.equal(en.weaponType, zh.weaponType)
    const englishTalents = read(paths('English', 'talents')), chineseTalents = read(paths('ChineseSimplified', 'talents'))
    const enConstellations = read(paths('English', 'constellations')), zhConstellations = read(paths('ChineseSimplified', 'constellations'))
    for (const [row, expectedName] of [[englishTalents, en.name], [chineseTalents, zh.name], [enConstellations, en.name], [zhConstellations, zh.name]]) {
      assert.equal(row.id, decision.talentRecordId, 'Talent/constellation numeric identity mismatch'); assert.equal(row.name, expectedName, 'Character family name mismatch')
    }
    const wikiPath = `wiki/${localId}.json`, pages = read(wikiPath).query.pages
    const wikiPages: any[] = Object.values(pages); assert.equal(wikiPages.length, 1)
    const page = wikiPages[0]; assert.equal(page.title, zh.name); assert.equal(page.revisions.length, 1)
    const revision = page.revisions[0], wikiText = revision.slots.main['*']
    assert(Number.isSafeInteger(revision.revid) && revision.revid > 0)
    const field = (name: string) => {
      const matches = [...wikiText.matchAll(new RegExp(`^\\|${name}=([^\\n]+)`, 'gm'))]
      assert.equal(matches.length, 1, `Ambiguous/missing character wiki field: ${name}`); return matches[0][1].trim()
    }
    assert.equal(field('名称'), zh.name); assert.equal(field('英文名称'), en.name); assert.equal(field('稀有度'), `${en.rarity}星`)
    const version = field('实装版本'); assert(/^\d+\.\d+$/.test(version), 'Invalid evidenced release version')
    const date = field('实装日期'); assert(/^\d{4}年\d{2}月\d{2}日$/.test(date), 'Invalid evidenced release date')
    const renderedPath = `wiki/${localId}-rendered.json`, rendered = read(renderedPath).parse
    assert.equal(rendered.revid, revision.revid, 'Character wiki revision mismatch')
    assert.equal(rendered.title, zh.name)
    const plain = rendered.text['*'].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
    const acquisition = plain.match(/常驻\/限定\s+(限定UP|常驻)\s/)
    assert(acquisition, 'Missing evidenced character acquisition')
    assert.equal(field('限定'), acquisition[1] === '限定UP' ? '是' : '否', 'Character acquisition sources disagree')
    const profilePath = `api/avatars/${localId}.json`, profile = read(profilePath)
    assert.equal(refs.get(profilePath)!.url, `https://gi.yatta.moe/api/v2/en/avatar/${decision.numericId}`, 'Wrong character evidence endpoint')
    assert.equal(profile.response, 200); assert.equal(profile.data.id, decision.numericId); assert.equal(profile.data.name, en.name)
    assert.equal(profile.data.rank, en.rarity); assert.equal(profile.data.weaponType, en.weaponType)
    const skillMap: Record<string, string> = { combat1: 'normalAttack', combat2: 'elementalSkill', combat3: 'elementalBurst',
      combatju: 'specialJump', passive1: 'passive1', passive2: 'passive2', passive3: 'passive3', passive4: 'passive4' }
    assert(Object.keys(englishTalents).every(key => ['id', 'name', 'costs', ...Object.keys(skillMap)].includes(key)), 'Unclassified character talent')
    assert.deepEqual(Object.keys(englishTalents).sort(), Object.keys(chineseTalents).sort(), 'Talent locale fields differ')
    const skills: Record<string, { name: string; nameEn: string; description: string; descriptionEn: string }> = {}
    for (const [key, output] of Object.entries(skillMap)) {
      if (!Object.hasOwn(englishTalents, key)) continue
      const e = englishTalents[key], z = chineseTalents[key]
      for (const value of [e.name, e.description, z.name, z.description]) nonempty(value)
      skills[output] = { name: z.name, nameEn: e.name, description: z.description, descriptionEn: e.description }
    }
    for (const key of ['normalAttack', 'elementalSkill', 'elementalBurst', 'passive1', 'passive2', 'passive3', 'passive4']) assert(skills[key], 'Incomplete character skill set')
    assert.deepEqual(Object.keys(enConstellations).sort(), ['id', 'name', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'].sort(), 'Incomplete constellation set')
    assert.deepEqual(Object.keys(enConstellations).sort(), Object.keys(zhConstellations).sort(), 'Constellation locale fields differ')
    const constellations = Array.from({ length: 6 }, (_, i) => {
      const e = enConstellations[`c${i + 1}`], z = zhConstellations[`c${i + 1}`]
      for (const value of [e.name, e.description, z.name, z.description]) nonempty(value)
      return { level: i + 1, name: z.name, nameEn: e.name, description: z.description, descriptionEn: e.description }
    })
    const element = ({ ELEMENT_HYDRO: 'hydro', ELEMENT_ELECTRO: 'electro' } as Record<string, string>)[en.elementType]
    const weaponType = ({ WEAPON_CATALYST: 'Catalyst', WEAPON_BOW: 'Bow' } as Record<string, string>)[en.weaponType]
    assert(element && weaponType && en.region === 'Natlan')
    for (const value of [en.name, zh.name, ja.name, en.description, zh.description, en.cv.chinese, en.cv.japanese, en.cv.english]) nonempty(value)
    const completeSkills = { normalAttack: skills.normalAttack, elementalSkill: skills.elementalSkill, elementalBurst: skills.elementalBurst,
      ...(skills.specialJump ? { specialJump: skills.specialJump } : {}),
      passive1: skills.passive1, passive2: skills.passive2, passive3: skills.passive3, passive4: skills.passive4 }
    const record: CompleteCharacter = { id: localId, name: zh.name, nameEn: en.name, nameJa: ja.name, element, weaponType, rarity: en.rarity,
      region: en.region, description: zh.description, descriptionEn: en.description, releaseVersion: version, status: 'released',
      acquisitionMethod: acquisition[1] === '限定UP' ? 'limited-banner' : 'standard', image: '', skills: completeSkills, constellations,
      recommendedBuild: { bestWeapon: '', bestWeaponEn: '', alternativeWeapons: [], bestArtifactSet: '', bestArtifactSetEn: '', mainStats: {}, mainStatsEn: {}, subStatPriority: [], subStatPriorityEn: [] },
      teamComps: [], faq: [], relatedCharacters: [], tierRank: '', tierReason: '', tierReasonZh: '', cvZh: en.cv.chinese, cvJp: en.cv.japanese, cvEn: en.cv.english }
    originalCharacters.push(record)
    return { localId, numericId: decision.numericId, record, skillSourceMapping: Object.fromEntries(Object.entries(skillMap).filter(([key]) => englishTalents[key])),
      wikiRevision: { pageId: page.pageid, revisionId: revision.revid, timestamp: revision.timestamp, releaseDate: date },
      sources: [...refs.keys()].filter(path => path.endsWith(`/${localId}.json`) || path === wikiPath || path === renderedPath || path === profilePath).map(proof),
      unreviewedFields: ['image', 'recommendedBuild', 'teamComps', 'faq', 'relatedCharacters', 'tierRank', 'tierReason', 'tierReasonZh'],
      mediaQualified: false, editorialRecommendationsInvented: false, hold: true, publishable: false }
  })
  const overlays = [encode(materialPath, materialRows), parent.overlays[1], encode(characterPath, originalCharacters)]
  const completed = sources.map(row => overlays.find(overlay => overlay.sourcePath === row.sourcePath) ?? row)
  const audit = auditMaterialReleaseDependencies('genshin', completed)
  assert.equal(audit.issues.length, 0, 'Completed candidate still has identity gaps')
  const dependencyGate = assertMaterialCandidateDependencies(sources, overlays)
  const data = { kind: 'genshin-candidate-completion-v1', parentCandidateKey: candidateKey,
    inputSources: sources.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })), evidence: evidence.map(({ sourcePath, sha256, url, gitBlob }) => ({ sourcePath, sha256, url, ...(gitBlob ? { gitBlob } : {}) })),
    rankReviews, characterReviews, overlays,
    counts: { materialDefinitions: audit.materialDefinitions, materialReferences: audit.materialReferences, characters: originalCharacters.length,
      missingMaterialIds: audit.missingMaterialIds.length, missingMaterialReferences: 0, missingCharacterIds: audit.missingCharacterIds.length,
      specialtyRanksReviewed: rankReviews.length, newDefinitionsCompleted: rankReviews.filter(row => row.action === 'new-definition-completed').length,
      existingSpecialtiesVerified: rankReviews.filter(row => row.action === 'existing-display-rank-verified').length, characterDefinitionsAdded: characterReviews.length },
    dependencyAuditKey: audit.auditKey, dependencyClosureComplete: true, dependencyGate,
    factClassification: 'community corroboration; API display rank is not official rarity certification',
    hold: true as const, publishable: false as const, draftIntakeEnabled: false as const, newEntityQualified: false as const }
  return { ...data, completionKey: digest(canonical(data)) }
}

export function verifyGenshinCandidateCompletion(plan: ReturnType<typeof completeGenshinCandidates>, parent: Parent, parentKey: string, sources: SourceBytes[], evidence: CompletionEvidence[]) {
  const rebuilt = completeGenshinCandidates(parent, parentKey, sources, evidence)
  assert.equal(canonical(plan), canonical(rebuilt), 'Stale or altered completion candidate')
  return rebuilt
}
