import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const digest = /^[a-f0-9]{64}$/;
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const stat = file => lstatSync(file, { throwIfNoEntry: false });

function safeDirectory(directory) {
  assert(!lstatSync(directory).isSymbolicLink(), 'Asset directory must not be a symlink');
  assert(lstatSync(directory).isDirectory(), 'Expected asset directory');
  const root = realpathSync(directory);
  assert.equal(root, resolve(directory), 'Asset directory contains a symlink ancestor');
  return root;
}

export function previousAssetFiles(directory) {
  const root = safeDirectory(directory), files = [];
  let bytes = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      assert(!entry.isSymbolicLink(), 'Previous assets must not contain symlinks');
      if (entry.isDirectory()) walk(file);
      else {
        assert(entry.isFile(), 'Previous assets must be regular files');
        bytes += lstatSync(file).size;
        assert(bytes <= 64 * 1024 * 1024 && files.length < 5000, 'Previous asset budget exceeded');
        files.push({ path: relative(root, file).split(sep).join('/'), sha256: sha(file), bytes: lstatSync(file).size });
      }
    }
  }
  walk(root);
  assert(files.length > 0, 'Previous asset set is empty');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function retainWebAssets({ previousStatic, artifactDirectory, source }) {
  verifyWebAssetSource(source);
  const root = safeDirectory(artifactDirectory);
  const target = safeDirectory(join(root, 'assets/_next/static'));
  const files = previousAssetFiles(previousStatic);
  assert.notEqual(realpathSync(previousStatic), target, 'Previous assets cannot be the candidate');
  // Validate every collision and destination before copying any file.
  for (const file of files) {
    const destination = join(target, file.path);
    for (let parent = dirname(destination); parent !== target; parent = dirname(parent)) {
      if (stat(parent)) assert(stat(parent).isDirectory() && !stat(parent).isSymbolicLink(), 'Unsafe destination ancestor');
    }
    if (stat(destination)) {
      assert(lstatSync(destination).isFile() && !lstatSync(destination).isSymbolicLink(), 'Unsafe asset destination');
      assert.equal(sha(destination), file.sha256, `Immutable asset collision: ${file.path}`);
    }
  }
  let copied = 0;
  for (const file of files) {
    const destination = join(target, file.path);
    if (!stat(destination)) {
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(previousStatic, file.path), destination); copied++;
    }
  }
  const record = { schemaVersion: 1, source, workerSha256: sha(join(root, 'worker.js')), files, copied,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0), scope: 'previous_next_static_only_no_html_or_server_cache' };
  writeFileSync(join(root, 'retained-web-assets.json.tmp'), JSON.stringify(record, null, 2) + '\n');
  renameSync(join(root, 'retained-web-assets.json.tmp'), join(root, 'retained-web-assets.json'));
  return record;
}

export function verifyRetainedWebAssets(artifactDirectory, versionId) {
  assert(uuid.test(versionId), 'Verified rollback version required');
  const root = safeDirectory(artifactDirectory), target = safeDirectory(join(root, 'assets/_next/static'));
  const record = JSON.parse(readFileSync(join(root, 'retained-web-assets.json'), 'utf8'));
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.source?.versionId, versionId, 'Retained assets do not match current rollback version');
  verifyWebAssetSource(record.source);
  assert.equal(sha(join(root, 'worker.js')), record.workerSha256, 'Worker changed after asset preparation');
  assert(Array.isArray(record.files) && record.files.length > 0 && record.files.length <= 5000);
  const seen = new Set();
  let bytes = 0;
  for (const file of record.files) {
    assert(typeof file.path === 'string' && file.path && !file.path.includes('\\') && !file.path.startsWith('/') && !file.path.split('/').some(p => !p || p === '.' || p === '..'), 'Unsafe retained path');
    assert(!seen.has(file.path), 'Duplicate retained path'); seen.add(file.path);
    assert(digest.test(file.sha256));
    assert(Number.isSafeInteger(file.bytes) && file.bytes >= 0, 'Invalid retained file size');
    bytes += file.bytes;
    assert(bytes <= 64 * 1024 * 1024, 'Retained asset budget exceeded');
    const destination = join(target, file.path);
    assert.equal(realpathSync(destination), destination, 'Retained asset contains symlinks');
    assert(lstatSync(destination).isFile());
    assert.equal(lstatSync(destination).size, file.bytes);
    assert.equal(sha(destination), file.sha256, `Retained asset changed: ${file.path}`);
  }
  assert.equal(record.bytes, bytes, 'Retained byte count mismatch');
  return { versionId, files: record.files.length, bytes: record.bytes, verified: true };
}

