import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, symlinkSync, realpathSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { captureExecutionMaterial, executionMaterialService } from '../src/execution-material.mjs';
import { openStore } from '../src/store.mjs';

function fixture(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-material-'))); const root = join(dir, 'source');
  mkdirSync(join(root, 'apps/web'), { recursive: true }); mkdirSync(join(root, 'packages/data'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{}'); writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock');
  writeFileSync(join(root, 'apps/web/next.config.mjs'), 'export default {}');
  writeFileSync(join(root, 'packages/data/example.json'), '[]');
  const store = openStore(join(dir, 'state/workbench.sqlite'));
  let current = true;
  store.workspaces = () => [{ id: 'workspace', path: root }];
  const reviews = { acceptedReview() { if (!current) throw new Error('stale'); return { id: 'review', workspaceId: 'workspace', packetDigest: 'packet' }; } };
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { dir, root, store, reviews, invalidate: () => { current = false; } };
}
test('freezes source/config/lock with exact hashes, excludes deps/git and exposes drift without execute permission', (t) => {
  const f = fixture(t);
  mkdirSync(join(f.root, 'apps/web/node_modules')); writeFileSync(join(f.root, 'apps/web/node_modules/ignored'), 'dependency');
  writeFileSync(join(f.root, '.git'), 'gitdir: elsewhere');
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews);
  const record = service.freeze({ reviewId: 'review', confirmSourceOnly: true });
  assert.equal(record.status, 'frozen_source_only'); assert.equal(record.assessment.status, 'current');
  assert.equal(record.manifest.files.length, 4); assert.equal(record.capabilities.execute, false);
  assert.equal(record.inputScope.materialDigest, record.manifest.digest);
  assert.equal(record.inputScope.executable, false);
  assert.equal(record.dependencyScope.materialDigest, record.manifest.digest);
  assert.equal(record.dependencyScope.executable, false);
  assert.equal(service.list()[0].inputScope.materialDigest, record.manifest.digest);
  assert.equal(readFileSync(join(record.path, 'apps/web/next.config.mjs'), 'utf8'), 'export default {}');
  chmodSync(join(record.path, 'package.json'), 0o600); writeFileSync(join(record.path, 'package.json'), 'tampered');
  assert.equal(service.list()[0].assessment.status, 'stale');
});
test('rejects credentials, symlinks and budgets before recording frozen material', (t) => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'apps/web/.env.local'), 'secret');
  assert.throws(() => captureExecutionMaterial(f.root), /凭据/);
  rmSync(join(f.root, 'apps/web/.env.local'));
  symlinkSync(join(f.root, 'package.json'), join(f.root, 'apps/web/link'));
  assert.throws(() => captureExecutionMaterial(f.root), /符号链接/);
  rmSync(join(f.root, 'apps/web/link'));
  assert.throws(() => captureExecutionMaterial(f.root, { maxBytes: 1 }), /预算/);
  assert.throws(() => captureExecutionMaterial(f.root, { maxFiles: 1 }), /预算/);
});

