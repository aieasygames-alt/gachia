import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(process.argv[2] ?? 'reports/owner-media-manifest-2026-10-31.json', 'utf8'));
const origins = { genshin: process.env.GENSHIN_ORIGIN ?? 'http://127.0.0.1:3317', nte: process.env.NTE_ORIGIN ?? 'http://127.0.0.1:3322' };
const results = [];
for (const entry of manifest.entries) {
  const response = await fetch(new URL(entry.pathname, origins[entry.owner]));
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  results.push({ owner: entry.owner, pathname: entry.pathname, status: response.status, contentType: response.headers.get('content-type'), bytes: bytes.length, digest, matches: response.status === 200 && bytes.length === entry.bytes && digest === entry.sha256 });
}
const failed = results.filter(row => !row.matches);
console.log(JSON.stringify({ results, passed: results.length - failed.length, failed: failed.length }, null, 2));
if (failed.length) process.exitCode = 1;
