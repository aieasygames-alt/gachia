import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runtimeInspectCommands, parseRuntimeInspectResults } from '../src/runtime-inspect-adapter.mjs';

const nonce = 'a'.repeat(64);
const expected = { runtimeKind: 'docker', instanceId: 'b'.repeat(64), image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
  platform: 'linux/arm64', intentId: 'intent', launchAttemptId: 'attempt', ownerInstanceId: 'owner', planDigest: 'd'.repeat(64),
  ownershipHash: createHash('sha256').update(nonce).digest('hex') };
const container = { Id: expected.instanceId, Image: `sha256:${'e'.repeat(64)}`, Config: { Env: ['SECRET=private'], Labels: {
  'com.gachia.intent': 'intent', 'com.gachia.attempt': 'attempt', 'com.gachia.owner': 'owner', 'com.gachia.plan-digest': expected.planDigest,
  'com.gachia.runtime-nonce': nonce } }, State: { Status: 'running', Running: true, Paused: false, Dead: false, Restarting: false } };
const image = { Id: container.Image, RepoDigests: [expected.image], Os: 'linux', Architecture: 'arm64' };
const result = (value) => ({ exitCode: 0, stdout: JSON.stringify([value]), stderr: '' });
const time = { startedAt: 10000, finishedAt: 10100, now: 10200 };
test('missing expected identity returns an unknown result without leaking inspect data', () => {
  for (const value of [null, undefined, [], 'text']) {
    const parsed = parseRuntimeInspectResults(value, result(container), result(image), time);
    assert.equal(parsed.status, 'unknown');
    assert.deepEqual(parsed.issues, ['invalid_expected_identity']);
    assert.equal(parsed.capabilities.execute, false);
    assert.ok(!JSON.stringify(parsed).includes('SECRET'));
  }
});
test('fixed commands use full IDs and digest references, no shell or execution', () => {
  const commands = runtimeInspectCommands(expected, '/usr/local/bin/docker');
  assert.deepEqual(commands.commands[0], ['container', 'inspect', expected.instanceId]);
  assert.equal(commands.shell, false); assert.equal(commands.executableNow, false);
  for (const patch of [{ instanceId: '--help' }, { image: 'node:latest' }, { runtimeKind: 'other' }]) assert.throws(() => runtimeInspectCommands({ ...expected, ...patch }, '/usr/local/bin/docker'));
  assert.throws(() => runtimeInspectCommands(expected, '/tmp/docker'));
});
test('Docker and Podman fixture JSON matching yields claims only, without secrets or raw output', () => {
  for (const runtimeKind of ['docker', 'podman']) {
    const parsed = parseRuntimeInspectResults({ ...expected, runtimeKind }, result(container), result(image), time);
    assert.equal(parsed.status, 'claims_match_only'); assert.equal(parsed.identityVerified, false); assert.equal(parsed.capabilities.stop, false);
    assert.equal(parsed.overallStatus, 'blocked'); assert.equal(parsed.settings.status, 'settings_mismatch_or_unknown');
    assert.ok(!JSON.stringify(parsed).includes(nonce)); assert.ok(!JSON.stringify(parsed).includes('SECRET')); assert.ok(!JSON.stringify(parsed).includes('private'));
  }
});
test('failed commands, malformed/multiple outputs, limits and clock ambiguity stay unknown, not absent', () => {
  for (const patch of [{ exitCode: 1, stderr: 'No such container SECRET' }, { signal: 'SIGTERM' }, { timedOut: true }, { truncated: true },
    { stdout: '{' }, { stdout: '[]' }, { stdout: '[{},{}]' }, { stdout: 'x'.repeat(1024 * 1024 + 1) }, { stderr: 'warning' }]) {
    const parsed = parseRuntimeInspectResults(expected, { ...result(container), ...patch }, result(image), time);
    assert.equal(parsed.status, 'unknown'); assert.equal(parsed.capabilities.release, false); assert.ok(!JSON.stringify(parsed).includes('SECRET'));
  }
  for (const patch of [{ now: 16000 }, { finishedAt: 9000 }, { startedAt: null }, { now: 9999 }]) assert.equal(parseRuntimeInspectResults(expected, result(container), result(image), { ...time, ...patch }).status, 'unknown');
});
test('mismatched instance/image/platform/labels and inconsistent state deny matching', () => {
  for (const patch of [{ Id: 'short' }, { Image: 'sha256:wrong' }, { Config: {} }, { Config: { Labels: {} } },
    { State: { ...container.State, Restarting: true } }, { State: { ...container.State, Running: false } }]) {
    assert.notEqual(parseRuntimeInspectResults(expected, result({ ...container, ...patch }), result(image), time).status, 'claims_match_only');
  }
  for (const patch of [{ RepoDigests: [] }, { Architecture: 'amd64' }, { Id: 'wrong' }, { Variant: 'v7' }]) assert.equal(parseRuntimeInspectResults(expected, result(container), result({ ...image, ...patch }), time).status, 'unknown');
});
