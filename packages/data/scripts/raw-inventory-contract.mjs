import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const RAW_REVIEW_LEDGER = 'packages/data/raw-content-review.json';
const SOURCE = 'packages/data/games';
const MIRROR = 'apps/web/public/data';
const PATH = /^[a-z0-9]+(?:-[a-z0-9]+)*\/raw-[a-z0-9-]+\.json$/;
const SHA = /^[a-f0-9]{64}$/;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export function rawSemanticHash(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function rawRecordChanges(source, mirror) {
  const index = (rows) => {
    if (!Array.isArray(rows)) throw new Error('Pending raw content must be an array');
    const result = new Map();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !row.id.trim() || result.has(row.id)) throw new Error('Pending raw content requires unique nonempty IDs');
      result.set(row.id, row);
    }
    return result;
  };
  const a = index(source), b = index(mirror);
  return [...new Set([...a.keys(), ...b.keys()])].sort().flatMap(id => {
    if (isDeepStrictEqual(a.get(id), b.get(id))) return [];
    return [{ id, kind: !b.has(id) ? 'source-only' : !a.has(id) ? 'mirror-only' : 'changed',
      fields: [...new Set([...Object.keys(a.get(id) ?? {}), ...Object.keys(b.get(id) ?? {})])]
        .filter(key => !isDeepStrictEqual(a.get(id)?.[key], b.get(id)?.[key])).sort() }];
  });
}

async function scan(root, directory) {
  const result = [];
  for (const game of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (game.isSymbolicLink()) throw new Error(`Symlink not allowed in raw inventory: ${directory}/${game.name}`);
    if (!game.isDirectory()) continue;
    for (const file of await readdir(resolve(root, directory, game.name), { withFileTypes: true })) {
      if (!/^raw-.*\.json$/.test(file.name)) continue;
      const path = `${game.name}/${file.name}`;
      if (!PATH.test(path) || !file.isFile()) throw new Error(`Invalid raw inventory file: ${directory}/${path}`);
      result.push(path);
    }
  }
  return result.sort();
}

function validateLedger(ledger) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.pairs) || !ledger.pairs.length ||
      !Array.isArray(ledger.sourceOnly) || !Array.isArray(ledger.pending)) throw new Error('Invalid raw review ledger');
  if (ledger.holds !== undefined && !Array.isArray(ledger.holds)) throw new Error('Invalid factual holds');
  const paths = [...ledger.pairs, ...ledger.sourceOnly.map(row => row?.path)];
  if (paths.some(path => typeof path !== 'string' || !PATH.test(path)) || new Set(paths).size !== paths.length ||
      ledger.sourceOnly.some(row => typeof row.reason !== 'string' || !row.reason.trim())) throw new Error('Invalid or duplicate raw inventory paths');
  const pendingPaths = new Set();
  for (const item of ledger.pending) {
    if (!ledger.pairs.includes(item?.path) || pendingPaths.has(item.path) || item.status !== 'needs_review' ||
        !SHA.test(item.sourceSha256) || !SHA.test(item.mirrorSha256) || item.sourceSha256 === item.mirrorSha256 ||
        !Array.isArray(item.changes) || !item.changes.length || typeof item.reason !== 'string' || !item.reason.trim() ||
        typeof item.reviewDocument !== 'string' || !/^plans\/[a-z0-9-]+\.md$/.test(item.reviewDocument)) throw new Error('Invalid pending raw review entry');
    pendingPaths.add(item.path);
  }
  const holdPaths = new Set();
  for (const item of ledger.holds ?? []) {
    if (!ledger.pairs.includes(item?.path) || holdPaths.has(item.path) || item.status !== 'needs_review' ||
        !SHA.test(item.sourceSha256) || !SHA.test(item.mirrorSha256) ||
        typeof item.reason !== 'string' || !item.reason.trim() ||
        typeof item.reviewDocument !== 'string' || !/^plans\/[a-z0-9-]+\.md$/.test(item.reviewDocument)) throw new Error('Invalid factual hold');
    holdPaths.add(item.path);
  }
}

