import fs from 'node:fs/promises';

const stagingOrigin = process.env.NTE_STAGING_ORIGIN;
if (!stagingOrigin) throw new Error('Set NTE_STAGING_ORIGIN to a temporary protected preview origin before running SEO parity.');
const productionOrigin = process.env.NTE_PRODUCTION_ORIGIN ?? 'https://gachia.com';
const previewOnly = process.env.NTE_PREVIEW_ONLY === 'true';
const requestTimeoutMs = Number.parseInt(process.env.NTE_PARITY_TIMEOUT_MS ?? '8000', 10);
const paths = [
  '/zh/nte', '/en/nte', '/ja/nte',
  '/zh/nte/characters', '/zh/nte/characters/nanally',
  '/zh/nte/guides', '/zh/nte/guides/999-nights-mode-guide',
  '/zh/nte/version', '/zh/nte/weapons', '/zh/nte/redeem-codes',
  '/zh/nte/items', '/zh/nte/disk-sets', '/zh/nte/tier-list', '/zh/nte/download',
  '/zh/nte/gacha', '/zh/nte/anomalies', '/zh/nte/build', '/zh/nte/teams', '/zh/nte/map',
  '/zh/nte/compare', '/zh/nte/calculator', '/zh/nte/events', '/zh/nte/merchant',
];

function extract(html, pattern) { return html.match(pattern)?.[1]?.trim() ?? ''; }
function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function normalize(html) {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/https:\/\/gachia-router-staging\.aieasygames\.workers\.dev/g, 'https://gachia.com')
    .trim();
}
function linkAttribute(html, rel, hrefAttr = 'href') {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const tag = links.find((value) => new RegExp(`\\brel=["']${rel}["']`, 'i').test(value));
  return tag?.match(new RegExp(`\\b${hrefAttr}=["']([^"']+)["']`, 'i'))?.[1]?.trim() ?? '';
}
function snapshot(url, status, html, headers) {
  const canonical = linkAttribute(html, 'canonical');
  const alternates = [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const lang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    return lang && href ? [`${lang}:${href}`] : [];
  }).sort();
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(([, value]) => value.trim());
  const bodyText = normalize(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '));
  return {
    url, status,
    title: decodeEntities(extract(html, /<title>([\s\S]*?)<\/title>/i)),
    description: decodeEntities(extract(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i)),
    canonical,
    alternates,
    jsonLdCount: jsonLd.length,
    xRobotsTag: headers.get('x-robots-tag') ?? '',
    bodyText: bodyText.slice(0, 1200),
    bodyTextLength: bodyText.length,
    headingCount: [...html.matchAll(/<h[1-6]\b/gi)].length,
    internalLinkCount: [...html.matchAll(/<a\b[^>]+href="\/(?:zh|en|ja)\/nte(?:[\/"])/gi)].length,
    hasSharedNavigation: /href="https:\/\/gachia\.com\/(?:zh|en|ja)\/(?:genshin|starrail|wuwa|zzz|calendar|about)/i.test(html),
    hasSharedFooter: /<footer\b/i.test(html),
    hasBreadcrumbs: /breadcrumb/i.test(html),
  };
}

function expectsJapaneseAlternate(path) {
  // NTE Japanese pages are indexable only for guides with reviewed Japanese copy.
  return /\/nte\/guides\/(?:999-nights-mode-guide)$/.test(path);
}

async function fetchSnapshot(origin, path) {
  const target = new URL(path, origin);
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(requestTimeoutMs) });
      return snapshot(path, response.status, await response.text(), response.headers);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw new Error(`Unable to fetch ${target}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

const report = { generatedAt: new Date().toISOString(), stagingOrigin, productionOrigin, previewOnly, requestTimeoutMs, pages: [] };
for (const path of paths) {
  const [productionResult, stagingResult] = await Promise.allSettled([fetchSnapshot(productionOrigin, path), fetchSnapshot(stagingOrigin, path)]);
  const production = productionResult.status === 'fulfilled' ? productionResult.value : { status: 0, error: productionResult.reason instanceof Error ? productionResult.reason.message : String(productionResult.reason) };
  const staging = stagingResult.status === 'fulfilled' ? stagingResult.value : { status: 0, error: stagingResult.reason instanceof Error ? stagingResult.reason.message : String(stagingResult.reason) };
  const stagingAvailable = staging.status === 200;
  const productionAvailable = production.status === 200;
  report.pages.push({ path, production, staging, differences: {
    titleEqual: stagingAvailable && productionAvailable && production.title === staging.title,
    descriptionEqual: stagingAvailable && productionAvailable && production.description === staging.description,
    bodyLengthDelta: stagingAvailable && productionAvailable ? staging.bodyTextLength - production.bodyTextLength : null,
    headingDelta: stagingAvailable && productionAvailable ? staging.headingCount - production.headingCount : null,
    internalLinkDelta: stagingAvailable && productionAvailable ? staging.internalLinkCount - production.internalLinkCount : null,
    jsonLdDelta: stagingAvailable && productionAvailable ? staging.jsonLdCount - production.jsonLdCount : null,
  }, checks: {
    productionReachable: productionAvailable,
    stagingReachable: stagingAvailable,
    titlePresent: stagingAvailable && Boolean(staging.title),
    canonicalOnProductionHost: stagingAvailable && staging.canonical.startsWith('https://gachia.com/'),
    hreflangComplete: stagingAvailable && ['zh-Hans', 'en', 'x-default'].every((lang) => staging.alternates.some((entry) => entry.startsWith(`${lang}:`))) && (!expectsJapaneseAlternate(path) || staging.alternates.some((entry) => entry.startsWith('ja:'))),
    noindexPreview: stagingAvailable && (/noindex/i.test(staging.xRobotsTag) || /noindex/i.test(staging.bodyText)),
    contentFloor: stagingAvailable && productionAvailable && staging.bodyTextLength >= Math.min(400, production.bodyTextLength),
    navigationFloor: stagingAvailable && productionAvailable && staging.internalLinkCount >= Math.min(12, production.internalLinkCount),
    sharedNavigation: stagingAvailable && staging.hasSharedNavigation,
    sharedFooter: stagingAvailable && staging.hasSharedFooter,
    breadcrumbs: stagingAvailable && staging.hasBreadcrumbs,
    structuredDataFloor: stagingAvailable && productionAvailable && staging.jsonLdCount >= Math.min(1, production.jsonLdCount),
  } });
}

await fs.mkdir('reports', { recursive: true });
const output = `reports/nte-seo-parity-${new Date().toISOString().slice(0, 10)}.json`;
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
const failures = report.pages.flatMap(({ path, checks }) => Object.entries(checks)
  .filter(([name, value]) => value !== true && !(previewOnly && ['canonicalOnProductionHost', 'noindexPreview', 'productionReachable', 'contentFloor', 'navigationFloor', 'structuredDataFloor'].includes(name)))
  .filter(([name]) => !(checks.stagingReachable === false && name !== 'stagingReachable'))
  .map(([name]) => `${path}: ${name}`));
const available = report.pages.filter(({ production, staging }) => production.status === 200 && staging.status === 200).length;
const unavailable = report.pages.filter(({ production, staging }) => production.status !== 200 || staging.status !== 200).length;
console.log(`Wrote ${output}; comparable pages: ${available}; unavailable samples: ${unavailable}.`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated ${report.pages.length} NTE URLs.`);
