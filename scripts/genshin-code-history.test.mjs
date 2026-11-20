import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { assertGenshinCodeTransition, GENSHIN_CODE_POLICY } from './genshin-code-history.mjs';
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
function fixture() {
  const service = 'gachia-game-genshin';
  const baseline = { services: Object.fromEntries(SERVICES.map((name, i) => [name, { id: uuid(i), versions: [{ version_id: uuid(i + 10), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: [...SERVICES], domains: [], routes: [] };
  const after = structuredClone(baseline); after.services[service] = { id: uuid(200), versions: [{ version_id: uuid(100), percentage: 100 }] };
  const active = { path: '/protected/active.json', pin: 'a'.repeat(64) }, router = { versionId: uuid(30) };
  const owners = Object.fromEntries(['main', 'genshin', 'nte', 'azur-promilia', 'lvmeng'].map(owner => [owner, { versionId: uuid(50), moduleSHA256: 'b'.repeat(64) }]));
  const previous = { value: { active }, owners, router, baseline }, parent = { path: '/protected/source-index.json', pin: 'c'.repeat(64) };
  const executorCI = { commit: 'd'.repeat(40), status: 'full_exact_ci_passed', runID: 123 };
  const completed = { policy: GENSHIN_CODE_POLICY, status: 'production_accepted', parent, active, commit: executorCI.commit, executorCI, before: baseline, after,
    promoted: { [service]: uuid(100) }, deployment: { deploymentId: uuid(200) }, accepted: { candidate: { versionId: uuid(100) }, recovery: { moduleSHA256: owners.genshin.moduleSHA256 } } };
  const value = { kind: 'nte_genshin_preserved_code_source_index_v1', status: 'published_sources_observed', cloudWrites: false, newPublicationAuthorized: false,
    previousSourceIndex: parent, sourceCommit: executorCI.commit, executorCI, active, router, owners: { ...owners, genshin: { versionId: uuid(100) } }, baseline: after };
  return { value: structuredClone(value), previous: structuredClone(previous), completed: structuredClone(completed) };
}
test('code-only source advancement preserves all published content and every other owner', () => {
  const f = fixture(); assertGenshinCodeTransition(f.value, f.previous, f.completed);
});
for (const fault of ['active', 'router', 'nte', 'main-deployment', 'staging', 'binding', 'ci', 'parent', 'recovery']) test('reject code-only publication drift: ' + fault, () => {
  const f = fixture();
  if (fault === 'active') f.value.active.pin = 'f'.repeat(64);
  if (fault === 'router') f.value.router.versionId = uuid(999);
  if (fault === 'nte') f.value.owners.nte.versionId = uuid(999);
  if (fault === 'main-deployment') f.value.baseline.services.gachia.id = uuid(999);
  if (fault === 'staging') f.value.baseline.services['gachia-staging'].id = uuid(999);
  if (fault === 'binding') f.value.baseline.bindings.unexpected = [];
  if (fault === 'ci') f.completed.executorCI.status = 'skipped';
  if (fault === 'parent') f.value.previousSourceIndex.pin = 'f'.repeat(64);
  if (fault === 'recovery') f.completed.accepted.recovery.moduleSHA256 = 'f'.repeat(64);
  assert.throws(() => assertGenshinCodeTransition(f.value, f.previous, f.completed));
});
