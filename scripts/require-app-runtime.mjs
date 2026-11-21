import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyNextDeferredPatch } from './verify-next-deferred-patch.mjs';

export const RUNTIME_APPS = Object.freeze(['web', 'game-genshin', 'game-lvmeng', 'game-nte', 'game-azur-promilia']);
export const APP_RUNTIME = Object.freeze({
  next: '15.5.29',
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

export function assertAppRuntime({ name, declared, installed, nodeVersion }) {
  if (!RUNTIME_APPS.some(app => name === `@gachia/${app}`)) {
    throw new Error('Runtime gate requires a registered Next application');
  }
  if (!/^\d+\.\d+\.\d+$/.test(nodeVersion) || Number(nodeVersion.split('.')[0]) < 22) {
    throw new Error('Application runtime requires Node 22 or newer');
  }
  for (const [dependency, expected] of Object.entries(APP_RUNTIME)) {
    if (declared[dependency] !== expected || installed[dependency] !== expected) {
      throw new Error(`Unreviewed runtime: ${dependency} must be declared and installed as ${expected}`);
    }
  }
}

// Resolve each application's actual dependencies, never a root-level fallback.
export function verifyAppRuntime(appRoot, { nodeVersion = process.versions.node } = {}) {
  const packagePath = resolve(appRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  const require = createRequire(packagePath);
  const installed = Object.fromEntries(Object.keys(APP_RUNTIME).map(name => [name, readResolvedPackage(require, name).version]));
  assertAppRuntime({ name: pkg.name, declared: { ...pkg.dependencies, ...pkg.devDependencies }, installed, nodeVersion });
  const patch = verifyNextDeferredPatch(dirname(require.resolve('next/package.json')), { requirePatched: true });
  return { status: 'reviewed_application_runtime', app: pkg.name, nodeVersion, versions: installed, patch, cloudVerification: 'not_performed' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--all')) throw new Error('Run from an app without arguments, or use --all');
    const result = args[0] === '--all'
      ? RUNTIME_APPS.map(app => verifyAppRuntime(resolve(import.meta.dirname, '../apps', app)))
      : verifyAppRuntime(process.cwd());
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
