import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertDeployedMainStop, executeGenshinReadonlyCompletion, genshinReadonlyCompletionTransport } from './genshin-migration-readonly-completion.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY } from './genshin-production-migration.mjs';
const sha = c => c.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t) {
  const run = mkdtempSync(join(tmpdir(), 'migration-readonly-')); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [], domains: [] };
  for (const [i, name] of SERVICES.entries()) {
    baseline.services[name] = { id: uuid(i), versions: [{ version_id: uuid(i + 10), percentage: 100 }] };
    baseline.bindings[name] = []; baseline.settings[name] = { bindings: [], tags: [] }; baseline.subdomains[name] = { enabled: true, previews_enabled: true };
  }
  const owners = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map(owner => {
    const service = { genshin: 'gachia-game-genshin', router: 'gachia-router', main: 'gachia' }[owner];
    return [owner, { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha('1'),
      ...Object.fromEntries(['recovery', 'candidate'].map(role => [role, { moduleSHA256: sha('2'), artifactPin: sha('3'), configPin: sha('4'), referencesPin: sha('5') }])) }];
  }));
  const identity = { policy: GENSHIN_MIGRATION_POLICY, releaseKey: sha('a'), sourceCommit: 'b'.repeat(40), sourceCI: { status: 'full_exact_ci_passed', commit: 'b'.repeat(40), runID: 1 },
    sourceIndexPin: sha('c'), activePin: sha('d'), baseline, owners, observedAt: Date.now() };
  const calls = [], previous = { snapshot: structuredClone(baseline), versions: { gachia: uuid(10) }, journal: { path: '/old/stopped.jsonl', pin: sha('e') } };
  const cloud = structuredClone(baseline), transport = {
    snapshot: async () => { calls.push('snapshot'); return structuredClone(cloud); },
    revalidate: async () => { calls.push('modules'); },
    accept: async () => { calls.push('public'); return { status: 'passed', evidenceSHA256: sha('f') }; },
  };
  return { run, releaseKey: identity.releaseKey, verify: async () => ({ ...identity, observedAt: Date.now() }), previous, transport, calls, cloud };
}
test('deployed read-only completion has no write capability, preserves the stopped journal and cannot replay', async t => {
  const f = fixture(t), result = await executeGenshinReadonlyCompletion(f);
  assert.equal(result.status, 'production_accepted'); assert.equal(result.cloudWrites, false);
  assert.deepEqual(f.calls, ['snapshot', 'modules', 'public', 'modules', 'snapshot']);
  const rows = readFileSync(join(f.run, `genshin-migration-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(r => r.phase), ['read_only_completion_baseline', 'topology_observed', 'immutable_modules_revalidated', 'public_accepted', 'production_accepted']);
  assert.deepEqual(rows[0].previousJournal, f.previous.journal);
  await assert.rejects(executeGenshinReadonlyCompletion(f), /EEXIST/);
  assert.deepEqual(Object.keys(genshinReadonlyCompletionTransport({ previous: {}, reader: {}, directory: f.run })).sort(), ['accept', 'revalidate', 'snapshot']);
});
test('real read-only adapter revalidates every recovery/candidate and protected source version', async () => {
  const version = id => ({ id, metadata: { created_on: '2026-11-11T00:00:00Z' }, resources: { script: { etag: '"immutable"' }, bindings: [] } });
  const accepted = {}, modules = {}, owners = {}, requested = [];
  for (const [i, owner] of GENSHIN_MIGRATION_ORDER.entries()) {
    owners[owner] = { service: 'fixture-' + owner }; accepted[owner] = {}; modules[owner] = {};
    for (const [j, role] of ['recovery', 'candidate'].entries()) {
      const versionId = uuid(i * 2 + j + 10); accepted[owner][role] = { versionId }; modules[owner][role] = { version: version(versionId) };
    }
  }
  const sources = { protected: { service: 'protected', versionId: uuid(90), version: version(uuid(90)) } };
  const previous = { accepted, modules, evidence: { value: { owners }, index: { owners: sources } } };
  const reader = { version: async (service, id) => { requested.push([service, id]); return version(id); } };
  await genshinReadonlyCompletionTransport({ previous, reader, directory: '/not-used' }).revalidate();
  assert.equal(requested.length, 7); assert.deepEqual(requested.at(-1), ['protected', uuid(90)]);
  reader.version = async (service, id) => ({ ...version(id), id: uuid(999) });
  await assert.rejects(genshinReadonlyCompletionTransport({ previous, reader, directory: '/not-used' }).revalidate());
});
for (const fault of ['topology', 'modules', 'public', 'final-topology', 'writer']) test(`read-only completion refuses ${fault} and never retries`, async t => {
  const f = fixture(t);
  if (fault === 'topology') f.cloud.services.gachia.id = uuid(999);
  if (fault === 'modules') f.transport.revalidate = async () => { f.calls.push('modules'); throw Error('module drift'); };
  if (fault === 'public') f.transport.accept = async () => { f.calls.push('public'); throw Error('public drift'); };
  if (fault === 'final-topology') f.transport.accept = async () => { f.cloud.services.gachia.id = uuid(999); return { status: 'passed', evidenceSHA256: sha('f') }; };
  if (fault === 'writer') f.transport.promote = async () => assert.fail('writer called');
  await assert.rejects(executeGenshinReadonlyCompletion(f));
  assert(f.calls.filter(c => c === 'public').length <= 1); assert(f.calls.filter(c => c === 'modules').length <= 2);
  if (fault !== 'writer') {
    const rows = readFileSync(join(f.run, `genshin-migration-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(rows.at(-1).phase, 'stopped'); assert.equal(rows.at(-1).cloudWrites, false); assert.equal(rows.at(-1).automaticRetry, false);
    assert(!rows.some(r => r.phase === 'production_accepted'));
  }
});
test('only the exact known post-deployment read stop with no pending operation can complete', () => {
  const deployed = { main: uuid(1), genshin: uuid(2), router: uuid(3) }, accepted = { candidate: { versionId: uuid(1) } };
  const rows = ['main_finalization_baseline', 'preview_accepted', 'preview_accepted', 'deployment_intent', 'deployed', 'stopped', 'read_only_reconciliation'].map(phase => ({ phase }));
  Object.assign(rows[5], { deployed, accepted, automaticRetry: false, automaticRollback: false,
    error: 'Production read failed: https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/gachia-game-azur-promilia/subdomain' });
  assertDeployedMainStop(rows, deployed, accepted);
  for (const mutate of [r => r[5].pendingOperation = { phase: 'deployment' }, r => r[5].error = 'public failure', r => r[5].automaticRetry = true,
    r => r[4].phase = 'deployment_intent', r => r.pop(), r => r.push(r.at(-1)), r => r[5].deployed.main = uuid(99), r => r[6].pendingOperation = { phase: 'upload' }]) {
    const changed = structuredClone(rows); mutate(changed); assert.throws(() => assertDeployedMainStop(changed, deployed, accepted));
  }
});
