import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { projectRoot } from '../src/local-environment'
import { canonical } from '../src/record-mapping'
import { digest } from '../src/legacy-intake'
import { publicationReadiness } from '../src/nte-item-audit'

const root = path.resolve(projectRoot, '../..')
const directory = path.resolve(root, process.argv[2] ?? 'reports/payload-real-slice-2026-11-01')
if (!directory.startsWith(root + '/reports/')) throw new Error('Report directory required')
const semantics = JSON.parse(readFileSync(path.join(directory, 'semantics.json'), 'utf8'))
assert.equal(semantics.publishable, false)
for (const input of semantics.inputs) assert.equal(digest(readFileSync(path.join(root, input.path), 'utf8')), input.sha256, `Source drift: ${input.path}`)
const assets = new Map<string, { url: string; usages: string[]; materialIDs: string[] }>()
function add(url: string, usage: string, id?: string) {
  const entry = assets.get(url) ?? { url, usages: [], materialIDs: [] }
  entry.usages = [...new Set([...entry.usages, usage])]
  if (id) entry.materialIDs = [...new Set([...entry.materialIDs, id])]
  assets.set(url, entry)
}
for (const row of semantics.dependencies) for (const character of row.characters) add(character.image, 'main-detail-related-character', row.id)
add('https://gachia.com/images/og/nte.webp', 'main-detail-and-nte-collection-metadata')
for (const row of semantics.materials) add(`https://img.gachia.com/images/nte/materials/${row.id}.webp`, 'shared-catalog-derived-icon-not-proven-rendered-on-item-page', row.id)
const media = [...assets.values()].map(entry => {
  const pathname = new URL(entry.url).pathname
  const copies = ['web', 'game-nte'].flatMap(app => {
    const file = `apps/${app}/public${pathname}`
    if (!existsSync(path.join(root, file))) return []
    const bytes = readFileSync(path.join(root, file))
    return [{ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }]
  })
  return { ...entry, pathname, localCopies: copies, deliveryVerified: false, sourceURLIsLicense: false,
    rights: 'unverified', receipt: { licensor: null, evidencePath: null, evidenceSHA256: null, permittedUses: [], territories: [], expiresAt: null, reviewer: null, authenticatedAt: null },
    publishable: false }
})
const readiness = publicationReadiness({ semanticApproved: false, rightsReceiptsAuthenticated: false, editorAssigned: false, freezeApproved: false })
const data = { schema: 'nte-item-responsibility-register-v1', semanticAuditKey: semantics.auditKey,
  authority: 'legacy', noDatabaseRead: true, noMediaDownloads: true, noRightsGranted: true,
  editor: null, reviewer: null, freezeWindow: null, finalSyncEvidence: null, handbackPlanApproved: false,
  requiredResponsibilityEvidence: ['named-editor-and-reviewer', 'per-unit-authoritative-source', 'freeze-and-final-sync-approval', 'handoff-and-handback-acceptance'],
  counts: { materialUnits: semantics.materials.length, mediaReferences: media.length, locallyPresent: media.filter(row => row.localCopies.length).length,
    renderedDependencyReferences: media.filter(row => row.usages.some(usage => !usage.startsWith('shared-catalog'))).length, rightsAuthenticated: 0 },
  media, readiness, publishable: false }
writeFileSync(path.join(directory, 'rights-responsibility.json'), JSON.stringify({ ...data, registerKey: digest(canonical(data)) }, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ ...data.counts, readiness }, null, 2))
