import { targetExecutionBudget } from './execution-protocol.mjs';

// Inspect fields are claims, not proof of cgroup or filesystem enforcement.
export function compareRuntimeSettings(container, { runtimeKind, stagingPath } = {}) {
  const issues = [];
  const check = (condition, code) => { if (!condition) issues.push(code); };
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  check(object(container) && object(container.HostConfig) && object(container.Config), 'invalid_settings_container');
  const h = container?.HostConfig ?? {}; const c = container?.Config ?? {};
  if (runtimeKind !== 'docker') issues.push('unsupported_settings_backend');
  check(typeof stagingPath === 'string' && /^\/run\/gachia-staging\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(stagingPath), 'unverified_staging_path_profile');
  check(h.Memory === targetExecutionBudget.memoryMiB * 1048576, 'memory_mismatch');
  check(h.MemorySwap === h.Memory, 'swap_mismatch');
  check(h.NanoCpus === targetExecutionBudget.cpus * 1000000000 && h.CpuQuota === 0 && h.CpuPeriod === 0 && h.CpusetCpus === '', 'cpu_mismatch');
  check(h.PidsLimit === targetExecutionBudget.pids, 'pids_mismatch');
  check(h.ReadonlyRootfs === true, 'rootfs_not_readonly');
  check(h.Privileged === false, 'privileged_or_unknown');
  check(c.User === '10001:10001', 'user_mismatch');
  check(Array.isArray(h.CapDrop) && h.CapDrop.length === 1 && typeof h.CapDrop[0] === 'string' && h.CapDrop[0].toUpperCase() === 'ALL', 'capabilities_not_dropped');
  const empty = (value) => Array.isArray(value) && value.length === 0;
  check(h.CapAdd === null || empty(h.CapAdd), 'added_capabilities');
  check(Array.isArray(h.SecurityOpt) && h.SecurityOpt.length === 1 && ['no-new-privileges', 'no-new-privileges=true'].includes(h.SecurityOpt[0]), 'security_options_mismatch');
  check(h.NetworkMode === 'none' && h.PublishAllPorts === false && h.PortBindings !== undefined &&
    (h.PortBindings === null || (object(h.PortBindings) && Object.keys(h.PortBindings).length === 0)), 'network_or_ports_mismatch');
  for (const field of ['PidMode', 'IpcMode', 'UTSMode', 'UsernsMode', 'CgroupParent', 'CgroupnsMode']) {
    check(h[field] === (field === 'IpcMode' || field === 'CgroupnsMode' ? 'private' : ''), `${field}_mismatch`);
  }
  for (const field of ['Devices', 'DeviceRequests', 'VolumesFrom', 'Links']) check(h[field] === null || empty(h[field]), `${field}_not_empty`);
  check(h.LogConfig?.Type === 'none', 'logging_mismatch');
  check(h.RestartPolicy?.Name === 'no' && h.RestartPolicy.MaximumRetryCount === 0 && h.AutoRemove === false, 'lifecycle_mismatch');
  check(Array.isArray(h.Ulimits) && h.Ulimits.length === 1 && object(h.Ulimits[0]) && h.Ulimits[0].Name === 'core' && h.Ulimits[0].Soft === 0 && h.Ulimits[0].Hard === 0, 'ulimits_mismatch');
  const tmp = h.Tmpfs;
  check(object(tmp) && Object.keys(tmp).length === 1 && tmp['/tmp'] === 'rw,noexec,nosuid,nodev,size=1073741824,mode=1777', 'tmpfs_mismatch');
  const mounts = container?.Mounts;
  check(Array.isArray(mounts) && mounts.length === 1 && mounts[0]?.Type === 'bind' && mounts[0].Source === stagingPath &&
    mounts[0].Destination === '/workspace' && mounts[0].RW === false && mounts[0].Propagation === 'rprivate', 'mounts_mismatch');
  check(c.WorkingDir === '/workspace/apps/web', 'working_directory_mismatch');
  check(JSON.stringify(c.Entrypoint) === JSON.stringify(['/usr/local/bin/node']), 'entrypoint_mismatch');
  check(JSON.stringify(c.Cmd) === JSON.stringify(['/workspace/apps/web/node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3000']), 'command_mismatch');
  check(Array.isArray(c.Env) && c.Env.length === 2 && c.Env.includes('NODE_ENV=production') && c.Env.includes('HOME=/tmp'), 'environment_mismatch');
  return { version: 'runtime-settings-comparison-v1', status: issues.length ? 'settings_mismatch_or_unknown' : 'settings_claims_match_only', issues,
    targetBudget: { ...targetExecutionBudget }, effectiveLimits: null,
    notCovered: ['Actual daemon/cgroup enforcement and stress testing', 'Daemon-side staging ownership, symlink/submount races and source integrity',
      'Default seccomp provenance, total disk quota and durable lifetime deadline', 'Additional version-specific inspect fields and backend semantics',
      'Image/artifact trust and writable Next cache layout; offline probe is not browser preview'],
    capabilities: { start: false, execute: false, stop: false, release: false, publish: false } };
}
