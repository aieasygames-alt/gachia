const origin = process.env.LVMENG_ORIGIN;

if (!origin) {
  throw new Error('Set LVMENG_ORIGIN to the deployed Worker origin.');
}

const baseUrl = new URL(origin);
const expectedPaths = [
  '/zh/lvmeng',
  '/zh/lvmeng/guides',
  '/zh/lvmeng/version',
  '/zh/lvmeng/launch-check',
  '/zh/lvmeng/download',
  '/zh/lvmeng/redeem-codes',
  '/robots.txt',
  '/sitemap.xml',
];

const responses = new Map();
for (const path of expectedPaths) {
  const response = await fetch(new URL(path, baseUrl), { redirect: 'manual' });
  if (response.status !== 200) {
    throw new Error(`${path} returned ${response.status}.`);
  }
  responses.set(path, await response.text());
}

const home = responses.get('/zh/lvmeng');
if (!home?.includes('https://gachia.com/zh/lvmeng')) {
  throw new Error('Home page canonical is missing or incorrect.');
}
if (!home.includes('/_games/lvmeng/_next/')) {
  throw new Error('Home page does not use the lvmeng asset prefix.');
}
if (home.includes('hreflang=')) {
  throw new Error('Home page unexpectedly declares alternate languages.');
}

const robots = responses.get('/robots.txt');
if (!robots?.includes('Sitemap: https://gachia.com/sitemaps/lvmeng/index.xml')) {
  throw new Error('robots.txt does not point to the game sitemap.');
}
if (robots.includes('Disallow: /')) {
  throw new Error('robots.txt unexpectedly blocks indexing.');
}

const sitemap = responses.get('/sitemap.xml');
if (!sitemap?.includes('https://gachia.com/zh/lvmeng')) {
  throw new Error('Sitemap is missing the Chinese game route.');
}
if (sitemap.includes('/en/lvmeng') || sitemap.includes('/ja/lvmeng')) {
  throw new Error('Sitemap unexpectedly includes non-Chinese game routes.');
}

console.log(`Lvmeng smoke checks passed for ${baseUrl.origin}.`);
