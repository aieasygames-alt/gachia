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

const report = { origin, generatedAt: new Date().toISOString(), checked: 0, findings: [] };
function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
function visibleTextWithoutSourceFallback(html, locale) {
  const sourceFallbacks = [];
  const withoutSourceFallbacks = html.replace(/<([a-z][\w-]*)\b[^>]*\blang=["']([^"']+)["'][^>]*>[\s\S]*?<\/\1>/gi, (match, _tag, language) => {
    if (language === locale) return match;
    sourceFallbacks.push(match);
    return `__SOURCE_FALLBACK_${sourceFallbacks.length - 1}__`;
  });
  return withoutSourceFallbacks
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
for (const path of [...new Set(paths)]) {
  const response = await fetch(new URL(path, origin));
  const html = await response.text();
  const locale = path.split('/')[1];
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, ' ').replace(/\s+/g, ' ').trim();
  const uiText = visibleTextWithoutSourceFallback(html, locale);
  const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '');
  const description = decodeEntities(html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1]?.trim() ?? '');
  const currentNav = /aria-current="page"/.test(html);
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((match) => match[1]);
  const findings = [];
  if (new Set(images).size !== images.length) findings.push('duplicate-image-source');
  // English guides can contain official Chinese search terms inside installation instructions.
  const chineseText = (locale === 'en' ? uiText : text).replace(/(?:Search|搜索|検索)[^.!?]{0,100}/gi, '');
  if (locale === 'en' && /[\u4e00-\u9fff]/.test(chineseText)) findings.push('chinese-visible-text');
  if (locale === 'ja' && /Back to|Version hub|Tier list|Team planning|Preview data/.test(uiText)) findings.push('english-ui-residue');
  if (pages.some((page) => path.endsWith(`/${page}`)) && ['characters', 'guides', 'weapons', 'redeem-codes', 'version'].some((page) => path.endsWith(`/${page}`)) && !currentNav) findings.push('missing-current-nav');
  if (!title || !description) findings.push('missing-title-or-description');
  if (title.length > 72 || description.length > 165) findings.push('metadata-length');
  if (findings.length) report.findings.push({ path, findings, title, description });
  report.checked += 1;
}

await fs.mkdir('reports', { recursive: true });
const file = `reports/content-audit-${new Date().toISOString().slice(0, 10)}.json`;
await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${file}; checked ${report.checked} pages; found ${report.findings.length} pages with findings.`);
if (report.findings.length) console.log(JSON.stringify(report.findings.slice(0, 100), null, 2));
