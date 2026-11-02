import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executeManualRecovery } from './desktop-manual-recovery.mjs';
import { assertRenewalTopology } from './desktop-evidence-renewal.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const sha = 'a'.repeat(64), operationId = 'a'.repeat(16);
function fixture(t, failure) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'cms-manual-recovery-')));
  t.after(() => rmSync(run, { recursive: true, force: true }));
  const baseline = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES };
  const owners = ['genshin', 'main'], manifest = { owners: {} }, recovery = { owners: {} }, accepted = {}, versions = {};
  for (const [i, owner] of owners.entries()) {
    const service = owner === 'main' ? 'gachia' : 'gachia-game-genshin';
    manifest.owners[owner] = { service }; accepted[service] = { versionId: uuid(100 + i) };
    recovery.owners[owner] = { versionId: uuid(200 + i), sourceVersionId: baseline.services[service].versions[0].version_id, acceptedAt: Date.now() };
    versions[service] = uuid(200 + i);
  }
  const observed = structuredClone(baseline);
  observed.services['gachia-game-genshin'].versions[0].version_id = accepted['gachia-game-genshin'].versionId;
  const value = { evidence: { plan: { game: 'genshin', preview: false, owners, releaseKey: sha }, baseline, manifest, recovery, accepted }, observed };
  const current = structuredClone(observed), writes = [];
  const journal = () => readFileSync(join(run, `manual-recovery-${operationId}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  let checks = 0;
  const options = { run, operationId, verify: () => {
    if (failure === 'changed-proof' && ++checks > 2) throw Error('proof changed');
    return structuredClone(value);
  }, authorize: () => failure === 'unauthorized' ? 'wrong' : sha, transport: {
    snapshot: async () => structuredClone(current),
    verifyVersions: async () => ({ status: 'passed', versions: failure === 'wrong-remote' ? {} : versions, evidenceSHA256: sha }),
    promote: async operation => {
      assert.equal(journal().at(-1).phase, 'recovery_intent'); writes.push(operation);
      if (failure === 'second-write' && writes.length === 2) throw Error('second failed');
      current.services[operation.service].versions[0].version_id = operation.versionId;
      if (failure === 'lost-response') throw Error('response lost');
    },
    acceptProduction: async () => ({ status: failure === 'public' ? 'failed' : 'passed', versions, releaseKey: sha, evidenceSHA256: sha }),
  } };
  return { value, current, writes, options, journal };
}

test('explicit recovery restores both compatible UUIDs and refuses replay', async t => {
  const f = fixture(t); const result = await executeManualRecovery(f.options);
  assert.equal(result.status, 'recovery_accepted'); assert.equal(f.writes.length, 2);
  assert.equal(f.journal().at(-1).phase, 'recovery_accepted');
  await assert.rejects(executeManualRecovery(f.options), /EEXIST/); assert.equal(f.writes.length, 2);
});
for (const failure of ['unauthorized', 'wrong-remote', 'expired', 'future', 'raw-old', 'candidate', 'topology']) {
  test(`manual recovery rejects ${failure} before any write`, async t => {
    const f = fixture(t, failure), target = f.value.evidence.recovery.owners.main;
    if (failure === 'expired') target.acceptedAt -= 900001;
    if (failure === 'future') target.acceptedAt += 60000;
    if (failure === 'raw-old') target.versionId = target.sourceVersionId;
    if (failure === 'candidate') target.versionId = f.value.evidence.accepted.gachia.versionId;
    if (failure === 'topology') f.current.routes.push('unexpected');
    await assert.rejects(executeManualRecovery(f.options)); assert.equal(f.writes.length, 0);
  });
}
for (const failure of ['second-write', 'lost-response', 'public', 'changed-proof']) {
  test(`manual recovery journals and stops ${failure} without retry`, async t => {
    const f = fixture(t, failure); await assert.rejects(executeManualRecovery(f.options));
    assert.equal(f.writes.length, ['lost-response', 'changed-proof'].includes(failure) ? 1 : 2);
    const rows = f.journal(); assert.equal(rows.at(-1).phase, 'observed_after_failure');
    assert(rows.some(row => row.phase === 'stopped')); assert(!rows.some(row => row.phase === 'recovery_accepted'));
    if (failure === 'lost-response') assert.equal(rows.find(row => row.phase === 'stopped').pendingOperation.versionId, uuid(200));
  });
}
test('renewal topology accepts only known recovery states, never unrelated or split deployments', t => {
  const f = fixture(t), e = f.value.evidence;
  assertRenewalTopology(e, e.baseline, 'promote');
  assert.throws(() => assertRenewalTopology(e, f.current, 'promote'));
  assertRenewalTopology(e, f.current, 'recover');
  f.current.services.gachia.versions[0].version_id = uuid(201); assertRenewalTopology(e, f.current, 'recover');
  f.current.services.gachia.versions[0].version_id = uuid(999); assert.throws(() => assertRenewalTopology(e, f.current, 'recover'), /Unknown/);
  f.current.services.gachia.versions = [{ version_id: uuid(201), percentage: 50 }, { version_id: uuid(101), percentage: 50 }];
  assert.throws(() => assertRenewalTopology(e, f.current, 'recover'));
});
