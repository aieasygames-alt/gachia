import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executionLaunchProtocol, targetExecutionBudget } from '../src/execution-protocol.mjs';
import { executionPolicy } from '../src/execution-policy.mjs';

test('fixed offline probe protocol maps target budgets without enabling commands or asserting effective limits', () => {
  const protocol = executionLaunchProtocol();
  assert.equal(protocol.status, 'specification_only'); assert.equal(protocol.effectiveLimits, null);
  const args = protocol.profiles.docker_linux_system.parameterTemplate;
  for (const flag of ['--pull=never', '--read-only', '--user=10001:10001', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--memory=2048m', '--memory-swap=2048m', '--cpus=2', '--pids-limit=128', '--network=none', '--log-driver=none']) assert.ok(args.includes(flag), flag);
  assert.ok(args.some((arg) => arg.includes('size=1073741824')));
  assert.ok(args.includes('<VERIFIED_PLATFORM_IMAGE_DIGEST>'));
  assert.ok(!args.some((arg) => arg.startsWith('--publish') || arg.startsWith('-p=') || arg.includes('privileged') || arg.includes('host-pid')));
  assert.ok(Object.values(protocol.capabilities).every((value) => value === false));
  assert.equal(protocol.profiles.podman_linux_system.parameterTemplate, null);
});
test('protocol is deterministic, immutable target budget is shared with policy and returned values cannot mutate it', () => {
  const first = executionLaunchProtocol(); const digest = first.digest;
  first.targetBudget.memoryMiB = 1; first.profiles.docker_linux_system.parameterTemplate.push('--privileged');
  const second = executionLaunchProtocol();
  assert.equal(second.digest, digest); assert.equal(second.targetBudget.memoryMiB, 2048);
  assert.ok(!second.profiles.docker_linux_system.parameterTemplate.includes('--privileged'));
  assert.deepEqual(executionPolicy({ inspect: () => false }).modes.isolated_linux.targetLimits, targetExecutionBudget);
  assert.equal(executionPolicy({ inspect: () => true }).modes.isolated_linux.available, false);
});
