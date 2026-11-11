import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mainManifests } from '../packages/data/scripts/main-manifests.mjs';

const ROOT = resolve(import.meta.dirname, '..');

// Produce isolated candidate indexes only. Never rewrite the compatibility assets in place.
export async function writeGenshinMainBase(output, root = ROOT) {
  root = realpathSync(root);
  const directory = resolve(output);
  assert(directory !== root && !root.startsWith(directory + '/'), 'Output cannot contain the repository');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked output parent');
  const files = await mainManifests(pathToFileURL(join(root, 'packages/data/games/')), { genshinWorkerBase: true });
  await mkdir(directory);
  for (const [file, value] of files) await writeFile(join(directory, file), `${JSON.stringify(value)}\n`, { flag: 'wx' });
  return { kind: 'genshin_main_base_candidate', directory, files: [...files.keys()], cloudWrites: false, productionReady: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 4 && process.argv[2] === '--output', 'Usage: node scripts/genshin-main-base.mjs --output <new-directory>');
  console.log(JSON.stringify(await writeGenshinMainBase(process.argv[3])));
}
