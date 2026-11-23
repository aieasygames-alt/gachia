import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { deserialize } from 'node:v8';

// Keep this program self-contained so installed and bundled executors use the
// same reviewed Node implementation without locating or compiling a binary.
const program = String.raw`
import assert from 'node:assert/strict';
import { realpathSync, readlinkSync } from 'node:fs';
import { lstat, readdir } from 'node:fs/promises';
import { isAbsolute, join, relative as relativePath } from 'node:path';
import { serialize } from 'node:v8';

const root = process.argv[1], concurrency = Number(process.argv[2]);
assert.equal(realpathSync(root), root, 'Linked artifact ancestor changed');
assert(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= 16);
let running = 0;
const queue = [];
async function limited(read) {
  if (running >= concurrency) await new Promise(resolve => queue.push(resolve));
  else running++;
  try { return await read(); }
  finally {
    const next = queue.shift();
    if (next) next();
    else running--;
  }
}
async function walk(relative = '') {
  const file = relative ? join(root, relative) : root;
  const stat = await limited(() => lstat(file, { bigint: true }));
  assert(stat.isFile() || stat.isDirectory() || stat.isSymbolicLink(), 'Unsupported artifact session entry');
  assert(stat.ctimeNs > 0n && stat.mtimeNs > 0n, 'Artifact change timestamps unavailable');
  const row = [relative, stat.dev, stat.ino, stat.mode, stat.nlink, stat.uid, stat.gid, stat.size, stat.mtimeNs, stat.ctimeNs];
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(file), resolved = realpathSync(file), inside = relativePath(root, resolved);
    assert(!isAbsolute(target) && inside !== '..' && !inside.startsWith('../') && !isAbsolute(inside), 'Non-portable artifact link');
    row.push(target, resolved);
  }
  if (!stat.isDirectory()) return [row];
  const names = (await limited(() => readdir(file))).sort();
  const children = await Promise.all(names.map(name => walk(relative ? relative + '/' + name : name)));
  return [row, ...children.flat()];
}
process.stdout.write(serialize(await walk()));
`;

// Every call reopens the entire original tree. Only independent filesystem
// reads run concurrently; tuple fields, DFS ordering and link checks stay exact.
export function parallelArtifactIdentity(root, concurrency = 16) {
  assert(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= 16);
  const rows = deserialize(execFileSync(process.execPath,
    ['--input-type=module', '--eval', program, root, String(concurrency)], {
      env: { ...process.env, UV_THREADPOOL_SIZE: String(concurrency) },
      stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024, timeout: 120000,
    }));
  assert(Array.isArray(rows) && rows.length && rows[0][0] === '', 'Missing artifact identity root');
  const paths = new Set();
  for (const row of rows) {
    assert(Array.isArray(row) && [10, 12].includes(row.length), 'Invalid artifact identity tuple');
    assert(typeof row[0] === 'string' && !paths.has(row[0]), 'Duplicate artifact identity entry');
    assert(row[0] === '' || row[0].split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid artifact identity path');
    assert(row.slice(1, 10).every(value => typeof value === 'bigint'), 'Artifact identity precision changed');
    const kind = row[3] & 0o170000n;
    assert([0o100000n, 0o040000n, 0o120000n].includes(kind), 'Unsupported artifact identity entry');
    assert.equal(row.length === 12, kind === 0o120000n, 'Artifact link identity missing');
    if (row.length === 12) assert(typeof row[10] === 'string' && typeof row[11] === 'string', 'Invalid artifact link identity');
    paths.add(row[0]);
  }
  return rows;
}
