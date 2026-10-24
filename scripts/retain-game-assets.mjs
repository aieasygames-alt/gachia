import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const GAME = 'azur-promilia';
const SERVICE = `gachia-game-${GAME}`;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const MAX_FILE = 8 * 1024 * 1024;
const MAX_TOTAL = 64 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireThat = (value, message) => { if (!value) throw new Error(`Previous game assets: ${message}`); };

function relativePath(path) {
  requireThat(typeof path === 'string' && path.length <= 512 && path.split('/').length <= 32 && !isAbsolute(path) && /^[A-Za-z0-9_\-[\]./]+$/.test(path), 'invalid relative path');
  requireThat(path.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe path component');
  return path;
}

function safePath(root, path) {
  const target = resolve(root, relativePath(path));
  for (let current = target; ; current = dirname(current)) {
    if (existsSync(current)) requireThat(!lstatSync(current).isSymbolicLink(), 'symlinks are forbidden');
    // lstat also detects dangling links, which existsSync deliberately ignores.
    else {
      try { requireThat(!lstatSync(current).isSymbolicLink(), 'symlinks are forbidden'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (current === root) break;
  }
  return target;
}

function readBoundFile(root, entry, maxBytes) {
  requireThat(entry && Number.isSafeInteger(entry.bytes) && entry.bytes > 0 && entry.bytes <= maxBytes && SHA.test(entry.sha256), 'invalid file bounds or digest');
  const path = safePath(root, entry.path);
  const stat = lstatSync(path);
  requireThat(stat.isFile() && stat.size === entry.bytes, 'file size/type mismatch');
  const bytes = readFileSync(path);
  requireThat(hash(bytes) === entry.sha256, 'file digest mismatch');
  return bytes;
}

// This validates operator-saved evidence and bytes, not Cloudflare state or Git
// provenance. A fresh cloud version check is still required before deployment.
export function readPreviousGameAssets(receiptPath, { game, rollbackVersion } = {}) {
  requireThat(game === GAME, 'only the reviewed Azur owner is supported');
  const absolute = resolve(receiptPath);
  const root = dirname(absolute);
  const receiptFile = safePath(root, absolute.slice(root.length + 1));
  requireThat(lstatSync(receiptFile).isFile() && lstatSync(receiptFile).size <= 1024 * 1024, 'invalid receipt file');
  const raw = readFileSync(receiptFile);
  const receipt = JSON.parse(raw);
  requireThat(receipt.schemaVersion === 1 && receipt.game === GAME && receipt.service === SERVICE, 'wrong schema or owner');
  requireThat(UUID.test(receipt.versionId) && UUID.test(receipt.deploymentId) && SHA.test(receipt.scriptEtag), 'invalid cloud identifiers');
  requireThat(!rollbackVersion || rollbackVersion === receipt.versionId, 'rollback version does not match retained version');
  requireThat(receipt.sourceCommit === 'not_attested' && receipt.cloudAssetManifestCompleteness === 'not_asserted', 'unsupported provenance claims');
  requireThat(Number.isFinite(Date.parse(receipt.capturedAt)), 'capture time required');
  for (const observation of [receipt.before, receipt.after]) {
    requireThat(observation?.versionId === receipt.versionId && observation?.deploymentId === receipt.deploymentId && observation?.scriptEtag === receipt.scriptEtag && observation?.percentage === 100, 'unstable deployment observations');
  }
  readBoundFile(root, receipt.workerArchive, 16 * 1024 * 1024);
  const inventoryBytes = readBoundFile(root, receipt.inventory, 1024 * 1024);
  const inventory = JSON.parse(inventoryBytes);
  requireThat(inventory.service === SERVICE && inventory.versionId === receipt.versionId && SHA.test(inventory.logSha256), 'wrong historical inventory');
  requireThat(Array.isArray(receipt.files) && receipt.files.length > 0 && receipt.files.length <= 2000, 'invalid static file inventory');
  const seen = new Set();
  let totalBytes = 0;
  const files = receipt.files.map(entry => {
    relativePath(entry.path);
    requireThat(/\.(?:js|css|woff2?|ttf|otf)$/.test(entry.path) && !seen.has(entry.path), 'duplicate or non-static file');
    seen.add(entry.path);
    const bytes = readBoundFile(root, { ...entry, path: `${relativePath(receipt.staticDirectory)}/${entry.path}` }, MAX_FILE);
    totalBytes += bytes.length;
    requireThat(totalBytes <= MAX_TOTAL, 'total static size exceeded');
    return { path: entry.path, bytes, sha256: entry.sha256 };
  });
  const logged = inventory.nextStaticPaths;
  requireThat(Array.isArray(logged) && logged.length === seen.size && new Set(logged).size === logged.length && logged.every(path => path.startsWith('/_next/static/') && seen.has(path.slice('/_next/static/'.length))), 'files differ from logged Next static inventory');
  return {
    files,
    summary: {
      receiptPath: absolute, receiptSha256: hash(raw), versionId: receipt.versionId,
      deploymentId: receipt.deploymentId, scriptEtag: receipt.scriptEtag,
      workerArchiveSha256: receipt.workerArchive.sha256, inventorySha256: hash(inventoryBytes),
      files: files.length, bytes: totalBytes, capturedAt: receipt.capturedAt,
      sourceCommit: 'not_attested', cloudAssetManifestCompleteness: 'not_asserted',
      verification: 'local_evidence_integrity_only_not_live_cloud_state',
    },
  };
}

export function retainPreviousGameAssets(plan, root) {
  if (!plan.previousAssets) return { status: 'not_requested', files: 0 };
  const capture = readPreviousGameAssets(plan.previousAssets.receiptPath, { game: plan.game, rollbackVersion: plan.rollbackVersion.value });
  requireThat(JSON.stringify(capture.summary) === JSON.stringify(plan.previousAssets), 'release evidence changed');
  const assets = resolve(root, plan.app, '.open-next/assets');
  // Preflight both namespaces before copying anything. Existing current chunks
  // must be byte-identical; an old capture can never overwrite a new build.
  const writes = [];
  for (const file of capture.files) for (const prefix of ['_next/static', `_games/${plan.game}/_next/static`]) {
    const path = safePath(assets, `${prefix}/${file.path}`);
    if (existsSync(path)) {
      const stat = lstatSync(path);
      requireThat(stat.isFile() && stat.size === file.bytes.length && hash(readFileSync(path)) === file.sha256, 'current asset collision');
    } else writes.push({ path, bytes: file.bytes });
  }
  for (const { path, bytes } of writes) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes, { flag: 'wx' });
  }
  return { status: 'retained_logged_previous_static_only', ...capture.summary, copiedPaths: writes.length, originalAndNamespacedPaths: true };
}
