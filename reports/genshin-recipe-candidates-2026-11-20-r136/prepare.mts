import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { prepareGenshinRecipeCandidates, verifyGenshinRecipeCandidates } from '../../services/content-cms/src/genshin-recipe-candidates.ts'

const directory = process.argv[2] ? path.resolve(process.argv[2]) : import.meta.dirname
const repo = path.resolve(import.meta.dirname, '../..')
if (process.argv[2]) mkdirSync(directory)
const previous = path.join(repo, 'reports/material-source-review-2026-11-20-r135')
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const checked = (proof: { path: string; pin: string }) => {
  assert.equal(sha(readFileSync(proof.path)), proof.pin, `Evidence drift: ${proof.path}`); return json(proof.path)
}
const save = (name: string, value: unknown) => {
  const file = path.join(directory, name), bytes = JSON.stringify(value, null, 2) + '\n'
  writeFileSync(file, bytes, { flag: 'wx' }); return { path: file, pin: sha(bytes) }
}
// Reuse the already verified source capture; no history read, network or CMS call.
const prior = checked({ path: path.join(previous, 'delivery.json'), pin: '43b63e74f0a7574ec16faa8168d5f41e115bc9503a3caa9dc0be5293c53f1897' })
for (const key of ['summary', 'identityReview', 'reviewRecord', 'recipeReview', 'remainingQueue', 'guihuanHeld', 'preservation', 'referenceIndex']) checked(prior[key])
const historical = checked(prior.reviewRecord)
const snapshot = checked(historical.sourceSnapshot)
assert.equal(snapshot.sourceReader, 'readNteSourceIndex')
assert.deepEqual(snapshot.sourceIndex, prior.sourceIndex)
checked(snapshot.sourceIndex)
// The bounded review capture contains 35 material-related sources. The pinned
// preservation receipt retains hashes for the complete 115-source publication.
const publishedHashes = checked(checked(prior.preservation).verifiedPublishedSourceHashes)
assert.equal(publishedHashes.length, 115)
assert.equal(snapshot.sources.length, 35)
for (const row of snapshot.sources) {
  assert.equal(sha(row.text), row.sha256)
  assert.equal(publishedHashes.find((entry: any) => entry.sourcePath === row.sourcePath)?.sha256, row.sha256)
}
const index = checked(prior.referenceIndex)
assert.equal(index.commit, '8e5badd60b5d894284ccc927a56c9683529d2592')
const all = index.files.map((entry: any) => {
  assert(entry.sourcePath === 'LICENSE' || /^src\/data\/(English|ChineseSimplified)\/(characters|talents|materials)\/[a-z0-9]+\.json$/.test(entry.sourcePath))
  const text = readFileSync(path.join(previous, 'reference', entry.sourcePath), 'utf8')
  assert.equal(sha(text), entry.sha256)
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex'), entry.gitBlob)
  return { sourcePath: entry.sourcePath, sha256: entry.sha256, gitBlob: entry.gitBlob, text }
})
const identityPlan = checked(prior.identityReview).plan
const sources = snapshot.sources.filter((row: any) => /^packages\/data\/games\/genshin\/raw-(characters|materials|character-materials)\.json$/.test(row.sourcePath))
assert.equal(sources.length, 3)
const relation = sources.find((row: any) => row.sourcePath === historical.sourcePath)
assert.equal(relation.sha256, historical.sourceSHA256)
Object.assign(relation, identityPlan.candidate)
assert.equal(relation.sha256, historical.candidateSHA256)
for (const row of sources.filter((row: any) => !row.sourcePath.endsWith('/raw-characters.json'))) {
  assert.equal(sha(readFileSync(path.join(repo, row.sourcePath))), row.sha256, 'Local input drift')
  assert.equal(sha(readFileSync(path.join(repo, row.sourcePath.replace('packages/data/games/', 'apps/web/public/data/')))), row.sha256, 'Local mirror drift')
}
const decisionsPath = path.join(repo, 'services/content-cms/reviews/2026-11-20-genshin-recipe-decisions.json')
const decisions = json(decisionsPath), references = all.filter((row: any) => row.sourcePath !== 'LICENSE')
const plan = prepareGenshinRecipeCandidates(sources, references, decisions)
verifyGenshinRecipeCandidates(plan, sources, references, decisions)
const candidateProof = save('candidates.json', { sourceIndex: prior.sourceIndex, sourceCapture: historical.sourceSnapshot,
  parentDelivery: { path: path.join(previous, 'delivery.json'), pin: sha(readFileSync(path.join(previous, 'delivery.json'))) },
  referenceCommit: index.commit, decisions: { path: decisionsPath, pin: sha(readFileSync(decisionsPath)) }, plan })
