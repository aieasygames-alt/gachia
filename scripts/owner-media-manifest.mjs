#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';

const roots = [
  ['genshin', 'apps/game-genshin/public'],
  ['nte', 'apps/game-nte/public'],
];
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

async function filesUnder(root) {
  const output = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const pathname = join(directory, entry.name);
      if (entry.isDirectory()) await visit(pathname);
      else output.push(pathname);
    }
  }
  await visit(root);
  return output.sort();
}

const entries = [];
for (const [owner, root] of roots) {
  for (const file of await filesUnder(root)) {
    const bytes = await readFile(file);
    const size = (await stat(file)).size;
    const pathname = `/${relative(root, file).split('\\').join('/')}`;
    entries.push({ owner, pathname, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: size, mime: mime[extname(file).toLowerCase()] ?? null, rights: 'unverified', sourcePointer: `${root}/${relative(root, file).split('\\').join('/')}` });
  }
}

const output = process.argv[2] ?? 'reports/owner-media-manifest-2026-10-31.json';
await writeFile(output, `${JSON.stringify({ schema: 'media-evidence-v1', generatedAt: new Date().toISOString(), entries }, null, 2)}\n`);
console.log(`Wrote ${output}; entries: ${entries.length}; rightsVerified: 0`);
