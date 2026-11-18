import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { verifyNteReleaseBundle } from '../services/content-cms/src/nte-release-bundle.ts'
import { verifyUnifiedPublishedSource } from '../services/content-cms/src/unified-source-advance.ts'
import { verifyUnifiedCI } from '../services/content-cms/src/unified-production.ts'
import { desktopCloudSnapshot, assertTopology } from '../scripts/desktop-cloud-release.mjs'
import { assertModuleVersionIdentity } from '../scripts/desktop-version-provenance.mjs'
import { readUnifiedVersion } from '../scripts/unified-version-identity.mjs'
import { readMigrationRouterVersion } from '../scripts/genshin-migration-router.mjs'
import { unifiedProductionRead } from '../scripts/unified-production-transport.mjs'
import { createGenshinPublicNetwork } from '../scripts/unified-preview-network.mjs'
import { verifyNteHTTP } from '../scripts/nte-release-http.mjs'
import { migrationPinned, migrationSave } from '../scripts/genshin-migration-http.mjs'

const root = import.meta.dirname, directory = path.join(root, 'nte-r128-readonly-preflight')
mkdirSync(directory, { mode: 0o700 })
const stage = (name: string) => console.log(JSON.stringify({ stage: name, at: new Date().toISOString(), cloudWrites: false, publicationAuthorized: false }))
stage('reopen_local_bundle')
const prepared = JSON.parse(readFileSync(path.join(root, 'prepared.json'), 'utf8'))
const e = await verifyNteReleaseBundle(prepared.proof)
const githubToken = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], { encoding: 'utf8' }).trim()
stage('verify_original_publication_and_ancestral_ci')
await verifyUnifiedPublishedSource({ publication: e.sources.originalPublication, sourceIndex: e.sources.originalSourceIndex, githubToken })
for (const ancestor of e.sources.ancestors) assert.deepEqual(await verifyUnifiedCI(ancestor.runID, ancestor.commit, githubToken), ancestor)
stage('verify_live_control_plane_and_exact_modules')
const auth = JSON.parse(execFileSync('/opt/homebrew/bin/python3', ['-c', 'import tomllib,json,sys;print(json.dumps(tomllib.load(open(sys.argv[1],"rb"))))', path.join(homedir(), '.wrangler/config/default.toml')], { encoding: 'utf8' }))
assert(Date.parse(auth.expiration_time) > Date.now())
const before = await desktopCloudSnapshot(auth.oauth_token, unifiedProductionRead)
assertTopology(e.sources.baseline, before)
for (const row of Object.values(e.sources.owners) as any[]) assertModuleVersionIdentity(row.version, await readUnifiedVersion({ service: row.service, versionId: row.versionId, token: auth.oauth_token, request: unifiedProductionRead }))
assertModuleVersionIdentity(e.sources.router.version, await readMigrationRouterVersion({ versionId: e.sources.router.versionId, token: auth.oauth_token, request: unifiedProductionRead }))
stage('verify_complete_recovery_public_graph')
const network = await createGenshinPublicNetwork('http://127.0.0.1:1087')
try {
  await verifyNteHTTP({ origin: 'https://gachia.com', references: migrationPinned(e.value.recoveryReferences), directory: path.join(directory, 'public'), request: network.request })
} finally { await network.close() }
const after = await desktopCloudSnapshot(auth.oauth_token, unifiedProductionRead)
assertTopology(before, after)
const proof = migrationSave(directory, 'result.json', { status: 'passed', bundle: prepared.proof, before, after, historicalPublicationAndCIReverified: true,
  publicContracts: migrationPinned(e.value.recoveryReferences).length, cloudWrites: false, publicationAuthorized: false, purpose: 'readonly_preflight_after_historical_reader_fix_before_new_exact_ci' })
console.log(JSON.stringify({ stage: 'passed', proof, cloudWrites: false, publicationAuthorized: false }))
