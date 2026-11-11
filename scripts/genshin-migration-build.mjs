import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { artifactFiles, isolatedEnvironment, withRunLock } from './desktop-publish.mjs';
import { assertDiskBudget, BUILD_TEMP_BUDGET } from './desktop-disk-preflight.mjs';
import { digest } from './desktop-release-assets.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { prepareGenshinMainCandidate, verifyGenshinMainCandidate } from './genshin-main-candidate.mjs';
import { verifyGenshinMigrationSource } from './genshin-migration-source.mjs';

const json = value => JSON.stringify(value, null, 2) + '\n';
const command = (file, args, { cwd, env, log }) => new Promise((accept, reject) => {
  const child = spawn(file, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', bytes => appendFileSync(log, bytes));
  child.stderr.on('data', bytes => appendFileSync(log, bytes));
  child.once('error', reject);
  child.once('exit', code => code === 0 ? accept() : reject(new Error(`Migration build failed (${code}); inspect ${log}`)));
});

// A one-time, unchanged-content build. Its receipt is explicitly separate from
// editorial freezes and cannot authorize any upload or traffic mutation.
export async function buildGenshinMigration({ directory, pin }) {
  directory = resolve(directory);
  return withRunLock(directory, async () => {
    const source = verifyGenshinMigrationSource(directory, pin), workspace = source.workspace;
    assertDiskBudget({ path: directory, operation: 'complete published A migration build', estimatedBytes: BUILD_TEMP_BUDGET });
    const build = join(directory, 'build'); assert(!existsSync(build), 'Migration build attempt exists; no overwrite');
    mkdirSync(build, { mode: 0o700 }); mkdirSync(join(build, 'home'), { mode: 0o700 });
    const env = { ...isolatedEnvironment(join(build, 'home')), NODE_ENV: 'production', npm_config_manage_package_manager_versions: 'false' };
    const stages = [], save = (name, value) => {
      const bytes = json(value); writeFileSync(join(build, name), bytes, { flag: 'wx', mode: 0o600 }); return digest(bytes);
    };
    const run = async (name, file, args, cwd, extra = {}) => {
      const log = join(build, name + '.log'); writeFileSync(log, '', { flag: 'wx', mode: 0o600 });
      await command(file, args, { cwd, env: { ...env, ...extra }, log });
      stages.push({ name, file, args, logPin: digest(readFileSync(log)) });
      verifyGenshinMigrationSource(directory, pin);
    };
    try {
      const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim();
      await run('install', 'pnpm', ['install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--prod=false', '--store-dir', store], workspace);
      for (const owner of ['genshin', 'main']) {
        const app = owner === 'main' ? 'web' : 'game-genshin', cwd = join(workspace, 'apps', app);
        const buildEnv = { CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false',
          ...(owner === 'genshin' ? { GENSHIN_DEPLOYMENT_MODE: 'production' } : {}) };
        await run(owner + '-runtime', process.execPath, [join(workspace, 'scripts/require-app-runtime.mjs')], cwd, buildEnv);
        await run(owner + '-build', 'pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', ''], cwd, buildEnv);
        if (owner === 'genshin') await run('genshin-assets', process.execPath,
          [join(workspace, 'scripts/game-release.mjs'), 'prepare-assets', '--game', 'genshin', '--environment', 'production'], cwd, buildEnv);
      }
      const main = await prepareGenshinMainCandidate(join(build, 'main'), workspace);
      const genshin = join(build, 'genshin');
      cpSync(join(workspace, 'apps/game-genshin/.open-next'), genshin, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true });
      const expected = genshinContentAssets(workspace);
      for (const [file, bytes] of expected.files) assert(readFileSync(join(genshin, 'assets', expected.contract.prefix, file)).equals(bytes), `Built published A differs: ${file}`);
      const artifacts = { main: { directory: main.artifact, pin: save('main-tree.json', artifactFiles(main.artifact)) },
        genshin: { directory: genshin, pin: save('genshin-tree.json', artifactFiles(genshin)) } };
      const receipt = { schemaVersion: 1, kind: 'genshin_complete_published_A_migration_build', source: { directory, pin },
        sourceCommit: source.receipt.commit, sourceIndex: source.receipt.sourceIndex, active: source.receipt.active, stages, artifacts,
        mainCandidate: { directory: main.directory, pin: main.pin }, contentVersion: expected.manifest.version,
        editorialChanges: [], cloudWrites: false, productionReady: false };
      const buildPin = save('build.json', receipt);
      verifyGenshinMigrationBuild(build, buildPin);
      return { directory: build, pin: buildPin, artifacts, contentVersion: receipt.contentVersion, cloudWrites: false };
    } catch (error) {
      save('failure.json', { error: error.message, stages, cloudWrites: false, automaticRetry: false }); throw error;
    }
  });
}

export function verifyGenshinMigrationBuild(directory, pin) {
  directory = resolve(directory); assert.equal(realpathSync(directory), directory);
  assert(!existsSync(join(directory, 'failure.json')), 'Failed migration build cannot be consumed');
  assert(/^[a-f0-9]{64}$/.test(pin));
  const bytes = readFileSync(join(directory, 'build.json')); assert.equal(digest(bytes), pin);
  const receipt = JSON.parse(bytes);
  assert.equal(receipt.kind, 'genshin_complete_published_A_migration_build'); assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.cloudWrites, false); assert.equal(receipt.productionReady, false); assert.deepEqual(receipt.editorialChanges, []);
  const source = verifyGenshinMigrationSource(receipt.source.directory, receipt.source.pin);
  assert.equal(source.receipt.commit, receipt.sourceCommit); assert.deepEqual(source.receipt.sourceIndex, receipt.sourceIndex); assert.deepEqual(source.receipt.active, receipt.active);
  const main = verifyGenshinMainCandidate(receipt.mainCandidate.directory, receipt.mainCandidate.pin);
  assert.equal(receipt.artifacts.main.directory, main.artifact);
  assert.equal(receipt.artifacts.genshin.directory, join(directory, 'genshin'));
  for (const owner of ['main', 'genshin']) {
    const raw = readFileSync(join(directory, owner + '-tree.json'));
    assert.equal(digest(raw), receipt.artifacts[owner].pin);
    assert.deepEqual(artifactFiles(receipt.artifacts[owner].directory), JSON.parse(raw), 'Migration artifact changed');
  }
  const expected = genshinContentAssets(source.workspace); assert.equal(expected.manifest.version, receipt.contentVersion);
  for (const [file, raw] of expected.files) assert(readFileSync(join(receipt.artifacts.genshin.directory, 'assets', expected.contract.prefix, file)).equals(raw));
  assert.deepEqual(receipt.stages.map(row => row.name), ['install', 'genshin-runtime', 'genshin-build', 'genshin-assets', 'main-runtime', 'main-build']);
  for (const stage of receipt.stages) assert.equal(digest(readFileSync(join(directory, stage.name + '.log'))), stage.logPin);
  return { directory, receipt, source, pin, cloudWrites: false };
}
