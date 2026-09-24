import { mkdir, writeFile } from 'node:fs/promises';

const stagingOrigin = process.env.GENSHIN_STAGING_ORIGIN;
if (!stagingOrigin) throw new Error('Set GENSHIN_STAGING_ORIGIN to a protected Genshin Worker preview origin before running SEO parity.');

const productionOrigin = process.env.GENSHIN_PRODUCTION_ORIGIN ?? 'https://gachia.com';
const previewOnly = process.env.GENSHIN_PREVIEW_ONLY === 'true';
const workerOriginDirect = process.env.GENSHIN_WORKER_ORIGIN_DIRECT === 'true';
const strictParity = process.env.GENSHIN_STRICT_PARITY === 'true';
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
function jsonLdTypes(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(([, value]) => {
      try {
        const parsed = JSON.parse(value);
        const values = Array.isArray(parsed) ? parsed : [parsed];
        return values.flatMap((entry) => {
          const type = entry?.['@type'];
          return Array.isArray(type) ? type : typeof type === 'string' ? [type] : [];
        });
      } catch {
        return [];
      }
    })
    .sort();
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
    robotsMeta: html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)/i)?.[1] ?? '',
    jsonLdCount: [...html.matchAll(/<script type=["']application\/ld\+json["']/gi)].length,
    jsonLdTypes: jsonLdTypes(html),
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
      const requestPath = previewOnly || workerOriginDirect
        ? `/_next/${asset.slice('/_games/genshin/_next/'.length)}`
        : asset;
      const response = await fetch(new URL(requestPath, origin), { signal: AbortSignal.timeout(timeoutMs) });
      return { asset, requestPath, status: response.status, contentType: response.headers.get('content-type') ?? '' };
    } catch (error) {
      return { asset, status: 0, contentType: '', error: String(error) };
    }
  }));
  return results;
}

async function inspectPage(path) {
  const [productionResult, stagingResult] = await Promise.allSettled([fetchSnapshot(productionOrigin, path), fetchSnapshot(stagingOrigin, path)]);
  const production = productionResult.status === 'fulfilled' ? productionResult.value : { status: 0, error: String(productionResult.reason) };
  const staging = stagingResult.status === 'fulfilled' ? stagingResult.value : { status: 0, error: String(stagingResult.reason) };
  const bothAvailable = !previewOnly && production.status === 200 && staging.status === 200;
  const assetChecks = staging.status === 200 ? await checkAssets(stagingOrigin, staging.assets) : [];
  return { path, production, staging, assetChecks, checks: {
    productionReachable: production.status === 200,
    stagingReachable: staging.status === 200,
    titlePresent: Boolean(staging.title),
    canonicalOnProductionHost: staging.canonical === `https://gachia.com${path}`,
    hreflangComplete: ['zh-Hans', 'en', 'ja', 'x-default'].every((lang) => staging.alternates?.some((value) => value.startsWith(`${lang}:`))),
    previewNoindex: !previewOnly || /noindex/i.test(staging.xRobotsTag) || /noindex/i.test(staging.robotsMeta),
    namespacedAssets: staging.assets?.length > 0,
    assetsReachable: staging.assets?.length > 0 && assetChecks.every((asset) => asset.status === 200 && /(?:javascript|css|font|image)/i.test(asset.contentType)),
    // In production parity mode, Main is the source of truth: some legacy pages
    // deliberately have no JSON-LD, so require the Worker to match that output.
    structuredDataPresent: previewOnly || !bothAvailable || production.jsonLdCount === 0 || staging.jsonLdCount > 0,
    contentFloor: !bothAvailable || staging.bodyTextLength >= Math.min(400, production.bodyTextLength),
    internalLinkFloor: !bothAvailable || staging.genshinInternalLinkCount >= Math.min(6, production.genshinInternalLinkCount),
    sameStatus: !strictParity || !bothAvailable || staging.status === production.status,
    sameFinalPath: !strictParity || !bothAvailable || new URL(staging.finalUrl).pathname === new URL(production.finalUrl).pathname,
    sameTitle: !strictParity || !bothAvailable || staging.title === production.title,
    sameDescription: !strictParity || !bothAvailable || staging.description === production.description,
    sameCanonical: !strictParity || !bothAvailable || staging.canonical === production.canonical,
    sameHreflang: !strictParity || !bothAvailable || JSON.stringify(staging.alternates) === JSON.stringify(production.alternates),
    sameJsonLdTypes: !strictParity || !bothAvailable || JSON.stringify(staging.jsonLdTypes) === JSON.stringify(production.jsonLdTypes),
    noContentRegression: !strictParity || !bothAvailable || staging.bodyTextLength >= production.bodyTextLength,
    noInternalLinkRegression: !strictParity || !bothAvailable || staging.genshinInternalLinkCount >= production.genshinInternalLinkCount,
  } };
}

const concurrency = 6;
const pages = [];
for (let index = 0; index < paths.length; index += concurrency) {
  pages.push(...await Promise.all(paths.slice(index, index + concurrency).map(inspectPage)));
}

const failures = pages.flatMap(({ path, checks }) => Object.entries(checks).filter(([, value]) => value !== true).map(([name]) => `${path}: ${name}`));
const reportDirectory = new URL('../reports/genshin/', import.meta.url);
await mkdir(reportDirectory, { recursive: true });
const output = new URL(`seo-parity-${new Date().toISOString().slice(0, 10)}.json`, reportDirectory);
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), productionOrigin, stagingOrigin, previewOnly, workerOriginDirect, strictParity, timeoutMs, pages, failures }, null, 2)}\n`);
console.log(`Wrote ${output.pathname}; inspected ${pages.length} pages; failures: ${failures.length}.`);
if (failures.length) process.exit(1);
