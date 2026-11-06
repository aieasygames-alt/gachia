import assert from 'node:assert/strict';
import { appendFileSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { assertTopology, reconcileRelease } from './desktop-cloud-release.mjs';
import { withRunLock } from './desktop-publish.mjs';
import { digest } from './desktop-release-assets.mjs';
import { readUnifiedMainPromotionJournal } from './unified-promotion-reconciliation.mjs';

const SHA = /^[a-f0-9]{64}$/;
function checkRecovery(run, value) {
  for (const pin of [value.releaseKey, value.transportPin, value.promotionJournalPin, value.renewalPin]) assert(SHA.test(pin));
  const original = readUnifiedMainPromotionJournal({ run, pin: value.promotionJournalPin, transportPin: value.transportPin, releaseKey: value.releaseKey });
  assert(original.stopped && original.rows.some(row => row.phase === 'promotion_intent'), 'Only a recorded stopped promotion can be recovered');
  assert(Number.isSafeInteger(value.identityObservedAt) && value.identityObservedAt <= Date.now()
    && Date.now() - value.identityObservedAt < 900000, 'Recovery source observation expired');
  const proof = value.recovery, old = original.first.accepted.recovery.main;
  assert.equal(proof.service, 'gachia'); assert.equal(proof.versionId, original.expected.recovery);
  assert.notEqual(proof.versionId, original.expected.candidate);
  for (const key of ['moduleSHA256', 'artifactPin', 'versionPin', 'moduleProof', 'parserVersion', 'parserPin']) {
    assert.deepEqual(proof[key], old[key], 'Recovery cannot replace the accepted compatible version identity');
  }
  for (const pin of [proof.moduleSHA256, proof.artifactPin, proof.versionPin, proof.moduleProof?.pin, proof.evidenceSHA256]) assert(SHA.test(pin));
  assert(Number.isSafeInteger(proof.acceptedAt) && proof.acceptedAt <= Date.now() && Date.now() - proof.acceptedAt < 900000, 'Compatible recovery preview expired');
  assert.equal(realpathSync(run), resolve(run));
  assert.equal(dirname(value.evidenceDirectory), run, 'Recovery evidence must be a direct run child');
  assert(/^unified-main-recovery-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(basename(value.evidenceDirectory)));
  assert.equal(realpathSync(value.evidenceDirectory), resolve(value.evidenceDirectory));
  return original;
}

// Internal protocol only. A production adapter must independently revalidate
// sealed content, module identity and fresh HTTP; no CLI exposes injection.
export async function executeUnifiedManualRecovery({ run, verify, authorize, makeTransport }) {
  return withRunLock(run, async () => {
    const initial = structuredClone(await verify()), original = checkRecovery(run, initial);
    assert.equal(await authorize(initial), initial.releaseKey, 'Explicit recovery authorization required');
    const transport = makeTransport(initial), observed = await transport.snapshot();
    const candidate = { gachia: { versionId: original.expected.candidate } };
    assert.equal(reconcileRelease(original.first.baseline, observed, candidate).status, 'candidates_active_acceptance_still_required',
      'Only the exact known candidate may transition to compatible recovery');
    const journal = join(run, `unified-manual-recovery-${initial.transportPin}.jsonl`);
    writeFileSync(journal, '', { flag: 'wx', mode: 0o600 });
    const record = row => appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), releaseKey: initial.releaseKey,
      transportPin: initial.transportPin, promotionJournalPin: initial.promotionJournalPin, renewalPin: initial.renewalPin, ...row }) + '\n', { flush: true });
    const versions = { gachia: original.expected.recovery };
    let pendingOperation, identityObservedAt = initial.identityObservedAt;
    const revalidate = async () => {
      const current = await verify(); checkRecovery(run, current);
      assert(current.identityObservedAt >= identityObservedAt, 'Recovery source observation moved backwards');
      assert.deepEqual({ ...current, identityObservedAt: initial.identityObservedAt }, initial, 'Recovery evidence changed');
      identityObservedAt = current.identityObservedAt;
    };
    record({ phase: 'baseline', observed, originalBaseline: original.first.baseline, recovery: initial.recovery, directory: initial.evidenceDirectory });
    try {
      await revalidate(); assertTopology(observed, await transport.snapshot());
      const remote = await transport.verifyVersions();
      assert.equal(remote.status, 'passed'); assert.deepEqual(remote.versions, versions);
      assert.deepEqual(remote.modules, { gachia: initial.recovery.moduleSHA256 }); assert(SHA.test(remote.evidenceSHA256));
      record({ phase: 'remote_versions_verified', proof: remote });
      await revalidate(); assertTopology(observed, await transport.snapshot());
      pendingOperation = { owner: 'main', service: 'gachia', versionId: original.expected.recovery };
      record({ phase: 'recovery_intent', ...pendingOperation });
      const result = await transport.promote({ ...pendingOperation, releaseKey: initial.releaseKey });
      assertTopology(observed, await transport.snapshot(), versions);
      record({ phase: 'recovered', ...pendingOperation, result }); pendingOperation = undefined;
      const proof = await transport.acceptProduction();
      assert.equal(proof.status, 'passed'); assert.equal(proof.releaseKey, initial.releaseKey); assert.deepEqual(proof.versions, versions);
      assert(SHA.test(proof.evidenceSHA256)); await revalidate(); assertTopology(observed, await transport.snapshot(), versions);
      record({ phase: 'recovery_accepted', proof });
      return { schemaVersion: 1, kind: 'unified_manual_compatible_recovery', status: 'recovery_accepted', versions,
        releaseKey: initial.releaseKey, transportPin: initial.transportPin, journalPin: digest(readFileSync(journal)), sourceAdvanced: false };
    } catch (error) {
      record({ phase: 'stopped', error: error.message, pendingOperation, automaticRetry: false, automaticRollback: false });
      try {
        record({ phase: 'read_only_reconciliation', result: reconcileRelease(original.first.baseline, await transport.snapshot(),
          { gachia: { versionId: original.expected.recovery } }) });
      } catch (failure) { record({ phase: 'observation_unavailable', error: failure.message }); }
      throw error;
    }
  });
}
