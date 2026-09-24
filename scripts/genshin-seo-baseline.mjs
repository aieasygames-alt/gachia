import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.GENSHIN_BASELINE_ORIGIN ?? 'https://gachia.com';
const timeoutMs = Number.parseInt(process.env.GENSHIN_BASELINE_TIMEOUT_MS ?? '15000', 10);
const locales = ['zh', 'en', 'ja'];
const localizedPaths = [
  '', 'characters', 'characters/hu-tao', 'weapons', 'weapons/sacrificial-jade',
  'artifacts', 'artifacts/gladiators-finale', 'items', 'guides',
  'guides/banner-schedule-guide', 'redeem-codes', 'version', 'gacha', 'build',
  'teams', 'tier-list', 'compare', 'calculator', 'map', 'download',
];

function extract(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? '';
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/<!-- -->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function linkAttribute(html, rel) {
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([value]) => value)
    .find((value) => new RegExp(`\\brel=["']${rel}["']`, 'i').test(value));
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
}

function snapshot(path, response, html) {
  const alternates = [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const language = tag.match(/\bhrefLang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    return language && href ? [`${language}:${href}`] : [];
  }).sort();
  const resources = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map(([, value]) => value)
    .filter((value) => value.startsWith('/_next/') || value.startsWith('/_games/') || value.includes('_rsc'));
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map(([, value]) => value.trim());
  const bodyText = normalizeText(html);
  return {
    path,
    finalUrl: response.url,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    cacheControl: response.headers.get('cache-control') ?? '',
    vary: response.headers.get('vary') ?? '',
    xRobotsTag: response.headers.get('x-robots-tag') ?? '',
    title: decodeEntities(extract(html, /<title>([\s\S]*?)<\/title>/i)),
    description: decodeEntities(extract(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i)),
    canonical: linkAttribute(html, 'canonical'),
    alternates,
    jsonLdCount: jsonLd.length,
    jsonLdTypes: jsonLd.flatMap((value) => [...value.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map(([, type]) => type)),
    bodyTextLength: bodyText.length,
    genshinInternalLinkCount: [...html.matchAll(/<a\b[^>]+href="\/(?:zh|en|ja)\/genshin(?:[\/"])/gi)].length,
    resources: [...new Set(resources)],
  };
}

async function fetchSnapshot(path) {
  const target = new URL(path, origin);
  const response = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  return snapshot(path, response, await response.text());
}

const paths = locales.flatMap((locale) => localizedPaths.map((suffix) => `/${locale}/genshin${suffix ? `/${suffix}` : ''}`));
const pages = [];
const failures = [];
for (const path of paths) {
  try {
    const page = await fetchSnapshot(path);
    pages.push(page);
    if (page.status !== 200) failures.push(`${path}: HTTP ${page.status}`);
    if (page.canonical !== `https://gachia.com${path}`) failures.push(`${path}: unexpected canonical ${page.canonical || '(missing)'}`);
    if (!['zh-Hans', 'en', 'ja', 'x-default'].every((locale) => page.alternates.some((entry) => entry.startsWith(`${locale}:`)))) failures.push(`${path}: incomplete hreflang`);
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const report = { generatedAt: new Date().toISOString(), origin, timeoutMs, pages, failures };
await mkdir('reports/genshin', { recursive: true });
const output = `reports/genshin/seo-baseline-${new Date().toISOString().slice(0, 10)}.json`;
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${output}; pages: ${pages.length}; failures: ${failures.length}.`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
