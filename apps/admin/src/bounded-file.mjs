import { constants, lstatSync, realpathSync, openSync, closeSync, fstatSync, readSync } from 'node:fs';

// Internal local read primitive; not a sandbox against concurrent ancestor replacement.
export function readBoundedFile(path, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > 256 * 1024 * 1024) throw new Error('Invalid byte budget');
  let fd;
  const stamp = (stat) => [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
  try {
    if (realpathSync(path) !== path) throw new Error('Linked input rejected');
    const before = lstatSync(path);
    if (!before.isFile() || before.size > maxBytes) throw new Error('Not an ordinary file or over budget');
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = fstatSync(fd);
    if (!opened.isFile() || stamp(before) !== stamp(opened)) throw new Error('Changed before read');
    const chunks = []; let count = 0;
    while (count <= maxBytes) {
      const buffer = Buffer.allocUnsafe(Math.min(65536, maxBytes - count + 1));
      const length = readSync(fd, buffer, 0, buffer.length, count);
      if (!length) break;
      count += length;
      if (count > maxBytes) throw new Error('Read exceeds byte budget');
      chunks.push(buffer.subarray(0, length));
    }
    if (count !== opened.size || stamp(opened) !== stamp(fstatSync(fd)) ||
      stamp(opened) !== stamp(lstatSync(path)) || realpathSync(path) !== path) throw new Error('Changed during read');
    return Buffer.concat(chunks, count);
  } finally { if (fd !== undefined) closeSync(fd); }
}
