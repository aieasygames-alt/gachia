import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'
import { completeGenshinCandidates, verifyGenshinCandidateCompletion, type CompletionEvidence } from '../../services/content-cms/src/genshin-candidate-completion.ts'
const report = import.meta.dirname, repo = path.resolve(report, '../..')
const output = process.argv[2] ? path.resolve(process.argv[2]) : report
if (process.argv[2]) mkdirSync(output)
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const checked = (proof: { path: string; pin: string }) => { assert.equal(sha(readFileSync(proof.path)), proof.pin, `Evidence drift: ${proof.path}`); return read(proof.path) }
const save = (name: string, value: unknown) => {
  const file = path.join(output, name), text = JSON.stringify(value, null, 2) + '\n'
  writeFileSync(file, text, { flag: 'wx' }); return { path: file, pin: sha(text) }
}
const parentDelivery = { path: path.join(repo, 'reports/genshin-recipe-candidates-2026-11-20-r136/delivery.json'), pin: '0ca512f50c3031697cd96096062554ad332d21eba9be7d79d616a0d194550c6a' }
const delivery = checked(parentDelivery)
const parent = checked(delivery.candidate).plan
assert.equal(parent.candidateKey, delivery.candidateKey)
const priorFixtureBytes = readFileSync(delivery.fixture.path); assert.equal(sha(priorFixtureBytes), delivery.fixture.pin)
const priorFixture = JSON.parse(gunzipSync(priorFixtureBytes).toString('utf8'))
const sourceIndex = delivery.sourceIndex; checked(sourceIndex)
const index = checked({ path: path.join(report, 'reference-index.json'), pin: '0a98a088838b514c3b6aad398bbdc1430cfd1f2cd7dac3ffa799d98e1e582ac9' })
const evidence: CompletionEvidence[] = []
const add = (sourcePath: string, file: string, url: string, expectedSHA256?: string, gitBlob?: string) => {
  const text = readFileSync(file, 'utf8'), sha256 = sha(text)
  if (expectedSHA256) assert.equal(sha256, expectedSHA256)
  evidence.push({ sourcePath, text, sha256, url, ...(gitBlob ? { gitBlob } : {}) })
}
for (const row of index.specialtyRanks) add(`api/materials/${row.numericId}.json`, path.join(report, row.path), row.url, row.sha256)
const gameText = gunzipSync(readFileSync(path.join(report, index.game.archive.path))).toString('utf8')
assert.equal(sha(gameText), index.game.sha256)
evidence.push({ sourcePath: index.game.sourcePath, text: gameText, sha256: index.game.sha256, url: index.game.url, gitBlob: index.game.gitBlob })
for (const row of index.characterFiles) add(row.sourcePath, path.join(report, row.path), row.url, row.sha256, row.gitBlob)
for (const key of ['mualani', 'ororon']) {
  for (const family of ['characters', 'talents']) {
    const sourcePath = `src/data/English/${family}/${key}.json`, row = priorFixture.references.find((row: any) => row.sourcePath === sourcePath)
    assert(row); evidence.push({ ...row, url: `https://raw.githubusercontent.com/theBowja/genshin-db/${index.databaseCommit}/${sourcePath}` })
  }
  const numericId = parent.decisions.characters.find((row: any) => row.localId === key).numericId
  add(`api/avatars/${key}.json`, path.join(report, `${key}-profile.json`), `https://gi.yatta.moe/api/v2/en/avatar/${numericId}`)
  const name = key === 'mualani' ? '玛拉妮' : '欧洛伦'
  const wikiURL = `https://wiki.biligame.com/ys/api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp%7Ccontent&rvslots=main&format=json&titles=${encodeURIComponent(name)}`
  add(`wiki/${key}.json`, path.join(report, `${key}-wiki.json`), wikiURL)
  const revision = Object.values(read(path.join(report, `${key}-wiki.json`)).query.pages)[0] as any
  add(`wiki/${key}-rendered.json`, path.join(report, `${key}-wiki-rendered.json`), `https://wiki.biligame.com/ys/api.php?action=parse&oldid=${revision.revisions[0].revid}&prop=text&format=json`)
}
const plan = completeGenshinCandidates(parent, delivery.candidateKey, priorFixture.sources, evidence)
verifyGenshinCandidateCompletion(plan, parent, delivery.candidateKey, priorFixture.sources, evidence)
const candidate = save('completed-candidate.json', { parentDelivery, sourceIndex, plan })
const ranks = save('specialty-rarity-review.json', { parentDelivery, sourceIndex, classification: plan.factClassification, reviews: plan.rankReviews })
const characters = save('character-definition-candidates.json', { parentDelivery, sourceIndex, reviews: plan.characterReviews })
const overlayPins = []
for (const row of plan.overlays) {
  const file = path.join(output, path.basename(row.sourcePath).replace('.json', '.candidate.json'))
  writeFileSync(file, row.text, { flag: 'wx' }); overlayPins.push({ path: file, pin: sha(row.text) })
}
const parentPreservation = checked(delivery.preservation)
const preservation = save('preservation.json', { sourceIndex,
  unchangedPublishedSources: parentPreservation.unchangedPublishedSources.filter((row: any) => row.sourcePath !== 'packages/data/games/genshin/raw-characters.json'),
  unchangedR136RecipeSHA256: parent.overlays[1].sha256,
  existingCharactersSHA256: priorFixture.sources.find((row: any) => row.sourcePath.endsWith('/raw-characters.json')).sha256,
  existingCharactersUnchanged: true, localRawWrites: false, cmsWrites: false, cloudControlPlaneCalls: false, sourceAdvanced: false })
