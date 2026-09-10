import fs from 'node:fs/promises';
import rawCharacters from '@gachia/data/games/nte/raw-character-summaries.json' with { type: 'json' };
import rawGuides from '@gachia/data/games/nte/raw-guides.json' with { type: 'json' };
import rawDiskSets from '@gachia/data/games/nte/raw-disk-sets.json' with { type: 'json' };
import rawWeapons from '@gachia/data/games/nte/raw-weapons.json' with { type: 'json' };
import rawBuilds from '@gachia/data/games/nte/raw-builds.json' with { type: 'json' };
import rawCharacterMaterials from '@gachia/data/games/nte/raw-character-materials.json' with { type: 'json' };

const origin = process.env.NTE_PREVIEW_ORIGIN;
if (!origin) throw new Error('NTE_PREVIEW_ORIGIN is required.');

const locales = ['zh', 'en', 'ja'];
const pages = ['characters', 'guides', 'weapons', 'redeem-codes', 'version', 'items', 'disk-sets', 'tier-list', 'download', 'gacha', 'anomalies', 'build', 'teams', 'compare', 'calculator', 'events', 'merchant', 'map'];
const detailGroups = [
  ['characters', rawCharacters],
  ['guides', rawGuides],
  ['disk-sets', rawDiskSets],
  ['weapons', rawWeapons],
];

const expectedPaths = new Set(locales.flatMap((locale) => [`/${locale}/nte`, ...pages.map((page) => `/${locale}/nte/${page}`)]));
for (const locale of locales) {
  for (const [group, entries] of detailGroups) {
    for (const entry of entries) if (entry.id) expectedPaths.add(`/${locale}/nte/${group}/${entry.id}`);
  }
}

function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function internalLinks(html) {
  return [...html.matchAll(/<a\b[^>]+href="([^"]+)"/gi)]
    .map((match) => decodeEntities(match[1]))
    .filter((href) => href.startsWith('/'));
}

function assetSources(html) {
  return [...html.matchAll(/<(?:img|script|link)\b[^>]+(?:src|href)="([^"]+)"/gi)]
    .map((match) => decodeEntities(match[1]))
    .filter((url) => url.startsWith('/'));
}

function requestPath(path) {
  // The standalone local Worker has no Router Worker to rewrite the production
  // asset namespace. Production keeps the original /_games/nte URLs.
  if (new URL(origin).hostname === '127.0.0.1' && path.startsWith('/_games/nte/_next/')) return `/_next/${path.slice('/_games/nte/_next/'.length)}`;
  return path;
}

const report = {
  origin,
  generatedAt: new Date().toISOString(),
  checkedPages: expectedPaths.size,
  issues: [],
  inbound: {},
  sitemap: { expected: expectedPaths.size, missing: [], unexpected: [] },
};
const pageHtml = new Map();

for (const path of expectedPaths) {
  const response = await fetch(new URL(path, origin));
  const html = await response.text();
  pageHtml.set(path, html);
  const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
  const description = decodeEntities(html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1]?.trim() ?? '');
  const canonical = decodeEntities(html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? '');
  const alternates = [...html.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"/gi)];
  const issues = [];
  if (response.status !== 200) issues.push(`status:${response.status}`);
  if (!title || title.length > 70) issues.push('title');
  if (!description || description.length > 160) issues.push('description');
  if (canonical !== `https://gachia.com${path}`) issues.push('canonical');
  if (!/noindex/i.test(response.headers.get('x-robots-tag') ?? '')) issues.push('noindex');
  for (const locale of locales) {
    const code = locale === 'zh' ? 'zh-Hans' : locale;
    if (!alternates.some((match) => match[1] === code && match[2] === `https://gachia.com/${locale}${path.slice(3)}`)) issues.push(`hreflang:${code}`);
  }
  if (!alternates.some((match) => match[1] === 'x-default' && match[2] === `https://gachia.com/zh${path.slice(3)}`)) issues.push('hreflang:x-default');
  if (!/href="https:\/\/gachia\.com\/(?:zh|en|ja)"/i.test(html)) issues.push('missing-shared-site-navigation');
  if (!/<footer\b/i.test(html)) issues.push('missing-shared-site-footer');
  for (const href of internalLinks(html)) {
    if (expectedPaths.has(href)) report.inbound[href] = (report.inbound[href] ?? 0) + 1;
    else if (!href.startsWith('/_games/nte/')) issues.push(`invalid-link:${href}`);
  }
  for (const asset of assetSources(html)) {
    if (!asset.startsWith('/_games/nte/')) continue;
    const assetResponse = await fetch(new URL(requestPath(asset), origin));
    if (!assetResponse.ok) issues.push(`asset:${assetResponse.status}:${asset}`);
  }
  if (/\/characters\/[^/]+$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-character-jsonld');
  if (/\/guides\/[^/]+$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-guide-jsonld');
  if ((/\/nte$/.test(path) || /\/nte\/version$/.test(path)) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-hub-jsonld');
  if (/\/nte\/anomalies$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-anomalies-jsonld');
  if (/\/nte\/build$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-build-jsonld');
  if (/\/nte\/tier-list$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-tier-jsonld');
  if (/\/nte\/(weapons|disk-sets|items)$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-database-jsonld');
  if (/\/nte\/(events|merchant|calculator)$/.test(path) && !/<script[^>]+type="application\/ld\+json"/i.test(html)) issues.push('missing-planning-jsonld');
  const characterId = path.match(/\/characters\/([^/]+)$/)?.[1];
  if (characterId && rawBuilds.some((entry) => entry.characterId === characterId) && !/(详细配装|Detailed builds|詳細ビルド)/.test(html)) issues.push('missing-character-detailed-builds');
  if (characterId && rawCharacterMaterials.some((entry) => entry.characterId === characterId) && !/(养成材料|Ascension materials|育成素材)/.test(html)) issues.push('missing-character-materials');
  if (issues.length) report.issues.push({ path, issues });
}

for (const locale of locales) {
  for (const page of pages) {
    const path = `/${locale}/nte/${page}`;
    if (!report.inbound[path]) report.issues.push({ path, issues: ['orphan-static-page'] });
  }
}

const sitemapResponse = await fetch(new URL('/sitemap.xml', origin));
const sitemap = await sitemapResponse.text();
if (!sitemapResponse.ok) report.issues.push({ path: '/sitemap.xml', issues: [`status:${sitemapResponse.status}`] });
const sitemapPaths = new Set([...sitemap.matchAll(/<loc>https:\/\/gachia\.com([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1])));
report.sitemap.missing = [...expectedPaths].filter((path) => !sitemapPaths.has(path));
report.sitemap.unexpected = [...sitemapPaths].filter((path) => !expectedPaths.has(path));
if (report.sitemap.missing.length) report.issues.push({ path: '/sitemap.xml', issues: [`missing:${report.sitemap.missing.length}`] });
if (report.sitemap.unexpected.length) report.issues.push({ path: '/sitemap.xml', issues: [`unexpected:${report.sitemap.unexpected.length}`] });

await fs.mkdir('reports', { recursive: true });
const file = `reports/site-audit-${new Date().toISOString().slice(0, 10)}.json`;
await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${file}; checked ${report.checkedPages} pages; found ${report.issues.length} issue groups.`);
if (report.issues.length) console.log(JSON.stringify(report.issues.slice(0, 100), null, 2));
if (report.issues.length) process.exitCode = 1;
