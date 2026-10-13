import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolationIntegrationReport } from '../src/isolation-integration.mjs';
import { executionPolicy } from '../src/execution-policy.mjs';

test('Mac recommendation is deferred by policy, not detection or authorization', () => {
  const report = isolationIntegrationReport({ platform: 'darwin' });
  assert.equal(report.runtimeProposal.candidate, 'docker_desktop');
  assert.equal(report.runtimeProposal.decision, 'deferred_by_current_project_policy');
  assert.equal(report.runtimeProposal.installed, 'not_checked');
  assert.equal(report.status, 'blocked_not_integrated');
  assert.equal(report.stages.length, 6); assert.ok(report.stages.every((stage) => stage.remaining.length));
  assert.ok(Object.values(report.capabilities).every((value) => value === false));
  assert.equal(report.orderedNextSteps[0].type, 'deferred_future_decision');
});
test('report is deterministic and fresh; non-Mac reports do not silently choose a runtime', () => {
  const first = isolationIntegrationReport({ platform: 'darwin' }); const digest = first.digest;
  first.stages[0].remaining.length = 0; first.capabilities.execute = true;
  const second = isolationIntegrationReport({ platform: 'darwin' });
  assert.equal(second.digest, digest); assert.equal(second.capabilities.execute, false); assert.ok(second.stages[0].remaining.length);
  assert.equal(isolationIntegrationReport({ platform: 'linux' }).runtimeProposal.candidate, 'unselected');
  assert.equal(executionPolicy({ platform: 'darwin', inspect: () => true }).integration.status, 'blocked_not_integrated');
});
