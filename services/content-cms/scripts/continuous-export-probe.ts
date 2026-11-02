import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cmsEnvironment } from '../src/cms-environment'
import { exportDesktopGuides } from '../src/desktop-export'
import { writeDesktopCandidate } from '../src/desktop-candidate'
import { parseGuides } from '../src/desktop-guides'

const [repo, destination] = process.argv.slice(2)
const runtime = cmsEnvironment()
assert.equal(runtime.mode, 'postgres-local')
assert(repo && destination && path.isAbsolute(destination))
assert(new URL(process.env.DATABASE_URL!).pathname.startsWith('/cms_probe_continuous_'))
const originalText = execFileSync('git', ['show', 'HEAD:packages/data/games/genshin/raw-guides.json'], { cwd: repo }).toString()
const original = parseGuides(originalText)[0]
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const user = (await payload.find({ collection: 'users', limit: 1, overrideAccess: true })).docs[0]
  assert(user)
  const record = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, locale: 'all',
    where: { stableKey: { equals: `genshin:guides:${original.id}` } }, limit: 1 })).docs[0]
  assert(record)
  const game = typeof record.game === 'object' ? record.game.id : record.game
  const result = { scope: 'isolated PostgreSQL/Payload editorial A/B; all candidates forced preview; never upload', guideId: original.id, rounds: [] as object[] }
  await mkdir(destination, { mode: 0o700 })
  for (const label of ['A', 'B']) {
    await payload.update({ collection: 'content-records', id: record.id, overrideAccess: true, user, draft: false, locale: 'zh',
      data: { title: `CMS isolated continuous ${label} - ${original.title}`, hold: false, _status: 'published' } })
    const records = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: false, locale: 'all', depth: 0, pagination: false,
      where: { and: [{ game: { equals: game } }, { kind: { equals: 'guides' } }, { _status: { equals: 'published' } }, { hold: { equals: false } }] } })).docs
    assert.equal(records.length, 1)
    assert.deepEqual(records[0].sourceRecord, original)
    const formal = exportDesktopGuides(originalText, 'genshin', records, false)
    const rehearsal = exportDesktopGuides(originalText, 'genshin', records, true)
    assert.equal(formal.content, rehearsal.content)
    assert.notEqual(formal.manifest.releaseKey, rehearsal.manifest.releaseKey)
    const directory = path.join(destination, label)
    await writeDesktopCandidate(directory, rehearsal.content, rehearsal.manifest)
    result.rounds.push({ label, directory, releaseKey: rehearsal.manifest.releaseKey, sourceSHA256: rehearsal.manifest.sourceSHA256,
      candidateSHA256: rehearsal.manifest.candidateSHA256, formalExportValidated: true, uploadForbidden: true })
  }
  assert.notEqual(await readFile(path.join(destination, 'A/raw-guides.json'), 'utf8'), await readFile(path.join(destination, 'B/raw-guides.json'), 'utf8'))
  await writeFile(path.join(destination, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify(result))
} finally { await payload.destroy() }
