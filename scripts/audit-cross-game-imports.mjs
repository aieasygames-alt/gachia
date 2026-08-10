import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const appRoot = join(repoRoot, 'apps/web/app');
const targetSegment = `${join('app', '[lang]', '[game]')}`;

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [file] : [];
  });
}

const importPattern = /from\s+['"]@gachia\/data\/games\/([^/]+)\//g;
const gameIdPattern = /^[a-z0-9-]+$/;
const rows = [];

for (const file of walk(appRoot)) {
  const rel = relative(repoRoot, file);
  if (!rel.includes(targetSegment)) continue;

  const source = readFileSync(file, 'utf8');
  const games = new Set();
  let match;
  while ((match = importPattern.exec(source))) {
    if (gameIdPattern.test(match[1])) {
      games.add(match[1]);
    }
  }

  if (games.size > 1) {
    rows.push({ file: rel, games: [...games].sort() });
  }
}

rows.sort((a, b) => b.games.length - a.games.length || a.file.localeCompare(b.file));

if (rows.length === 0) {
  console.log('No cross-game static data imports found in app/[lang]/[game].');
} else {
  console.log('Cross-game static data imports in app/[lang]/[game]:');
  for (const row of rows) {
    console.log(`${row.games.length}\t${row.file}\t${row.games.join(', ')}`);
  }
}