const proposalProof = save('definition-candidates.json', { candidateKey: plan.candidateKey, proposals: plan.proposals })
for (const overlay of plan.overlays) save(path.basename(overlay.sourcePath).replace('.json', '.candidate.json'), JSON.parse(overlay.text))
const oldQueue = checked(prior.remainingQueue)
const unresolved = oldQueue.materials.filter((row: any) => row.status === 'reference-identity-unresolved')
const conflictResolutions = oldQueue.materials.filter((row: any) => row.status === 'existing-definition-name-conflict').map((row: any) => ({
  original: row, resolution: plan.proposals.find(proposal => proposal.numericId === row.referenceMatches[0].numericId),
}))
assert.equal(unresolved.length, 14); assert.equal(conflictResolutions.length, 6)
const heldProof = save('held-and-resolutions.json', { candidateKey: plan.candidateKey, conflictResolutions,
  unresolvedLegacyIdentities: unresolved, legacyDecision: 'Held original identities and occurrences; no alias or deletion applied to live data. Candidate costs are replaced only from each pinned character/talent stage.',
  missingDefinitionFields: plan.proposals.filter(row => row.missingFields.length),
  missingCharacters: plan.after.missingCharacterIds, guihuanHeld: prior.guihuanHeld, hold: true, publishable: false })
const preserved = publishedHashes.filter((row: any) => !plan.overlays.some(overlay => overlay.sourcePath === row.sourcePath))
assert.equal(preserved.length, 113)
const preservationProof = save('preservation.json', { sourceIndex: prior.sourceIndex, unchangedPublishedSources: preserved,
  nteUnchangedSources: preserved.filter((row: any) => row.sourcePath.includes('/nte/')),
  guihuanUnchangedSources: preserved.filter((row: any) => row.sourcePath.includes('/guihuan/')),
  localRawWrites: false, cmsWrites: false, cloudCalls: false, sourceAdvanced: false })
// A compact, self-contained regression fixture survives report-cache cleanup.
const fixture = { kind: 'genshin-recipe-candidate-fixture-r136', sourceIndex: prior.sourceIndex, referenceRepository: index.repository,
  referenceCommit: index.commit, referenceClassification: index.classification, license: all.find((row: any) => row.sourcePath === 'LICENSE'),
  sources, references, decisions, expectedCandidateKey: plan.candidateKey,
  expectedOverlayPins: plan.overlays.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })) }
const fixtureBytes = gzipSync(Buffer.from(JSON.stringify(fixture) + '\n'), { level: 9 })
const fixturePath = path.join(repo, 'services/content-cms/reviews/2026-11-20-genshin-recipes-r136.json.gz')
if (existsSync(fixturePath)) assert.equal(sha(readFileSync(fixturePath)), sha(fixtureBytes), 'Existing regression fixture differs')
else writeFileSync(fixturePath, fixtureBytes, { flag: 'wx' })
const summary = { kind: 'genshin-recipe-definition-candidate-delivery-v1', sourceIndex: prior.sourceIndex,
  candidate: candidateProof, definitions: proposalProof, held: heldProof, preservation: preservationProof,
  fixture: { path: fixturePath, pin: sha(fixtureBytes) }, decisions: { path: decisionsPath, pin: sha(readFileSync(decisionsPath)) },
  candidateKey: plan.candidateKey, before: plan.before, after: plan.after, comparedCharacters: decisions.characters.length,
  stages: plan.stages.length, changedStages: plan.patches.length,
  newDefinitionCandidates: plan.proposals.filter(row => row.action === 'new-definition').length,
  completeNewDefinitions: plan.proposals.filter(row => row.action === 'new-definition' && !row.missingFields.length).length,
  incompleteNewDefinitions: plan.proposals.filter(row => row.action === 'new-definition' && row.missingFields.length).length,
  existingDefinitionCorrections: plan.proposals.filter(row => row.action === 'correct-existing').length,
  missingRarityIds: plan.proposals.filter(row => row.missingFields.includes('rarity')).map(row => row.localId),
  retainedLocalUnverifiedRarity: plan.proposals.filter(row => row.rarityEvidence === 'retained-local-unverified').length,
  unresolvedLegacyIdentities: unresolved.length, conflictResolutions: conflictResolutions.length,
  guihuanAnonymousHeld: prior.guihuanAnonymousHeld, unchangedPublishedSources: preserved.length,
  referenceClassification: plan.referenceClassification, localRawWrites: false, cmsWrites: false, cloudCalls: false,
  sourceAdvanced: false, productionDeployments: 0, hold: true, publishable: false }
save('summary.json', summary)
console.log(JSON.stringify({ ...summary, candidate: candidateProof.path, definitions: proposalProof.path, held: heldProof.path, preservation: preservationProof.path }, null, 2))
