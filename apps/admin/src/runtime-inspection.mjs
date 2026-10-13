import { createHash } from 'node:crypto';

const sha = (text) => createHash('sha256').update(text).digest('hex');

// Observations are adapter assertions, never proof or permission to stop a runtime.
export function compareRuntimeObservation(expected, observation, now = Date.now()) {
  const issues = [];
  const add = (code) => issues.push(code);
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    expected = {}; add('invalid_expected_identity');
  }
  if (!expected.instanceId || !/^[a-f0-9]{64}$/.test(expected.instanceId)) add('expected_instance_missing');
  if (!observation || observation.result !== 'found') add('runtime_absent_or_unknown');
  if (observation?.result === 'found') {
    for (const field of ['intentId', 'launchAttemptId', 'runtimeKind', 'instanceId', 'image', 'platform', 'ownerInstanceId', 'planDigest']) {
      if (typeof expected[field] !== 'string' || observation[field] !== expected[field]) add(`${field}_mismatch`);
    }
    if (!['running', 'exited', 'created', 'paused'].includes(observation.state)) add('runtime_state_unknown');
    if (!Number.isSafeInteger(observation.observedAt) || observation.observedAt < 0 || !Number.isSafeInteger(now) || now < 0 || observation.observedAt > now || now - observation.observedAt > 5000) add('observation_stale');
    if (typeof observation.runtimeOwnershipNonce !== 'string' || !/^[a-f0-9]{64}$/.test(observation.runtimeOwnershipNonce) ||
      sha(observation.runtimeOwnershipNonce ?? '') !== expected.ownershipHash) add('runtime_ownership_mismatch');
  }
  return { version: 'runtime-identity-comparison-v1', status: issues.length ? 'mismatch_or_unknown' : 'claims_match_only', issues,
    identityVerified: false, notCovered: ['Observation provenance and actual daemon state', 'Image digest/platform resolution and labels authenticity',
      'Reinspection immediately before action, process descendants and mount/network cleanup'],
    capabilities: { stop: false, release: false, execute: false, publish: false } };
}

export function runtimeInspectionContract(intent) {
  const identity = intent.runtimeIdentity;
  const contract = { version: 'runtime-inspection-contract-v1', purpose: 'specification_only', intentId: intent.id,
    controlState: intent.status, expected: { launchAttemptId: identity?.launchAttemptId ?? null,
      runtimeKind: identity?.runtimeKind ?? null, instanceId: identity?.instanceId ?? null,
      image: identity?.image ?? null, platform: identity?.platform ?? null,
      ownerInstanceId: intent.ownerInstanceId, planDigest: intent.planDigest },
    blockers: [
      ...(!identity?.instanceId ? ['完整实例ID尚未记录；不得按名称、短ID或PID停止'] : []),
      '只读检查参数/输出解析已实现，但无可信CLI执行器或daemon连接；当前身份仅为声明',
      '停止前须重新核验daemon实际完整ID、镜像/平台、启动attempt及归属nonce',
      '未实现停止适配器、停止后资源残留检查或可信对账释放',
    ],
    observationContract: { result: ['found', 'absent', 'unknown'],
      requiredFoundFields: ['intentId', 'launchAttemptId', 'runtimeKind', 'instanceId', 'image', 'platform', 'ownerInstanceId', 'planDigest', 'runtimeOwnershipNonce', 'observedAt', 'state'],
      maximumAgeMs: 5000, nonceHandling: 'internal_only_never_export_or_log',
      imageMeaning: 'verified_platform_specific_immutable_reference_not_tag_or_unresolved_index',
      absenceMeaning: 'not_release_permission_requires_launch_outcome_and_resource_reconciliation' },
    inspectCommandProfile: { version: 'runtime-inspect-command-profile-v1', executableNow: false,
      commands: identity?.instanceId ? [['container', 'inspect', identity.instanceId], ['image', 'inspect', identity.image]] : [],
      shell: false, timeoutMs: 5000, maximumOutputBytesPerCommand: 1048576,
      executableSelection: 'fixed_allowlist_only_no_PATH_lookup', daemonSelection: 'unimplemented',
      simulationProfiles: ['docker_linux_system', 'podman_linux_system'],
      sessionFencing: 'exact_DB_snapshot_before_between_after_commands_and_live_lease',
      rawOutputHandling: 'memory_only_never_log_persist_or_export',
      parseResultMeaning: 'claims_match_only_not_verified',
      labelKeys: ['com.gachia.intent', 'com.gachia.attempt', 'com.gachia.owner', 'com.gachia.plan-digest', 'com.gachia.runtime-nonce'] },
    requirements: ['Read daemon through trusted adapter; do not accept pasted observations',
      'Match database instance ID and private ownership hash, not labels alone',
      'Identity/daemon/clock ambiguity denies action and retains slot',
      'Stop and post-stop inspection require separate verified lifecycle adapter; contract authorizes neither'],
    capabilities: { inspect: false, stop: false, release: false, execute: false, publish: false } };
  return { ...contract, digest: sha(JSON.stringify(contract)) };
}
