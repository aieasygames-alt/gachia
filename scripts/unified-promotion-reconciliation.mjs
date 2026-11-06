import assert from 'node:assert/strict';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { activeVersion, reconcileRelease } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { exactUnifiedPreviewOrigin } from './unified-version-preview.mjs';
import { assertUnifiedPromotionDirectories } from './unified-promotion-protocol.mjs';

const SHA = /^[a-f0-9]{64}$/;
export function readUnifiedMainPromotionJournal({ run, pin, transportPin, releaseKey }) {
  assert(SHA.test(pin) && SHA.test(transportPin) && SHA.test(releaseKey));
  const file = join(run, `unified-promotion-${transportPin}.jsonl`);
  assert.equal(realpathSync(file), resolve(file));
  const stat = statSync(file); assert(stat.isFile() && stat.size > 0 && stat.size <= 16 * 1024 * 1024);
  const raw = readFileSync(file); assert.equal(digest(raw), pin, 'Promotion journal changed'); assert(raw.toString().endsWith('\n'));
  const rows = raw.toString().trimEnd().split('\n').map(JSON.parse), first = rows[0];
  assert.equal(first.phase, 'baseline'); assert.deepEqual(first.ownerOrder, ['main']);
  assertUnifiedPromotionDirectories(run, first.directory, first.renewalDirectory);
  assert.equal(rows.filter(row => row.phase === 'baseline').length, 1);
  const phases = ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted', 'production_accepted', 'stopped', 'read_only_reconciliation', 'observation_unavailable'];
  let at = -Infinity;
  for (const row of rows) {
    assert(phases.includes(row.phase), 'Unreviewed promotion phase');
    assert.equal(row.releaseKey, releaseKey); assert.equal(row.transportPin, transportPin);
    assert.equal(row.previewPin, first.previewPin); assert.equal(row.renewalPin, first.renewalPin);
    const time = Date.parse(row.at); assert(time >= at && time <= Date.now()); at = time;
  }
  assert(SHA.test(first.previewPin) && SHA.test(first.renewalPin));
  const sequence = rows.map(row => row.phase);
  const progress = ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted'];
  const stopped = sequence.indexOf('stopped');
  if (stopped === -1) assert.deepEqual(sequence, [...progress, 'production_accepted'], 'Incomplete promotion journal');
  else {
    assert(stopped >= 1 && stopped <= progress.length, 'Invalid stopped promotion');
    assert.deepEqual(sequence.slice(0, stopped), progress.slice(0, stopped), 'Invalid promotion chronology');
    assert.equal(rows[stopped].automaticRetry, false); assert.equal(rows[stopped].automaticRollback, false);
    assert.equal(sequence.length, stopped + 2, 'Incomplete stopped promotion');
    assert(['read_only_reconciliation', 'observation_unavailable'].includes(sequence.at(-1)), 'Missing stopped observation');
  }
  const expected = /** @type {{candidate: string, recovery: string}} */ ({});
  for (const role of ['candidate', 'recovery']) {
    assert.deepEqual(Object.keys(first.accepted[role]), ['main']);
    const proof = first.accepted[role].main;
    assert.equal(proof.service, 'gachia'); exactUnifiedPreviewOrigin('gachia', proof.versionId);
    assert.notEqual(proof.versionId, activeVersion(first.baseline, 'gachia'));
    expected[role] = proof.versionId;
  }
  assert.notEqual(expected.candidate, expected.recovery);
  for (const phase of ['promotion_intent', 'promoted']) {
    const writes = rows.filter(row => row.phase === phase); assert(writes.length <= 1, 'Repeated Main promotion journal');
    for (const row of writes) {
      assert.equal(row.owner, 'main'); assert.equal(row.service, 'gachia'); assert.equal(row.versionId, expected.candidate);
    }
  }
  return { file, rows, first, expected, stopped: stopped !== -1 };
}

// Diagnostic only: even a known candidate/recovery allocation does not grant
// acceptance, renewal, recovery, source advance or any other write capability.
export async function reconcileUnifiedMainPromotion(input, snapshot) {
  const original = readUnifiedMainPromotionJournal(input), current = await snapshot();
  readUnifiedMainPromotionJournal(input);
  const candidate = reconcileRelease(original.first.baseline, current, { gachia: { versionId: original.expected.candidate } });
  const recovery = reconcileRelease(original.first.baseline, current, { gachia: { versionId: original.expected.recovery } });
  const status = candidate.status === 'baseline_active' ? 'baseline_active'
    : candidate.status === 'candidates_active_acceptance_still_required' ? 'candidate_active_public_acceptance_still_required'
    : recovery.status === 'candidates_active_acceptance_still_required' ? 'compatible_recovery_active_acceptance_still_required'
    : 'drift_requires_manual_reconciliation';
  return { schemaVersion: 1, kind: 'unified_main_promotion_read_only_reconciliation', status,
    releaseKey: input.releaseKey, transportPin: input.transportPin, journalPin: input.pin, observedAt: new Date().toISOString(),
    expected: original.expected, current, candidate, recovery, cloudWrites: false, automaticRetry: false, automaticRollback: false,
    acceptanceGranted: false, sourceAdvanced: false };
}
