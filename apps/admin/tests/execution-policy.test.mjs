import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executionPolicy, executionMode } from '../src/execution-policy.mjs';

test('runtime file discovery never enables isolation, even when every command exists', () => {
  const paths = [];
  const policy = executionPolicy({ inspect: (path) => { paths.push(path); return true; }, platform: 'darwin' });
  assert.equal(paths.length, 6);
  assert.ok(paths.every((path) => path.startsWith('/') && !path.includes(' ')));
  assert.equal(policy.defaultMode, 'disabled');
  assert.equal(policy.modes.isolated_linux.available, false);
  assert.equal(policy.modes.isolated_linux.targetLimitsEffective, false);
  assert.equal(policy.modes.legacy_trusted_local.sandboxed, false);
  assert.equal(policy.modes.legacy_trusted_local.effectiveLimits.hardMemory, false);
});
test('missing/inaccessible files remain diagnostic, never trigger installation or fallback', () => {
  const policy = executionPolicy({ inspect: () => { throw new Error('Denied'); } });
  assert.ok(policy.runtimes.every((runtime) => !runtime.executablePresent));
  for (const mode of [undefined, 'disabled', 'isolated_linux', 'docker', '__proto__']) {
    assert.throws(() => executionMode({ executionMode: mode }));
  }
  assert.equal(executionMode({ executionMode: 'legacy_trusted_local' }), 'legacy_trusted_local');
});
