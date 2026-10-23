import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { fixtureIpHeaders, localFixtureConfig } from './runtime-rollout-smoke.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { requireLocalContentOrigin } from './managed-content-smoke.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const LOCALES = ['zh', 'en', 'ja'];
const PLATFORM_PATHS = ['', '/about', '/contact', '/privacy', '/terms'];
const GUIDE_IDS = ['banner-schedule-guide', 'phase-ii-columbina-raiden-pull-plan', 'lightrace-wish-phase-ii-faq'];
const raw = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/genshin/raw-guides.json'), 'utf8'));
const translatedIds = new Set(raw.filter(guide => guide.titleJa?.trim() && guide.summaryJa?.trim() && guide.contentJa?.trim().length >= 80).map(guide => guide.id));

export function assertDiscoveryMetadata(snapshot, path, languages, { noindex = false } = {}) {
  assert.equal(snapshot.canonical, `https://gachia.com${path}`, `${path}: canonical`);
  assert.equal(/noindex/i.test(snapshot.robots ?? ''), noindex, `${path}: robots`);
  if (noindex) assert(/\bfollow\b/.test(snapshot.robots) && !/nofollow/.test(snapshot.robots), `${path}: fallback must allow following links`);
  assert.deepEqual(Object.keys(snapshot.alternates).sort(), [...languages, 'x-default'].sort(), `${path}: hreflang set`);
  const suffix = path.replace(/^\/(zh|en|ja)/, '');
  for (const language of [...languages, 'x-default']) {
    const locale = language === 'zh-Hans' || language === 'x-default' ? 'zh' : language;
    assert.equal(snapshot.alternates[language], `https://gachia.com/${locale}${suffix}`, `${path}: hreflang ${language}`);
  }
}

export async function verifyDiscovery(value, app, directory) {
  const origin = requireLocalContentOrigin(value);
  assert(['web', 'game-genshin'].includes(app), 'Unknown discovery application');
  const sitemapPath = app === 'web' ? '/sitemaps/main/sitemap.xml' : '/sitemap.xml';
  const response = await fetch(origin + sitemapPath, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /xml/);
  const xmlPath = resolve(directory, 'sitemap.xml');
  writeFileSync(xmlPath, await response.text());
  // Parse XML with the standard parser, not an HTML/regex approximation.
  const urls = JSON.parse(execFileSync('python3', ['-B', '-c', 'import sys,json,xml.etree.ElementTree as E; r=E.parse(sys.argv[1]).getroot(); assert r.tag=="{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"; print(json.dumps([n.text for n in r.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]))', xmlPath], { encoding: 'utf8' }));
  assert.equal(new Set(urls).size, urls.length, 'Duplicate XML URL');
  for (const url of urls) assert.equal(new URL(url).origin, 'https://gachia.com');
  if (app === 'game-genshin') {
    for (const guide of raw) for (const locale of LOCALES) {
      assert.equal(urls.includes(`https://gachia.com/${locale}/genshin/guides/${guide.id}`), locale !== 'ja' || translatedIds.has(guide.id));
    }
  } else {
    execFileSync('python3', ['-B', 'scripts/web-sitemap-contract-audit.py', '--origin', origin, '--output', resolve(directory, 'xml-report.json')], { cwd: ROOT });
  }
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', extraHTTPHeaders: fixtureIpHeaders(origin, '192.0.2.203') });
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
        const page = await context.newPage();
        const errors = [], failedAssets = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        page.on('requestfailed', request => { if (new URL(request.url()).origin === origin && ['script', 'stylesheet'].includes(request.resourceType())) failedAssets.push(request.url()); });
        const paths = LOCALES.flatMap(locale => (app === 'web' ? PLATFORM_PATHS : ['/guides', ...GUIDE_IDS.map(id => `/guides/${id}`)]).map(suffix => app === 'web' ? `/${locale}${suffix}` : `/${locale}/genshin${suffix}`));
        if (app === 'web') paths.push('/zh/update-radar');
        for (const path of paths) {
          const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
          assert.equal(response.status(), 200, path);
          assert(!/noindex/i.test(response.headers()['x-robots-tag'] ?? ''), `${path}: unexpected global preview header`);
          assert.equal(await page.locator('h1').count(), 1, path);
          const snapshot = await page.evaluate(() => ({
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
            alternates: Object.fromEntries([...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(node => [node.getAttribute('hreflang'), node.getAttribute('href')])),
          }));
          const locale = path.split('/')[1];
          const id = path.split('/')[4];
          const fallback = app === 'game-genshin' && Boolean(id) && locale === 'ja' && !translatedIds.has(id);
          if (path !== '/zh/update-radar') assertDiscoveryMetadata(snapshot, path, app === 'web' || !id || translatedIds.has(id) ? ['zh-Hans', 'en', 'ja'] : ['zh-Hans', 'en'], { noindex: fallback });
          if (app === 'web') {
            const duplicate = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).filter(href => /^\/(zh|en|ja)\/(zh|en|ja)(\/|$)/.test(href)));
            assert.deepEqual(duplicate, [], path);
            if (path !== '/zh/update-radar') {
              const description = await page.locator('meta[name="description"]').getAttribute('content');
              for (const property of ['og:description', 'twitter:description']) assert.equal(await page.locator(`meta[${property.startsWith('og:') ? 'property' : 'name'}="${property}"]`).getAttribute('content'), description);
            }
            if (path === '/zh' || path === '/zh/update-radar') {
              const card = page.locator('a[href="/zh/azur-promilia/travel-trace"]').first();
              assert((await card.innerText()).includes(path === '/zh' ? '测试已结束' : '进入旅迹测试核验台'));
            }
            if (path === '/zh') {
              const choice = page.getByRole('radio', { name: /蓝色星原/ });
              await choice.click();
              assert.equal(await choice.getAttribute('aria-checked'), 'true');
              assert.equal(await page.getByRole('link', { name: /打开行动页/ }).getAttribute('href'), '/zh/azur-promilia/travel-trace');
            }
          } else if (id) {
            const guide = raw.find(entry => entry.id === id);
            assert.equal(await page.locator('[data-guide-fallback]').count(), fallback ? 1 : 0);
            const readingLocale = fallback ? 'en' : locale;
            assert.equal(await page.locator('[data-guide-content]').getAttribute('lang'), readingLocale === 'zh' ? 'zh-Hans' : readingLocale);
            assert.equal(await page.locator('[data-guide-content]').innerText(), readingLocale === 'zh' ? guide.content : readingLocale === 'ja' ? guide.contentJa : guide.contentEn);
            const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)));
            const article = schemas.find(schema => schema['@type'] === 'Article');
            assert.equal(article.inLanguage, readingLocale === 'zh' ? 'zh-Hans' : readingLocale);
            if (locale === 'ja' && !fallback) {
              const faq = schemas.find(schema => schema['@type'] === 'FAQPage');
              assert.equal(faq.mainEntity[0].name, guide.faq[0].questionJa);
              assert((await page.locator('main').innerText()).includes(guide.faq[0].answerJa));
            }
          } else if (locale === 'ja') {
            assert.equal(await page.locator('[data-guide-fallback]').count(), raw.length - translatedIds.size);
          }
          assert.deepEqual(errors, [], path); assert.deepEqual(failedAssets, [], path);
          observations.push({ path, width, status: 200, fallback, errors: 0, failedAssets: 0 });
          if ((path === '/zh' || path === '/ja/genshin/guides/banner-schedule-guide' || path === '/ja/genshin/guides/lightrace-wish-phase-ii-faq') && width === 390) await page.screenshot({ path: resolve(directory, `${id ?? 'home'}-${width}.png`) });
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return { sitemapUrls: urls.length, browser: observations };
}

