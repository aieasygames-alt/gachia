import { createHash } from 'node:crypto';
import { FactError } from './facts.mjs';
import { runtimeInspectCommands, parseRuntimeInspectResults } from './runtime-inspect-adapter.mjs';

const profiles = {
  docker_linux_system: { runtimeKind: 'docker', endpoint: 'unix:///var/run/docker.sock', args: ['--host', 'unix:///var/run/docker.sock', '--config', '/run/gachia-inspection/empty-config'] },
  podman_linux_system: { runtimeKind: 'podman', endpoint: 'unix:///run/podman/podman.sock', args: ['--remote', '--url', 'unix:///run/podman/podman.sock'] },
};

export function fixedInspectionEnvironment(expected, executable, profileId) {
  const profile = profiles[profileId];
  if (!profile || profile.runtimeKind !== expected.runtimeKind) throw new FactError('Unsupported daemon profile; no default/context fallback');
  const command = runtimeInspectCommands(expected, executable);
  return { ...command, version: 'fixed-inspection-environment-v1', profileId, endpoint: profile.endpoint,
    commands: command.commands.map((args) => [...profile.args, ...args]), env: { LANG: 'C', LC_ALL: 'C' },
    cwd: '/run/gachia-inspection', executableNow: false,
    prerequisites: ['Trusted runner must provision a private empty config and working directory',
      'Socket identity/ownership and daemon provenance must be pinned and verified',
      'Linux system profiles only; Mac Desktop and rootless profiles are unsupported',
      'No inherited HOME/PATH/DOCKER_HOST/DOCKER_CONTEXT/CONTAINER_HOST or credentials',
      'Podman host configuration isolation and CLI-version behavior require actual validation'] };
}

export const inspectionSnapshotDigest = (snapshot) => createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

// Explicit simulation boundary: callback data can never become trusted runtime evidence.
export async function simulateInspectionSession({ expected, snapshot, readSnapshot, simulate, simulatedOnly, profileId, executable, now = Date.now }) {
  if (simulatedOnly !== true || typeof simulate !== 'function') throw new FactError('Only an explicitly injected simulator is implemented');
  const denied = (code) => ({ version: 'simulated-inspection-session-v1', status: 'unknown', issues: [code], simulated: true,
    identityVerified: false, capabilities: { inspect: false, stop: false, release: false, execute: false, publish: false } });
  const profile = fixedInspectionEnvironment(expected, executable, profileId);
  const startedAt = now();
  const snapshotDigest = inspectionSnapshotDigest(snapshot);
  const current = () => inspectionSnapshotDigest(readSnapshot()) === snapshotDigest;
  if (snapshot.status !== 'identity_recorded' || !Number.isSafeInteger(snapshot.leaseUntil) || snapshot.leaseUntil <= startedAt) return denied('lease_or_state_not_current');
  if (!current()) return denied('snapshot_changed_before_inspection');
  let containerResult; let imageResult;
  try {
    containerResult = await simulate({ ...profile, args: profile.commands[0], step: 'container' });
    if (!current() || now() >= snapshot.leaseUntil) return denied('snapshot_or_lease_changed_during_inspection');
    imageResult = await simulate({ ...profile, args: profile.commands[1], step: 'image' });
  } catch { return denied('simulator_failed'); }
  const finishedAt = now();
  if (!current() || finishedAt >= snapshot.leaseUntil) return denied('snapshot_or_lease_changed_after_inspection');
  const parsed = parseRuntimeInspectResults(expected, containerResult, imageResult, { startedAt, finishedAt, now: finishedAt });
  return { ...parsed, version: 'simulated-inspection-session-v1', simulated: true, snapshotDigest,
    profileId, endpoint: profile.endpoint, identityVerified: false };
}
