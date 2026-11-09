import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
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
  const state = { entries: new Map(), current: undefined, failed: false };
  return {
    async run(read) {
      assert(!state.current && !state.failed, 'Artifact verification session is busy or failed');
      const turn = Symbol(); state.current = turn;
      try {
        const result = await sessions.run({ state, turn }, read);
        assert(!state.failed, 'Artifact verification session failed');
        return result;
      }
      catch (error) { state.entries.clear(); state.failed = true; throw error; }
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
  catch (error) { state.entries.clear(); state.failed = true; throw error; }
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
