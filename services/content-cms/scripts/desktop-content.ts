import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { cmsEnvironment } from '../src/cms-environment'
import { guideFields, parseGuides, sha256 } from '../src/desktop-guides'
import { exportDesktopGuides } from '../src/desktop-export'
import { writeDesktopCandidate } from '../src/desktop-candidate'

const [action, repo, game, flag] = process.argv.slice(2)
if (!['import', 'export'].includes(action) || !repo || !['genshin', 'nte'].includes(game) || (flag && flag !== '--preview')) {
  throw new Error('Usage: desktop-content.ts import|export <repository> genshin|nte [--preview]')
}
const runtime = cmsEnvironment()
if (runtime.mode !== 'desktop' || process.env.CI || process.env.GITHUB_ACTIONS) throw new Error('Only the installed desktop can prepare content')
const root = path.join(homedir(), 'Library/Application Support/GachiaCMS')
if (runtime.directory !== path.join(root, 'data')) throw new Error('Unexpected desktop data directory')
const relative = `packages/data/games/${game}/raw-guides.json`
const originalText = await readFile(path.join(repo, relative), 'utf8')
const originals = parseGuides(originalText)
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  let gameDoc = (await payload.find({ collection: 'games', where: { key: { equals: game } }, limit: 1, overrideAccess: true })).docs[0]
  if (action === 'import' && !gameDoc) gameDoc = await payload.create({ collection: 'games', overrideAccess: true,
    data: { key: game, name: game, region: 'global', legacyRegistry: { source: relative } } })
  if (!gameDoc) throw new Error('Import this scope before exporting')
  const existing = await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, locale: 'all',
    where: { and: [{ game: { equals: gameDoc.id } }, { kind: { equals: 'guides' } }] }, pagination: false, depth: 0 })
  if (action === 'import') {
    let created = 0
    for (const original of originals) {
      const stableKey = `${game}:guides:${original.id}`
      if (existing.docs.some(doc => doc.stableKey === stableKey)) continue
      const transactionID = await payload.db.beginTransaction()
      if (!transactionID) throw new Error('Import requires a transaction')
      const req = { transactionID }
      try {
        const record = await payload.create({ collection: 'content-records', overrideAccess: true, draft: true, req,
          data: { stableKey, game: gameDoc.id, kind: 'guides', legacyId: original.id, legacyPath: `/${game}/guides/${original.id}`,
            bodyFormat: 'markdown', sourceRecord: original, hold: true,
            reviewEvidence: { desktopSource: relative, sourceDigest: sha256(originalText) } } })
        for (const [locale, fields] of Object.entries(guideFields)) {
          const data: Record<string, string> = {}
          for (const [field, legacy] of Object.entries(fields)) if (typeof original[legacy] === 'string') data[field] = original[legacy]
          if (Object.keys(data).length) await payload.update({ collection: 'content-records', id: record.id, overrideAccess: true, draft: true,
            req, locale: locale as 'zh' | 'en' | 'ja', data })
        }
        await payload.db.commitTransaction(transactionID)
        created++
      } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
    }
    console.log(JSON.stringify({ action, game, created, skipped: originals.length - created, factsCorrected: false, websiteChanged: false }))
  } else {
    const preview = flag === '--preview'
    // Without --preview, read the published versions, never overlay newer drafts.
    const records = preview ? existing.docs : (await payload.find({ collection: 'content-records', overrideAccess: true, draft: false, locale: 'all',
      where: { and: [{ game: { equals: gameDoc.id } }, { kind: { equals: 'guides' } }, { _status: { equals: 'published' } }, { hold: { equals: false } }] },
      pagination: false, depth: 0 })).docs
    const { content, manifest } = exportDesktopGuides(originalText, game, records, preview)
    const directory = path.join(root, 'publish', manifest.releaseKey)
    await writeDesktopCandidate(directory, content, manifest)
    console.log(JSON.stringify({ ...manifest, directory }))
  }
} finally { await payload.destroy() }