async function main() {
  const [app, ...extra] = process.argv.slice(2);
  assert(['web', 'game-genshin'].includes(app) && extra.length === 0, 'Usage: seo-discovery-smoke.mjs web|game-genshin');
  const records = resolve(ROOT, '.release-records'); mkdirSync(records, { recursive: true });
  const lock = resolve(records, `${app.replace(/^game-/, '')}.lock`);
  writeFileSync(lock, JSON.stringify({ pid: process.pid, action: 'seo_discovery_smoke' }), { flag: 'wx', mode: 0o600 });
  const directory = resolve(records, `seo-discovery-${app}-${randomUUID()}`);
  const record = { app, status: 'running', cloudVerification: 'not_performed', startedAt: new Date().toISOString() };
  try {
    mkdirSync(directory, { mode: 0o700 });
    record.workerEntrypointSha256 = createHash('sha256').update(readFileSync(resolve(ROOT, 'apps', app, '.open-next/worker.js'))).digest('hex');
    const configPath = resolve(directory, 'wrangler.json');
    writeFileSync(configPath, JSON.stringify(localFixtureConfig(app, ROOT)), { mode: 0o600 });
    await verifyLocalWorker({ app: `apps/${app}`, wranglerEnvironment: '', buildEnvironment: {} }, ROOT, {
      configPath, persistTo: resolve(directory, 'state'), onOutput: output => appendFileSync(resolve(directory, 'worker.log'), output),
      verify: async (_, origin) => { record.acceptance = await verifyDiscovery(origin, app, directory); return {}; },
    });
    record.status = 'local_seo_discovery_verified';
  } catch (error) { record.status = 'failed'; record.error = error.message; throw error; }
  finally {
    record.finishedAt = new Date().toISOString();
    try { writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n'); }
    finally { unlinkSync(lock); console.log(`SEO discovery record: ${directory}`); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
