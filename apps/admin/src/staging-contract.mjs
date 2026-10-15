import { createHash } from 'node:crypto';
import { dependencyPreparationReport } from './dependency-plan.mjs';
import { FactError } from './facts.mjs';

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safePath = (path) => typeof path === 'string' && path.length <= 500 && /^[A-Za-z0-9_@.+/-]+$/.test(path) &&
  !path.startsWith('/') && path.split('/').every((part) => part && part !== '.' && part !== '..');
const forbidden = (path) => path.split('/').some((part) => ['.git', '.gachia-workbench', '.npmrc', '.netrc', 'credentials'].includes(part) ||
  /^\.env(?:\.|$)/.test(part) || /\.(pem|key|p12|pfx)$/i.test(part));

// Metadata validation is not artifact-byte verification or symlink-safe extraction.
export function inspectStagingArtifactManifest(input, contract) {
  const issues = []; let issueCount = 0;
  const add = (code) => { issueCount++; if (issues.length < 100) issues.push(code); };
  const expected = contract.bindings;
  for (const field of ['materialId', 'planId', 'reviewId', 'materialDigest', 'planDigest', 'lockSha256', 'packetDigest', 'image', 'platform']) {
    if (typeof expected[field] !== 'string' || !expected[field] || input?.[field] !== expected[field]) add(`${field}_mismatch`);
  }
  if (!Array.isArray(input?.files) || input.files.length === 0 || input.files.length > 20000) add('file_count_invalid');
  const entries = Array.isArray(input?.files) ? input.files.slice(0, 20000) : [];
  const seen = new Set(); let totalBytes = 0;
  const sourcePaths = new Set(contract.source.files.map((file) => file.path));
  for (const file of entries) {
    if (!file || !safePath(file.path) || forbidden(file.path)) { add('unsafe_or_credential_path'); continue; }
    if (!file.path.startsWith('apps/web/node_modules/') && !file.path.startsWith('apps/web/.next/')) add('artifact_outside_fixed_roots');
    if (seen.has(file.path)) add('duplicate_path'); seen.add(file.path);
    if (sourcePaths.has(file.path)) add('source_artifact_collision');
    if (file.type !== 'file') add('nonordinary_artifact');
    if (![0o444, 0o555].includes(file.mode)) add('mode_invalid');
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 1073741824) add('file_bytes_invalid');
    else totalBytes += file.bytes;
    if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) add('file_digest_invalid');
  }
  for (const path of seen) {
    let parent = path;
    while (parent.includes('/')) { parent = parent.slice(0, parent.lastIndexOf('/')); if (seen.has(parent) || sourcePaths.has(parent)) add('file_directory_collision'); }
  }
  for (const path of sourcePaths) {
    let parent = path;
    while (parent.includes('/')) { parent = parent.slice(0, parent.lastIndexOf('/')); if (seen.has(parent)) add('file_directory_collision'); }
  }
  if (totalBytes > 1073741824) add('artifact_byte_budget');
  for (const required of ['apps/web/node_modules/next/dist/bin/next', 'apps/web/.next/BUILD_ID']) if (!seen.has(required)) add('required_artifact_missing');
  return { version: 'staging-artifact-metadata-v1', contractDigest: contract.digest,
    status: issueCount ? 'metadata_rejected' : 'metadata_only_unverified', fileCount: entries.length, totalBytes,
    issueCount, issues, issuesTruncated: issueCount > issues.length,
    manifestDigest: issueCount ? null : hash({ bindings: expected, files: entries }),
    artifactBytesVerified: false, capabilities: { stage: false, mount: false, start: false, execute: false, publish: false } };
}

export function stagingMountContract(material, plan) {
  const readiness = dependencyPreparationReport(material, plan);
  if (!readiness.bindingCurrent) throw new FactError('材料或计划已失效，不能导出staging契约', 409);
  const contract = { version: 'staging-mount-contract-v1', purpose: 'specification_only',
    bindings: { materialId: material.id, materialDigest: material.manifest.digest, planId: plan.id, planDigest: plan.digest,
      reviewId: material.reviewId, packetDigest: material.packetDigest, lockSha256: plan.lockSha256, image: plan.image, platform: plan.platform },
    source: { files: material.manifest.files, exclusions: material.manifest.sourceExclusions ?? [],
      contentDigest: material.manifest.contentDigest ?? material.manifest.digest, readOnly: true },
    artifactProfile: { roots: ['apps/web/node_modules', 'apps/web/.next'], maximumFiles: 20000, maximumBytes: 1073741824,
      fileFields: ['path', 'type', 'bytes', 'sha256', 'mode'], types: ['file'], modes: [0o444, 0o555],
      requiredPaths: ['apps/web/node_modules/next/dist/bin/next', 'apps/web/.next/BUILD_ID'],
      trust: 'metadata_only_until_trusted_adapter_reads_and_hashes_all_actual_bytes' },
    staging: { daemonPathTemplate: '/run/gachia-staging/<independent-instance-uuid>', destination: '/workspace', readOnly: true,
      propagation: 'rprivate', createdNow: false, sourceHostPathIncluded: false,
      owner: 'trusted_controller_private_directory_never_workload_writable',
      composition: 'verified_source_plus_verified_artifacts_no_overwrites_or_path_collisions' },
    requiredChecks: ['Revalidate accepted review, plan, material and lock before composition and before mount',
      'Resolve daemon-side path identity; Mac host path and Linux VM path are not interchangeable',
      'Read ordinary source/artifact files without following links; reject secret, absolute/traversal/special/duplicate paths',
      'Verify every byte/hash/mode, full file inventory and no source/artifact collisions before and after composition',
      'Verify ownership, no symlink ancestors or extra submounts; bind mounting path syntax is not trust',
      'Inspect exact instance mounts and staging identity immediately before start; drift retains reconciliation slot'],
    localByteCheck: { version: 'artifact-byte-check-v1', internalOnly: true, scope: 'local_two_scan_snapshot',
      readsActualBytes: true, createsStaging: false, grantsArtifactTrust: false },
    blockers: ['Local ordinary-file byte checker exists, but no trusted artifact preparer, staging composer or daemon-side path mapping',
      'pnpm symlink/hardlink layout needs an explicit safe materialization policy; links are currently unsupported',
      'Next build/runtime closure, native dependencies, excluded template impact and writable cache remain unverified',
      'Regular-file metadata inspection alone cannot validate archives, extraction races, isolation or lifecycle'],
    readiness, capabilities: { stage: false, mount: false, prepare: false, start: false, execute: false, stop: false, release: false, publish: false } };
  return { ...contract, digest: hash(contract) };
}
