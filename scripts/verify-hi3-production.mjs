import { readFile } from 'node:fs/promises';

const origin = process.env.SITE_ORIGIN ?? 'https://gachia.com';
const entries = await Promise.all(['characters', 'weapons', 'materials', 'guides'].map(async (kind) => {
  const rows = JSON.parse(await readFile(new URL(`../packages/data/games/hi3/raw-${kind}.json`, import.meta.url), 'utf8'));
  const route = kind === 'materials' ? 'items' : kind;
  return rows.map(({ id }) => `${route}/${id}`);
}));
const suffixes = ['', 'characters', 'weapons', 'items', 'guides', 'version', 'download', ...entries.flat()];
const failures = [];
for (const locale of ['zh', 'en', 'ja']) {
  for (const suffix of suffixes) {
    const path = `/${locale}/hi3${suffix ? `/${suffix}` : ''}`;
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    if (response.status !== 200) failures.push(`${path}: HTTP ${response.status}`);
    if (!body.includes(`href="https://gachia.com${path}"`)) failures.push(`${path}: missing canonical URL`);
    if (!/<h1[\s>]/.test(body)) failures.push(`${path}: missing heading`);
    if (body.includes('NEXT_HTTP_ERROR_FALLBACK;404')) failures.push(`${path}: rendered not-found`);
    console.log(`${response.status}\t${path}`);
  }
}
for (const path of ['/images/hi3/characters/official-v9-0.svg', '/data/hi3/raw-guides.json', '/zh/tools/market-intel']) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) failures.push(`${path}: HTTP ${response.status}`);
  console.log(`${response.status}\t${path}`);
}
const sitemap = await (await fetch(new URL('/sitemap.xml', origin))).text();
for (const locale of ['zh', 'en', 'ja']) {
  for (const suffix of suffixes) {
    const path = `/${locale}/hi3${suffix ? `/${suffix}` : ''}`;
    if (!sitemap.includes(`https://gachia.com${path}</loc>`)) failures.push(`${path}: absent from sitemap`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${suffixes.length * 3} HI3 pages, assets, dashboard, and sitemap.`);
}