export async function checkRawInventory(root = ROOT) {
  const ledger = JSON.parse(await readFile(resolve(root, RAW_REVIEW_LEDGER), 'utf8'));
  validateLedger(ledger);
  const sourcePaths = await scan(root, SOURCE), mirrorPaths = await scan(root, MIRROR);
  const issues = [];
  for (const path of new Set([...ledger.pending, ...(ledger.holds ?? [])].map(item => item.reviewDocument))) {
    try {
      if (!(await readFile(resolve(root, path), 'utf8')).trim()) throw new Error('empty document');
    } catch (error) { issues.push(`missing or invalid review document: ${path} (${error.message})`); }
  }
  const compare = (label, expected, actual) => {
    for (const path of expected) if (!actual.includes(path)) issues.push(`missing ${label}: ${path}`);
    for (const path of actual) if (!expected.includes(path)) issues.push(`unregistered ${label}: ${path}`);
  };
  compare('source', [...ledger.pairs, ...ledger.sourceOnly.map(row => row.path)], sourcePaths);
  compare('mirror', ledger.pairs, mirrorPaths);
  const documents = new Map();
  for (const [directory, paths] of [[SOURCE, sourcePaths], [MIRROR, mirrorPaths]]) {
    for (const path of paths) {
      try { documents.set(`${directory}/${path}`, JSON.parse(await readFile(resolve(root, directory, path), 'utf8'))); }
      catch (error) { issues.push(`invalid JSON: ${directory}/${path} (${error.message})`); }
    }
  }
  let equal = 0;
  const pending = [];
  for (const path of ledger.pairs) {
    if (!documents.has(`${SOURCE}/${path}`) || !documents.has(`${MIRROR}/${path}`)) continue;
    const source = documents.get(`${SOURCE}/${path}`), mirror = documents.get(`${MIRROR}/${path}`);
    const review = ledger.pending.find(item => item.path === path);
    if (isDeepStrictEqual(source, mirror)) {
      equal++;
      if (review) issues.push(`pending content silently synchronized: ${path}; close its review explicitly`);
    } else if (!review) issues.push(`unreviewed drift: ${path}`);
    else {
      try {
        const changes = rawRecordChanges(source, mirror);
        if (rawSemanticHash(source) !== review.sourceSha256 || rawSemanticHash(mirror) !== review.mirrorSha256 ||
            !isDeepStrictEqual(changes, review.changes)) issues.push(`pending content changed since review: ${path}`);
        pending.push({ path, status: review.status, sourceSha256: rawSemanticHash(source), mirrorSha256: rawSemanticHash(mirror), changes,
          reason: review.reason, reviewDocument: review.reviewDocument });
      } catch (error) { issues.push(`${path}: ${error.message}`); }
    }
  }
  // Mirror equality is independent of a factual hold; bind both snapshots even when equal.
  const holds = ledger.holds ?? [];
  for (const hold of holds) {
    const source = documents.get(`${SOURCE}/${hold.path}`), mirror = documents.get(`${MIRROR}/${hold.path}`);
    if (source === undefined || mirror === undefined || rawSemanticHash(source) !== hold.sourceSha256 || rawSemanticHash(mirror) !== hold.mirrorSha256) {
      issues.push(`held content changed since review: ${hold.path}`);
    }
  }
  return { contract: 'raw-inventory-v1', pairs: ledger.pairs.length, equal, sourceOnly: ledger.sourceOnly.length,
    pending, holds, issues, engineeringReady: issues.length === 0,
    contentReleaseReady: issues.length === 0 && ledger.pending.length === 0 && holds.length === 0,
    factualApproval: 'not_implied_by_mirror_equality' };
}

export async function verifyRawInventory(root = ROOT, { release = false } = {}) {
  const result = await checkRawInventory(root);
  if (!result.engineeringReady) throw new Error(`Raw inventory contract failed:\n${result.issues.join('\n')}`);
  if (release && !result.contentReleaseReady) throw new Error(`Main content release blocked: ${result.pending.length} raw pairs pending; ${result.holds.length} factual holds:\n${[...result.pending, ...result.holds].map(row => row.path).join('\n')}\nReview ${RAW_REVIEW_LEDGER}; do not synchronize or rebaseline merely to pass.`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--release')) throw new Error('Usage: raw-inventory-contract.mjs [--release]');
    const result = await checkRawInventory();
    console.log(JSON.stringify(result, null, 2));
    if (!result.engineeringReady || (args[0] === '--release' && !result.contentReleaseReady)) {
      console.error('Raw content gate failed; inspect issues/pending/holds and their review documents. No files were changed.');
      process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
