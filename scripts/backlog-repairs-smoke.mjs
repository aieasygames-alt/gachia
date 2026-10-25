import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { parseWrangler } from './game-release.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { observeBrowserAssets } from './browser-asset-diagnostics.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const APPS = ['web', 'game-genshin', 'game-nte'];
const LOCALES = ['zh', 'en', 'ja'];

export function validateRepairOrigin(app, origin) {
  assert(APPS.includes(app), 'Unknown repair owner');
  const url = new URL(origin);
  assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && url.origin === origin, 'Only an explicit local Worker origin is allowed');
  return url;
}

export async function verifyRepairsHttp(app, origin) {
  validateRepairOrigin(app, origin);
  const observations = [];
  for (const locale of LOCALES) {
    const paths = app === 'web' ? [`/${locale}/search?q=nanally`, `/${locale}/search?q=${encodeURIComponent('<script>window.__repairQueryXss=1</script>')}`]
      : app === 'game-genshin' ? ['', '/gacha', '/weapons', '/calculator'].map(path => `/${locale}/genshin${path}`)
        : [`/${locale}/nte/characters/chaos`, `/${locale}/nte/characters/nanally`];
    for (const path of paths) {
      const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/i);
      const canonical = html.match(/<link\b(?=[^>]*\brel="canonical")[^>]*\bhref="([^"]+)"/)?.[1];
      assert.equal(canonical, `https://gachia.com${path.split('?')[0]}`, path);
      if (app === 'web') {
        assert.match(html, /name="robots" content="noindex, follow"/);
        assert(!html.includes('<script>window.__repairQueryXss=1</script>'), 'Query must not become executable HTML');
      } else if (app === 'game-genshin') {
        assert(html.includes('gachia-header__brand'), `${path}: missing shared navigation`);
        assert(!html.includes('Cosmetic Staffs'), `${path}: obsolete weapon category`);
        assert(!/remain handled by main-domain|仍由主域|引き続き主ドメイン|主ドメイン API が処理/.test(html), `${path}: stale account promise`);
        if (path.endsWith('/gacha')) {
          assert(!/<title>(?:原神 Wiki|Genshin Impact Wiki) \| Gachia<\/title>/.test(html));
          for (const language of LOCALES) assert(html.includes(`href="https://gachia.com/${language}/genshin/gacha"`), 'Wish-planning alternate points to hub');
        }
      } else if (path.endsWith('/chaos')) {
        assert(html.includes('data-portrait-unavailable="chaos"'));
        assert(!html.includes('/images/characters/chaos.webp'));
      } else assert(html.includes('/images/characters/nanally.webp'));
      observations.push({ path, status: response.status, canonical });
    }
  }
  return observations;
}

