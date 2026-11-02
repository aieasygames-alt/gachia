import { execFileSync } from 'node:child_process';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, process.argv[2] ?? 'reports/payload-real-slice-2026-11-01/source-manifest.json');
if (!output.startsWith(root + '/reports/')) throw new Error('New report path required');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const candidates = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0').filter(Boolean);
const selected = candidates.filter(file => /^(apps\/|packages\/|services\/content-cms\/|scripts\/|patches\/|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|turbo\.json$)/.test(file)
  && !/(^|\/)(node_modules|\.local|\.next|\.open-next|\.wrangler|reports|test-results|playwright-report|coverage|\.env[^/]*)(\/|$)/.test(file)
  && !/\.(?:db|sqlite|sqlite3|tsbuildinfo|log)$/.test(file));
selected.push('reports/payload-real-slice-2026-11-01/navigation-a.json', 'reports/payload-real-slice-2026-11-01/navigation-b.json',
  'reports/payload-real-slice-2026-11-01/final/semantics.json', 'reports/payload-real-slice-2026-11-01/final/rights-responsibility.json',
  'reports/payload-next-phase-2026-11-01/shadow-split-fixture.json', 'reports/shadow-fixture-2026-10-31.json');
const files = [];
for (const file of [...new Set(selected)].sort()) {
  const stat = await lstat(resolve(root, file));
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Non-regular input requires explicit review: ${file}`);
  const bytes = await readFile(resolve(root, file));
  files.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
}
const result = { schema: 'payload-local-source-manifest-v2', baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
  dirtyWorktree: true, node: process.version, files, count: files.length, manifestKey: hash(JSON.stringify(files)), publishable: false,
  scope: 'Git-discovered tracked/untracked non-ignored application/package/CMS/script/patch inputs and selected fixtures, including local public assets. Excludes secrets, DB state, dependency installations, build outputs and unrelated reports; not signed or CI-reproducible release proof.' };
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ count: result.count, manifestKey: result.manifestKey, output }));
