import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyNextDeferredPatch } from './verify-next-deferred-patch.mjs';

export const GAME_RUNTIME = Object.freeze({
  next: '15.5.28',
  '@opennextjs/cloudflare': '1.20.13',
  wrangler: '4.148.0',
});

export function readResolvedPackage(require, name) {
  // Some packages deliberately do not export package.json. Walk from their
  // resolved entrypoint instead of assuming a particular pnpm store layout.
  let directory = dirname(require.resolve(name));
  while (true) {
    const path = resolve(directory, 'package.json');
    if (existsSync(path)) {
      const pkg = JSON.parse(readFileSync(path, 'utf8'));
      if (pkg.name === name) return pkg;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Package metadata not found: ${name}`);
    directory = parent;
  }
}

export function assertGameRuntime({ name, declared, installed, nodeVersion }) {
  if (!['@gachia/game-nte', '@gachia/game-azur-promilia'].includes(name)) {
    throw new Error('Runtime gate is limited to the two pilot games');
  }
  if (!/^\d+\.\d+\.\d+$/.test(nodeVersion) || Number(nodeVersion.split('.')[0]) < 22) {
    throw new Error('Pilot runtime requires Node 22 or newer');
  }
  for (const [dependency, expected] of Object.entries(GAME_RUNTIME)) {
    if (declared[dependency] !== expected || installed[dependency] !== expected) {
      throw new Error(`Unreviewed runtime: ${dependency} must be declared and installed as ${expected}`);
    }
  }
}

// Resolve from the app, not the workspace root: legacy apps keep their exact
// runtime until their separate hydration and authentication acceptance.
export function verifyGameRuntime(appRoot, { nodeVersion = process.versions.node } = {}) {
  const packagePath = resolve(appRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const require = createRequire(packagePath);
  const installed = Object.fromEntries(Object.keys(GAME_RUNTIME).map(name => [name, readResolvedPackage(require, name).version]));
  assertGameRuntime({ name: pkg.name, declared: { ...pkg.dependencies, ...pkg.devDependencies }, installed, nodeVersion });
  const patch = verifyNextDeferredPatch(dirname(require.resolve('next/package.json')), { requirePatched: true });
  return { status: 'reviewed_pilot_runtime', nodeVersion, versions: installed, patch, cloudVerification: 'not_performed' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Run from a pilot app without arguments');
    console.log(JSON.stringify(verifyGameRuntime(process.cwd()), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
