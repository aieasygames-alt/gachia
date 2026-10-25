import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWrangler, prepareNamespacedAssets, verifyBuiltIndexing } from './game-release.mjs';
import { readPreviousGameAssets, retainPreviousGameAssets } from './retain-game-assets.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { verifyWorkerArtifact } from './verify-worker-artifact.mjs';
import { verifyAppRuntime } from './require-app-runtime.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const APP = 'apps/game-genshin';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Both targets run the production build. Crawl exclusion is a runtime host policy,
// not a second preview build with potentially different code or static files.
export function genshinArtifactConfigs(text) {
  const config = parseWrangler(text);
  const expectedKeys = ['name', 'main', 'assets', 'compatibility_date', 'compatibility_flags', 'workers_dev', 'observability', 'previews', 'vars', 'env'];
  assert.deepEqual(Object.keys(config).sort(), expectedKeys.sort(), 'Unreviewed Genshin configuration keys');
  assert.equal(config.name, 'gachia-game-genshin');
  assert.equal(config.main, '.open-next/worker.js');
  assert.deepEqual(config.assets, { directory: '.open-next/assets', binding: 'ASSETS' });
  assert.equal(config.compatibility_date, '2026-07-08');
  assert.deepEqual(config.compatibility_flags, ['nodejs_compat']);
  assert.equal(config.workers_dev, true);
  assert.deepEqual(config.vars, { NEXT_PUBLIC_APP_URL: 'https://gachia.com', GENSHIN_DEPLOYMENT_MODE: 'production' });
  assert.deepEqual(config.env, { staging: { name: 'gachia-game-genshin-staging', workers_dev: true,
    vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', GENSHIN_DEPLOYMENT_MODE: 'preview' } } });
  const { env: _env, ...production } = config;
  return { production, staging: { ...production, name: 'gachia-game-genshin-staging' } };
}

function boundedJson(path, max = 8 * 1024 * 1024) {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= max, 'Invalid bounded JSON file');
  return JSON.parse(readFileSync(path));
}

export function inventoryGenshinArtifact(directory) {
  assert(!lstatSync(directory).isSymbolicLink(), 'Artifact root must not be a symlink');
  verifyWorkerArtifact(join(directory, '.open-next'));
  const entries = [];
  let bytes = 0;
  const walk = (relative = '') => {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (!relative && name === 'manifest.json') continue;
      assert(!/[\\\x00-\x1f]/.test(name), 'Unsafe artifact path');
      const path = join(directory, name);
      if (entry.isDirectory()) { entries.push({ path: name, type: 'directory' }); walk(name); }
      else if (entry.isSymbolicLink()) {
        assert(name.startsWith('.open-next/'), 'Links outside the Worker artifact are forbidden');
        entries.push({ path: name, type: 'link', target: readlinkSync(path) });
      } else {
        assert(entry.isFile(), 'Unsupported artifact entry');
        const stat = lstatSync(path);
        assert(stat.size <= 64 * 1024 * 1024, 'Artifact file too large');
        bytes += stat.size;
        assert(bytes <= 512 * 1024 * 1024, 'Artifact byte budget exceeded');
        entries.push({ path: name, type: 'file', bytes: stat.size, sha256: sha256(readFileSync(path)) });
      }
      assert(entries.length <= 20000, 'Artifact entry budget exceeded');
    }
  };
  walk();
  return { entries, bytes, treeSha256: sha256(JSON.stringify(entries)) };
}

export function sealGenshinArtifact({ directory, source, sourceCommit, configText, previousAssets, sitemap, verification }) {
  assert(COMMIT.test(sourceCommit), 'Committed source identity required');
  const configs = genshinArtifactConfigs(configText);
  mkdirSync(directory, { recursive: false, mode: 0o700 });
  cpSync(source, join(directory, '.open-next'), { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  for (const [environment, config] of Object.entries(configs)) {
    writeFileSync(join(directory, `wrangler.${environment}.json`), JSON.stringify(config, null, 2) + '\n', { flag: 'wx' });
  }
  writeFileSync(join(directory, 'candidate-sitemap.xml'), sitemap, { flag: 'wx' });
  const tree = inventoryGenshinArtifact(directory);
  const manifest = { schemaVersion: 1, game: 'genshin', createdAt: new Date().toISOString(), sourceCommit,
    sourceConfigurationSha256: sha256(configText), previousAssets, verification,
    provenance: 'local_operator_build_and_integrity_not_remote_attestation', ...tree };
  const raw = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(join(directory, 'manifest.json'), raw, { flag: 'wx', mode: 0o600 });
  return { manifestSha256: sha256(raw), sourceCommit, treeSha256: tree.treeSha256, entries: tree.entries.length, bytes: tree.bytes };
}

export function verifyGenshinArtifact(directory, { manifestSha256, sourceCommit, configText, previousAssets }) {
  assert(SHA.test(manifestSha256), 'An externally pinned manifest SHA-256 is required');
  assert(COMMIT.test(sourceCommit), 'Expected source commit required');
  const manifest = boundedJson(join(directory, 'manifest.json'));
  assert.equal(sha256(readFileSync(join(directory, 'manifest.json'))), manifestSha256, 'Manifest digest changed');
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.game, 'genshin');
  assert.equal(manifest.sourceCommit, sourceCommit, 'Wrong source commit');
  assert.equal(manifest.sourceConfigurationSha256, sha256(configText), 'Source configuration changed');
  assert.equal(manifest.provenance, 'local_operator_build_and_integrity_not_remote_attestation');
  assert.deepEqual(manifest.previousAssets, previousAssets, 'Previous asset receipt changed');
  const configs = genshinArtifactConfigs(configText);
  for (const [environment, config] of Object.entries(configs)) {
    assert.deepEqual(boundedJson(join(directory, `wrangler.${environment}.json`)), config, 'Artifact target configuration changed');
  }
  const tree = inventoryGenshinArtifact(directory);
  assert.deepEqual(tree.entries, manifest.entries, 'Artifact entries changed');
  assert.equal(tree.treeSha256, manifest.treeSha256, 'Artifact tree digest changed');
  assert.equal(tree.bytes, manifest.bytes, 'Artifact byte count changed');
  return manifest;
}

export function genshinExecutionConfig(directory, environment, verification) {
  assert(['production', 'staging'].includes(environment), 'Unknown Genshin execution target');
  verifyGenshinArtifact(directory, verification);
  const config = boundedJson(join(directory, `wrangler.${environment}.json`));
  // Wrangler writes .wrangler/tmp next to its config. Save this derived config
  // outside the seal; absolute paths still point to the exact verified payload.
  return { ...config, main: resolve(directory, config.main), assets: { ...config.assets, directory: resolve(directory, config.assets.directory) } };
}

function cleanCommit(root) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(git(['status', '--porcelain']), '', 'A clean committed tree is required');
  return git(['rev-parse', 'HEAD']);
}

export function parseGenshinArtifactArguments(args) {
  const [action, ...flags] = args;
  assert(['build', 'verify'].includes(action), 'Only local build/verify supported; no deployment is performed');
  const options = { action };
  const keys = { '--directory': 'directory', '--previous-assets-receipt': 'previousAssetsReceipt', '--rollback-version': 'rollbackVersion', '--sha256': 'manifestSha256', '--commit': 'sourceCommit' };
  for (let i = 0; i < flags.length; i += 2) {
    const key = keys[flags[i]], value = flags[i + 1];
    assert(key && value && !value.startsWith('--') && !Object.hasOwn(options, key), 'Unknown, duplicate or missing option');
    options[key] = value;
  }
  assert(options.directory && options.previousAssetsReceipt && options.rollbackVersion, 'Directory, rollback UUID and previous receipt required');
  if (action === 'verify') assert(SHA.test(options.manifestSha256) && COMMIT.test(options.sourceCommit), 'Pinned SHA-256 and source commit required');
  else assert(!options.manifestSha256 && !options.sourceCommit, 'Build records the actual source identity');
  return options;
}

async function main() {
  const options = parseGenshinArtifactArguments(process.argv.slice(2));
  const configText = readFileSync(join(ROOT, APP, 'wrangler.jsonc'), 'utf8');
  genshinArtifactConfigs(configText);
  const capture = readPreviousGameAssets(resolve(options.previousAssetsReceipt), { game: 'genshin', rollbackVersion: options.rollbackVersion });
  const directory = resolve(options.directory);
  if (options.action === 'verify') {
    const manifest = verifyGenshinArtifact(directory, { ...options, configText, previousAssets: capture.summary });
    console.log(JSON.stringify({ status: 'artifact_integrity_verified_not_cloud_or_acceptance', treeSha256: manifest.treeSha256, sourceCommit: manifest.sourceCommit }));
    return;
  }
  const commit = cleanCommit(ROOT);
  const lock = join(ROOT, '.release-records/genshin.lock');
  writeFileSync(lock, JSON.stringify({ pid: process.pid, action: 'sealed_genshin_build' }), { flag: 'wx', mode: 0o600 });
  try {
    const runtimePolicy = verifyAppRuntime(join(ROOT, APP));
    const run = args => {
      const result = spawnSync('pnpm', args, { cwd: join(ROOT, APP), env: { ...process.env, GENSHIN_DEPLOYMENT_MODE: 'production', CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' }, stdio: 'inherit' });
      assert(!result.error && result.status === 0, `Local build/check failed: ${args.join(' ')}`);
    };
    run(['run', 'build:worker']);
    const plan = { game: 'genshin', app: APP, environment: 'production', wranglerEnvironment: '', buildEnvironment: { GENSHIN_DEPLOYMENT_MODE: 'production' }, rollbackVersion: { value: options.rollbackVersion }, previousAssets: capture.summary };
    const namespaced = prepareNamespacedAssets(plan, ROOT);
    const retained = retainPreviousGameAssets(plan, ROOT);
    const indexing = verifyBuiltIndexing(plan, ROOT);
    run(['exec', 'wrangler', 'deploy', '--dry-run', '--config', 'wrangler.jsonc', '--env', '']);
    const local = await verifyLocalWorker(plan, ROOT);
    assert.equal(cleanCommit(ROOT), commit, 'Source changed while building');
    assert.equal(readFileSync(join(ROOT, APP, 'wrangler.jsonc'), 'utf8'), configText, 'Configuration changed while building');
    const freshCapture = readPreviousGameAssets(resolve(options.previousAssetsReceipt), { game: 'genshin', rollbackVersion: options.rollbackVersion });
    assert.deepEqual(freshCapture.summary, capture.summary, 'Capture changed while building');
    const result = sealGenshinArtifact({ directory, source: join(ROOT, APP, '.open-next'), sourceCommit: commit,
      configText, previousAssets: capture.summary, sitemap: readFileSync(join(ROOT, APP, '.next/server/app/sitemap.xml.body')),
      verification: { runtimePolicy, namespaced, retained, indexing, local } });
    verifyGenshinArtifact(directory, { ...result, configText, previousAssets: capture.summary });
    console.log(JSON.stringify({ status: 'sealed_local_artifact_not_deployed', directory, ...result }));
  } finally { unlinkSync(lock); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
