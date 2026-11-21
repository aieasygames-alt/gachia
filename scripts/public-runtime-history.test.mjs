import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPublicRuntimeTransition, PUBLIC_RUNTIME_OWNERS, PUBLIC_RUNTIME_POLICY } from './public-runtime-history.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { unifiedService } from './unified-release-assets.mjs';
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
function fixture() {
  const baseline = { services: Object.fromEntries(SERVICES.map((service, index) => [service,
    { id: uuid(index + 1), strategy: 'percentage', versions: [{ version_id: uuid(index + 10), percentage: 100 }] }])),
  settings: {}, bindings: {}, subdomains: {}, scripts: [], routes: [], domains: [] };
  const active = { path: '/protected/active.json', pin: 'a'.repeat(64) }, router = { versionId: uuid(3) };
  const previous = { value: { active }, router, baseline, owners: Object.fromEntries(PUBLIC_RUNTIME_OWNERS.map(owner => [owner, { moduleSHA256: 'b'.repeat(64) }])) };
  const promoted = Object.fromEntries(PUBLIC_RUNTIME_OWNERS.map((owner, index) => [unifiedService(owner), uuid(100 + index)]));
  const after = structuredClone(baseline), deployments = {}, owners = {}, accepted = {};
  for (const [index, owner] of PUBLIC_RUNTIME_OWNERS.entries()) {
    const service = unifiedService(owner), versionId = promoted[service];
    after.services[service] = { id: uuid(200 + index), strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] };
    deployments[owner] = { deploymentId: after.services[service].id };
    owners[owner] = { service, versionId };
    accepted[owner] = { candidate: { versionId }, recovery: { moduleSHA256: previous.owners[owner].moduleSHA256 } };
  }
  const parent = { path: '/protected/source-index.json', pin: 'c'.repeat(64) }, commit = 'd'.repeat(40);
  const executorCI = { commit, runID: 123, status: 'full_exact_ci_passed' };
  const completed = { policy: PUBLIC_RUNTIME_POLICY, status: 'production_accepted', nextVersion: '15.5.29',
    parent, active, commit, executorCI, accepted, before: baseline, after, promoted, deployments };
  const value = { kind: 'nte_public_runtime_source_index_v1', status: 'published_sources_observed', cloudWrites: false,
    newPublicationAuthorized: false, previousSourceIndex: parent, active, router, sourceCommit: commit, executorCI, owners, baseline: after };
  return { value, previous, completed };
}
test('security rollout advances exactly five Next owners while preserving published inputs and Router', () => {
  const f = fixture(); assertPublicRuntimeTransition(f.value, f.previous, f.completed);
});
for (const fault of ['content', 'router', 'staging', 'bindings', 'missing-owner', 'wrong-runtime', 'ci', 'parent', 'recovery', 'allocation', 'deployment', 'service']) {
  test('security source transition rejects ' + fault, () => {
    const f = fixture();
    if (fault === 'content') f.value.active = { ...f.value.active, pin: 'e'.repeat(64) };
    if (fault === 'router') f.value.router = { versionId: uuid(999) };
    if (fault === 'staging') { f.value.baseline = structuredClone(f.value.baseline); f.value.baseline.services['gachia-staging'].versions[0].version_id = uuid(999); }
    if (fault === 'bindings') { f.completed.after = structuredClone(f.completed.after); f.completed.after.bindings = { unexpected: [] }; }
    if (fault === 'missing-owner') delete f.completed.accepted.nte;
    if (fault === 'wrong-runtime') f.completed.nextVersion = '15.5.28';
    if (fault === 'ci') f.completed.executorCI = { ...f.completed.executorCI, status: 'partial_ci' };
    if (fault === 'parent') f.value.previousSourceIndex = { ...f.value.previousSourceIndex, pin: 'e'.repeat(64) };
    if (fault === 'recovery') f.completed.accepted.genshin.recovery.moduleSHA256 = 'e'.repeat(64);
    if (fault === 'allocation') f.completed.after.services.gachia.versions[0].percentage = 50;
    if (fault === 'deployment') f.completed.deployments.nte.deploymentId = uuid(999);
    if (fault === 'service') f.value.owners.nte.service = 'gachia-router';
    assert.throws(() => assertPublicRuntimeTransition(f.value, f.previous, f.completed));
  });
}
