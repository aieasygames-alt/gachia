import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compareRuntimeObservation, runtimeInspectionContract } from '../src/runtime-inspection.mjs';

const nonce = 'a'.repeat(64);
const expected = { intentId: 'intent', launchAttemptId: 'attempt', runtimeKind: 'docker', instanceId: 'b'.repeat(64),
  image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`, platform: 'linux/arm64', ownerInstanceId: 'controller',
  planDigest: 'd'.repeat(64), ownershipHash: createHash('sha256').update(nonce).digest('hex') };
const observation = { ...expected, ownershipHash: undefined, result: 'found', runtimeOwnershipNonce: nonce, observedAt: 10000, state: 'running' };
test('exact current identity assertions match only and never permit stop/release or verify runtime', () => {
  const result = compareRuntimeObservation(expected, observation, 10000);
  assert.equal(result.status, 'claims_match_only'); assert.deepEqual(result.issues, []);
  assert.equal(result.identityVerified, false); assert.equal(result.capabilities.stop, false); assert.equal(result.capabilities.release, false);
  assert.ok(!JSON.stringify(result).includes(nonce)); assert.ok(!JSON.stringify(result).includes(expected.ownershipHash));
});
test('fault matrix rejects every identity mismatch, nonce spoof, stale clock, absent and ambiguous state', () => {
  for (const key of ['intentId', 'launchAttemptId', 'runtimeKind', 'instanceId', 'image', 'platform', 'ownerInstanceId', 'planDigest']) {
    assert.ok(compareRuntimeObservation(expected, { ...observation, [key]: 'wrong' }, 10000).issues.includes(`${key}_mismatch`));
  }
  for (const patch of [{ result: 'absent' }, { result: 'unknown' }, { runtimeOwnershipNonce: 'e'.repeat(64) },
    { runtimeOwnershipNonce: null }, { observedAt: 4999 }, { observedAt: 10001 }, { observedAt: null }, { state: 'restarting' }]) {
    const result = compareRuntimeObservation(expected, { ...observation, ...patch }, 10000);
    assert.equal(result.status, 'mismatch_or_unknown'); assert.equal(result.capabilities.release, false);
  }
  assert.equal(compareRuntimeObservation(expected, null, 10000).status, 'mismatch_or_unknown');
  for (const missing of [null, undefined, [], 'text']) {
    assert.equal(compareRuntimeObservation(missing, observation, 10000).status, 'mismatch_or_unknown');
  }
  assert.ok(compareRuntimeObservation(expected, { ...observation, observedAt: -1 }, 0).issues.includes('observation_stale'));
  assert.ok(compareRuntimeObservation({ ...expected, instanceId: null }, observation, 10000).issues.includes('expected_instance_missing'));
});
test('inspection specification is digest-stable, redacted and not an inspection or stop authorization', () => {
  const intent = { id: 'intent', status: 'needs_reconciliation', runtimeIdentity: expected, ownerInstanceId: 'controller', planDigest: expected.planDigest };
  const contract = runtimeInspectionContract(intent);
  assert.equal(contract.digest, runtimeInspectionContract(intent).digest);
  assert.equal(contract.capabilities.inspect, false); assert.equal(contract.capabilities.stop, false);
  assert.ok(!JSON.stringify(contract).includes(expected.ownershipHash));
  assert.ok(!JSON.stringify(contract).includes(nonce));
  const missing = runtimeInspectionContract({ ...intent, runtimeIdentity: null });
  assert.equal(missing.expected.instanceId, null); assert.equal(missing.blockers.length, 4);
});
