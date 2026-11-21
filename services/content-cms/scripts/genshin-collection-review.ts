import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import { canonical } from '../src/record-mapping'
import { projectRoot } from '../src/local-environment'
import { assertUnifiedDesktopEnvironment, readPinnedUnifiedInput } from '../src/unified-desktop'
import { verifyUnifiedInstalledApplication } from '../src/unified-installed-application'
import { GENSHIN_INTAKE_PATHS, type GenshinIntakeInput } from '../src/genshin-bounded-intake'
import { assertGenshinReviewCMS, exportGenshinCollection, prepareGenshinCollectionReview, readGenshinCollectionReview, stageGenshinCollectionReview } from '../src/genshin-collection-review'

const [action, ...args] = process.argv.slice(2)
assert(['stage', 'decide', 'export', 'verify'].includes(action), 'Expected stage, decide, export or verify')
const common = ['--input', '--input-pin', '--application', '--application-pin', '--commit', '--repo', '--output']
const allowed = action === 'decide' ? [...common, '--decisions', '--decisions-pin', '--reviewer'] : common
const options = new Map<string, string>()
for (let index = 0; index < args.length; index += 2) {
  const key = args[index], value = args[index + 1]
  assert(allowed.includes(key) && !options.has(key) && value && !value.startsWith('--'), 'Invalid collection review arguments')
  options.set(key, value)
}
assert(allowed.every(key => options.has(key)), 'Explicit pinned arguments required')
const { root } = assertUnifiedDesktopEnvironment()
const application = { path: options.get('--application')!, pin: options.get('--application-pin')! }
verifyUnifiedInstalledApplication(root, options.get('--repo')!, options.get('--commit')!, application)
assert.equal(JSON.parse(readFileSync(path.join(root, 'settings.json'), 'utf8')).app, projectRoot)
const input = readPinnedUnifiedInput(options.get('--input')!, options.get('--input-pin')!) as GenshinIntakeInput
for (const proof of [input.sourceIndex, input.candidateProof, ...input.renames.map(row => row.evidence)]) readPinnedUnifiedInput(proof.path, proof.pin)
const snapshotBytes = readFileSync(input.cmsProof.path)
// Snapshot pins cover compressed bytes; never confuse them with JSON text pins.
const { createHash } = await import('node:crypto')
assert.equal(createHash('sha256').update(snapshotBytes).digest('hex'), input.cmsProof.pin)
const snapshot = JSON.parse(gunzipSync(snapshotBytes).toString('utf8'))
assert.equal(canonical(snapshot.draft.filter((row: { legacyPath: string }) => GENSHIN_INTAKE_PATHS.includes(row.legacyPath))), canonical(input.cms))
const review = prepareGenshinCollectionReview(input), output = options.get('--output')!
assert(path.isAbsolute(output), 'Absolute new receipt path required')
if (['stage', 'decide'].includes(action)) writeFileSync(output + '.intent.json', JSON.stringify({ action, application,
  input: { path: options.get('--input'), pin: options.get('--input-pin') }, runKey: review.runKey, at: new Date().toISOString(),
  contentRecordWrites: 0, productionDeployments: 0 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const { getPayload } = await import('payload'), { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  let result: unknown
  if (action === 'stage') result = await stageGenshinCollectionReview(payload, input)
  else if (action === 'decide') {
    const packet = readPinnedUnifiedInput(options.get('--decisions')!, options.get('--decisions-pin')!) as {
      runKey: string; decisions: { revisionKey: string; action: 'accept-export' | 'reject'; note: string }[] }
    assert.equal(packet.runKey, review.runKey)
    assert.deepEqual(Object.keys(packet).sort(), ['decisions', 'runKey'])
    assert.equal(packet.decisions.length, review.items.length)
    assert.equal(new Set(packet.decisions.map(row => row.revisionKey)).size, review.items.length)
    const user = await payload.findByID({ collection: 'users', id: Number(options.get('--reviewer')), overrideAccess: true, depth: 0 })
    assert(['admin', 'reviewer'].includes(user.role))
    const transactionID = await payload.db.beginTransaction(); assert(transactionID)
    const req = { transactionID }; let created = 0, reused = 0
    try {
      const items = await readGenshinCollectionReview(payload, review, req)
      await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
      for (const entry of packet.decisions) {
        assert.deepEqual(Object.keys(entry).sort(), ['action', 'note', 'revisionKey'])
        const item = items.find(row => row.revisionKey === entry.revisionKey); assert(item)
        const prior = (await payload.find({ collection: 'genshin-review-decisions', req, overrideAccess: true, depth: 0,
          limit: 2, where: { and: [{ runKey: { equals: review.runKey } }, { revisionKey: { equals: item.revisionKey } }] } })).docs
        if (prior.length) {
          assert.equal(prior.length, 1); assert.equal(prior[0].action, entry.action); assert.equal(prior[0].note, entry.note.trim())
          assert.equal(prior[0].cmsKey, review.manifest.cmsKey); assert.equal(prior[0].actorID, String(user.id)); reused++
        } else {
          await payload.create({ collection: 'genshin-review-decisions', req, overrideAccess: false, user,
            data: { runKey: review.runKey, reviewItem: item.id, action: entry.action, note: entry.note,
              decisionKey: '', revisionKey: '', cmsKey: '', actorID: '', actorEmail: '' } }); created++
        }
      }
      await assertGenshinReviewCMS(payload, review.manifest.cmsKey, req)
      await payload.db.commitTransaction(transactionID)
    } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    result = { runKey: review.runKey, created, reused, total: review.items.length, contentRecordWrites: 0, productionDeployments: 0 }
  } else if (action === 'export') result = await exportGenshinCollection(payload, input)
  else {
    const items = await readGenshinCollectionReview(payload, review)
    await assertGenshinReviewCMS(payload, review.manifest.cmsKey)
    result = { runKey: review.runKey, items: items.length, contentRecordWrites: 0 }
  }
  writeFileSync(output, JSON.stringify({ action, application, sourceCommit: options.get('--commit'), result,
    observedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ action, runKey: review.runKey, complete: true, contentRecordWrites: 0, productionDeployments: 0 }))
} finally { await payload.destroy() }
