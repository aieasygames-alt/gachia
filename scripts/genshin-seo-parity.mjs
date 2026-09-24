import { mkdir, writeFile } from 'node:fs/promises';

const stagingOrigin = process.env.GENSHIN_STAGING_ORIGIN;
if (!stagingOrigin) throw new Error('Set GENSHIN_STAGING_ORIGIN to a protected Genshin Worker preview origin before running SEO parity.');

const productionOrigin = process.env.GENSHIN_PRODUCTION_ORIGIN ?? 'https://gachia.com';
const previewOnly = process.env.GENSHIN_PREVIEW_ONLY === 'true';
const timeoutMs = Number.parseInt(process.env.GENSHIN_PARITY_TIMEOUT_MS ?? '15000', 10);
const locales = ['zh', 'en', 'ja'];
const paths = locales.flatMap((locale) => [
  `/${locale}/genshin`, `/${locale}/genshin/characters`, `/${locale}/genshin/characters/hu-tao`,
  `/${locale}/genshin/weapons`, `/${locale}/genshin/weapons/sacrificial-jade`,
  `/${locale}/genshin/artifacts`, `/${locale}/genshin/artifacts/gladiators-finale`,
  `/${locale}/genshin/items`, `/${locale}/genshin/guides`, `/${locale}/genshin/guides/banner-schedule-guide`,
  `/${locale}/genshin/redeem-codes`, `/${locale}/genshin/version`, `/${locale}/genshin/gacha`,
  `/${locale}/genshin/build`, `/${locale}/genshin/teams`, `/${locale}/genshin/tier-list`,
  `/${locale}/genshin/compare`, `/${locale}/genshin/calculator`, `/${locale}/genshin/map`, `/${locale}/genshin/download`,
]);

function attribute(tag, name) { return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1]?.trim() ?? ''; }
function links(html) { return [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag); }
function normalizeText(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function snapshot(path, response, html) {
  const linkTags = links(html);
  const canonical = attribute(linkTags.find((tag) => /\brel=["']canonical["']/i.test(tag)) ?? '', 'href');
  const alternates = linkTags.flatMap((tag) => {
    const language = attribute(tag, 'hreflang');
    const href = attribute(tag, 'href');
    return language && href ? [`${language}:${href}`] : [];
  }).sort();
  const bodyText = normalizeText(html);
  return {
    path,
    finalUrl: response.url,
    status: response.status,
    title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '',
    description: html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim() ?? '',
    canonical,
    alternates,
    xRobotsTag: response.headers.get('x-robots-tag') ?? '',
    jsonLdCount: [...html.matchAll(/<script type=["']application\/ld\+json["']/gi)].length,
    bodyTextLength: bodyText.length,
    genshinInternalLinkCount: [...html.matchAll(/<a\b[^>]+href=["']\/(?:zh|en|ja)\/genshin(?:[\/"'])/gi)].length,
    assets: [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(([, value]) => value).filter((value) => value.startsWith('/_games/genshin/_next/')),
  };
}
async function fetchSnapshot(origin, path) {
  const response = await fetch(new URL(path, origin), { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  return snapshot(path, response, await response.text());
}

async function checkAssets(origin, assets) {
  const results = await Promise.all(assets.slice(0, 12).map(async (asset) => {
    try {
      const response = await fetch(new URL(asset, origin), { signal: AbortSignal.timeout(timeoutMs) });
      return { asset, status: response.status, contentType: response.headers.get('content-type') ?? '' };
    } catch (error) {
      return { asset, status: 0, contentType: '', error: String(error) };
    }
  }));
  return results;
}

const pages = [];
for (const path of paths) {
  const [productionResult, stagingResult] = await Promise.allSettled([fetchSnapshot(productionOrigin, path), fetchSnapshot(stagingOrigin, path)]);
  const production = productionResult.status === 'fulfilled' ? productionResult.value : { status: 0, error: String(productionResult.reason) };
  const staging = stagingResult.status === 'fulfilled' ? stagingResult.value : { status: 0, error: String(stagingResult.reason) };
  const bothAvailable = !previewOnly && production.status === 200 && staging.status === 200;
  const assetChecks = staging.status === 200 ? await checkAssets(stagingOrigin, staging.assets) : [];
  pages.push({ path, production, staging, assetChecks, checks: {
    productionReachable: production.status === 200,
    stagingReachable: staging.status === 200,
    titlePresent: Boolean(staging.title),
    canonicalOnProductionHost: staging.canonical === `https://gachia.com${path}`,
    hreflangComplete: ['zh-Hans', 'en', 'ja', 'x-default'].every((lang) => staging.alternates?.some((value) => value.startsWith(`${lang}:`))),
    previewNoindex: !previewOnly || /noindex/i.test(staging.xRobotsTag),
    namespacedAssets: staging.assets?.length > 0,
    assetsReachable: staging.assets?.length > 0 && assetChecks.every((asset) => asset.status === 200 && /(?:javascript|css|font|image)/i.test(asset.contentType)),
    structuredDataPresent: previewOnly || staging.jsonLdCount > 0,
    contentFloor: !bothAvailable || staging.bodyTextLength >= Math.min(400, production.bodyTextLength),
    internalLinkFloor: !bothAvailable || staging.genshinInternalLinkCount >= Math.min(6, production.genshinInternalLinkCount),
  } });
}

const failures = pages.flatMap(({ path, checks }) => Object.entries(checks).filter(([, value]) => value !== true).map(([name]) => `${path}: ${name}`));
const reportDirectory = new URL('../reports/genshin/', import.meta.url);
await mkdir(reportDirectory, { recursive: true });
const output = new URL(`seo-parity-${new Date().toISOString().slice(0, 10)}.json`, reportDirectory);
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), productionOrigin, stagingOrigin, previewOnly, timeoutMs, pages, failures }, null, 2)}\n`);
console.log(`Wrote ${output.pathname}; inspected ${pages.length} pages; failures: ${failures.length}.`);
if (failures.length) process.exit(1);
