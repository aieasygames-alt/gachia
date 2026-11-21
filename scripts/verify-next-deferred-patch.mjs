import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const digest = value => createHash('sha256').update(value).digest('hex');
const manifests = new Map(['15.5.18', '15.5.28', '15.5.29'].map(version => [version,
  fileURLToPath(new URL(`../patches/next-${version}-deferred-initial.json`, import.meta.url)),
]));

// Read-only: this does not apply a patch or enable it in package-manager config.
export function verifyNextDeferredPatch(packageRoot, { requirePatched = false } = {}) {
  const root = realpathSync(packageRoot);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const manifestPath = manifests.get(pkg.version);
  if (pkg.name !== 'next' || !manifestPath) throw Error('Exact Next version required');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (digest(readFileSync(join(dirname(manifestPath), manifest.patch))) !== manifest.patchSha256) {
    throw Error('Patch digest mismatch');
  }
  if (pkg.name !== manifest.package || pkg.version !== manifest.version) throw Error('Exact Next version required');
  const files = manifest.files.map(file => {
    const path = realpathSync(join(root, file.path));
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw Error('Package-local source required');
    const sha256 = digest(readFileSync(path));
    const state = sha256 === file.originalSha256 ? 'original' : sha256 === file.patchedSha256 ? 'patched' : 'drift';
    if (state === 'drift') throw Error('Source digest mismatch: ' + file.path);
    return { path: file.path, sha256, state };
  });
  if (new Set(files.map(file => file.state)).size !== 1) throw Error('Partial patch rejected');
  if (requirePatched && files[0].state !== 'patched') throw Error('Patched Next required; refresh dependencies before building');
  return { nextVersion: pkg.version, state: files[0].state, files, productionEnabled: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const args = process.argv.slice(2);
  const requirePatched = args.includes('--require-patched');
  const paths = args.filter(arg => arg !== '--require-patched');
  if (paths.length > 1 || paths.some(arg => arg.startsWith('--'))) throw Error('Expected optional package root and --require-patched');
  const root = paths[0] ?? dirname(require.resolve('next/package.json'));
  console.log(JSON.stringify(verifyNextDeferredPatch(root, { requirePatched }), null, 2));
}
