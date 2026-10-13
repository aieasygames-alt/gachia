import { FactError } from './facts.mjs';
import { compareRuntimeObservation } from './runtime-inspection.mjs';
import { compareRuntimeSettings } from './runtime-settings.mjs';

const idPattern = /^[a-f0-9]{64}$/;
const imagePattern = /^[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/;
const paths = {
  docker: ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', '/usr/bin/docker'],
  podman: ['/opt/homebrew/bin/podman', '/usr/local/bin/podman', '/usr/bin/podman'],
};

export function runtimeInspectCommands(expected, executable) {
  if (!paths[expected.runtimeKind]?.includes(executable) || !idPattern.test(expected.instanceId ?? '') ||
    typeof expected.image !== 'string' || expected.image.length > 300 || !imagePattern.test(expected.image) || expected.image.includes('..') || expected.image.includes('//')) throw new FactError('Invalid fixed inspection target');
  return { version: 'runtime-inspect-command-profile-v1', executable,
    commands: [ ['container', 'inspect', expected.instanceId], ['image', 'inspect', expected.image] ],
    shell: false, timeoutMs: 5000, maximumOutputBytesPerCommand: 1024 * 1024,
    environment: 'future_runner_must_not_inherit_runtime_context_or_credentials',
    executableNow: false, limitations: ['No runner or daemon/context pinning implemented', 'Raw inspect JSON may contain secrets; never log, persist or export it'] };
}

// Parse in memory only; return codes/comparison, never raw Env, labels or nonce.
export function parseRuntimeInspectResults(expected, containerResult, imageResult, { startedAt, finishedAt, now = Date.now() } = {}) {
  const denied = (code) => ({ version: 'runtime-inspect-parser-v1', status: 'unknown', issues: [code],
    identityVerified: false, capabilities: { inspect: false, stop: false, release: false, execute: false, publish: false } });
  if (!expected || typeof expected !== 'object' || Array.isArray(expected) || !['docker', 'podman'].includes(expected.runtimeKind) || !idPattern.test(expected.instanceId ?? '') ||
    typeof expected.image !== 'string' || !imagePattern.test(expected.image) || !['linux/arm64', 'linux/amd64'].includes(expected.platform)) return denied('invalid_expected_identity');
  if (![startedAt, finishedAt, now].every(Number.isSafeInteger) || startedAt > finishedAt || finishedAt > now ||
    finishedAt - startedAt > 5000 || now - startedAt > 5000) return denied('inspection_time_unknown_or_stale');
  function parse(result) {
    if (!result || result.exitCode !== 0 || result.signal || result.timedOut || result.truncated || result.error) throw new Error('command_failed_or_incomplete');
    if (typeof result.stdout !== 'string' || Buffer.byteLength(result.stdout) > 1024 * 1024 ||
      (result.stderr !== undefined && (typeof result.stderr !== 'string' || result.stderr.length))) throw new Error('output_invalid_or_over_budget');
    let rows; try { rows = JSON.parse(result.stdout); } catch { throw new Error('output_not_json'); }
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object' || Array.isArray(rows[0])) throw new Error('output_not_single_object');
    return rows[0];
  }
  let container; let image;
  try { container = parse(containerResult); image = parse(imageResult); } catch (error) { return denied(error.message); }
  if (container.Id !== expected.instanceId) return denied('container_id_mismatch');
  if (typeof image.Id !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(image.Id) || container.Image !== image.Id) return denied('container_image_id_mismatch');
  if (!Array.isArray(image.RepoDigests) || !image.RepoDigests.includes(expected.image)) return denied('repository_digest_unresolved');
  if (`${image.Os}/${image.Architecture}` !== expected.platform || (image.Variant && image.Variant !== 'v8')) return denied('image_platform_mismatch_or_unsupported');
  const labels = container.Config?.Labels;
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) return denied('ownership_labels_missing');
  const state = container.State;
  if (!state || state.Dead !== false || state.Restarting !== false || typeof state.Running !== 'boolean' || typeof state.Paused !== 'boolean' ||
    !['created', 'running', 'paused', 'exited'].includes(state.Status) ||
    state.Running !== ['running', 'paused'].includes(state.Status) || state.Paused !== (state.Status === 'paused')) return denied('container_state_ambiguous');
  const comparison = compareRuntimeObservation(expected, {
    result: 'found', intentId: labels['com.gachia.intent'], launchAttemptId: labels['com.gachia.attempt'],
    runtimeKind: expected.runtimeKind, instanceId: container.Id, image: expected.image, platform: expected.platform,
    ownerInstanceId: labels['com.gachia.owner'], planDigest: labels['com.gachia.plan-digest'],
    runtimeOwnershipNonce: labels['com.gachia.runtime-nonce'], observedAt: startedAt, state: state.Status,
  }, now);
  const settings = compareRuntimeSettings(container, { runtimeKind: expected.runtimeKind, stagingPath: expected.stagingPath });
  return { ...comparison, version: 'runtime-inspect-parser-v1',
    overallStatus: comparison.status === 'claims_match_only' && settings.status === 'settings_claims_match_only' ? 'claims_only_unverified' : 'blocked', settings,
    notCovered: [...comparison.notCovered, 'No CLI execution, daemon provenance, signature or actual platform image digest verification',
      'RepoDigests may refer to a multi-platform index; matching metadata alone is insufficient'],
    capabilities: { inspect: false, stop: false, release: false, execute: false, publish: false } };
}
