import fs from 'node:fs/promises';
import rawCharacters from '@gachia/data/games/nte/raw-character-summaries.json' with { type: 'json' };
import rawGuides from '@gachia/data/games/nte/raw-guides.json' with { type: 'json' };
import rawDiskSets from '@gachia/data/games/nte/raw-disk-sets.json' with { type: 'json' };
import rawWeapons from '@gachia/data/games/nte/raw-weapons.json' with { type: 'json' };

const origin = process.env.NTE_PREVIEW_ORIGIN;
if (!origin) throw new Error('NTE_PREVIEW_ORIGIN is required.');

const locales = ['zh', 'en', 'ja'];
const pages = ['characters', 'guides', 'weapons', 'redeem-codes', 'version', 'items', 'disk-sets', 'tier-list', 'download', 'gacha', 'anomalies', 'build', 'teams', 'compare', 'calculator', 'events', 'merchant', 'map'];
const paths = locales.flatMap((locale) => [`/${locale}/nte`, ...pages.map((page) => `/${locale}/nte/${page}`)]);
for (const locale of locales) {
  paths.push(...rawCharacters.filter((item) => item.id).map((item) => `/${locale}/nte/characters/${item.id}`));
  paths.push(...rawGuides.filter((item) => item.id).map((item) => `/${locale}/nte/guides/${item.id}`));
  paths.push(...rawDiskSets.filter((item) => item.id).map((item) => `/${locale}/nte/disk-sets/${item.id}`));
  paths.push(...rawWeapons.filter((item) => item.id).map((item) => `/${locale}/nte/weapons/${item.id}`));
}

const uniquePaths = [...new Set(paths)];
const report = { origin, generatedAt: new Date().toISOString(), checked: uniquePaths.length, failures: [] };
for (const path of uniquePaths) {
  const response = await fetch(new URL(path, origin));
  const html = await response.text();
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? '';
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((match) => match[1]).filter((href) => href.startsWith('/'));
  const failures = [];
  if (response.status !== 200) failures.push(`status:${response.status}`);
  if (!title) failures.push('missing-title');
  if (!canonical.startsWith('https://gachia.com/')) failures.push('invalid-canonical');
  if (!/noindex/i.test(response.headers.get('x-robots-tag') ?? '')) failures.push('missing-noindex');
  if (html.replace(/<[^>]+>/g, ' ').trim().length < 100) failures.push('thin-body');
  const allowedSiteLinks = ['/zh', '/en', '/ja', '/zh/games', '/en/games', '/ja/games', '/zh/privacy', '/en/privacy', '/ja/privacy', '/zh/contact', '/en/contact', '/ja/contact'];
  const allowedGamePrefixes = ['/zh/', '/en/', '/ja/'];
  if (links.some((href) => !href.startsWith('/zh/nte') && !href.startsWith('/en/nte') && !href.startsWith('/ja/nte') && !href.startsWith('/_games/nte') && !allowedSiteLinks.includes(href) && !allowedGamePrefixes.some((prefix) => href.startsWith(prefix)))) failures.push('unexpected-internal-link');
  if (failures.length) report.failures.push({ path, failures });
}

for (const path of ['/zh/nte/characters/not-real', '/zh/nte/guides/not-real', '/zh/nte/disk-sets/not-real', '/zh/nte/weapons/not-real']) {
  const response = await fetch(new URL(path, origin));
  if (response.status !== 404) report.failures.push({ path, failures: [`expected-404:${response.status}`] });
}

await fs.mkdir('reports', { recursive: true });
const file = `reports/full-audit-${new Date().toISOString().slice(0, 10)}.json`;
await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${file}; checked ${report.checked} pages.`);
if (report.failures.length) {
  console.error(JSON.stringify(report.failures.slice(0, 50), null, 2));
  process.exit(1);
}
