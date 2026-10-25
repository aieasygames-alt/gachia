import assert from 'node:assert/strict';
import { cpSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseWrangler } from './game-release.mjs';
import { inventoryGenshinArtifact as inventoryArtifact, sha256 } from './genshin-release-artifact.mjs';

export { sha256 };
const base = { main: '.open-next/worker.js', assets: { directory: '.open-next/assets', binding: 'ASSETS' },
  compatibility_date: '2026-07-08', compatibility_flags: ['nodejs_compat'] };
const vars = (game, mode) => ({ NEXT_PUBLIC_APP_URL: 'https://gachia.com', [`${game.toUpperCase()}_DEPLOYMENT_MODE`]: mode });

// These policies authorize local sealing only. Upload and traffic promotion need
// separate fresh cloud checks; neither operation is exposed by this module.
export function liveOwnerConfig(game, text) {
  assert(['nte', 'lvmeng'].includes(game), 'Unreviewed owner');
  const name = `gachia-game-${game}`;
  const config = parseWrangler(text);
  const expected = game === 'nte'
    ? { name, ...base, vars: vars(game, 'live'), env: { staging: { name: `${name}-staging`, workers_dev: true, vars: vars(game, 'preview') } } }
    : { name, ...base, workers_dev: true, observability: { enabled: true, logs: { enabled: true, persist: true, invocation_logs: true } },
      vars: vars(game, 'preview'), env: { production: { name, vars: vars(game, 'production') } } };
  assert.deepEqual(config, expected, 'Unreviewed owner configuration');
  if (game === 'nte') {
    const { env: _env, ...production } = config;
    // No environment block: preserve the live service's empty CF service tags.
    return { config: production, environment: '', mode: 'live' };
  }
  // Keep explicit production selection (and existing CF environment tags).
  // Default preview mode uses the SAME service name and must never be uploaded.
  return { config, environment: 'production', mode: 'production' };
}

function json(path) {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 8 * 1024 * 1024, 'Invalid manifest/config');
  return JSON.parse(readFileSync(path));
}

export function sealLiveOwnerArtifact({ game, directory, source, sourceCommit, configText, previousAssets, sitemap, verification }) {
  assert(/^[a-f0-9]{40}$/.test(sourceCommit), 'Committed source identity required');
  const target = liveOwnerConfig(game, configText);
  mkdirSync(directory, { recursive: false, mode: 0o700 });
  cpSync(source, join(directory, '.open-next'), { recursive: true, verbatimSymlinks: true, errorOnExist: true, force: false });
  writeFileSync(join(directory, 'wrangler.json'), JSON.stringify(target.config, null, 2) + '\n', { flag: 'wx' });
  writeFileSync(join(directory, 'candidate-sitemap.xml'), sitemap, { flag: 'wx' });
  const tree = inventoryArtifact(directory);
  const manifest = { schemaVersion: 1, game, createdAt: new Date().toISOString(), sourceCommit,
    sourceConfigurationSha256: sha256(configText), previousAssets, verification, environment: target.environment,
    provenance: 'local_operator_build_and_integrity_not_remote_attestation', ...tree };
  const raw = JSON.stringify(manifest, null, 2) + '\n';
  writeFileSync(join(directory, 'manifest.json'), raw, { flag: 'wx', mode: 0o600 });
  return { game, directory: resolve(directory), sourceCommit, manifestSha256: sha256(raw), treeSha256: tree.treeSha256, entries: tree.entries.length, bytes: tree.bytes };
}

export function verifyLiveOwnerArtifact(directory, { game, manifestSha256, sourceCommit, configText, previousAssets }) {
  assert(/^[a-f0-9]{64}$/.test(manifestSha256), 'External manifest pin required');
  assert(/^[a-f0-9]{40}$/.test(sourceCommit), 'Expected source commit required');
  const target = liveOwnerConfig(game, configText);
  const manifest = json(join(directory, 'manifest.json'));
  assert.equal(sha256(readFileSync(join(directory, 'manifest.json'))), manifestSha256, 'Manifest digest changed');
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.game, game, 'Wrong owner');
  assert.equal(manifest.sourceCommit, sourceCommit, 'Wrong source commit');
  assert.equal(manifest.sourceConfigurationSha256, sha256(configText), 'Source configuration changed');
  assert.equal(manifest.environment, target.environment);
  assert.equal(manifest.provenance, 'local_operator_build_and_integrity_not_remote_attestation');
  assert.deepEqual(manifest.previousAssets, previousAssets, 'Previous asset receipt changed');
  assert.deepEqual(json(join(directory, 'wrangler.json')), target.config, 'Target configuration changed');
  const tree = inventoryArtifact(directory);
  assert.deepEqual(tree.entries, manifest.entries, 'Artifact entries changed');
  assert.equal(tree.treeSha256, manifest.treeSha256);
  assert.equal(tree.bytes, manifest.bytes);
  return manifest;
}

export function liveOwnerExecutionConfig(directory, verification) {
  verifyLiveOwnerArtifact(directory, verification);
  const config = json(join(directory, 'wrangler.json'));
  // Save outside the seal: Wrangler creates .wrangler/tmp beside its config.
  return { ...config, main: resolve(directory, config.main), assets: { ...config.assets, directory: resolve(directory, config.assets.directory) } };
}
