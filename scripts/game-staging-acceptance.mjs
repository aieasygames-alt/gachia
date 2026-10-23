import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const GAMES = ['nte', 'azur-promilia'];
const ROOT = resolve(import.meta.dirname, '..');
const noindex = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i;

export function stagingOrigin({ game, subdomain }) {
  if (!GAMES.includes(game)) throw new Error('Only reviewed pilot games are accepted');
  if (typeof subdomain !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
    throw new Error('Explicit workers.dev account subdomain required');
  }
  return `https://gachia-game-${game}-staging.${subdomain}.workers.dev`;
}

export function parseStagingArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--game': 'game', '--subdomain': 'subdomain' }[args[i]];
    if (!key || Object.hasOwn(options, key) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Usage: --game nte|azur-promilia --subdomain <workers-dev-account>');
    }
    options[key] = args[i + 1];
  }
  stagingOrigin(options);
  return options;
}

export function localBrowserProxy(value) {
  if (value === undefined) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Browser proxy must be an explicit credential-free local HTTP proxy');
  }
  return { server: url.origin };
}

// This remote reader is separate from the local-only release checks. It never
// accepts a free-form origin, follows redirects, deploys, or sends credentials.
export async function verifyStagingHttp(options, request = fetch) {
  const origin = stagingOrigin(options);
  const observations = [];
  const get = async (path, status = 200) => {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin, 'Cross-origin probe rejected');
    const response = await request(url, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, status, `${path}: unexpected status`);
    const body = await response.text();
    observations.push({ path, status: response.status, contentType: response.headers.get('content-type'), xRobotsTag: response.headers.get('x-robots-tag') });
    return { response, body };
  };
  assert.match((await get('/robots.txt')).body, /^Disallow:\s*\/\s*$/m);
  const sitemap = await get('/sitemap.xml');
  assert.match(sitemap.response.headers.get('content-type') ?? '', /xml/i);
  const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  assert(urls.length > 0, 'Expected public sitemap URLs');
  assert(urls.every(url => url.origin === 'https://gachia.com'), 'Sitemap must contain only the public production origin');
  let home;
  for (const locale of ['zh', 'en', 'ja']) {
    const base = `/${locale}/${options.game}`;
    const detail = urls.find(url => url.pathname.startsWith(`${base}/characters/`));
    assert(detail, `${locale}: missing real character detail`);
    for (const path of [base, `${base}/characters`, detail.pathname]) {
      const result = await get(path);
      assert.match(result.response.headers.get('content-type') ?? '', /text\/html/i);
      assert.match(result.body, /<h1\b/i);
      assert(noindex.test(result.body), `${path}: missing noindex`);
      assert.match(result.response.headers.get('x-robots-tag') ?? '', /noindex/i);
      const canonical = result.body.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
      assert.equal(canonical, `https://gachia.com${path}`);
      home ??= result.body;
    }
  }
  const prefix = `/_games/${options.game}/_next/`;
  const assets = [...home.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:[?#][^"]*)?"/g)].map(match => match[1]);
  for (const extension of ['js', 'css']) {
    const path = assets.find(asset => asset.startsWith(prefix) && asset.endsWith(`.${extension}`));
    assert(path, `Missing namespaced ${extension}`);
    const namespaced = await get(path);
    assert.match(namespaced.response.headers.get('content-type') ?? '', extension === 'js' ? /javascript/i : /text\/css/i);
    const original = await get(path.replace(prefix, '/_next/'));
    assert.equal(createHash('sha256').update(namespaced.body).digest('hex'), createHash('sha256').update(original.body).digest('hex'));
  }
  const missing = await get(`/zh/${options.game}/__staging_acceptance_missing__`, 404);
  assert.match(missing.response.headers.get('x-robots-tag') ?? '', /noindex/i);
  return { status: 'staging_http_verified', origin, observations, sitemapUrls: urls.length };
}

export async function verifyStagingBrowser(options, directory) {
  const origin = stagingOrigin(options);
  const browser = await chromium.launch({ headless: true, proxy: localBrowserProxy(process.env.STAGING_CHECK_PROXY) });
  const observations = [];
  let requests = 0;
  try {
    for (const width of [1440, 390]) for (const locale of ['zh', 'en', 'ja']) for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled, serviceWorkers: 'block' });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const errors = [], failedAssets = [];
        await context.route('**/*', route => {
          const request = route.request();
          if (new URL(request.url()).origin !== origin || !['GET', 'HEAD'].includes(request.method())) return route.abort('blockedbyclient');
          if (++requests > 1000) return route.abort('blockedbyclient');
          return route.continue();
        });
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        const path = `/${locale}/${options.game}/characters`;
        const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert.equal(response.status(), 200);
        await expect(page.locator('h1')).toBeVisible();
        const cards = page.locator(options.game === 'nte' ? '.character-directory .card' : 'main > section.grid .card');
        const count = await cards.count();
        assert(count > 1);
        if (javaScriptEnabled) {
          await page.waitForLoadState('networkidle');
          if (options.game === 'nte') {
            const search = page.locator('.character-directory input');
            await search.fill('__no_matching_character__'); await expect(cards).toHaveCount(0); await search.fill('');
          } else {
            const select = page.locator('.filter-bar select').first();
            await select.selectOption(await select.locator('option').nth(1).getAttribute('value'));
            await expect.poll(() => cards.count()).toBeLessThan(count); await select.selectOption('all');
          }
          await expect(cards).toHaveCount(count);
          if (directory && locale === 'zh') await page.screenshot({ path: resolve(directory, `staging-${width}.png`), fullPage: false });
          const href = await cards.first().getAttribute('href');
          assert(href.startsWith(`/${locale}/${options.game}/characters/`));
          await page.evaluate(() => { window.__stagingNavigationMarker = 'preserved'; });
          await cards.first().click(); await expect(page).toHaveURL(origin + href);
          await expect(page.locator('h1')).toBeVisible();
          assert.equal(await page.evaluate(() => window.__stagingNavigationMarker), 'preserved');
          await page.goBack(); await expect(page).toHaveURL(origin + path); await expect(cards).toHaveCount(count);
        }
        assert(requests <= 1000, 'Functional request budget exceeded');
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        observations.push({ width, locale, javaScriptEnabled, cards: count, hydrationErrors: errors.length, failedAssets: failedAssets.length });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return { status: 'staging_browser_verified', requests, requestLimit: 1000, observations, scope: 'reading_filter_navigation_not_production_or_auth_acceptance' };
}

async function main() {
  const options = parseStagingArguments(process.argv.slice(2));
  const directory = resolve(ROOT, '.release-records', `staging-${options.game}-${randomUUID()}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const record = { schemaVersion: 1, startedAt: new Date().toISOString(), ...options, origin: stagingOrigin(options), status: 'running', productionAccepted: false };
  try {
    record.http = await verifyStagingHttp(options);
    record.browser = await verifyStagingBrowser(options, directory);
    record.status = 'bounded_staging_checks_passed';
  } catch (error) {
    record.status = 'failed'; record.error = error.message;
    record.errorCode = error.cause?.code ?? error.code;
    throw error;
  }
  finally {
    record.finishedAt = new Date().toISOString();
    writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    console.log(`Staging check record: ${resolve(directory, 'result.json')}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
