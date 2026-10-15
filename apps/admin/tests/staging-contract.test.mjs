import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDependencyPlan } from '../src/dependency-plan.mjs';
import { stagingMountContract, inspectStagingArtifactManifest } from '../src/staging-contract.mjs';

const material = { id: 'material', reviewId: 'review', packetDigest: 'packet', assessment: { status: 'current' },
  manifest: { digest: 'material-digest', contentDigest: 'content', files: [{ path: 'pnpm-lock.yaml', sha256: 'lock' }] } };
const plan = { ...validateDependencyPlan({ confirmPlanOnly: true, image: `registry.example.com/preview@sha256:${'a'.repeat(64)}`,
  platform: 'linux/arm64', nodeVersion: '22.18.0', pnpmVersion: '10.10.0', sourceUrl: 'https://example.com/source', note: 'Fixture metadata only' }, material, '{"packageManager":"pnpm@10.10.0"}'), id: 'plan' };
const contract = stagingMountContract(material, plan);
const file = (path) => ({ path, type: 'file', bytes: 1, mode: 0o444, sha256: 'b'.repeat(64) });
const input = () => ({ ...contract.bindings, files: [file('apps/web/node_modules/next/dist/bin/next'), file('apps/web/.next/BUILD_ID')] });
test('contract binds all identities, remains deterministic and does not create directories or permit mounts', () => {
  assert.equal(contract.digest, stagingMountContract(material, plan).digest);
  assert.equal(contract.bindings.lockSha256, 'lock'); assert.equal(contract.staging.createdNow, false);
  assert.equal(contract.capabilities.mount, false); assert.equal(contract.staging.sourceHostPathIncluded, false);
  assert.throws(() => stagingMountContract({ ...material, assessment: { status: 'stale' } }, plan), /失效/);
});
test('valid regular-file metadata is unverified, never stage permission', () => {
  const result = inspectStagingArtifactManifest(input(), contract);
  assert.equal(result.status, 'metadata_only_unverified'); assert.equal(result.artifactBytesVerified, false);
  assert.equal(result.capabilities.stage, false); assert.equal(result.totalBytes, 2);
});
test('rejects traversal, secrets, links, duplicates, collisions, roots and excessive budget without raw paths', () => {
  for (const path of ['/tmp/file', 'apps/web/.next/../secret', 'apps/web/.next/.env.local', 'apps/web/.next/token.pem',
    'apps/web/.next//file', 'packages/core/file', 'apps/web/.next/.git/config']) {
    const data = input(); data.files.push(file(path));
    assert.equal(inspectStagingArtifactManifest(data, contract).status, 'metadata_rejected', path);
  }
  for (const patch of [{ type: 'symlink' }, { mode: 0o777 }, { bytes: -1 }, { bytes: 1.5 }, { sha256: 'short' }]) {
    const data = input(); data.files[0] = { ...data.files[0], ...patch };
    assert.equal(inspectStagingArtifactManifest(data, contract).status, 'metadata_rejected');
  }
  const duplicate = input(); duplicate.files.push(duplicate.files[0]);
  assert.ok(inspectStagingArtifactManifest(duplicate, contract).issues.includes('duplicate_path'));
  const collision = input(); collision.files.push(file('apps/web/node_modules/next'));
  assert.ok(inspectStagingArtifactManifest(collision, contract).issues.includes('file_directory_collision'));
  const sourceCollision = { ...contract, source: { files: [file('apps/web/.next/BUILD_ID')] } };
  assert.ok(inspectStagingArtifactManifest(input(), sourceCollision).issues.includes('source_artifact_collision'));
  const large = input(); large.files[0].bytes = 1073741824;
  assert.ok(inspectStagingArtifactManifest(large, contract).issues.includes('artifact_byte_budget'));
});
test('identity drift and truncated diagnostic lists do not yield metadata pass', () => {
  for (const field of ['materialId', 'planId', 'reviewId', 'materialDigest', 'planDigest', 'packetDigest', 'lockSha256', 'image', 'platform']) {
    const data = input(); data[field] = 'changed';
    assert.equal(inspectStagingArtifactManifest(data, contract).status, 'metadata_rejected');
    delete data[field];
    assert.equal(inspectStagingArtifactManifest(data, contract).status, 'metadata_rejected');
  }
  const data = input(); data.files.push(...Array.from({ length: 120 }, () => file('SECRET/path')));
  const result = inspectStagingArtifactManifest(data, contract);
  assert.equal(result.status, 'metadata_rejected'); assert.equal(result.issuesTruncated, true);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});
