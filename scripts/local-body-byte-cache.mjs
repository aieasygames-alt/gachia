// Bounded local body bytes, validated against the reopened original file identity.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const pools = new WeakMap();
const maximumContentBytes = 128 * 1024 * 1024;
const identity = stat => [stat.dev, stat.ino, stat.mode, stat.nlink, stat.uid, stat.gid, stat.size, stat.mtimeNs, stat.ctimeNs];
const same = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

export function createBodyContentPool({ maxBytes = maximumContentBytes } = {}) {
  assert(Number.isSafeInteger(maxBytes) && maxBytes > 0 && maxBytes <= maximumContentBytes);
  const state = { entries: new Map(), bytes: 0, maxBytes };
  const handle = Object.freeze({ statistics: () => ({ bytes: state.bytes, entries: state.entries.size, maxBytes }) });
  pools.set(handle, state);
  return handle;
}

const sharedPool = createBodyContentPool();

function retain(pool, bytes) {
  const state = pools.get(pool);
  if (bytes.length > state.maxBytes) return undefined;
  const key = createHash('sha256').update(bytes).digest('hex');
  let saved = state.entries.get(key);
  if (saved) {
    assert(saved.equals(bytes), 'Body content digest collision');
    state.entries.delete(key);
  } else {
    while (state.entries.size && state.bytes + bytes.length > state.maxBytes) {
      const oldest = state.entries.keys().next().value;
      state.bytes -= state.entries.get(oldest).length;
      state.entries.delete(oldest);
    }
    saved = Buffer.from(bytes);
    state.bytes += saved.length;
  }
  state.entries.set(key, saved);
  return new WeakRef(saved);
}

// Only raw local bytes are retained. Headers, status, response observations,
// reviews, topology, timestamps and publication decisions never enter this cache.
// Every eligible hit opens the original path and checks its complete identity
// before and after copying the previously read bytes. File mutations invalidate
// the entry, including equal-size changes whose mtime was restored.
export function createLocalBodyByteCache({ pool = sharedPool, maxEntries = 131072 } = {}) {
  assert(pools.has(pool));
  assert(Number.isSafeInteger(maxEntries) && maxEntries > 0 && maxEntries <= 131072);
  const entries = new Map();
  let reads = 0, hits = 0, fallbackReads = 0;
  const fallback = file => { entries.delete(file); fallbackReads++; return readFileSync(file); };
  return {
    clear() { entries.clear(); },
    statistics() { return { reads, hits, fallbackReads, entries: entries.size, pool: pool.statistics() }; },
    read(file) {
      // Permission enforcement always stays with the original filesystem read.
      if (process.permission || typeof file !== 'string' || !isAbsolute(file) || resolve(file) !== file) return fallback(file);
      let fd;
      try {
        const named = lstatSync(file, { bigint: true });
        if (!named.isFile() || named.ctimeNs <= 0n || named.mtimeNs <= 0n || named.size > 16n * 1024n * 1024n || realpathSync(file) !== file) return fallback(file);
        fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        const opened = fstatSync(fd, { bigint: true }), before = identity(opened);
        assert(opened.isFile() && same(identity(named), before), 'Body changed while its original path was opened');
        const entry = entries.get(file);
        const saved = entry && same(entry.identity, before) ? entry.bytes.deref() : undefined;
        let body, retained;
        if (saved) {
          body = Buffer.from(saved); retained = entry.bytes; hits++;
        } else {
          body = readFileSync(fd); reads++;
          retained = retain(pool, body);
        }
        assert(same(before, identity(fstatSync(fd, { bigint: true }))), 'Body changed while its bytes were read');
        assert(same(before, identity(lstatSync(file, { bigint: true }))) && realpathSync(file) === file, 'Body path changed while its bytes were read');
        entries.delete(file);
        if (retained) {
          while (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
          entries.set(file, { identity: before, bytes: retained });
        }
        return body;
      } catch (error) {
        entries.clear();
        throw error;
      } finally {
        if (fd !== undefined) closeSync(fd);
      }
    },
  };
}
