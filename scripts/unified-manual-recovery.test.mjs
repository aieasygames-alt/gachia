import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { executeUnifiedManualRecovery } from './unified-manual-recovery.mjs';

const sha = 'a'.repeat(64), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(t) {
  const run = realpathSync(mkdtempSync(join(tmpdir(), 'unified-manual-recovery-'))); t.after(() => rmSync(run, { recursive: true, force: true }));
  const directory = join(run, `unified-main-promotion-${uuid(700)}`), renewalDirectory = join(directory, 'renewal');
  mkdirSync(renewalDirectory, { recursive: true });
  const baseline = { services: Object.fromEntries(SERVICES.map((service, i) => [service, { id: uuid(20 + i), versions: [{ version_id: uuid(i + 1), percentage: 100 }] }])),
    settings: {}, bindings: {}, subdomains: {}, scripts: SERVICES, routes: [], domains: [] };
  const recovery = { service: 'gachia', versionId: uuid(101), moduleSHA256: sha, artifactPin: sha, versionPin: sha,
    evidenceSHA256: sha, moduleProof: { path: '/trusted/module.json', pin: sha }, acceptedAt: Date.now(), parserVersion: 'streaming-v2', parserPin: sha };
  const rows = [{ phase: 'baseline', ownerOrder: ['main'], directory, renewalDirectory, baseline,
    accepted: { candidate: { main: { ...recovery, versionId: uuid(100) } }, recovery: { main: recovery } } },
    { phase: 'remote_versions_verified' }, { phase: 'promotion_intent', owner: 'main', service: 'gachia', versionId: uuid(100) },
    { phase: 'stopped', automaticRetry: false, automaticRollback: false }, { phase: 'observation_unavailable' }]
    .map(row => ({ at: new Date().toISOString(), releaseKey: sha, transportPin: sha, previewPin: sha, renewalPin: sha, ...row }));
  const raw = rows.map(JSON.stringify).join('\n') + '\n', originalFile = join(run, `unified-promotion-${sha}.jsonl`);
  writeFileSync(originalFile, raw);
  const evidenceDirectory = join(run, `unified-main-recovery-${uuid(701)}`); mkdirSync(evidenceDirectory);
  const value = { releaseKey: sha, transportPin: sha, promotionJournalPin: digest(raw), renewalPin: sha, recovery: structuredClone(recovery),
    identityObservedAt: Date.now(), evidenceDirectory };
  const current = structuredClone(baseline); current.services.gachia = { id: uuid(999), versions: [{ version_id: uuid(100), percentage: 100 }] };
  const calls = [], transport = { snapshot: async () => structuredClone(current),
    verifyVersions: async () => ({ status: 'passed', versions: { gachia: uuid(101) }, modules: { gachia: sha }, evidenceSHA256: sha }),
    promote: async args => { calls.push(args); current.services.gachia = { id: uuid(998), versions: [{ version_id: args.versionId, percentage: 100 }] }; return { deploymentId: uuid(998) }; },
    acceptProduction: async () => ({ status: 'passed', versions: { gachia: uuid(101) }, releaseKey: sha, evidenceSHA256: sha }) };
  const args = { run, verify: async () => structuredClone(value), authorize: async () => sha, makeTransport: () => transport };
  const journal = () => readFileSync(join(run, `unified-manual-recovery-${sha}.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  return { args, value, baseline, current, calls, transport, journal, originalFile, originalBytes: raw, rows };
}

test('only the known failed candidate moves to its compatible recovery once, with public acceptance', async t => {
  const f = fixture(t), result = await executeUnifiedManualRecovery(f.args);
  assert.equal(result.status, 'recovery_accepted'); assert.equal(result.sourceAdvanced, false);
  assert.deepEqual(f.calls, [{ owner: 'main', service: 'gachia', versionId: uuid(101), releaseKey: sha }]);
  assert.deepEqual(f.journal().map(row => row.phase), ['baseline', 'remote_versions_verified', 'recovery_intent', 'recovered', 'recovery_accepted']);
  assert.equal(readFileSync(f.originalFile, 'utf8'), f.originalBytes);
  await assert.rejects(executeUnifiedManualRecovery(f.args)); assert.equal(f.calls.length, 1);
});

for (const fault of ['baseline-active', 'already-recovered', 'unknown', 'split', 'other-service', 'route', 'raw-old-uuid', 'candidate-uuid',
  'module', 'artifact', 'missing-module', 'expired-preview', 'future-preview', 'expired-source', 'future-source', 'authorization', 'no-intent', 'completed-publication']) {
  test(`recovery rejects without writes: ${fault}`, async t => {
    const f = fixture(t);
    if (fault === 'baseline-active') f.current.services.gachia = f.baseline.services.gachia;
    if (fault === 'already-recovered') f.current.services.gachia.versions[0].version_id = uuid(101);
    if (fault === 'unknown') f.current.services.gachia.versions[0].version_id = uuid(555);
    if (fault === 'split') f.current.services.gachia.versions.push({ version_id: uuid(101), percentage: 50 });
    if (fault === 'other-service') f.current.services['gachia-game-nte'].id = uuid(888);
    if (fault === 'route') f.current.routes.push({ foreign: true });
    if (fault === 'raw-old-uuid') f.value.recovery.versionId = f.baseline.services.gachia.versions[0].version_id;
    if (fault === 'candidate-uuid') f.value.recovery.versionId = uuid(100);
    if (fault === 'module') f.value.recovery.moduleSHA256 = 'b'.repeat(64);
    if (fault === 'artifact') f.value.recovery.artifactPin = 'b'.repeat(64);
    if (fault === 'missing-module') delete f.value.recovery.moduleProof;
    if (fault === 'expired-preview') f.value.recovery.acceptedAt = Date.now() - 900001;
    if (fault === 'future-preview') f.value.recovery.acceptedAt = Date.now() + 60000;
    if (fault === 'expired-source') f.value.identityObservedAt = Date.now() - 900001;
    if (fault === 'future-source') f.value.identityObservedAt = Date.now() + 60000;
    if (fault === 'authorization') f.args.authorize = () => 'b'.repeat(64);
    if (['no-intent', 'completed-publication'].includes(fault)) {
      if (fault === 'no-intent') f.rows.splice(2, 1);
      else {
        f.rows.splice(3, 2, { ...f.rows[2], phase: 'promoted' }, { ...f.rows[2], phase: 'production_accepted' });
      }
      const raw = f.rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(f.originalFile, raw); f.value.promotionJournalPin = digest(raw);
    }
    await assert.rejects(executeUnifiedManualRecovery(f.args)); assert.equal(f.calls.length, 0);
  });
}

for (const fault of ['remote', 'lost-response', 'public', 'changed-evidence', 'topology-before-write', 'post-write-drift']) test(`recovery stops durably with no automatic retry: ${fault}`, async t => {
  const f = fixture(t), promote = f.transport.promote;
  if (fault === 'remote') f.transport.verifyVersions = async () => ({ status: 'passed', versions: { gachia: uuid(555) }, modules: { gachia: sha }, evidenceSHA256: sha });
  if (fault === 'lost-response') f.transport.promote = async args => { await promote(args); throw Error('response lost'); };
  if (fault === 'public') f.transport.acceptProduction = async () => { throw Error('public body differs'); };
  if (fault === 'changed-evidence') { let n = 0; f.args.verify = async () => ({ ...structuredClone(f.value), renewalPin: ++n > 1 ? 'b'.repeat(64) : sha }); }
  if (fault === 'topology-before-write') { let n = 0; f.transport.snapshot = async () => { if (++n > 1) f.current.routes.push({ unexpected: true }); return structuredClone(f.current); }; }
  if (fault === 'post-write-drift') f.transport.promote = async args => { await promote(args); f.current.scripts = []; };
  await assert.rejects(executeUnifiedManualRecovery(f.args));
  assert.equal(f.journal().at(-2).phase, 'stopped'); assert.equal(f.journal().at(-2).automaticRetry, false);
  assert.equal(f.journal().at(-2).automaticRollback, false); assert.equal(f.journal().at(-1).phase, 'read_only_reconciliation');
  const count = f.calls.length;
  await assert.rejects(executeUnifiedManualRecovery(f.args)); assert.equal(f.calls.length, count);
  assert.equal(readFileSync(f.originalFile, 'utf8'), f.originalBytes);
});
