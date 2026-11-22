import assert from 'node:assert/strict'
import test from 'node:test'
import { SERVICES } from '../../../scripts/desktop-cloud-release.mjs'
import { AZUR_PROMILIA_INDEPENDENT_POLICY } from '../../../scripts/genshin-independent-release.mjs'
import { assertAzurPromiliaSourceTransition } from '../src/azur-promilia-release-history'
import { digest } from '../src/legacy-intake'
import { AZUR_PROMILIA_GUIDE_SOURCE } from '../src/azur-promilia-independent-text'
const uuid = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
function fixture() {
  const baseline: any = { services: Object.fromEntries(SERVICES.map((s: string, i: number) => [s,
    { id: uuid(i + 1), strategy: 'percentage', versions: [{ version_id: uuid(i + 10), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: [], routes: [], domains: [] }
  const source = (sourcePath: string, text: string) => ({ sourcePath, text, sha256: digest(text) })
  const guides = [{ id: 'existing-guide', title: { en: 'Title' }, content: { en: 'Already published text.', zh: '保留中文' } }]
  const sources = [source(AZUR_PROMILIA_GUIDE_SOURCE, 'export const guides = ' + JSON.stringify(guides, null, 2) + ';'),
    ...Array.from({ length: 114 }, (_, i) => source(`preserved-${i}.json`, '[]'))]
  const candidate = structuredClone(sources)
  guides[0].content.en = 'New reviewed text from the current baseline.'
  candidate[0] = source(AZUR_PROMILIA_GUIDE_SOURCE, 'export const guides = ' + JSON.stringify(guides, null, 2) + ';')
  const owners: any = Object.fromEntries(['main', 'genshin', 'nte', 'azur-promilia', 'lvmeng'].map(owner => [owner,
    { owner, service: owner === 'main' ? 'gachia' : `gachia-game-${owner}`, moduleSHA256: 'a'.repeat(64), versionId: uuid(3) }]))
  const previous: any = { allOwnersCurrent: true, sources, owners, router: { versionId: uuid(4) }, baseline }
  const executorCI = { status: 'full_exact_ci_passed', commit: 'b'.repeat(40), runID: 123 }
  const completion: any = { status: 'production_accepted', policy: AZUR_PROMILIA_INDEPENDENT_POLICY, executorCI,
    accepted: { candidate: { versionId: uuid(100), moduleSHA256: 'c'.repeat(64), moduleProof: { path: '/sealed/module.json', pin: 'd'.repeat(64) } },
      recovery: { moduleSHA256: 'a'.repeat(64) } }, deployment: { deploymentId: uuid(101) } }
  const after = structuredClone(baseline)
  after.services['gachia-game-azur-promilia'] = { id: uuid(101), strategy: 'percentage', versions: [{ version_id: uuid(100), percentage: 100 }] }
  const value: any = { schemaVersion: 1, kind: 'nte_azur_editorial_source_index_v1', status: 'published_sources_observed',
    cloudWrites: false, newPublicationAuthorized: false, executorCI, sourceCommit: executorCI.commit, owners: structuredClone(owners),
    router: structuredClone(previous.router), baseline: after }
  Object.assign(value.owners['azur-promilia'], completion.accepted.candidate)
  return { value, previous, completion, candidate }
}
test('Azur source continuation advances only one owner and preserves all 114 other source bytes', () => {
  const f = fixture(); assertAzurPromiliaSourceTransition(f.value, f.previous, f.completion, f.candidate)
})
for (const fault of ['incomplete-A', 'incomplete-B', 'other-content', 'other-owner', 'router', 'main-deployment', 'bindings',
  'wrong-service', 'wrong-deployment', 'partial-CI', 'recovery', 'new-authority', 'failed-completion']) test(`Azur continuation rejects ${fault}`, () => {
  const f = fixture()
  if (fault === 'incomplete-A') f.previous.allOwnersCurrent = false
  if (fault === 'incomplete-B') f.candidate.pop()
  if (fault === 'other-content') { f.candidate[1].text = '[1]'; f.candidate[1].sha256 = digest('[1]') }
  if (fault === 'other-owner') f.value.owners.nte.moduleSHA256 = 'e'.repeat(64)
  if (fault === 'router') f.value.router.versionId = uuid(999)
  if (fault === 'main-deployment') f.value.baseline.services.gachia.id = uuid(999)
  if (fault === 'bindings') f.value.baseline.bindings = { unexpected: [] }
  if (fault === 'wrong-service') f.value.owners['azur-promilia'].service = 'gachia'
  if (fault === 'wrong-deployment') f.completion.deployment.deploymentId = uuid(999)
  if (fault === 'partial-CI') f.completion.executorCI.status = 'partial_ci'
  if (fault === 'recovery') f.completion.accepted.recovery.moduleSHA256 = 'e'.repeat(64)
  if (fault === 'new-authority') f.value.newPublicationAuthorized = true
  if (fault === 'failed-completion') f.completion.status = 'stopped'
  assert.throws(() => assertAzurPromiliaSourceTransition(f.value, f.previous, f.completion, f.candidate))
})
