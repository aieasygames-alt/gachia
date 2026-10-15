import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareRuntimeSettings } from '../src/runtime-settings.mjs';

const stagingPath = '/run/gachia-staging/12345678-1234-1234-1234-123456789abc';
const options = { runtimeKind: 'docker', stagingPath };
function fixture() {
  return { HostConfig: { Memory: 2147483648, MemorySwap: 2147483648, NanoCpus: 2000000000, CpuQuota: 0, CpuPeriod: 0, CpusetCpus: '', PidsLimit: 128,
    ReadonlyRootfs: true, Privileged: false, CapDrop: ['ALL'], CapAdd: null, SecurityOpt: ['no-new-privileges=true'],
    NetworkMode: 'none', PublishAllPorts: false, PortBindings: {}, PidMode: '', IpcMode: 'private', UTSMode: '', UsernsMode: '', CgroupParent: '', CgroupnsMode: 'private',
    Devices: [], DeviceRequests: null, VolumesFrom: null, Links: null, LogConfig: { Type: 'none' }, RestartPolicy: { Name: 'no', MaximumRetryCount: 0 }, AutoRemove: false,
    Ulimits: [{ Name: 'core', Soft: 0, Hard: 0 }], Tmpfs: { '/tmp': 'rw,noexec,nosuid,nodev,size=1073741824,mode=1777' } },
  Mounts: [{ Type: 'bind', Source: stagingPath, Destination: '/workspace', RW: false, Propagation: 'rprivate' }],
  Config: { User: '10001:10001', WorkingDir: '/workspace/apps/web', Entrypoint: ['/usr/local/bin/node'],
    Cmd: ['/workspace/apps/web/node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3000'], Env: ['HOME=/tmp', 'NODE_ENV=production'] } };
}
test('exact offline settings claims match target budget but never assert effective enforcement', () => {
  const result = compareRuntimeSettings(fixture(), options);
  assert.equal(result.status, 'settings_claims_match_only'); assert.deepEqual(result.issues, []);
  assert.equal(result.effectiveLimits, null); assert.equal(result.capabilities.start, false);
});
test('budget/permission/network/mount/command/environment deviations fail closed without returning secrets', () => {
  for (const [field, value] of Object.entries({ Memory: 0, MemorySwap: -1, NanoCpus: 0, PidsLimit: -1, ReadonlyRootfs: false,
    Privileged: true, CapDrop: [null], CapAdd: ['SYS_ADMIN'], SecurityOpt: ['seccomp=unconfined'], NetworkMode: 'host', PortBindings: { '3000/tcp': [] },
    PidMode: 'host', IpcMode: 'host', UTSMode: 'host', UsernsMode: 'host', CgroupParent: 'other', CgroupnsMode: 'host',
    Devices: [{}], DeviceRequests: [{}], VolumesFrom: ['other'], Links: ['other'], AutoRemove: true,
    RestartPolicy: { Name: 'always' }, LogConfig: { Type: 'json-file' }, Ulimits: [], Tmpfs: { '/tmp': 'size=999999999999' } })) {
    const container = fixture(); container.HostConfig[field] = value;
    assert.equal(compareRuntimeSettings(container, options).status, 'settings_mismatch_or_unknown', field);
  }
  for (const field of ['User', 'WorkingDir', 'Entrypoint', 'Cmd', 'Env']) {
    const container = fixture(); container.Config[field] = 'SECRET=private';
    const result = compareRuntimeSettings(container, options);
    assert.equal(result.status, 'settings_mismatch_or_unknown'); assert.ok(!JSON.stringify(result).includes('SECRET'));
  }
  const container = fixture(); container.Mounts.push({ Source: '/var/run/docker.sock', Destination: '/socket', RW: true });
  assert.ok(compareRuntimeSettings(container, options).issues.includes('mounts_mismatch'));
});
test('missing fields, unsupported backends and unverified staging remain mismatched', () => {
  assert.equal(compareRuntimeSettings(null, options).status, 'settings_mismatch_or_unknown');
  assert.ok(compareRuntimeSettings(fixture(), { ...options, runtimeKind: 'podman' }).issues.includes('unsupported_settings_backend'));
  assert.ok(compareRuntimeSettings(fixture(), { runtimeKind: 'docker' }).issues.includes('unverified_staging_path_profile'));
  for (const field of Object.keys(fixture().HostConfig)) {
    const container = fixture(); delete container.HostConfig[field];
    assert.equal(compareRuntimeSettings(container, options).status, 'settings_mismatch_or_unknown', field);
  }
});

test('array port bindings and malformed settings containers cannot match claims', () => {
  const container = fixture(); container.HostConfig.PortBindings = [];
  assert.ok(compareRuntimeSettings(container, options).issues.includes('network_or_ports_mismatch'));
  for (const field of ['HostConfig', 'Config']) {
    const invalid = fixture(); invalid[field] = [];
    assert.ok(compareRuntimeSettings(invalid, options).issues.includes('invalid_settings_container'));
  }
  for (const value of [null, [], 'core']) {
    const invalid = fixture(); invalid.HostConfig.Ulimits = [value];
    assert.ok(compareRuntimeSettings(invalid, options).issues.includes('ulimits_mismatch'));
  }
});
