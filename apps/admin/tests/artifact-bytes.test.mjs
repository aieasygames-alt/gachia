import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync, realpathSync, symlinkSync, linkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { verifyArtifactBytes } from '../src/artifact-bytes.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-artifact-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bindings = { materialId: 'material', planId: 'plan-id', reviewId: 'review', materialDigest: 'source', planDigest: 'plan', lockSha256: 'lock', packetDigest: 'packet', image: 'image', platform: 'linux/arm64' };
  const files = ['apps/web/node_modules/next/dist/bin/next', 'apps/web/.next/BUILD_ID'].map((path) => {
    mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), 'fixture'); chmodSync(join(root, path), 0o444);
    return { path, type: 'file', bytes: 7, mode: 0o444, sha256: createHash('sha256').update('fixture').digest('hex') };
  });
  return { root, input: { ...bindings, files }, contract: { digest: 'contract', bindings, source: { files: [] } } };
}
test('hashes complete ordinary-file inventory twice without copying or opening execution permissions', (t) => {
  const f = fixture(t); const report = verifyArtifactBytes(f.root, f.input, f.contract);
  assert.equal(report.status, 'local_bytes_match_only'); assert.equal(report.artifactBytesVerified, true);
  assert.equal(report.totalBytes, 14); assert.equal(report.fileCount, 2); assert.equal(report.capabilities.mount, false);
  assert.ok(!JSON.stringify(report).includes(f.root)); assert.ok(report.notCovered.length);
});
test('rejects content/size/mode drift and incomplete or extra inventory', (t) => {
  const f = fixture(t); const path = join(f.root, f.input.files[0].path);
  chmodSync(path, 0o644); assert.equal(verifyArtifactBytes(f.root, f.input, f.contract).status, 'rejected');
  writeFileSync(path, 'changed'); chmodSync(path, 0o444);
  assert.ok(verifyArtifactBytes(f.root, f.input, f.contract).issues.includes('file_digest_mismatch'));
  rmSync(path); assert.equal(verifyArtifactBytes(f.root, f.input, f.contract).status, 'rejected');
  writeFileSync(path, 'fixture'); chmodSync(path, 0o444);
  writeFileSync(join(f.root, 'SECRET.env'), 'private');
  const report = verifyArtifactBytes(f.root, f.input, f.contract); assert.equal(report.status, 'rejected');
  assert.ok(!JSON.stringify(report).includes('SECRET')); assert.ok(!JSON.stringify(report).includes('private'));
});
test('rejects symlink file, symlink ancestor, root alias, hardlinks and undeclared directories', (t) => {
  const f = fixture(t); const path = join(f.root, f.input.files[0].path);
  rmSync(path); symlinkSync(join(f.root, f.input.files[1].path), path);
  assert.ok(verifyArtifactBytes(f.root, f.input, f.contract).issues.includes('link_or_device_boundary'));
  rmSync(path); linkSync(join(f.root, f.input.files[1].path), path);
  assert.equal(verifyArtifactBytes(f.root, f.input, f.contract).status, 'rejected');
  rmSync(path); writeFileSync(path, 'fixture'); chmodSync(path, 0o444);
  const extra = join(f.root, 'alias'); symlinkSync(f.root, extra);
  assert.equal(verifyArtifactBytes(extra, f.input, f.contract).status, 'rejected'); rmSync(extra);
  const ancestor = join(f.root, 'apps/web/node_modules/next/dist'); rmSync(ancestor, { recursive: true });
  symlinkSync(join(f.root, 'apps/web/.next'), ancestor);
  assert.equal(verifyArtifactBytes(f.root, f.input, f.contract).status, 'rejected');
});
test('between-scan mutation rejects report and metadata failures never reach read hook', (t) => {
  const f = fixture(t); const report = verifyArtifactBytes(f.root, f.input, f.contract, { betweenScans() {
    mkdirSync(join(f.root, 'extra-directory'));
  } });
  assert.equal(report.status, 'rejected'); assert.equal(report.artifactBytesVerified, false);
  let called = false;
  assert.equal(verifyArtifactBytes(f.root, { ...f.input, platform: 'other' }, f.contract, { betweenScans() { called = true; } }).status, 'rejected');
  assert.equal(called, false);
});
