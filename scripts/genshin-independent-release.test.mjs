import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { executeGenshinIndependentRelease, assertGenshinIndependentIdentity, GENSHIN_INDEPENDENT_POLICY,
  executeNteIndependentRelease, assertNteIndependentIdentity, NTE_INDEPENDENT_POLICY,
  executeAzurPromiliaIndependentRelease, assertAzurPromiliaIndependentIdentity, AZUR_PROMILIA_INDEPENDENT_POLICY,
  executeLvmengIndependentRelease, assertLvmengIndependentIdentity, LVMENG_INDEPENDENT_POLICY } from './genshin-independent-release.mjs';
const sha = char => char.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, service = 'gachia-game-genshin';
function fixture(t, game = 'genshin') {
  const service = `gachia-game-${game}`;
  const run = mkdtempSync(join(tmpdir(), 'genshin-independent-')); t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: {}, bindings: {}, settings: {}, subdomains: {}, scripts: [...SERVICES], routes: [{ pattern: 'gachia.com/*', script: 'gachia-router' }], domains: [] };
  for (const [i, name] of SERVICES.entries()) {
    baseline.services[name] = { id: uuid(i + 1), versions: [{ version_id: uuid(i + 20), percentage: 100 }] };
    baseline.bindings[name] = []; baseline.settings[name] = { bindings: [], tags: [] }; baseline.subdomains[name] = { enabled: true, previews_enabled: true };
  }
  const value = { policy: game === 'nte' ? NTE_INDEPENDENT_POLICY : game === 'azur-promilia' ? AZUR_PROMILIA_INDEPENDENT_POLICY : game === 'lvmeng' ? LVMENG_INDEPENDENT_POLICY : GENSHIN_INDEPENDENT_POLICY, releaseKey: sha('a'), bundlePin: sha('b'), reviewPin: sha('c'), sourceCommit: 'd'.repeat(40),
    executorCI: { commit: 'd'.repeat(40), runID: 1, status: 'full_exact_ci_passed' }, baseline, observedAt: Date.now(),
    owners: { [game]: { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha('e'),
      ...Object.fromEntries(['candidate', 'recovery'].map(role => [role, { artifactPin: sha('1'), configPin: sha('2'), moduleSHA256: sha('3'), referencesPin: sha('4') }])) } } };
  const cloud = structuredClone(baseline), calls = [], state = { fail: undefined };
  const transport = {
    snapshot: async () => structuredClone(cloud),
    upload: async row => { calls.push(`upload:${row.owner}:${row.role}`); if (state.fail === `upload:${row.role}`) throw Error('unknown upload'); return { versionId: uuid(row.role === 'candidate' ? 101 : 100) }; },
    inspect: async row => ({ versionId: row.versionId, moduleSHA256: row.sealed.moduleSHA256, versionPin: sha('5'), moduleProof: { pin: sha('6') } }),
    preview: async row => { calls.push(`preview:${row.role}`); if (state.fail === `preview:${row.role}`) throw Error('preview rejected'); return { service, versionId: row.versionId, observationMode: 'cloud_exact_version', status: 'passed', evidenceSHA256: sha('7') }; },
    revalidate: async () => {},
    promote: async row => { calls.push(`promote:${row.owner}`); if (state.fail === 'promote') throw Error('unknown deployment'); cloud.services[service] = { id: uuid(200), versions: [{ version_id: row.versionId, percentage: 100 }] }; return { ...row, deploymentId: uuid(200) }; },
    acceptProduction: async () => { calls.push('public'); if (state.fail === 'public') throw Error('public rejected'); return { status: 'passed', evidenceSHA256: sha('8'), versions: { [service]: uuid(101) } }; },
  };
  return { run, releaseKey: value.releaseKey, verify: async () => value, transport, value, cloud, calls, state };
}
test('only Genshin is uploaded and deployed; Main, Router and all other identities stay fixed', async t => {
  const f = fixture(t), result = await executeGenshinIndependentRelease(f);
  assert.equal(result.status, 'production_accepted'); assert.equal(result.sourceAdvanced, false);
  assert.deepEqual(f.calls, ['upload:genshin:recovery', 'preview:recovery', 'upload:genshin:candidate', 'preview:candidate', 'promote:genshin', 'public']);
  for (const name of SERVICES.filter(name => name !== service)) assert.deepEqual(f.cloud.services[name], f.value.baseline.services[name]);
  await assert.rejects(executeGenshinIndependentRelease(f), /EEXIST/);
});
for (const failure of ['upload:recovery', 'upload:candidate', 'preview:recovery', 'preview:candidate', 'promote', 'public']) test(`${failure} stops with no retry or automatic rollback`, async t => {
  const f = fixture(t); f.state.fail = failure; await assert.rejects(executeGenshinIndependentRelease(f));
  assert(f.calls.filter(call => call.startsWith('promote')).length <= 1);
  const rows = readFileSync(join(f.run, `genshin-independent-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-2).automaticRetry, false); assert.equal(rows.at(-2).automaticRollback, false);
  assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
});
test('Main/Router drift or a changed review prevents any upload', async t => {
  for (const name of ['gachia', 'gachia-router', 'gachia-staging', 'gachia-game-nte']) {
    const f = fixture(t); f.cloud.services[name].id = uuid(999); await assert.rejects(executeGenshinIndependentRelease(f)); assert.deepEqual(f.calls, []);
  }
  const f = fixture(t); let reads = 0; f.verify = async () => ({ ...f.value, reviewPin: sha(++reads > 1 ? 'f' : 'c') });
  await assert.rejects(executeGenshinIndependentRelease(f), /identity changed/); assert.deepEqual(f.calls, []);
});
test('scope, stale evidence and missing exact CI are rejected', t => {
  const f = fixture(t);
  for (const mutate of [v => { v.owners.main = v.owners.genshin }, v => { v.observedAt -= 900001 }, v => { v.executorCI.status = 'skipped' }, v => { v.owners.genshin.service = 'gachia' }]) {
    const value = structuredClone(f.value); mutate(value); assert.throws(() => assertGenshinIndependentIdentity(value));
  }
});
test('NTE uses the same qualified single-owner protocol while protecting Genshin and the platform', async t => {
  const f = fixture(t, 'nte'), result = await executeNteIndependentRelease(f);
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls, ['upload:nte:recovery', 'preview:recovery', 'upload:nte:candidate', 'preview:candidate', 'promote:nte', 'public']);
  for (const name of SERVICES.filter(name => name !== 'gachia-game-nte')) assert.deepEqual(f.cloud.services[name], f.value.baseline.services[name]);
  assert.throws(() => assertGenshinIndependentIdentity(f.value));
  const wrong = structuredClone(f.value); wrong.owners.main = wrong.owners.nte; assert.throws(() => assertNteIndependentIdentity(wrong));
});
for (const failure of ['upload:recovery', 'upload:candidate', 'preview:recovery', 'preview:candidate', 'promote', 'public']) test(`NTE ${failure} records the stop without another write`, async t => {
  const f = fixture(t, 'nte'); f.state.fail = failure; await assert.rejects(executeNteIndependentRelease(f));
  assert(f.calls.filter(call => call.startsWith('promote')).length <= 1);
  const rows = readFileSync(join(f.run, `nte-independent-${f.releaseKey}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-2).automaticRetry, false); assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
});
test('NTE publication refuses any protected deployment change before upload', async t => {
  for (const name of SERVICES.filter(name => name !== 'gachia-game-nte')) {
    const f = fixture(t, 'nte'); f.cloud.services[name].id = uuid(999); await assert.rejects(executeNteIndependentRelease(f)); assert.deepEqual(f.calls, []);
  }
});
test('Azur Promilia uses the same single-owner protocol and protects every other deployment', async t => {
  const f = fixture(t, 'azur-promilia'), result = await executeAzurPromiliaIndependentRelease(f);
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls, ['upload:azur-promilia:recovery', 'preview:recovery', 'upload:azur-promilia:candidate', 'preview:candidate', 'promote:azur-promilia', 'public']);
  for (const name of SERVICES.filter(name => name !== 'gachia-game-azur-promilia')) assert.deepEqual(f.cloud.services[name], f.value.baseline.services[name]);
  assert.doesNotThrow(() => assertAzurPromiliaIndependentIdentity(f.value));
});
test('Lvmeng uses the same single-owner protocol and protects every other deployment', async t => {
  const f = fixture(t, 'lvmeng'), result = await executeLvmengIndependentRelease(f);
  assert.equal(result.status, 'production_accepted');
  assert.deepEqual(f.calls, ['upload:lvmeng:recovery', 'preview:recovery', 'upload:lvmeng:candidate', 'preview:candidate', 'promote:lvmeng', 'public']);
  for (const name of SERVICES.filter(name => name !== 'gachia-game-lvmeng')) assert.deepEqual(f.cloud.services[name], f.value.baseline.services[name]);
  assert.doesNotThrow(() => assertLvmengIndependentIdentity(f.value));
});
