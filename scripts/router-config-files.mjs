import { open, lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const routerInputLimit = 1024 * 1024;
const absolutePath = (path) => resolve(path instanceof URL ? fileURLToPath(path) : path);
const same = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

export async function readRouterInput(path, { allowMissing = false } = {}) {
  const absolute = absolutePath(path); let handle;
  let before;
  try { before = await lstat(absolute); }
  catch (error) {
    if (allowMissing && error.code === 'ENOENT') {
      if (await realpath(dirname(absolute)) !== dirname(absolute)) throw new Error('Unsafe Router input parent');
      return null;
    }
    throw error;
  }
  if (!before.isFile() || before.isSymbolicLink() || await realpath(absolute) !== absolute) throw new Error('Unsafe Router input path');
  if (before.size > routerInputLimit) throw new Error('Router input exceeds byte budget');
  try {
    handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat();
    if (!opened.isFile() || !same(before, opened)) throw new Error('Router input changed before read');
    const buffer = Buffer.alloc(routerInputLimit + 1); let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await handle.read(buffer, count, buffer.length - count, count);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > routerInputLimit) throw new Error('Router input exceeds byte budget');
    if (!same(opened, await handle.stat()) || !same(opened, await lstat(absolute)) || await realpath(absolute) !== absolute) throw new Error('Router input changed during read');
    const bytes = buffer.subarray(0, count);
    return { text: bytes.toString('utf8'), digest: createHash('sha256').update(bytes).digest('hex'), bytes: count };
  } finally { await handle?.close(); }
}

export async function writeRouterOutput(path, content, previous) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > routerInputLimit) throw new Error('Router output exceeds byte budget');
  const absolute = absolutePath(path);
  if (await realpath(dirname(absolute)) !== dirname(absolute)) throw new Error('Unsafe Router output parent');
  const current = await readRouterInput(absolute, { allowMissing: true });
  if (current?.digest !== previous?.digest) throw new Error('Router output changed before write');
  const handle = await open(absolute, previous ? constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o644);
  try {
    if (previous) {
      const stat = await handle.stat(); const pathStat = await lstat(absolute);
      if (!stat.isFile() || !same(stat, pathStat) || await realpath(absolute) !== absolute) throw new Error('Unsafe Router output');
      const bytes = Buffer.alloc(routerInputLimit + 1);
      let count = 0;
      while (count < bytes.length) {
        const { bytesRead } = await handle.read(bytes, count, bytes.length - count, count);
        if (!bytesRead) break;
        count += bytesRead;
      }
      if (count > routerInputLimit || !same(stat, await handle.stat()) || !same(stat, await lstat(absolute)) ||
        await realpath(absolute) !== absolute || createHash('sha256').update(bytes.subarray(0, count)).digest('hex') !== previous.digest) {
        throw new Error('Router output changed before write');
      }
    }
    await handle.writeFile(content); await handle.truncate(Buffer.byteLength(content));
  } finally { await handle.close(); }
}
