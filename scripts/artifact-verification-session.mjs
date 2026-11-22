import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative as relativePath, resolve } from 'node:path';

const sessions = new AsyncLocalStorage();

function identity(root) {
  assert.equal(realpathSync(root), root, 'Linked artifact ancestor changed');
  const rows = [];
  const walk = (relative = '') => {
    const file = relative ? join(root, relative) : root, stat = lstatSync(file, { bigint: true });
    assert(stat.isFile() || stat.isDirectory() || stat.isSymbolicLink(), 'Unsupported artifact session entry');
    assert(stat.ctimeNs > 0n && stat.mtimeNs > 0n, 'Artifact change timestamps unavailable');
    rows.push([relative, stat.dev, stat.ino, stat.mode, stat.nlink, stat.uid, stat.gid, stat.size, stat.mtimeNs, stat.ctimeNs]);
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(file), resolved = realpathSync(file), inside = relativePath(root, resolved);
      assert(!isAbsolute(target) && inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside), 'Non-portable artifact link');
      rows.at(-1).push(target, resolved);
    }
    if (stat.isDirectory()) for (const name of readdirSync(file).sort()) walk(relative ? `${relative}/${name}` : name);
  };
  walk();
  return rows;
}

// A session stores only local artifact inventories. Every hit still walks the
// complete tree; ctime detects same-size edits even when mtime is restored.
export function createArtifactVerificationSession() {
  const state = { entries: new Map(), html: new Map(), htmlBytes: 0, current: undefined, failed: false };
  return {
    async run(read) {
      assert(!state.current && !state.failed, 'Artifact verification session is busy or failed');
      const turn = Symbol(); state.current = turn;
      try {
        const result = await sessions.run({ state, turn }, read);
        assert(!state.failed, 'Artifact verification session failed');
        return result;
      }
      catch (error) { state.entries.clear(); state.html.clear(); state.htmlBytes = 0; state.failed = true; throw error; }
      finally { state.current = undefined; }
    },
  };
}

// Recursive historical readers share guarded inventories, never validation or
// network results. Each independent root operation starts a new session.
export async function withArtifactVerificationSession(read) {
  const context = sessions.getStore(), state = context?.state;
  if (!state || state.current !== context.turn) return createArtifactVerificationSession().run(read);
  assert(!state.failed, 'Artifact verification session failed');
  try { return await read(); }
  catch (error) { state.entries.clear(); state.html.clear(); state.htmlBytes = 0; state.failed = true; throw error; }
}

// Memoize only deterministic HTML parsing, keyed by newly hashed HTML bytes,
// HTTP status and both parser source digests. Callers still reopen every body,
// check every header/hash/pin and compare the parsed result on every traversal.
// No HTTP observations, freshness, topology or publication decisions are cached.
export function sessionHTMLFingerprints(rows, parserPin, parse) {
  const context = sessions.getStore(), state = context?.state;
  if (!state || state.current !== context.turn || state.failed) return parse(rows);
  assert(/^[a-f0-9]{64}$/.test(parserPin));
  const keys = rows.map(row => createHash('sha256').update(JSON.stringify([parserPin, row.status, row.html])).digest('hex'));
  const missing = [], indices = [], results = new Array(rows.length);
  for (const [index, key] of keys.entries()) {
    const saved = state.html.get(key);
    if (saved) {
      state.html.delete(key); state.html.set(key, saved);
      results[index] = structuredClone(saved.value);
    } else { missing.push(rows[index]); indices.push(index); }
  }
  if (missing.length) {
    const parsed = parse(missing); assert.equal(parsed.length, missing.length);
    for (const [position, value] of parsed.entries()) {
      const index = indices[position], key = keys[index], bytes = Buffer.byteLength(JSON.stringify(value));
      results[index] = value;
      if (bytes > 128 * 1024 * 1024) continue;
      if (state.html.has(key)) { state.htmlBytes -= state.html.get(key).bytes; state.html.delete(key); }
      while (state.html.size && state.htmlBytes + bytes > 128 * 1024 * 1024) {
        const oldest = state.html.keys().next().value;
        state.htmlBytes -= state.html.get(oldest).bytes; state.html.delete(oldest);
      }
      state.html.set(key, { value: structuredClone(value), bytes }); state.htmlBytes += bytes;
    }
  }
  return results;
}

export function guardedArtifactInventory(directory, read) {
  const context = sessions.getStore(), state = context?.state;
  if (!state || state.current !== context.turn || state.failed) return read();
  const root = resolve(directory);
  let before;
  try { before = identity(root); }
  catch {
    // Unsupported or damaged entries still go through the original verifier.
    state.entries.delete(root);
    return read();
  }
  const saved = state.entries.get(root);
  if (saved && isSame(before, saved.identity)) return structuredClone(saved.value);
  state.entries.delete(root);
  const value = read(), after = identity(root);
  assert(isSame(before, after), 'Artifact changed while its inventory was read');
  state.entries.set(root, { identity: after, value: structuredClone(value) });
  return value;
}

function isSame(left, right) {
  if (left.length !== right.length) return false;
  return left.every((row, index) => row.length === right[index].length && row.every((value, column) => value === right[index][column]));
}
