import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { completeGenshinCandidates } from '../../services/content-cms/src/genshin-candidate-completion.ts'
import { canonical } from '../../services/content-cms/src/record-mapping.ts'

const report = import.meta.dirname, repo = path.resolve(report, '../..')
const output = process.argv[2] ? path.resolve(process.argv[2]) : report
if (process.argv[2]) mkdirSync(output)
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const proof = (file: string) => ({ path: file, pin: sha(readFileSync(file)) })
const parentFile = path.join(repo, 'reports/genshin-specialty-characters-2026-11-20-r137/delivery.json')
assert.equal(proof(parentFile).pin, '8cedaab55d01e33d74b75a942ec5de7f637956bfb53e926d190400a9e078a5b0')
const parent = read(parentFile)
const fixtureBytes = readFileSync(parent.fixture.path)
assert.equal(sha(fixtureBytes), parent.fixture.pin)
const fixture = JSON.parse(gunzipSync(fixtureBytes).toString('utf8'))
const plan = completeGenshinCandidates(fixture.parent, fixture.parentKey, fixture.sources, fixture.evidence)
assert.equal(plan.completionKey, parent.completionKey)
const mediaFile = path.join(report, 'media-manifest.json'), publicFile = path.join(report, 'public-acceptance.json')
const media = read(mediaFile), acceptance = read(publicFile)
assert.deepEqual(media.entries.map((row: any) => row.localId), ['mualani', 'ororon'])
assert(acceptance.image404Resolved && acceptance.allPublicBytesMatchOwnerAssets)
const previous = plan.overlays.find(row => row.sourcePath.endsWith('/raw-characters.json'))!
const characters = JSON.parse(previous.text)
const changes = media.entries.map((entry: any) => {
  const index = characters.findIndex((row: any) => row.id === entry.localId)
  assert(index >= 115)
  assert.equal(characters[index].image, '')
  assert.equal(entry.pathname, `/images/genshin/characters/${entry.localId}.webp`)
  assert.equal(entry.url, `https://img.gachia.com${entry.pathname}`)
  const bytes = readFileSync(path.join(repo, entry.ownerPath))
  assert.equal(sha(bytes), entry.sha256)
  const observed = acceptance.entries.find((row: any) => row.localId === entry.localId)
  assert.equal(observed.url, entry.url)
  for (const method of ['GET', 'HEAD']) {
    const result = observed.observations.find((row: any) => row.method === method)
    assert.equal(result.status, 200); assert.equal(result.mime, 'image/webp'); assert.equal(result.contentLength, bytes.length)
    if (method === 'GET') assert.equal(result.sha256, entry.sha256)
  }
  characters[index].image = entry.pathname
  return { localId: entry.localId, pointer: `/${index}/image`, previous: '', value: entry.pathname }
})
const text = JSON.stringify(characters, null, 2) + '\n'
const candidateFile = path.join(output, 'raw-characters.media.candidate.json')
writeFileSync(candidateFile, text, { flag: 'wx' })
const data = { kind: 'genshin-candidate-media-patch-r138', parentDelivery: proof(parentFile),
  parentCompletionKey: parent.completionKey, sourceIndex: parent.sourceIndex,
  mediaManifest: proof(mediaFile), publicAcceptance: proof(publicFile),
  sourcePath: previous.sourcePath, previousSHA256: previous.sha256,
  candidate: proof(candidateFile), changes,
  unchangedR137Overlays: plan.overlays.filter(row => row !== previous).map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })),
  existingCharacterRecordsUnchanged: 115, technicalMediaAvailabilityComplete: true,
  genericSkillsSupported: true, mediaRightsAuthenticated: false,
  localRawWrites: false, cmsWrites: false, sourceAdvanced: false,
  newEntityQualified: false, hold: true, publishable: false }
const patch = { ...data, patchKey: sha(canonical(data)) }
writeFileSync(path.join(output, 'candidate-media-patch.json'), JSON.stringify(patch, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ patchKey: patch.patchKey, changes, candidate: patch.candidate, publishable: false }, null, 2))