// Desktop publications have pinned local bundles/journals, not GitHub artifact
// IDs. Keep the old archive contract separate rather than inventing an ID.
export function verifyWebAssetSource(source) {
  assert(uuid.test(source?.versionId), 'Verified rollback version required');
  if (source.kind === undefined) {
    assert(/^[1-9][0-9]*$/.test(String(source.artifactId)), 'Previous artifact ID required');
    assert(digest.test(source.archiveSha256), 'Previous artifact archive digest required');
    return;
  }
  assert(['published_desktop_candidate', 'recovered_desktop_candidate'].includes(source.kind), 'Unknown Main asset provenance');
  const pinned = (path, pin) => {
    assert(digest.test(pin)); assert.equal(realpathSync(path), resolve(path));
    assert(lstatSync(path).isFile() && lstatSync(path).size <= 16 * 1024 * 1024);
    assert.equal(sha(path), pin, 'Published asset provenance changed'); return readFileSync(path, 'utf8');
  };
  if (source.kind === 'recovered_desktop_candidate') {
    const bundle = JSON.parse(pinned(source.recoveryBundlePath, source.recoveryBundlePin));
    const renewal = JSON.parse(pinned(source.renewalPath, source.renewalPin));
    assert.equal(bundle.kind, 'sealed_local_recovery'); assert.equal(bundle.previewCandidate, false);
    assert.equal(bundle.releaseKey, source.releaseKey); assert(digest.test(source.releaseKey));
    assert.equal(bundle.owners.main.service, 'gachia');
    assert.equal(renewal.kind, 'same_uuid_renewal'); assert.equal(renewal.status, 'passed'); assert.equal(renewal.mode, 'recover');
    assert.equal(renewal.releaseKey, source.releaseKey); assert.equal(renewal.recoveryBundlePin, source.recoveryBundlePin);
    const text = pinned(source.recoveryJournalPath, source.recoveryJournalPin); assert(text.endsWith('\n'));
    const rows = text.trimEnd().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'recovery_intent', 'recovered', 'recovery_intent', 'recovered', 'recovery_accepted']);
    assert(rows.every(row => row.releaseKey === source.releaseKey)); assert.equal(rows[0].renewalId, renewal.id);
    for (const row of rows.slice(4, 6)) { assert.equal(row.owner, 'main'); assert.equal(row.service, 'gachia'); assert.equal(row.versionId, source.versionId); }
    assert.equal(renewal.owners['main-recovery'].versionId, source.versionId);
    assert.notEqual(renewal.owners['main-candidate'].versionId, source.versionId);
    assert.equal(rows[1].proof.modules.gachia, bundle.owners.main.moduleSHA256);
    assert.equal(rows.at(-1).proof.status, 'passed'); assert.equal(rows.at(-1).proof.versions.gachia, source.versionId);
    assert.notEqual(source.versionId, bundle.owners.main.sourceVersionId);
    return;
  }
  const bundle = JSON.parse(pinned(source.bundlePath, source.bundlePin));
  assert.equal(bundle.previewCandidate, false); assert.equal(bundle.releaseKey, source.releaseKey); assert(digest.test(source.releaseKey));
  assert.equal(bundle.owners.main.service, 'gachia');
  const text = pinned(source.promotionJournalPath, source.promotionJournalPin); assert(text.endsWith('\n'));
  const rows = text.trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(rows.length, 7); assert(rows.every(row => row.releaseKey === source.releaseKey));
  assert.deepEqual(rows.map(row => row.phase), ['baseline', 'remote_versions_verified', 'promotion_intent', 'promoted', 'promotion_intent', 'promoted', 'production_accepted']);
  assert.equal(rows[0].accepted.gachia.versionId, source.versionId);
  assert.equal(rows[0].accepted.gachia.artifactSHA256, bundle.owners.main.artifactSHA256);
  assert.equal(rows.at(-1).proof.versions.gachia, source.versionId); assert.equal(rows.at(-1).proof.status, 'passed');
}

export async function verifyStagedRetainedAssets(artifactDirectory, versionId, request = fetch) {
  verifyRetainedWebAssets(artifactDirectory, versionId);
  const record = JSON.parse(readFileSync(join(artifactDirectory, 'retained-web-assets.json'), 'utf8'));
  const selected = [...record.files.filter(file => /(?:webpack[^/]*\.js|\.css)$/.test(file.path)), ...record.files];
  const files = [...new Map(selected.map(file => [file.path, file])).values()].slice(0, 12);
  for (const file of files) {
    const path = file.path.split('/').map(encodeURIComponent).join('/');
    const response = await request(`https://gachia-staging.aieasygames.workers.dev/_next/static/${path}`, {
      method: 'GET', redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, `Staging retained asset status: ${file.path}`);
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(body.length, file.bytes, `Staging retained asset size: ${file.path}`);
    assert.equal(createHash('sha256').update(body).digest('hex'), file.sha256, `Staging retained asset hash: ${file.path}`);
  }
  return { verified: true, sampledFiles: files.length, totalFiles: record.files.length, scope: 'bounded_staging_byte_probe_not_all_chunks_executed' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const [command, versionId, ...extra] = process.argv.slice(2);
    if (!['verify', 'staging'].includes(command) || !versionId || extra.length) throw Error('Usage: retain-web-assets.mjs <verify|staging> <current-main-version>');
    const directory = resolve(import.meta.dirname, '../apps/web/.open-next');
    console.log(JSON.stringify(command === 'verify' ? verifyRetainedWebAssets(directory, versionId) : await verifyStagedRetainedAssets(directory, versionId)));
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
