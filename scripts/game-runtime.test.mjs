import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { assertAppRuntime, APP_RUNTIME, RUNTIME_APPS, readResolvedPackage, verifyAppRuntime } from './require-app-runtime.mjs';
import { verifyNextDeferredPatch } from './verify-next-deferred-patch.mjs';

const root = resolve(import.meta.dirname, '..');
const fixture = () => ({ name: '@gachia/game-nte', declared: { ...APP_RUNTIME }, installed: { ...APP_RUNTIME }, nodeVersion: '22.22.2' });

test('runtime requires reviewed exact declarations, resolutions, app and Node version', () => {
  assert.doesNotThrow(() => assertAppRuntime(fixture()));
  for (const side of ['declared', 'installed']) {
    for (const dependency of Object.keys(APP_RUNTIME)) {
      for (const value of [undefined, `^${APP_RUNTIME[dependency]}`, '99.0.0']) {
        const input = fixture(); input[side][dependency] = value;
        assert.throws(() => assertAppRuntime(input), /Unreviewed runtime/);
      }
    }
  }
  for (const nodeVersion of ['20.19.0', '21.0.0', 'invalid']) assert.throws(() => assertAppRuntime({ ...fixture(), nodeVersion }), /Node 22/);
  assert.throws(() => assertAppRuntime({ ...fixture(), name: '@gachia/router' }), /registered Next application/);
});

for (const game of ['nte', 'azur-promilia']) {
  test(`${game}: installed supported runtime and per-version patch are verified from the app`, () => {
    const result = verifyAppRuntime(resolve(root, `apps/game-${game}`));
    assert.deepEqual(result.versions, APP_RUNTIME);
    assert.equal(result.patch.state, 'patched');
    assert.equal(result.patch.nextVersion, '15.5.29');
    assert.equal(result.cloudVerification, 'not_performed');
    const pkg = JSON.parse(readFileSync(resolve(root, `apps/game-${game}/package.json`), 'utf8'));
    assert.equal(pkg.scripts.build, 'node ../../scripts/require-app-runtime.mjs && next build');
  });
}

test('all five Next applications share one reviewed runtime and patch registration', () => {
  for (const app of RUNTIME_APPS) {
    const require = createRequire(resolve(root, `apps/${app}/package.json`));
    assert.equal(require('next/package.json').version, '15.5.29', app);
    assert.equal(readResolvedPackage(require, '@opennextjs/cloudflare').version, '1.20.13', app);
    assert.equal(readResolvedPackage(require, 'wrangler').version, '4.148.0', app);
    assert.equal(verifyAppRuntime(resolve(root, `apps/${app}`)).status, 'reviewed_application_runtime');
    assert.equal(verifyNextDeferredPatch(dirname(require.resolve('next/package.json')), { requirePatched: true }).state, 'patched');
  }
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.pnpm.patchedDependencies), ['next@15.5.29']);
});

test('runtime inventory CLI reports all apps and rejects unknown flags', () => {
  const file = resolve(root, 'scripts/require-app-runtime.mjs');
  const result = spawnSync(process.execPath, [file, '--all'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).length, RUNTIME_APPS.length);
  const invalid = spawnSync(process.execPath, [file, '--ignore-version'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
});

test('main CI verifies exact runtime before building or restoring an artifact', () => {
  const require = createRequire(resolve(root, 'apps/admin/package.json'));
  const { jobs } = require('yaml').parse(readFileSync(resolve(root, '.github/workflows/deploy.yml'), 'utf8'));
  for (const name of ['build', 'deploy-staging', 'deploy']) {
    const steps = jobs[name].steps;
    const install = steps.findIndex(step => step.run === 'pnpm install --frozen-lockfile');
    const gate = steps.findIndex(step => step.run === 'node scripts/require-app-runtime.mjs --all');
    const action = name === 'build'
      ? steps.findIndex(step => step.run === 'pnpm --filter @gachia/web exec opennextjs-cloudflare build')
      : steps.findIndex(step => step.name === 'Verify and restore web artifact');
    assert(gate > install && action > gate, name);
  }
});

test('Next 15.5.29 distribution patch reverses and reapplies exactly; partial, drift and wrong versions fail', () => {
  const require = createRequire(resolve(root, 'apps/game-nte/package.json'));
  const next = dirname(require.resolve('next/package.json'));
  const directory = mkdtempSync(resolve(tmpdir(), 'next15529-patch-'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'patches/next-15.5.29-deferred-initial.json'), 'utf8'));
  const patch = resolve(root, 'patches', manifest.patch);
  try {
    writeFileSync(resolve(directory, 'package.json'), readFileSync(resolve(next, 'package.json')));
    for (const file of manifest.files) {
      const path = resolve(directory, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, readFileSync(resolve(next, file.path)));
    }
    assert.equal(verifyNextDeferredPatch(directory, { requirePatched: true }).state, 'patched');
    const reverse = spawnSync('git', ['apply', '--reverse', '--unsafe-paths', patch], { cwd: directory, encoding: 'utf8' });
    assert.equal(reverse.status, 0, reverse.stderr);
    assert.equal(verifyNextDeferredPatch(directory).state, 'original');
    assert.throws(() => verifyNextDeferredPatch(directory, { requirePatched: true }), /Patched Next required/);
    const original = readFileSync(resolve(directory, manifest.files[0].path));
    const apply = spawnSync('git', ['apply', '--unsafe-paths', patch], { cwd: directory, encoding: 'utf8' });
    assert.equal(apply.status, 0, apply.stderr);
    assert.equal(verifyNextDeferredPatch(directory, { requirePatched: true }).state, 'patched');
    writeFileSync(resolve(directory, manifest.files[0].path), original);
    assert.throws(() => verifyNextDeferredPatch(directory), /Partial patch/);
    writeFileSync(resolve(directory, manifest.files[0].path), 'drift');
    assert.throws(() => verifyNextDeferredPatch(directory), /Source digest/);
    writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ name: 'next', version: '15.5.30' }));
    assert.throws(() => verifyNextDeferredPatch(directory), /Exact Next version/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Next 15.5.29 patch changes only four absent-prefetch fallbacks, retaining actual prefetched values', () => {
  const require = createRequire(resolve(root, 'apps/game-nte/package.json'));
  const next = dirname(require.resolve('next/package.json'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'patches/next-15.5.29-deferred-initial.json'), 'utf8'));
  assert.equal(manifest.files.length, 4);
  for (const file of manifest.files) {
    const source = readFileSync(resolve(next, file.path), 'utf8');
    const expression = source.match(/const resolvedPrefetchRsc = ([^;]+);/)?.[1];
    assert(expression, file.path);
    const evaluate = new Function('cacheNode', 'prefetchHead', `return ${expression}`);
    const prefetched = { marker: 'prefetched' };
    assert.equal(evaluate({ prefetchRsc: null, rsc: 'final' }, null), undefined);
    assert.equal(evaluate({ prefetchRsc: prefetched, rsc: 'final' }, prefetched), prefetched);
  }
});
