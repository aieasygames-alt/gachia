import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { GENSHIN_MIGRATION_ORDER, GENSHIN_MIGRATION_POLICY } from './genshin-production-migration.mjs';
import { assertGenshinMainFinalizationPrefix, executeGenshinMainFinalization } from './genshin-migration-main-finalization.mjs';
const sha = c => c.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t) {
  const run = mkdtempSync(join(tmpdir(), 'known-main-finalization-')); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [], domains: [] };
  for (const [i, name] of SERVICES.entries()) {
    baseline.services[name] = { id: uuid(i), versions: [{ version_id: uuid(i + 10), percentage: 100 }] };
    baseline.bindings[name] = []; baseline.settings[name] = { bindings: [], tags: [] }; baseline.subdomains[name] = { enabled: true, previews_enabled: true };
  }
  const owners = Object.fromEntries(GENSHIN_MIGRATION_ORDER.map((owner, i) => {
    const service = { genshin: 'gachia-game-genshin', router: 'gachia-router', main: 'gachia' }[owner];
    return [owner, { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha('1'),
      ...Object.fromEntries(['recovery', 'candidate'].map(role => [role, { moduleSHA256: sha('2'), artifactPin: sha('3'), configPin: sha('4'), referencesPin: sha('5') }])) }];
  }));
  const identity = { policy: GENSHIN_MIGRATION_POLICY, releaseKey: sha('a'), sourceCommit: 'b'.repeat(40), sourceCI: { status: 'full_exact_ci_passed', commit: 'b'.repeat(40), runID: 1 },
    sourceIndexPin: sha('c'), activePin: sha('d'), baseline, owners, observedAt: Date.now() };
  const cloud = structuredClone(baseline), deployed = { genshin: uuid(100), router: uuid(101) };
  for (const owner of GENSHIN_MIGRATION_ORDER) {
    const name = owners[owner].service;
    if (owner !== 'genshin') cloud.bindings[name].push({ name: 'GENSHIN_CONTENT_ENABLED', text: 'true', type: 'plain_text' });
    if (owner === 'main') cloud.bindings[name].push({ name: 'GENSHIN_CONTENT', service: owners.genshin.service, environment: 'production', type: 'service' });
    cloud.settings[name].bindings = structuredClone(cloud.bindings[name]);
    if (owner in deployed) cloud.services[name] = { id: uuid(200 + GENSHIN_MIGRATION_ORDER.indexOf(owner)), versions: [{ version_id: deployed[owner], percentage: 100 }] };
  }
  const calls = [], previous = { deployed, journal: { path: '/sealed/old.jsonl', pin: sha('e') }, accepted: { main: { recovery: { versionId: uuid(102) }, candidate: { versionId: uuid(103) } } } };
  const transport = {
    snapshot: async () => structuredClone(cloud), revalidate: async role => { calls.push('validate:' + role); },
    preview: async role => { calls.push('preview:' + role); return { status: 'passed', observationMode: 'cloud_exact_version', service: 'gachia', versionId: previous.accepted.main[role].versionId, evidenceSHA256: sha('f') }; },
    promote: async args => { calls.push('deploy:' + args.owner); const result = { service: 'gachia', versionId: args.versionId, releaseKey: args.releaseKey, deploymentId: uuid(300) };
      cloud.services.gachia = { id: result.deploymentId, versions: [{ version_id: result.versionId, percentage: 100 }] }; return result; },
    accept: async () => { calls.push('public'); return { status: 'passed', evidenceSHA256: sha('9') }; },
  };
  return { run, releaseKey: identity.releaseKey, verify: async () => ({ ...identity, observedAt: Date.now() }), previous, transport, calls, cloud };
}
test('known uploaded Main gets fresh previews and exactly one deployment, never an upload', async t => {
  const f = fixture(t), result = await executeGenshinMainFinalization(f);
  assert.equal(result.status, 'production_accepted'); assert.equal(result.versions.gachia, uuid(103));
  assert.deepEqual(f.calls.filter(c => c.startsWith('preview:') || c.startsWith('deploy:') || c === 'public'), ['preview:recovery', 'preview:candidate', 'deploy:main', 'public']);
  const rows = readFileSync(join(f.run, `genshin-migration-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].phase, 'main_finalization_baseline'); assert.deepEqual(rows[0].previousJournal, f.previous.journal);
  await assert.rejects(executeGenshinMainFinalization(f), /EEXIST/); assert.equal(f.calls.filter(c => c === 'deploy:main').length, 1);
});
for (const fault of ['recovery', 'candidate', 'module', 'topology', 'unknown-deployment', 'public']) test(`Main finalization stops on ${fault} without retries`, async t => {
  const f = fixture(t), preview = f.transport.preview;
  if (['recovery', 'candidate'].includes(fault)) f.transport.preview = async role => { if (role === fault) throw Error(fault); return preview(role); };
  if (fault === 'module') f.transport.revalidate = async () => { throw Error('module'); };
  if (fault === 'topology') f.cloud.services['gachia-game-nte'].id = uuid(999);
  if (fault === 'unknown-deployment') f.transport.promote = async () => { f.calls.push('deploy:main'); throw Error('response lost'); };
  if (fault === 'public') f.transport.accept = async () => { throw Error('public'); };
  await assert.rejects(executeGenshinMainFinalization(f));
  assert(f.calls.filter(c => c.startsWith('deploy:')).length <= (['public', 'unknown-deployment'].includes(fault) ? 1 : 0));
  const rows = readFileSync(join(f.run, `genshin-migration-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse), stop = rows.find(r => r.phase === 'stopped');
  assert.equal(stop.automaticRetry, false); assert.equal(stop.automaticRollback, false);
  assert.equal(stop.pendingOperation?.phase, fault === 'unknown-deployment' ? 'deployment' : undefined);
});
test('only the exact known upload-returned prefix may be finalized', () => {
  const phases = ['continuation_baseline', 'step_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'deployment_intent', 'deployed', 'step_accepted', 'upload_intent', 'upload_returned', 'preview_accepted', 'upload_intent', 'upload_returned', 'stopped', 'observation_unavailable'];
  const rows = phases.map(phase => ({ phase })); rows[15].versionId = uuid(1);
  Object.assign(rows[16], { pendingOperation: { phase: 'upload', owner: 'main', role: 'candidate', service: 'gachia', versionId: uuid(1) }, automaticRetry: false, automaticRollback: false, error: 'Migration rendered content/metadata/links/media differ: /ja\n details' });
  rows[17].error = 'Production read failed: https://api.cloudflare.com/client/v4/example';
  assertGenshinMainFinalizationPrefix(rows);
  for (const change of [r => r[16].pendingOperation.phase = 'deployment', r => r[16].pendingOperation.versionId = uuid(2), r => r[16].pendingOperation.owner = 'router', r => r[16].error = 'timeout', r => r.push(r.at(-1)), r => r[15].phase = 'upload_intent', r => r[16].automaticRetry = true]) {
    const changed = structuredClone(rows); change(changed); assert.throws(() => assertGenshinMainFinalizationPrefix(changed));
  }
});
