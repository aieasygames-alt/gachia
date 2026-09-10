import fs from 'node:fs/promises';

const origin = process.env.AZUR_PROMILIA_STAGING_ORIGIN ?? 'https://gachia-game-azur-promilia-staging.aieasygames.workers.dev';
const timeoutMs = Number.parseInt(process.env.AZUR_PROMILIA_PARITY_TIMEOUT_MS ?? '8000', 10);
const paths = [
  '/zh/azur-promilia', '/en/azur-promilia', '/ja/azur-promilia',
  '/zh/azur-promilia/characters', '/zh/azur-promilia/weapons',
  '/zh/azur-promilia/guides', '/zh/azur-promilia/guides/official-information-checklist',
  '/zh/azur-promilia/kibo', '/zh/azur-promilia/world',
  '/zh/azur-promilia/tier-list', '/zh/azur-promilia/redeem-codes',
];

function linkTags(html) { return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag); }
function attribute(tag, name) { return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1]?.trim() ?? ''; }
function snapshot(path, response, html) {
  const links = linkTags(html);
  const canonical = attribute(links.find((tag) => /\brel=["']canonical["']/i.test(tag)) ?? '', 'href');
  const hreflang = links.flatMap((tag) => {
    const lang = attribute(tag, 'hreflang');
    const href = attribute(tag, 'href');
    return lang && href ? [`${lang}:${href}`] : [];
  });
  return {
    path,
    status: response.status,
    title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '',
    canonical,
    hreflang,
    jsonLdCount: [...html.matchAll(/<script type="application\/ld\+json">/gi)].length,
    hasExternalAssetPrefix: /(?:src|href)="\/_games\/azur-promilia\/_next\//i.test(html),
    noindex: /noindex/i.test(response.headers.get('x-robots-tag') ?? '') || /noindex/i.test(html),
  };
}

async function fetchPage(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(timeoutMs) });
  return snapshot(path, response, await response.text());
}

const pages = await Promise.all(paths.map(async (path) => {
  try { return await fetchPage(path); }
  catch (error) { return { path, status: 0, error: error instanceof Error ? error.message : String(error) }; }
}));

const expectedHreflang = ['zh-Hans', 'en', 'ja', 'x-default'];
const failures = pages.flatMap((page) => {
  if (page.status !== 200) return [`${page.path}: expected 200, got ${page.status}`];
  const messages = [];
  if (!page.title) messages.push('missing title');
  if (!page.canonical?.startsWith('https://gachia.com/')) messages.push('canonical is not on gachia.com');
  if (!expectedHreflang.every((lang) => page.hreflang?.some((value) => value.startsWith(`${lang}:`)))) messages.push('incomplete hreflang');
  if (!page.jsonLdCount) messages.push('missing JSON-LD');
  if (!page.hasExternalAssetPrefix) messages.push('missing namespaced Next asset');
  if (!page.noindex) messages.push('preview lacks noindex');
  return messages.map((message) => `${page.path}: ${message}`);
});

await fs.mkdir('reports', { recursive: true });
const output = `reports/azur-promilia-seo-parity-${new Date().toISOString().slice(0, 10)}.json`;
await fs.writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), origin, timeoutMs, pages }, null, 2)}\n`);
console.log(`Wrote ${output}; inspected ${pages.length} pages.`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
