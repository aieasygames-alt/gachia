import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertTopology } from './desktop-cloud-release.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { readReleaseJournal } from './desktop-release-readiness.mjs';
import { verifyRenewedEvidence } from './desktop-evidence-renewal.mjs';
import { createPromotionTransport } from './desktop-promotion-transport.mjs';
import { assertReleaseScope } from './desktop-release-scope.mjs';

export async function executeManualRecovery({ run, operationId, verify, authorize, transport }) {
  return withRunLock(run, async () => {
    assert(/^[a-f0-9]{16}$/.test(operationId));
    const initial = structuredClone(await verify());
    assert.equal(initial.evidence.plan.preview, false);
    const scope = assertReleaseScope(initial.evidence.plan, initial.evidence.manifest.owners);
    assert.deepEqual(Object.keys(initial.evidence.accepted).sort(), [...scope.services].sort());
    assert.deepEqual(Object.keys(initial.evidence.recovery.owners).sort(), [...scope.owners].sort());
    const checkTargets = () => {
      for (const owner of initial.evidence.plan.owners) {
        const service = initial.evidence.manifest.owners[owner].service, target = initial.evidence.recovery.owners[owner];
        assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(target.versionId));
        assert.notEqual(target.versionId, target.sourceVersionId, 'Raw old UUID recovery forbidden');
        assert.notEqual(target.versionId, initial.evidence.accepted[service].versionId, 'Candidate UUID is not recovery');
        assert(Number.isSafeInteger(target.acceptedAt) && target.acceptedAt <= Date.now() && Date.now() - target.acceptedAt < 900000, 'Recovery expired');
      }
    };
    checkTargets();
    assert.equal(await authorize(initial), initial.evidence.plan.releaseKey);
    const journal = join(run, `manual-recovery-${operationId}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.evidence.plan.releaseKey, ...row }) + '\n', { flush: true });
    const changed = {}; let pendingOperation;
    record({ phase: 'baseline', observed: initial.observed, renewalId: operationId });
    try {
      assertTopology(initial.observed, await transport.snapshot());
      const remote = await transport.verifyVersions();
      assert.equal(remote.status, 'passed');
      assert.deepEqual(remote.versions, Object.fromEntries(initial.evidence.plan.owners.map(owner =>
        [initial.evidence.manifest.owners[owner].service, initial.evidence.recovery.owners[owner].versionId])));
      assert(/^[a-f0-9]{64}$/.test(remote.evidenceSHA256));
      record({ phase: 'remote_versions_verified', proof: remote });
      for (const owner of initial.evidence.plan.owners) {
        assert.deepEqual(await verify(), initial, 'Recovery evidence changed');
        checkTargets();
        assertTopology(initial.observed, await transport.snapshot(), changed);
        const service = initial.evidence.manifest.owners[owner].service;
        const target = initial.evidence.recovery.owners[owner];
        assert.notEqual(target.versionId, target.sourceVersionId, 'Raw old UUID recovery forbidden');
        assert.notEqual(target.versionId, initial.evidence.accepted[service].versionId, 'Candidate UUID is not recovery');
        assert(Number.isSafeInteger(target.acceptedAt) && target.acceptedAt <= Date.now() && Date.now() - target.acceptedAt < 900000, 'Recovery expired');
        pendingOperation = { owner, service, versionId: target.versionId, releaseKey: initial.evidence.plan.releaseKey };
        record({ phase: 'recovery_intent', ...pendingOperation });
        await transport.promote(pendingOperation); changed[service] = target.versionId;
        assertTopology(initial.observed, await transport.snapshot(), changed);
        record({ phase: 'recovered', ...pendingOperation }); pendingOperation = undefined;
      }
      const proof = await transport.acceptProduction();
      assert.equal(proof.status, 'passed'); assert.deepEqual(proof.versions, changed);
      assert.equal(proof.releaseKey, initial.evidence.plan.releaseKey);
      assert(/^[a-f0-9]{64}$/.test(proof.evidenceSHA256));
      assert.deepEqual(await verify(), initial);
      assertTopology(initial.observed, await transport.snapshot(), changed);
      record({ phase: 'recovery_accepted', proof });
      return { status: 'recovery_accepted', versions: changed, journalSHA256: digest(readFileSync(journal)) };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, pendingOperation, changed });
      try { record({ phase: 'observed_after_failure', snapshot: await transport.snapshot() }); }
      catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}

export async function recoverDesktopRelease(input) {
  assert(process.platform === 'darwin' && !process.env.CI && !process.env.GITHUB_ACTIONS, 'Desktop only');
  const verify = async () => {
    const value = await verifyRenewedEvidence(input, 'recover');
    verifyRecoveryPromotionJournal(input, value);
    return value;
  };
  return executeVerifiedManualRecovery({ input, verify, request: fetch });
}

export function verifyRecoveryPromotionJournal(input, value) {
  assert(/^[a-f0-9]{64}$/.test(input.promotionJournalPin), 'Pinned promotion journal required');
  const journal = readReleaseJournal(join(input.run, `promotion-${value.evidence.manifest.retentionId}.jsonl`),
    { releaseKey: input.releaseKey }, input.promotionJournalPin);
  assert(!journal.damaged, 'Damaged promotion journal needs manual audit');
  assert(journal.rows.some(row => row.phase === 'promotion_intent'), 'No recorded promotion to recover');
  assert.equal(journal.rows[0].phase, 'baseline');
  assertTopology(value.evidence.baseline, journal.rows[0].baseline);
  for (const [service, proof] of Object.entries(value.evidence.accepted)) assert.equal(journal.rows[0].accepted[service].versionId, proof.versionId);
  for (const row of journal.rows.filter(row => row.phase === 'promotion_intent')) {
    const expected = value.evidence.manifest.owners[row.owner];
    assert(expected, 'Unknown promotion owner');
    assert.equal(row.service, expected.service);
    assert.equal(row.versionId, value.evidence.accepted[expected.service].versionId, 'Promotion intent belongs to another candidate');
  }
  assert.equal(input.releaseKey, value.evidence.plan.releaseKey);
  return journal;
}


// Internal composition seam; the desktop wrapper never accepts injected verifiers.
export async function executeVerifiedManualRecovery({ input, verify, request }) {
  const initial = await verify(), frame = structuredClone(initial.evidence), fallback = structuredClone(initial.sealed.manifest);
  for (const owner of frame.plan.owners) {
    const row = initial.sealed.manifest.owners[owner], service = row.service;
    frame.manifest.owners[owner] = { ...row, artifactSHA256: row.recoveryArtifactSHA256 };
    frame.accepted[service] = { ...frame.recovery.owners[owner], service, status: 'passed', releaseKey: frame.plan.releaseKey, artifactSHA256: row.recoveryArtifactSHA256 };
    fallback.owners[owner].candidateArtifactSHA256 = row.recoveryArtifactSHA256;
  }
  const actual = createPromotionTransport({ run: input.run, evidence: frame, candidateDirectory: initial.sealed.directory,
    recoveryDirectory: initial.sealed.directory, recoveryManifest: fallback, token: input.token, request,
    evidenceDirectoryName: `manual-recovery-evidence-${input.renewalId}` });
  return executeManualRecovery({ run: input.run, operationId: input.renewalId, verify, authorize: () => input.releaseKey,
    transport: { snapshot: actual.snapshot, verifyVersions: () => actual.verifyVersions(frame), promote: actual.promote,
      acceptProduction: () => actual.acceptProduction(frame) } });
}
