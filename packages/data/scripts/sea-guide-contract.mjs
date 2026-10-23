import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE = 'packages/data/games/sea/raw-guides.json';
const PUBLIC = 'apps/web/public/';
const DETAILS = 'data-client/sea/guides/';

export function seaGuideOutputs(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Sea guides must be a nonempty array');
  const outputs = new Map([['data/sea/raw-guides.json', raw]]);
  const ids = new Set();
  const summaries = raw.map(guide => {
    if (!guide || typeof guide.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.id) || ids.has(guide.id)) {
      throw new Error(`Invalid or duplicate Sea guide id: ${guide?.id}`);
    }
    if (typeof guide.content !== 'string' || !guide.content.trim() || typeof guide.title !== 'string' || !guide.title.trim()) {
      throw new Error(`Sea guide ${guide.id} requires title and content`);
    }
    ids.add(guide.id);
    outputs.set(`${DETAILS}${guide.id}.json`, guide);
    const { content: _zh, contentEn: _en, contentJa: _ja, faq: _faq, ...summary } = guide;
    return summary;
  });
  outputs.set('data-client/sea/guides.json', summaries);
  return outputs;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

export async function checkSeaGuideContract(root = ROOT) {
  const raw = JSON.parse(await readFile(resolve(root, SOURCE), 'utf8'));
  const outputs = seaGuideOutputs(raw);
  const issues = [];
  for (const [path, expected] of outputs) {
    try {
      const actual = JSON.parse(await readFile(resolve(root, PUBLIC, path), 'utf8'));
      if (!isDeepStrictEqual(actual, expected)) issues.push(`drift: ${PUBLIC}${path}`);
    } catch (error) {
      issues.push(`missing or invalid: ${PUBLIC}${path} (${error.message})`);
    }
  }
  // Old detail files remain public assets even after leaving the index. Require
  // an explicit editorial/removal decision instead of silently deleting them.
  const details = await readdir(resolve(root, PUBLIC, DETAILS)).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const name of details) {
    if (name.endsWith('.json') && !outputs.has(`${DETAILS}${name}`)) issues.push(`orphan: ${PUBLIC}${DETAILS}${name}`);
  }
  return {
    contract: 'sea-guides-v1', source: SOURCE,
    sourceSha256: createHash('sha256').update(JSON.stringify(canonical(raw))).digest('hex'),
    guides: raw.length, outputs: outputs.size, issues,
  };
}

export async function verifySeaGuideContract(root = ROOT) {
  const result = await checkSeaGuideContract(root);
  if (result.issues.length) throw new Error(`Sea guide content contract failed:\n${result.issues.join('\n')}\nReview source, then run pnpm --filter @gachia/data generate:sea-guides; orphan removal requires review.`);
  return result;
}

export async function writeSeaGuideOutputs(root = ROOT) {
  const raw = JSON.parse(await readFile(resolve(root, SOURCE), 'utf8'));
  const outputs = seaGuideOutputs(raw);
  for (const [path, value] of outputs) {
    const target = resolve(root, PUBLIC, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(value)}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--write')) throw new Error('Usage: sea-guide-contract.mjs [--write]');
  if (args[0] === '--write') await writeSeaGuideOutputs();
  console.log(JSON.stringify(await verifySeaGuideContract(), null, 2));
}
