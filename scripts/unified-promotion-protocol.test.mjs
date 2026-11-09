import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { unifiedService } from './unified-release-assets.mjs';
import { executeUnifiedPromotionProtocol } from './unified-promotion-protocol.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t, owners = ['main']) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-promotion-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const evidenceDirectory = join(run, `unified-main-promotion-${uuid(700)}`), renewalDirectory = join(evidenceDirectory, 'renewal');
  mkdirSync(renewalDirectory, { recursive: true });
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(i + 20), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const value = { preview: false, transportPin: sha, releaseKey: 'b'.repeat(64), changed: ['unified:record'], ownerOrder: owners,
    baseline, evidenceDirectory, renewalDirectory, identityObservedAt: Date.now() - 1000, previewPin: sha, renewalPin: sha, preservedOwners: { genshin: { identityPin: sha } },
    owners: Object.fromEntries(owners.map(owner => {
      const service = unifiedService(owner), target = { moduleSHA256: sha, configPin: sha, artifactPin: sha, referencesPin: sha };
      return [owner, { service, sourceVersionId: baseline.services[service].versions[0].version_id, sourceIdentityPin: sha, candidate: target, recovery: target }];
    })), accepted: Object.fromEntries(['candidate', 'recovery'].map((role, roleIndex) => [role, Object.fromEntries(owners.map((owner, i) => [owner,
      { service: unifiedService(owner), versionId: uuid(100 + roleIndex * 10 + i), moduleSHA256: sha, artifactPin: sha, versionPin: sha,
        evidenceSHA256: sha, moduleProof: { path: '/trusted-wrapper/module.json', pin: sha }, acceptedAt: Date.now() }]))])) };
  const versions = Object.fromEntries(owners.map(owner => [unifiedService(owner), value.accepted.candidate[owner].versionId]));
  let current = structuredClone(baseline), observations = 0;
  const calls = [], transport = {
    snapshot: async () => structuredClone(current),
    verifyVersions: async () => ({ status: 'passed', versions, evidenceSHA256: sha,
      modules: Object.fromEntries(owners.map(owner => [unifiedService(owner), sha])),
      recoveryVersions: Object.fromEntries(owners.map(owner => [unifiedService(owner), value.accepted.recovery[owner].versionId])) }),
    promote: async args => { calls.push(args); current.services[args.service] = { id: uuid(999), versions: [{ version_id: args.versionId, percentage: 100 }] }; return { deploymentId: uuid(999) }; },
    acceptProduction: async () => ({ status: 'passed', releaseKey: value.releaseKey, versions, evidenceSHA256: sha }),
  };
  const args = { run, verify: async () => ({ ...structuredClone(value), identityObservedAt: value.identityObservedAt + observations++ }),
    authorize: async () => value.releaseKey, makeTransport: () => transport };
  const journal = () => readFileSync(join(run, `unified-promotion-${sha}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  return { args, value, calls, transport, journal, current: () => current };
}

for (const owners of [['main'], ['azur-promilia', 'genshin', 'lvmeng', 'nte', 'main']]) test(`separate continuation promotes only accepted scope in order: ${owners}`, async t => {
  const f = fixture(t, owners), result = await executeUnifiedPromotionProtocol(f.args);
  assert.equal(result.status, 'production_accepted'); assert.equal(result.productionPromoted, true); assert.equal(result.sourceAdvanced, false);
  assert.deepEqual(f.calls.map(row => row.owner), owners); assert.equal(f.journal().at(-1).phase, 'production_accepted');
  await assert.rejects(executeUnifiedPromotionProtocol(f.args), /EEXIST/); assert.equal(f.calls.length, owners.length);
});

test('promotion binds the explicit source proof in every journal row and the completed receipt', async t => {
  const f = fixture(t); f.value.sourceHandoff = { path: '/sealed/fresh-source.json', pin: sha };
  const result = await executeUnifiedPromotionProtocol(f.args);
  assert.deepEqual(result.sourceHandoff, f.value.sourceHandoff);
  assert(f.journal().every(row => JSON.stringify(row.sourceHandoff) === JSON.stringify(f.value.sourceHandoff)));
});

test('changed source selection stops before deployment', async t => {
  const f = fixture(t); f.value.sourceHandoff = { path: '/sealed/fresh-source.json', pin: sha };
  const verify = f.args.verify; let calls = 0;
  f.args.verify = async () => { const value = await verify(); if (++calls > 1) value.sourceHandoff.pin = 'c'.repeat(64); return value; };
  await assert.rejects(executeUnifiedPromotionProtocol(f.args), /identity changed/);
  assert.equal(f.calls.length, 0);
});

for (const fault of ['fixture', 'scope', 'stale-source', 'stale-candidate', 'stale-recovery', 'future-preview', 'raw-old-uuid', 'same-uuid',
  'candidate-module', 'recovery-artifact', 'missing-owner', 'missing-module-proof', 'missing-renewal', 'authorization']) test(`refuses before writes: ${fault}`, async t => {
  const f = fixture(t);
  if (fault === 'fixture') f.value.preview = true;
  if (fault === 'scope') f.value.ownerOrder.unshift('router');
  if (fault === 'stale-source') f.value.identityObservedAt = Date.now() - 900001;
  if (fault === 'stale-candidate') f.value.accepted.candidate.main.acceptedAt = Date.now() - 900001;
  if (fault === 'stale-recovery') f.value.accepted.recovery.main.acceptedAt = Date.now() - 900001;
  if (fault === 'future-preview') f.value.accepted.candidate.main.acceptedAt = Date.now() + 60000;
  if (fault === 'raw-old-uuid') f.value.accepted.recovery.main.versionId = f.value.owners.main.sourceVersionId;
  if (fault === 'same-uuid') f.value.accepted.recovery.main.versionId = f.value.accepted.candidate.main.versionId;
  if (fault === 'candidate-module') f.value.accepted.candidate.main.moduleSHA256 = 'c'.repeat(64);
  if (fault === 'recovery-artifact') f.value.accepted.recovery.main.artifactPin = 'c'.repeat(64);
  if (fault === 'missing-owner') delete f.value.accepted.recovery.main;
  if (fault === 'missing-module-proof') delete f.value.accepted.recovery.main.moduleProof;
  if (fault === 'missing-renewal') delete f.value.renewalPin;
  if (fault === 'authorization') f.args.authorize = async () => 'c'.repeat(64);
  await assert.rejects(executeUnifiedPromotionProtocol(f.args)); assert.equal(f.calls.length, 0);
});

for (const fault of ['remote', 'topology', 'changed-review', 'preserved-owner', 'backwards-observation', 'unknown-write', 'public', 'post-write-drift']) test(`durably stops without retry or automatic rollback: ${fault}`, async t => {
  const f = fixture(t); let writes = 0;
  if (fault === 'remote') f.transport.verifyVersions = async () => { throw Error('wrong remote module'); };
  if (fault === 'topology') f.current().routes.push({ unexpected: true });
  if (['changed-review', 'preserved-owner', 'backwards-observation'].includes(fault)) {
    const verify = f.args.verify; let n = 0;
    f.args.verify = async () => { const v = await verify(); if (++n > 1) {
      if (fault === 'changed-review') v.changed.push('extra');
      else if (fault === 'preserved-owner') v.preservedOwners.genshin.identityPin = 'c'.repeat(64);
      else v.identityObservedAt -= 100;
    } return v; };
  }
  if (fault === 'unknown-write') { const promote = f.transport.promote; f.transport.promote = async args => { writes++; await promote(args); throw Error('response lost'); }; }
  if (fault === 'public') f.transport.acceptProduction = async () => { throw Error('public body differs'); };
  if (fault === 'post-write-drift') { const promote = f.transport.promote; f.transport.promote = async args => { await promote(args); f.current().scripts = []; }; }
  await assert.rejects(executeUnifiedPromotionProtocol(f.args));
  const rows = f.journal(); assert.equal(rows.at(-2).phase, 'stopped'); assert.equal(rows.at(-1).phase, 'read_only_reconciliation');
  assert.equal(rows.at(-2).automaticRetry, false); assert.equal(rows.at(-2).automaticRollback, false);
  assert.equal(rows.at(-1).result.cloudWrites, false);
  if (fault === 'unknown-write') { assert.equal(writes, 1); assert(rows.at(-2).pendingOperation); assert.equal(rows.at(-1).result.status, 'candidates_active_acceptance_still_required'); }
  const count = f.calls.length; await assert.rejects(executeUnifiedPromotionProtocol(f.args), /EEXIST/); assert.equal(f.calls.length, count);
});

test('partial multi-owner promotion is reported explicitly without advancing Main', async t => {
  const f = fixture(t, ['nte', 'main']), promote = f.transport.promote;
  f.transport.promote = async args => { if (args.owner === 'main') throw Error('unknown result'); return promote(args); };
  await assert.rejects(executeUnifiedPromotionProtocol(f.args));
  assert.deepEqual(f.calls.map(row => row.owner), ['nte']);
  assert.equal(f.journal().at(-1).result.status, 'partial_promotion_requires_manual_reconciliation');
  assert.equal(f.journal().at(-1).pendingOperation.owner, 'main');
});

for (const fault of ['outside', 'wrong-name', 'foreign-renewal', 'linked-evidence', 'linked-renewal']) test(`promotion refuses unsafe evidence directories: ${fault}`, async t => {
  const f = fixture(t), value = f.value;
  if (fault === 'outside') value.evidenceDirectory = join(tmpdir(), `unified-main-promotion-${uuid(700)}`);
  if (fault === 'wrong-name') value.evidenceDirectory = join(f.args.run, 'arbitrary');
  if (fault === 'foreign-renewal') value.renewalDirectory = join(f.args.run, 'other-renewal');
  if (fault === 'linked-evidence') {
    const original = value.evidenceDirectory;
    value.evidenceDirectory = join(f.args.run, `unified-main-promotion-${uuid(701)}`);
    symlinkSync(original, value.evidenceDirectory); value.renewalDirectory = join(value.evidenceDirectory, 'renewal');
  }
  if (fault === 'linked-renewal') {
    rmSync(value.renewalDirectory, { recursive: true }); symlinkSync(f.args.run, value.renewalDirectory);
  }
  await assert.rejects(executeUnifiedPromotionProtocol(f.args)); assert.equal(f.calls.length, 0);
});
