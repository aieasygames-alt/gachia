import assert from 'node:assert/strict';
import { existsSync, lstatSync, readdirSync, realpathSync, statfsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const GiB = 1024 ** 3;
export const DISK_RESERVE = 8 * GiB;
export const DISK_WARNING = 10 * GiB;
export const BUILD_TEMP_BUDGET = 6 * GiB;

export function diskSpace(path) {
  let parent = resolve(path);
  while (!existsSync(parent)) {
    const next = dirname(parent);
    assert.notEqual(next, parent, 'No filesystem ancestor for disk probe');
    parent = next;
  }
  const filesystem = realpathSync(parent), stat = statfsSync(filesystem, { bigint: true });
  return { filesystem, availableBytes: Number(stat.bavail * stat.bsize) };
}

export function assertDiskBudget({ path, operation, estimatedBytes = 0, probe = diskSpace, warn = message => console.warn(message) }) {
  assert(Number.isSafeInteger(estimatedBytes) && estimatedBytes >= 0, 'Invalid temporary disk budget');
  const result = probe(path);
  assert(result && typeof result.filesystem === 'string' && Number.isSafeInteger(result.availableBytes) && result.availableBytes >= 0,
    'Disk probe failed closed');
  const requiredBytes = DISK_RESERVE + estimatedBytes;
  assert(result.availableBytes >= requiredBytes,
    `Insufficient disk for ${operation}: ${(result.availableBytes / GiB).toFixed(2)} GiB available; ${(requiredBytes / GiB).toFixed(2)} GiB required including reserve. No automatic cleanup.`);
  if (result.availableBytes < DISK_WARNING) warn(`Low disk for ${operation}: ${(result.availableBytes / GiB).toFixed(2)} GiB available`);
  return { ...result, operation, estimatedBytes, requiredBytes };
}

export function treeBytes(root) {
  const stat = lstatSync(root);
  if (stat.isSymbolicLink()) return 0;
  if (stat.isFile()) return stat.size;
  assert(stat.isDirectory(), 'Unknown disk-budget input');
  return readdirSync(root).reduce((sum, name) => sum + treeBytes(join(root, name)), 0);
}
