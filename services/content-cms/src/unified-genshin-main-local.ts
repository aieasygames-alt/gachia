import assert from 'node:assert/strict'
import path from 'node:path'
import { readUnifiedHistoricalBytes } from '../../../scripts/unified-historical-sources.mjs'
import { unifiedPinnedJSON } from '../../../scripts/unified-promotion-protocol.mjs'
import { unifiedPreviewReferences } from '../../../scripts/unified-version-preview.mjs'
import { unifiedGenshinPublicReferences } from '../../../scripts/unified-genshin-public.mjs'
import { unifiedMainPublicReferences } from '../../../scripts/unified-main-public.mjs'
import { unifiedRuntimeConfig, unifiedTransportTarget } from '../../../scripts/unified-cloud-module.mjs'
import { frozenCharacterTextPairContract, verifyUnifiedOwnerBuild } from './unified-owner-build'
import { verifyUnifiedPublication } from './unified-publication'
import { verifyUnifiedTransport } from './unified-transport'

type Role = 'candidate' | 'recovery'
type Owner = 'genshin' | 'main'
type Reference = { path: string; status: number; headers: Record<string, string>; bytes: number; sha256: string; bodyFile: string }
const owners: Owner[] = ['genshin', 'main']

// Read-only binding for the next fixed adapter. Local evidence, including a
// preview:false build, cannot replace installed review, exact CI or live sources.
export async function readUnifiedGenshinMainLocal(input: { directory: string; pin: string }) {
  const { directory, pin } = structuredClone(input)
  const transport = await verifyUnifiedTransport(directory, pin)
  const publication = await verifyUnifiedPublication(transport.receipt.publicationDirectory, transport.receipt.publicationPin)
  const built = verifyUnifiedOwnerBuild(publication.receipt.buildDirectory, publication.receipt.buildPin), build = built.directory
  assert.deepEqual(built.frozen.owners, owners, 'Only the fixed Genshin/Main build is supported')
  assert.equal(built.frozen.candidate.changed.length, 1, 'One existing character record required')
  const pair = frozenCharacterTextPairContract(build, built.frozen)
  assert.equal(pair.candidate.changes.length, 1, 'One existing Genshin character text edit required')
  const change = pair.candidate.changes[0]
  assert.equal(change.game, 'genshin', 'Only Genshin character text is supported by this adapter')
  assert.deepEqual(built.frozen.candidate.files.filter(row => row.candidateSHA256 !== row.activeSHA256).map(row => row.sourcePath), [change.sourcePath],
    'Unrelated editorial sources cannot enter the pair adapter')
  assert.equal(publication.receipt.schemaVersion, 2); assert.deepEqual(publication.receipt.characterTextContract, pair)
  const readRows = (owner: Owner, role: Role) => {
    const root = path.join(transport.directory, owner, role, 'http')
    return unifiedPinnedJSON(path.join(root, 'references.json'), transport.receipt.owners[owner][role].referencesPin) as Reference[]
  }
  const body = (owner: Owner, role: Role, row: Reference) => {
    assert(/^\d+\.body$/.test(row.bodyFile), 'Unsafe sealed pair body path')
    return readUnifiedHistoricalBytes(path.join(transport.directory, owner, role, 'http', row.bodyFile))
  }
  const references = (owner: Owner, role: Role) => {
    assert(owners.includes(owner) && ['candidate', 'recovery'].includes(role), 'Unknown fixed pair owner/role')
    return unifiedPreviewReferences(readRows(owner, role), (row: Reference) => body(owner, role, row), 'streaming-v2')
  }
  const project = (role: Role) => {
    const main = unifiedMainPublicReferences(references('main', role), (row: Reference) => body('main', role, row))
    assert.equal(main.find((row: Reference) => row.path === '/data/genshin/raw-characters.json')?.sha256, pair[role].changes[0].candidateSHA256,
      'Main public character mirror differs from the exact Genshin A/B source')
    return { main, genshin: unifiedGenshinPublicReferences(references('genshin', role), (row: Reference) => body('genshin', role, row), pair[role].expectations) }
  }
  const publicReferences = { candidate: project('candidate'), recovery: project('recovery') }
  const runtimeConfigs = Object.fromEntries(owners.map(owner => {
    const config = readUnifiedHistoricalBytes(path.join(build, 'source/apps', owner === 'main' ? 'web' : 'game-genshin', 'wrangler.jsonc')).toString()
    return [owner, unifiedRuntimeConfig(unifiedTransportTarget(owner, config))]
  }))
  return { transport, publication, built, pair, references, publicReferences, runtimeConfigs, preview: transport.receipt.preview,
    productionReady: false as const, activationSupported: false as const, cloudWrites: false as const }
}