const media = save('media-hold.json', { decision: 'held; character content is defined, new-entity media is not qualified',
  observations: ['mualani', 'ororon'].map(id => ({ method: 'HEAD', url: `https://img.gachia.com/images/genshin/characters/${id}.webp`, status: 404 })),
  candidateImageFields: 'empty; no URL or image bytes invented', mediaWrites: false, publishable: false })
const fixture = { kind: 'genshin-candidate-completion-fixture-r137', parentDelivery, sourceIndex, parent, parentKey: delivery.candidateKey,
  sources: priorFixture.sources, evidence, expectedCompletionKey: plan.completionKey, expectedOverlayPins: plan.overlays.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })) }
const bytes = gzipSync(Buffer.from(JSON.stringify(fixture) + '\n'), { level: 9 })
const fixturePath = path.join(repo, 'services/content-cms/reviews/2026-11-20-genshin-completion-r137.json.gz')
if (existsSync(fixturePath)) assert.equal(sha(readFileSync(fixturePath)), sha(bytes), 'Existing completion fixture differs')
else writeFileSync(fixturePath, bytes, { flag: 'wx' })
const summary = { kind: 'genshin-specialty-character-completion-delivery-v1', status: 'held-candidate-identity-closure-complete', parentDelivery,
  sourceIndex, candidate, specialtyRanks: ranks, characters, candidateOutputs: overlayPins, preservation, media,
  fixture: { path: fixturePath, pin: sha(bytes) }, counts: plan.counts, completionKey: plan.completionKey,
  recipeChangedThisBatch: false, existingCharactersChanged: false, dependencyClosureComplete: true,
  rarityMeaning: 'API display rank=1 for all 49 specialties; fixed game table omits rankLevel. Not official one-star certification.',
  unresolvedLegacyIdentitiesHeld: 14, guihuanAnonymousHeld: 108,
  externalSourceReads: true, localRawWrites: false, cmsWrites: false, cloudControlPlaneCalls: false, productionDeployments: 0,
  sourceAdvanced: false, hold: true, publishable: false, newEntityQualified: false }
save('summary.json', summary)
console.log(JSON.stringify({ counts: summary.counts, candidateKey: summary.completionKey, fixture: summary.fixture, dependencyClosureComplete: true, publishable: false }, null, 2))