test('capture rejects invalid or excessive budgets and nonboolean exclusion options', (t) => {
  const f = fixture(t);
  for (const maxFiles of [NaN, Infinity, 0, -1, 1.5, '1', 20001]) {
    assert.throws(() => captureExecutionMaterial(f.root, { maxFiles }), (error) => error.status === 400);
  }
  for (const maxBytes of [NaN, Infinity, 0, -1, 1.5, '1', 256 * 1024 * 1024 + 1]) {
    assert.throws(() => captureExecutionMaterial(f.root, { maxBytes }), (error) => error.status === 400);
  }
  assert.throws(() => captureExecutionMaterial(f.root, { excludeEnvironmentTemplate: 'true' }), (error) => error.status === 400);
  assert.equal(f.store.executionMaterials().length, 0);
});
test('copy-time source changes and revoked review fail closed and preserve non-executable failed record', (t) => {
  const f = fixture(t);
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews, { afterCopy: () => writeFileSync(join(f.root, 'package.json'), 'changed') });
  const record = service.freeze({ reviewId: 'review', confirmSourceOnly: true });
  assert.equal(record.status, 'failed'); assert.equal(record.capabilities.execute, false);
  f.invalidate();
  assert.throws(() => service.freeze({ reviewId: 'review', confirmSourceOnly: true }));
  assert.equal(service.list()[0].assessment.status, 'stale');
});
test('fixed template exclusion requires an exact separate confirmation and keeps only audit metadata', (t) => {
  const f = fixture(t); const path = join(f.root, 'apps/web/.env.example');
  writeFileSync(path, 'SAMPLE=do-not-copy');
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews);
  assert.throws(() => service.freeze({ reviewId: 'review', confirmSourceOnly: true }), /凭据/);
  const proposal = service.prepareExclusions({ reviewId: 'review' });
  assert.equal(proposal.exclusions[0].path, 'apps/web/.env.example');
  assert.equal(proposal.executable, false);
  assert.ok(!JSON.stringify(proposal).includes('do-not-copy'));
  assert.throws(() => service.freeze({ reviewId: 'review', confirmSourceOnly: true, exclusionDigest: proposal.digest }), /单独确认/);
  assert.throws(() => service.freeze({ reviewId: 'review', confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: 'wrong' }), /已变化/);
  const record = service.freeze({ reviewId: 'review', confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: proposal.digest });
  assert.equal(record.status, 'frozen_source_only'); assert.equal(record.assessment.status, 'current');
  assert.equal(record.exclusionReview.digest, proposal.digest);
  assert.equal(record.manifest.sourceExclusions[0].sha256, proposal.exclusions[0].sha256);
  assert.equal(existsSync(join(record.path, 'apps/web/.env.example')), false);
  assert.ok(record.inputScope.issues.some((issue) => issue.file === 'apps/web/.env.example'));
  assert.equal(service.list()[0].assessment.status, 'current');
  writeFileSync(join(record.path, 'apps/web/.env.example'), 'unexpected');
  assert.equal(service.list()[0].assessment.status, 'stale');
});
test('changed exclusion bytes, other source changes, or changed packet invalidate the proposal', (t) => {
  const f = fixture(t); const path = join(f.root, 'apps/web/.env.example'); writeFileSync(path, 'before');
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews);
  const freeze = (proposal) => service.freeze({ reviewId: 'review', confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: proposal.digest });
  let proposal = service.prepareExclusions({ reviewId: 'review' });
  writeFileSync(path, 'after'); assert.throws(() => freeze(proposal), /已变化/);
  proposal = service.prepareExclusions({ reviewId: 'review' });
  writeFileSync(join(f.root, 'package.json'), '{"name":"changed"}'); assert.throws(() => freeze(proposal), /已变化/);
  proposal = service.prepareExclusions({ reviewId: 'review' });
  f.reviews.acceptedReview = () => ({ id: 'review', workspaceId: 'workspace', packetDigest: 'new-packet' });
  assert.throws(() => freeze(proposal), /已变化/);
  assert.equal(f.store.executionMaterials().length, 0);
});
test('exclusion option never bypasses symlink, directory or other credential rejection', (t) => {
  const f = fixture(t); const path = join(f.root, 'apps/web/.env.example');
  symlinkSync(join(f.root, 'package.json'), path);
  assert.throws(() => captureExecutionMaterial(f.root, { excludeEnvironmentTemplate: true }), /符号链接/);
  rmSync(path); mkdirSync(path);
  assert.throws(() => captureExecutionMaterial(f.root, { excludeEnvironmentTemplate: true }), /普通文件/);
  rmSync(path, { recursive: true }); writeFileSync(path, 'template');
  writeFileSync(join(f.root, 'apps/web/.env.local'), 'secret');
  assert.throws(() => captureExecutionMaterial(f.root, { excludeEnvironmentTemplate: true }), /凭据/);
});
test('excluded file drift during copy fails and older v1 manifest still assesses correctly', (t) => {
  const f = fixture(t); const path = join(f.root, 'apps/web/.env.example'); writeFileSync(path, 'before');
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews, { afterCopy: () => writeFileSync(path, 'after') });
  const proposal = service.prepareExclusions({ reviewId: 'review' });
  const failed = service.freeze({ reviewId: 'review', confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: proposal.digest });
  assert.equal(failed.status, 'failed'); assert.equal(failed.capabilities.execute, false);
  rmSync(path);
  const clean = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews).freeze({ reviewId: 'review', confirmSourceOnly: true });
  clean.manifest.digest = clean.manifest.contentDigest; delete clean.manifest.contentDigest; delete clean.manifest.sourceExclusions;
  clean.manifest.version = 'execution-source-v1'; f.store.saveExecutionMaterial(clean);
  assert.equal(service.list().find((item) => item.id === clean.id).assessment.status, 'current');
});
test('dependency plans persist without execution, deduplicate, append changes and become stale with material/review drift', (t) => {
  const f = fixture(t); writeFileSync(join(f.root, 'package.json'), '{"packageManager":"pnpm@10.10.0"}');
  const service = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews);
  const material = service.freeze({ reviewId: 'review', confirmSourceOnly: true });
  const input = { materialId: material.id, confirmPlanOnly: true, image: `registry.example.com/preview@sha256:${'b'.repeat(64)}`,
    platform: 'linux/arm64', nodeVersion: '22.18.0', pnpmVersion: '10.10.0', sourceUrl: 'https://example.com/source', note: 'Test plan, not actual verification' };
  assert.throws(() => service.recordDependencyPlan({ ...input, materialId: 'missing' }), /不存在/);
  const first = service.recordDependencyPlan(input); assert.equal(first.duplicate, false);
  const contract = service.preparationContract({ materialId: material.id, planId: first.plan.id });
  assert.equal(contract.readiness.status, 'blocked_unverified'); assert.equal(contract.capabilities.prepare, false);
  assert.equal(contract.inputs.identity.materialDigest, material.manifest.digest);
  assert.equal(service.stagingContract({ materialId: material.id, planId: first.plan.id }).capabilities.mount, false);
  assert.throws(() => service.preparationContract({ materialId: material.id, planId: 'missing' }), /不存在/);
  assert.equal(service.recordDependencyPlan(input).duplicate, true);
  assert.equal(service.recordDependencyPlan({ ...input, platform: 'linux/amd64' }).duplicate, false);
  const listed = executionMaterialService(join(f.dir, 'state'), f.store, f.reviews).list()[0];
  assert.equal(listed.dependencyPlans.length, 2); assert.equal(listed.dependencyPlans[0].assessment.status, 'current');
  assert.equal(listed.dependencyPlans[0].validation.artifactVerified, false); assert.equal(listed.capabilities.execute, false);
  for (let i = 2; i < 20; i++) service.recordDependencyPlan({ ...input, note: `Additional fixture plan ${i}` });
  assert.equal(service.list()[0].dependencyPlans.length, 20);
  assert.throws(() => service.recordDependencyPlan({ ...input, note: 'Overflow fixture plan' }), /最多/);
  assert.equal(service.recordDependencyPlan(input).duplicate, true);
  chmodSync(join(material.path, 'package.json'), 0o600); writeFileSync(join(material.path, 'package.json'), '{}');
  assert.equal(service.list()[0].dependencyPlans[0].assessment.status, 'stale');
  assert.throws(() => service.preparationContract({ materialId: material.id, planId: first.plan.id }), /失效/);
  assert.throws(() => service.stagingContract({ materialId: material.id, planId: first.plan.id }), /失效/);
  assert.throws(() => service.recordDependencyPlan(input), /过期/);
  f.invalidate(); assert.throws(() => service.recordDependencyPlan(input), /过期/);
});
