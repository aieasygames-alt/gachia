import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const MANAGED_MIRRORS = Object.freeze([
  { game: 'wuwa', file: 'raw-redeem-codes.json', key: 'code' },
  { game: 'skjh', file: 'raw-guides.json', key: 'id' },
  { game: 'roco-cn', file: 'raw-guides.json', key: 'id' },
  { game: 'wuwa', file: 'raw-echoes.json', key: 'id' },
  { game: 'wuwa', file: 'raw-regions.json', key: 'id' },
].map(Object.freeze));

async function inputs(root) {
  return Promise.all(MANAGED_MIRRORS.map(async ({ game, file, key }) => {
    const source = `packages/data/games/${game}/${file}`;
    const mirror = `apps/web/public/data/${game}/${file}`;
    const value = JSON.parse(await readFile(resolve(root, source), 'utf8'));
    if (!Array.isArray(value) || value.length === 0) throw new Error(`${source}: expected nonempty array`);
    const keys = value.map(entry => entry?.[key]);
    if (keys.some(id => typeof id !== 'string' || !id.trim()) || new Set(keys).size !== keys.length) {
      throw new Error(`${source}: missing or duplicate ${key}`);
    }
    return { source, mirror, value };
  }));
}

export async function verifyRawMirrors(root = ROOT) {
  const rows = await inputs(root);
  const issues = [];
  for (const { mirror, value } of rows) {
    try {
      const actual = JSON.parse(await readFile(resolve(root, mirror), 'utf8'));
      if (!isDeepStrictEqual(value, actual)) issues.push(`drift: ${mirror}`);
    } catch (error) {
      issues.push(`missing or invalid: ${mirror} (${error.message})`);
    }
  }
  if (issues.length) throw new Error(`Managed raw mirror contract failed:\n${issues.join('\n')}\nReview source and run pnpm --filter @gachia/data generate:raw-mirrors; never choose authority by file timestamp.`);
  return { contract: 'managed-raw-mirrors-v1', pairs: rows.length, entries: rows.reduce((sum, row) => sum + row.value.length, 0) };
}

export async function writeRawMirrors(root = ROOT) {
  // Validate every input before touching an output. Unmanaged pairs are never copied.
  const rows = await inputs(root);
  for (const { mirror, value } of rows) {
    const target = resolve(root, mirror);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--write')) throw new Error('Usage: raw-mirror-contract.mjs [--write]');
  if (args[0] === '--write') await writeRawMirrors();
  console.log(JSON.stringify(await verifyRawMirrors(), null, 2));
}
