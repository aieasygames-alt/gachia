import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDependencyPlan, dependencyPreparationReport, dependencyPreparationContract } from '../src/dependency-plan.mjs';

const material = { id: 'material', reviewId: 'review', packetDigest: 'packet', manifest: { digest: 'source', files: [{ path: 'pnpm-lock.yaml', sha256: 'lock' }] } };
const pkg = '{"packageManager":"pnpm@10.10.0"}';
const input = { confirmPlanOnly: true, image: `registry.example.com/team/preview@sha256:${'a'.repeat(64)}`, platform: 'linux/arm64',
  nodeVersion: '22.18.0', pnpmVersion: '10.10.0', sourceUrl: 'https://example.com/image-source', note: 'Fixture identity only, no real artifact verified' };
test('binds exact source/review/lock identities without treating metadata as artifact verification', () => {
  const plan = validateDependencyPlan(input, material, pkg);
  assert.equal(plan.materialDigest, 'source'); assert.equal(plan.lockSha256, 'lock'); assert.equal(plan.packetDigest, 'packet');
  assert.equal(plan.status, 'planned_unverified'); assert.equal(plan.validation.artifactVerified, false);
  assert.deepEqual(plan.capabilities, { prepare: false, execute: false, publish: false });
  assert.equal(plan.digest, validateDependencyPlan({ ...input }, material, pkg).digest);
  assert.notEqual(plan.digest, validateDependencyPlan({ ...input, platform: 'linux/amd64' }, material, pkg).digest);
});
test('rejects missing confirmation, floating identities, unsupported platforms and credential URLs', () => {
  for (const patch of [{ confirmPlanOnly: false }, { image: 'node:22' }, { image: `https://registry/image@sha256:${'a'.repeat(64)}` },
    { image: `user:password@registry/image@sha256:${'a'.repeat(64)}` }, { platform: 'darwin/arm64' }, { nodeVersion: '^22' },
    { nodeVersion: '22.17.0' }, { pnpmVersion: '10.11.0' }, { pnpmVersion: 'latest' }, { sourceUrl: 'http://example.com' },
    { sourceUrl: 'https://user:pass@example.com/path' }, { sourceUrl: 'https://example.com?token=secret' }, { note: '' }]) {
    assert.throws(() => validateDependencyPlan({ ...input, ...patch }, material, pkg), undefined, JSON.stringify(patch));
  }
  assert.throws(() => validateDependencyPlan(input, material, '{}'));
  assert.throws(() => validateDependencyPlan(input, { ...material, manifest: { digest: 'source', files: [] } }, pkg));
});
test('readiness stays blocked even with claimed verification flags and partial scans', () => {
  const current = { ...material, assessment: { status: 'current' },
    inputScope: { materialDigest: 'source', status: 'partial_pass' },
    dependencyScope: { materialDigest: 'source', status: 'partial_pass', omittedImporters: ['apps/other'] } };
  const plan = { ...validateDependencyPlan(input, current, pkg), id: 'plan', validation: { artifactVerified: true, linuxTested: true } };
  const report = dependencyPreparationReport(current, plan);
  assert.equal(report.status, 'blocked_unverified'); assert.equal(report.bindingCurrent, true);
  for (const code of ['workspace_install_scope', 'image_unverified', 'artifacts_unverified', 'preparer_unimplemented', 'isolation_untested']) assert.ok(report.blockers.some((item) => item.code === code));
  assert.equal(report.capabilities.prepare, false); assert.equal(report.capabilities.execute, false);
  const contract = dependencyPreparationContract(current, plan);
  assert.equal(contract.purpose, 'specification_only'); assert.equal(contract.inputs.identity.lockSha256, 'lock');
  assert.equal(contract.requirements.separateAuthorization, true);
  assert.equal(contract.digest, dependencyPreparationContract(current, plan).digest);
  assert.ok(!JSON.stringify(contract).includes('artifactVerified":true'));
});
test('missing/failed scans are explicit and changed plan or material bindings reject export', () => {
  const current = { ...material, assessment: { status: 'current' } };
  const plan = validateDependencyPlan(input, current, pkg);
  assert.ok(dependencyPreparationReport(current, plan).blockers.some((item) => item.code === 'inputScope_unchecked'));
  const failed = { ...current, inputScope: { materialDigest: 'source', status: 'needs_attention' } };
  assert.ok(dependencyPreparationReport(failed, plan).blockers.some((item) => item.code === 'inputScope_issues'));
  for (const patch of [{ lockSha256: 'changed' }, { image: 'different' }, { materialId: 'other' }, { reviewId: 'other' }, { digest: 'forged' }]) {
    assert.equal(dependencyPreparationReport(current, { ...plan, ...patch }).status, 'stale');
    assert.throws(() => dependencyPreparationContract(current, { ...plan, ...patch }), /失效/);
  }
  assert.throws(() => dependencyPreparationContract({ ...current, assessment: { status: 'stale' } }, plan), /失效/);
});
