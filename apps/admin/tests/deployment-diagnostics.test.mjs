import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentDiagnostics } from '../src/deployment-diagnostics.mjs';

const deployment = { deployment: 'main', worker: 'gachia' };
function fixture() {
  const web = { name: 'gachia', main: '.open-next/worker.js', assets: { directory: '.open-next/assets', binding: 'ASSETS' },
    services: [{ binding: 'WORKER_SELF_REFERENCE', service: 'gachia' }],
    env: { staging: { name: 'gachia-staging', services: [{ binding: 'WORKER_SELF_REFERENCE', service: 'gachia-staging' }] } } };
  const router = { services: [{ binding: 'MAIN_SITE', service: 'gachia' }],
    env: { staging: { services: [{ binding: 'MAIN_SITE', service: 'gachia-staging' }] } } };
  return { web, router };
}
const observe = ({ web, router }) => deploymentDiagnostics({ web: JSON.stringify(web), router: JSON.stringify(router) }, deployment);

test('JSONC local fields are consistent without promoting release acceptance', () => {
  const input = fixture();
  const report = deploymentDiagnostics({ web: `// comment\n${JSON.stringify(input.web)}`, router: JSON.stringify(input.router).replace(/}$/, ',}') }, deployment);
  assert.equal(report.result, 'fixed_configuration_consistent');
  assert.deepEqual(report.counts, { consistent: 10, mismatch: 0, not_checked: 0 });
  assert.ok(Object.values(report.permissions).every((value) => value === false));
  assert.ok(report.notCovered.includes('实时部署/预发布验收'));
});

test('environment bindings never inherit production and duplicate bindings are mismatches', () => {
  const input = fixture(); delete input.router.env.staging.services;
  let report = observe(input);
  assert.equal(report.checks.find((item) => item.environment === 'staging' && item.id === 'router_main').status, 'mismatch');
  input.router.services.push({ binding: 'MAIN_SITE', service: 'gachia' });
  input.web.env.staging.services[0].service = 'gachia';
  input.web.assets.binding = 'OTHER'; input.web.main = 'other.js';
  report = observe(input);
  assert.equal(report.checks.find((item) => item.environment === 'production' && item.id === 'router_main').status, 'mismatch');
  assert.equal(report.checks.find((item) => item.environment === 'staging' && item.id === 'self_reference').status, 'mismatch');
  assert.equal(report.counts.mismatch, 7);
  assert.equal(report.result, 'configuration_mismatch');
});

test('invalid or absent configuration is not checked and strings with URL comments survive', () => {
  for (const web of [undefined, '{', 'null', '[]']) {
    const report = deploymentDiagnostics({ web }, deployment);
    assert.equal(report.counts.not_checked, 10);
    assert.equal(report.result, 'incomplete_configuration_observation');
  }
  const input = fixture(); input.web.vars = { URL: 'https://example.com/a//b' };
  const before = JSON.stringify(input);
  assert.equal(observe(input).counts.consistent, 10);
  assert.equal(JSON.stringify(input), before);
  delete input.web.env;
  const report = observe(input);
  assert.equal(report.counts.not_checked, 5);
  assert.equal(observe(fixture()).counts.consistent, 10);
});
