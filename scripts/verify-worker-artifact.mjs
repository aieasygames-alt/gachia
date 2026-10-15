import { lstatSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyWorkerArtifact(directory) {
  if (lstatSync(directory).isSymbolicLink()) throw Error('Artifact root must not be a link');
  const root = realpathSync(directory);
  const inside = target => {
    const rel = relative(root, target);
    return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
  };
  let files = 0; let links = 0;
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        if (isAbsolute(readlinkSync(path)) || !inside(realpathSync(path))) {
          throw Error('Non-portable artifact link: ' + relative(root, path));
        }
        links++;
      } else if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files++;
      else throw Error('Unsupported artifact entry: ' + relative(root, path));
    }
  }
  walk(root);
  for (const path of ['worker.js', '.build/open-next.config.edge.mjs', 'assets/BUILD_ID']) {
    const stat = lstatSync(join(root, path));
    if (!stat.isFile() || stat.size === 0 || !inside(realpathSync(join(root, path)))) {
      throw Error('Required artifact file missing or invalid: ' + path);
    }
  }
  return { files, links, portable: true, scope: 'filesystem_portability_not_runtime_or_platform_acceptance' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw Error('Usage: node scripts/verify-worker-artifact.mjs DIRECTORY');
  console.log(JSON.stringify(verifyWorkerArtifact(process.argv[2])));
}
