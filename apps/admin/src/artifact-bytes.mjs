import { lstatSync, realpathSync, readdirSync, openSync, fstatSync, readSync, closeSync, constants } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectStagingArtifactManifest } from './staging-contract.mjs';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stamp = (s) => [s.dev, s.ino, s.size, s.mode, s.nlink, s.mtimeMs, s.ctimeMs];

// Internal read-only primitive, not an artifact intake API or durable trust grant.
export function verifyArtifactBytes(root, input, contract, { betweenScans = () => {} } = {}) {
  const metadata = inspectStagingArtifactManifest(input, contract);
  const denied = (code) => ({ version: 'artifact-byte-check-v1', status: 'rejected', issues: [code],
    contractDigest: contract.digest, manifestDigest: metadata.manifestDigest, artifactBytesVerified: false,
    capabilities: { stage: false, mount: false, start: false, execute: false, publish: false } });
  if (metadata.status !== 'metadata_only_unverified') return denied('metadata_rejected');
  try {
    if (typeof root !== 'string' || realpathSync(root) !== root || !lstatSync(root).isDirectory()) throw new Error('root_invalid');
    const expected = new Map(input.files.map((file) => [file.path, file]));
    const directories = new Set();
    for (const path of expected.keys()) {
      let parent = path;
      while (parent.includes('/')) { parent = parent.slice(0, parent.lastIndexOf('/')); directories.add(parent); }
    }
    function scan() {
      const records = []; let bytesRead = 0; let nodes = 0;
      const rootStat = lstatSync(root); const device = rootStat.dev;
      function visit(path) {
        if (++nodes > 60000 || path.split('/').length > 100) throw new Error('inventory_budget');
        const absolute = path ? join(root, path) : root; const s = lstatSync(absolute);
        if (s.isSymbolicLink() || realpathSync(absolute) !== absolute || s.dev !== device) throw new Error('link_or_device_boundary');
        if (s.isDirectory()) {
          if (path && !directories.has(path)) throw new Error('unexpected_directory');
          const names = readdirSync(absolute).sort();
          for (const name of names) visit(path ? `${path}/${name}` : name);
          if (JSON.stringify(stamp(s)) !== JSON.stringify(stamp(lstatSync(absolute)))) throw new Error('directory_changed');
          records.push({ path, directory: true, stamp: stamp(s) }); return;
        }
        const file = expected.get(path);
        if (!file || !s.isFile() || s.nlink !== 1) throw new Error('unexpected_or_nonordinary_file');
        if (s.size !== file.bytes || (s.mode & 0o7777) !== file.mode) throw new Error('file_size_or_mode_mismatch');
        const fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
        const hash = createHash('sha256'); let count = 0;
        try {
          if (JSON.stringify(stamp(s)) !== JSON.stringify(stamp(fstatSync(fd)))) throw new Error('file_changed_before_read');
          const buffer = Buffer.allocUnsafe(65536); let length;
          while ((length = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
            count += length; bytesRead += length;
            if (count > file.bytes || bytesRead > 1073741824) throw new Error('read_budget');
            hash.update(buffer.subarray(0, length));
          }
          if (count !== file.bytes || hash.digest('hex') !== file.sha256) throw new Error('file_digest_mismatch');
          if (JSON.stringify(stamp(s)) !== JSON.stringify(stamp(fstatSync(fd))) ||
            JSON.stringify(stamp(s)) !== JSON.stringify(stamp(lstatSync(absolute)))) throw new Error('file_changed_during_read');
        } finally { closeSync(fd); }
        records.push({ path, stamp: stamp(s), sha256: file.sha256 });
      }
      visit('');
      if (records.filter((record) => !record.directory).length !== expected.size) throw new Error('missing_files');
      return { records, bytesRead };
    }
    const first = scan(); betweenScans(); const second = scan();
    if (digest(first.records) !== digest(second.records)) throw new Error('inventory_changed_between_scans');
    return { version: 'artifact-byte-check-v1', status: 'local_bytes_match_only', issues: [],
      contractDigest: contract.digest, manifestDigest: metadata.manifestDigest, fileCount: input.files.length, totalBytes: second.bytesRead,
      artifactBytesVerified: true, verificationScope: 'local_two_scan_snapshot_not_linux_trust_or_future_mount',
      notCovered: ['Concurrent same-user ancestor/path races and post-check mutation', 'Same-device submounts, daemon-side path ownership and immutable staging',
        'Linux artifact provenance, native module/build closure and actual image identity', 'Archive extraction, pnpm link materialization and OS isolation'],
      capabilities: { stage: false, mount: false, start: false, execute: false, publish: false } };
  } catch (error) {
    const codes = new Set(['root_invalid', 'inventory_budget', 'link_or_device_boundary', 'unexpected_directory', 'directory_changed',
      'unexpected_or_nonordinary_file', 'file_size_or_mode_mismatch', 'file_changed_before_read', 'read_budget', 'file_digest_mismatch',
      'file_changed_during_read', 'missing_files', 'inventory_changed_between_scans']);
    return denied(codes.has(error.message) ? error.message : 'filesystem_check_failed');
  }
}
