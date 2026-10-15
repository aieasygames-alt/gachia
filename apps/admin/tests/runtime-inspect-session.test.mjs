import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixedInspectionEnvironment, simulateInspectionSession } from '../src/runtime-inspect-session.mjs';

const expected = { runtimeKind: 'docker', instanceId: 'a'.repeat(64), image: `registry.example.com/preview@sha256:${'b'.repeat(64)}` };
const snapshot = { status: 'identity_recorded', leaseUntil: 20000, attempt: 'attempt', owner: 'owner' };
const options = { expected, snapshot, readSnapshot: () => snapshot, executable: '/usr/bin/docker', profileId: 'docker_linux_system',
  simulatedOnly: true, now: () => 10000, simulate: async () => ({ exitCode: 1 }) };
test('fixed daemon profiles pin unix endpoints and do not inherit host environment', () => {
  const profile = fixedInspectionEnvironment(expected, '/usr/bin/docker', 'docker_linux_system');
  assert.deepEqual(profile.env, { LANG: 'C', LC_ALL: 'C' }); assert.equal(profile.executableNow, false);
  assert.equal(profile.commands[0][1], 'unix:///var/run/docker.sock');
  assert.ok(!JSON.stringify(profile.env).includes('HOME'));
  assert.throws(() => fixedInspectionEnvironment(expected, '/usr/bin/docker', 'tcp://example.com'));
  assert.throws(() => fixedInspectionEnvironment(expected, '/usr/bin/docker', 'podman_linux_system'));
  const podman = fixedInspectionEnvironment({ ...expected, runtimeKind: 'podman' }, '/usr/bin/podman', 'podman_linux_system');
  assert.equal(podman.endpoint, 'unix:///run/podman/podman.sock');
});
test('explicit simulation only; result remains unverified and simulator errors are redacted', async () => {
  await assert.rejects(simulateInspectionSession({ ...options, simulatedOnly: false }));
  const result = await simulateInspectionSession(options);
  assert.equal(result.simulated, true); assert.equal(result.identityVerified, false); assert.equal(result.capabilities.stop, false);
  const failed = await simulateInspectionSession({ ...options, simulate: async () => { throw new Error('SECRET'); } });
  assert.deepEqual(failed.issues, ['simulator_failed']); assert.ok(!JSON.stringify(failed).includes('SECRET'));
});
test('before/during/after snapshot drift and lease expiry reject session without state changes', async () => {
  const originalSnapshot = structuredClone(snapshot);
  const before = await simulateInspectionSession({ ...options, readSnapshot: () => ({ ...snapshot, owner: 'other' }) });
  assert.deepEqual(before.issues, ['snapshot_changed_before_inspection']);
  for (const step of ['container', 'image']) {
    let current = snapshot; const calls = [];
    const changed = await simulateInspectionSession({ ...options, readSnapshot: () => current, simulate: async (request) => {
      calls.push(request.step); if (request.step === step) current = { ...snapshot, attempt: 'replacement' }; return { exitCode: 1 };
    } });
    assert.equal(changed.status, 'unknown'); assert.ok(changed.issues[0].includes('changed'));
    if (step === 'container') assert.deepEqual(calls, ['container']);
  }
  let time = 10000;
  const expired = await simulateInspectionSession({ ...options, now: () => time, simulate: async () => { time = 20000; return { exitCode: 1 }; } });
  assert.deepEqual(expired.issues, ['snapshot_or_lease_changed_during_inspection']);
  assert.deepEqual(snapshot, originalSnapshot);
});

test('simulation leaves caller identity and snapshot untouched and grants no capabilities', async () => {
  const identity = Object.freeze({ ...expected }); const state = Object.freeze({ ...snapshot });
  const report = await simulateInspectionSession({ ...options, expected: identity, snapshot: state,
    readSnapshot: () => state, simulate: async () => ({ exitCode: 1, stderr: 'fixture failure' }) });
  assert.deepEqual(identity, expected); assert.deepEqual(state, snapshot);
  assert.equal(report.identityVerified, false); assert.equal(report.simulated, true);
  assert.ok(Object.values(report.capabilities).every((value) => value === false));
});