export async function verifyRepairsBrowser(app, origin, directory) {
  validateRepairOrigin(app, origin);
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  try {
    for (const width of [1440, 390]) for (const locale of LOCALES) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [], failed = [], accountRequests = [], missingPortraitRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (/\/api\/(?:auth|favorites|user-characters|map\/progress)(?:\/|\?|$)/.test(request.url())) accountRequests.push(request.url());
        if (new URL(request.url()).pathname === '/images/characters/chaos.webp') missingPortraitRequests.push(request.url());
      });
      observeBrowserAssets(page, origin, failed, directory, width);
      if (app === 'web') {
        await page.goto(`${origin}/${locale}/search?q=nanally`, { waitUntil: 'networkidle' });
        const result = page.locator('[data-search-page] [data-search-result][href$="/nte/characters/nanally"]');
        await expect(result).toBeVisible();
        const input = page.locator('[data-search-page] input[name="q"]');
        await expect(input).toHaveValue('nanally');
        await input.fill(' Hu Tao ');
        await expect(page.locator('[data-search-page] [data-search-result][href$="/genshin/characters/hu-tao"]')).toBeVisible();
        await input.fill('__no_matching_record__');
        await expect(page.locator('[data-search-page] [data-search-result]')).toHaveCount(0);
        await input.fill('nsfw');
        await expect(page.locator('[data-search-page] [data-search-result]')).toHaveCount(0);
        await input.fill('nanally');
        // A synthetic destination isolates navigation semantics from other local owners.
        const navigations = [];
        await page.route(`**/${locale}/nte/characters/nanally`, async route => {
          navigations.push({ type: route.request().resourceType(), navigation: route.request().isNavigationRequest() });
          await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Native destination fixture</title><h1>Native destination fixture</h1>' });
        });
        await result.click();
        await expect(page).toHaveURL(`${origin}/${locale}/nte/characters/nanally`);
        assert.deepEqual(navigations, [{ type: 'document', navigation: true }]);
        await page.unroute(`**/${locale}/nte/characters/nanally`);
        let failIndex = true;
        await page.route('**/data-manifest/search-*.json', route => failIndex ? route.fulfill({ status: 503, body: 'fixture unavailable' }) : route.continue());
        await page.goto(`${origin}/${locale}/search?q=nanally`, { waitUntil: 'networkidle' });
        await expect(page.locator('[data-search-page] [role="alert"]')).toBeVisible();
        failIndex = false;
        await page.locator('[data-search-page] [role="alert"] button').click();
        await expect(result).toBeVisible();
      } else if (app === 'game-genshin') {
        await page.goto(`${origin}/${locale}/genshin/calculator`, { waitUntil: 'networkidle' });
        await expect(page.locator('.gachia-header__brand')).toBeVisible();
        await expect(page.locator('.gachia-header__search')).toHaveAttribute('href', `https://gachia.com/${locale}/search?q=`);
        await expect(page.locator(`.gachia-header__section a[href="/${locale}/genshin/calculator"]`)).toHaveAttribute('aria-current', 'page');
      } else {
        await page.goto(`${origin}/${locale}/nte/characters/chaos`, { waitUntil: 'networkidle' });
        await expect(page.locator('[data-portrait-unavailable="chaos"]')).toBeVisible();
        await expect(page.locator('[data-portrait-unavailable="chaos"]')).toHaveAttribute('role', 'img');
        assert.deepEqual(missingPortraitRequests, []);
        assert(await page.locator('.skill-card').evaluateAll(cards => cards.every(card => card.textContent.trim())), 'Empty skill cards must not be rendered');
        assert(await page.locator('main').evaluate(main => ![...main.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '0')), 'Empty arrays must not render a raw zero');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page overflows narrow viewport');
      assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(accountRequests, []);
      await page.screenshot({ path: resolve(directory, `${app}-${locale}-${width}.png`), fullPage: true });
      observations.push({ app, width, locale, runtimeErrors: errors, failedAssets: failed, accountRequests, missingPortraitRequests });
      await context.close();
    }
    if (app === 'web') {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`${origin}/zh/search?q=nanally`);
      await expect(page.locator('noscript p')).toBeVisible();
      assert((await page.locator('body').innerText()).includes('搜索需要 JavaScript'));
      await expect(page.locator('a[href="/zh"]').last()).toBeVisible();
      observations.push({ app, mode: 'javascript-disabled', fallbackVisible: true });
      await context.close();
    }
  } finally { await browser.close(); }
  return observations;
}

export async function runRepairsSmoke(app, directory) {
  assert(APPS.includes(app), 'Unknown repair owner');
  directory = resolve(directory); mkdirSync(directory, { recursive: false });
  const original = parseWrangler(readFileSync(resolve(ROOT, 'apps', app, 'wrangler.jsonc'), 'utf8'));
  const game = app.replace('game-', '');
  const config = { name: `repair-local-${app}`, main: resolve(ROOT, 'apps', app, '.open-next/worker.js'), compatibility_date: original.compatibility_date,
    compatibility_flags: ['nodejs_compat'], assets: { directory: resolve(ROOT, 'apps', app, '.open-next/assets'), binding: 'ASSETS' },
    vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com', ...(app === 'web' ? {} : { [`${game.toUpperCase()}_DEPLOYMENT_MODE`]: game === 'nte' ? 'live' : 'production' }) } };
  const configPath = resolve(directory, 'wrangler.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  const record = { app, startedAt: new Date().toISOString(), status: 'running', cloudWrites: false };
  try {
    Object.assign(record, await verifyLocalWorker({ app: `apps/${app}`, wranglerEnvironment: '', buildEnvironment: {} }, ROOT, {
      configPath, persistTo: resolve(directory, 'state'), onOutput: output => appendFileSync(resolve(directory, 'worker.log'), output),
      verify: async (_, origin) => ({ http: await verifyRepairsHttp(app, origin), browser: await verifyRepairsBrowser(app, origin, directory) }),
    }));
    record.status = 'local_repairs_verified';
  } catch (error) { record.status = 'failed'; record.error = error.message; throw error; }
  finally { record.finishedAt = new Date().toISOString(); writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n'); }
  return record;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [app, directory] = process.argv.slice(2);
  runRepairsSmoke(app, directory).then(record => console.log(JSON.stringify({ app, status: record.status, http: record.http.length, browser: record.browser.length })))
    .catch(error => { console.error(error); process.exitCode = 1; });
}
