import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { parseWrangler } from './game-release.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { verifyAppRuntime } from './require-app-runtime.mjs';
import { verifyDisabledAccounts } from './web-release-policy.mjs';

const ROOT = resolve(import.meta.dirname, '..');
export const ROLLOUT_APPS = Object.freeze(['web', 'game-genshin', 'game-lvmeng']);
const HI3_IDS = ['vermillion-liuli', 'vermillion-liuli-full-burn', 'volatile-sparkler'];
const sha = value => createHash('sha256').update(value).digest('hex');

export function fixtureIpHeaders(origin, ip) {
  const url = new URL(origin);
  // Synthetic trusted-IP headers are exclusively for the local Worker fixture.
  return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port
    ? { 'cf-connecting-ip': ip } : {};
}

export function localFixtureConfig(app, root) {
  if (!ROLLOUT_APPS.includes(app)) throw new Error('Unknown rollout application');
  const directory = resolve(root, 'apps', app);
  const original = parseWrangler(readFileSync(resolve(directory, 'wrangler.jsonc'), 'utf8'));
  // Do not copy routes, service bindings, real IDs, secrets or environment blocks.
  const config = {
    name: `runtime-local-${app}`, main: resolve(directory, '.open-next/worker.js'),
    compatibility_date: original.compatibility_date, compatibility_flags: ['nodejs_compat'],
    assets: { directory: resolve(directory, '.open-next/assets'), binding: 'ASSETS' },
    vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com' },
  };
  if (app !== 'web') config.vars[`${app.slice(5).toUpperCase()}_DEPLOYMENT_MODE`] = 'production';
  return config;
}

export function wildcardRobotsAllows(text, path) {
  const groups = [];
  let group, directives = false;
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, '').trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const name = match[1].trim().toLowerCase(), value = match[2].trim();
    if (name === 'user-agent') {
      if (!group || directives) {
        group = { agents: [], rules: [] }; groups.push(group); directives = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      directives = true;
      if (['allow', 'disallow'].includes(name) && value) group.rules.push({ allow: name === 'allow', path: value });
    }
  }
  const wildcard = groups.filter(entry => entry.agents.includes('*'));
  assert(wildcard.length, 'Missing wildcard robots group');
  // Combine wildcard groups; named managed-crawler restrictions do not apply here.
  const matches = wildcard.flatMap(entry => entry.rules).filter(rule => {
    const pattern = rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp('^' + pattern).test(path);
  }).sort((a, b) => b.path.replace(/\*|\$$/g, '').length - a.path.replace(/\*|\$$/g, '').length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}

export async function verifyHttp(app, origin, { preview = false } = {}) {
  const observations = [];
  const get = async (path, expected = 200, init = {}) => {
    const url = new URL(path, origin);
    assert.equal(url.origin, origin, 'Cross-origin probe rejected');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init,
      headers: { ...fixtureIpHeaders(origin, '192.0.2.1'), ...init.headers } });
    const body = await response.text();
    assert.equal(response.status, expected, `${path}: ${response.status} ${body.slice(0, 160)}`);
    observations.push({ path, method: init.method ?? 'GET', status: response.status });
    return { response, body };
  };
  const paths = app === 'web'
    ? ['zh', 'en', 'ja'].flatMap(locale => ['', ...HI3_IDS.map(id => `/${id}`)].map(suffix => `/${locale}/hi3/weapons${suffix}`))
    : app === 'game-genshin'
      ? ['zh', 'en', 'ja'].flatMap(locale => ['', '/characters', '/calculator'].map(suffix => `/${locale}/genshin${suffix}`))
      : ['', '/characters', '/guides', '/launch-check', '/download'].map(suffix => `/zh/lvmeng${suffix}`);
  let first;
  for (const path of paths) {
    const result = await get(path);
    assert.match(result.body, /<h1\b/i);
    assert(result.body.includes(`href="https://gachia.com${path}"`), `${path}: canonical`);
    assert(!/name="robots" content="[^"]*noindex/.test(result.body), `${path}: unexpected noindex`);
    if (preview) assert.match(result.response.headers.get('x-robots-tag') ?? '', /noindex/i);
    first ??= result.body;
  }
  const robots = await get('/robots.txt');
  for (const path of ['/', ...paths, '/sitemap.xml']) {
    assert.equal(wildcardRobotsAllows(robots.body, path), !preview, `${path}: unexpected wildcard robots policy`);
  }
  const sitemap = await get('/sitemap.xml');
  assert.match(sitemap.response.headers.get('content-type') ?? '', /xml/);
  let pageSitemap = sitemap;
  if (app === 'web') {
    assert.match(sitemap.body, /<sitemapindex\s+xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    assert(sitemap.body.includes('<sitemap><loc>https://gachia.com/sitemaps/main/sitemap.xml</loc></sitemap>'));
    pageSitemap = await get('/sitemaps/main/sitemap.xml');
    assert.match(pageSitemap.response.headers.get('content-type') ?? '', /xml/);
    assert.match(pageSitemap.body, /<urlset\b/);
  }
  for (const path of paths) assert(pageSitemap.body.includes(`https://gachia.com${path}</loc>`), `Missing sitemap path: ${path}`);
  for (const extension of ['js', 'css']) {
    const asset = first.match(new RegExp(`(?:src|href)="([^"?#]+\\.${extension})(?:[?#][^"]*)?"`))?.[1];
    assert(asset?.startsWith('/'), `Missing local ${extension}`);
    const response = await get(asset);
    assert.match(response.response.headers.get('content-type') ?? '', extension === 'js' ? /javascript/ : /css/);
  }
  await get(`${paths[0]}/__runtime_missing__`, 404);
  if (app === 'game-lvmeng') {
    await get('/en/lvmeng', 404);
    await get('/ja/lvmeng', 404);
  }
  if (app === 'web') observations.push(...await verifyDisabledAccounts(origin));
  return observations;
}

export async function verifyBrowser(app, origin, { proxy, directory, requestBudget = 3000 } = {}) {
  const browser = await chromium.launch({ headless: true, proxy });
  const observations = [];
  let requests = 0;
  const locales = app === 'game-lvmeng' ? ['zh'] : ['zh', 'en', 'ja'];
  try {
    for (const width of [1440, 390]) for (const locale of locales) for (const mode of ['interactive', 'delayed_scripts', 'no_javascript']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no_javascript', serviceWorkers: 'block', extraHTTPHeaders: fixtureIpHeaders(origin, `192.0.2.${observations.length + 10}`) });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const errors = [], failedAssets = [], prefetches = [], accountRequests = [];
        let delayedScripts = 0;
        await context.route('**/*', async route => {
          const request = route.request();
          if (new URL(request.url()).origin !== origin) return route.abort('blockedbyclient');
          if (++requests > requestBudget) return route.abort('blockedbyclient');
          if (mode === 'delayed_scripts' && request.resourceType() === 'script') { delayedScripts++; await new Promise(done => setTimeout(done, 1000)); }
          return route.continue();
        });
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('request', request => {
          const path = new URL(request.url()).pathname;
          if (/^\/api\/(auth(?:\/|$)|favorites$|user-characters$|map\/progress$|shared-builds$)/.test(path)) accountRequests.push(path);
          if (request.headers()['next-router-prefetch']) prefetches.push(path);
        });
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        const path = app === 'web' ? `/${locale}/hi3/weapons` : app === 'game-genshin' ? `/${locale}/genshin/calculator` : '/zh/lvmeng/launch-check';
        const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert.equal(response.status(), 200);
        await expect(page.locator('h1')).toBeVisible();
        if (mode !== 'no_javascript') {
          if (app === 'web') {
            const searchName = { zh: '搜索', en: 'Search', ja: '検索' }[locale];
            const search = page.getByRole('button', { name: searchName, exact: true });
            await expect(search).toBeEnabled();
            const link = page.locator(`a[href="/${locale}/hi3/weapons/vermillion-liuli"]`).first();
            await page.evaluate(() => { window.__runtimeDocument = 'preserved'; });
            await link.hover(); await link.click();
            await expect(page).toHaveURL(`${origin}/${locale}/hi3/weapons/vermillion-liuli`);
            await expect(page.locator('h1')).toBeVisible();
            assert.equal(await page.evaluate(() => window.__runtimeDocument), 'preserved');
            await page.goBack();
            await expect(page).toHaveURL(`${origin}${path}`);
            await search.click();
            const dialog = page.getByRole('dialog', { name: searchName, exact: true });
            await dialog.locator('input').fill('Vermillion');
            await expect(dialog.locator('a[href*="/hi3/weapons/"]').first()).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            await expect(search).toBeFocused();
          } else {
            await page.waitForLoadState('networkidle');
            if (app === 'game-genshin') {
              const rows = page.locator('.material-planner__results .material-row');
              const count = await rows.count(); assert(count > 1);
              const input = page.locator('.material-planner input');
              await input.fill('__no_material__'); await expect(rows).toHaveCount(0);
              await input.fill(''); await expect(rows).toHaveCount(count);
              await rows.first().getByRole('button').click();
              await expect(page.locator('.material-planner__watchlist li')).toHaveCount(1);
              await page.reload({ waitUntil: 'networkidle' });
              await expect(page.locator('.material-planner__watchlist li')).toHaveCount(1);
            } else {
              const checkbox = page.locator('.launch-board input[type=checkbox]').first();
              await checkbox.check(); await expect(checkbox).toBeChecked();
              await page.reload({ waitUntil: 'networkidle' }); await expect(checkbox).toBeChecked();
            }
          }
          if (mode === 'delayed_scripts') assert(delayedScripts > 0);
        }
        if (app === 'web') {
          await expect(page.getByRole('button', { name: /^(Login|登录|ログイン)$/ })).toHaveCount(0);
          await expect(page.getByRole('dialog', { name: '登录 Gachia', exact: true })).toHaveCount(0);
          assert.deepEqual(accountRequests, [], 'Account client must not poll sessions or cloud APIs');
        }
        assert.deepEqual(errors, [], `${app}/${locale}/${width}/${mode}: runtime errors`);
        assert.deepEqual(failedAssets, [], 'Failed JS/CSS responses');
        assert(requests <= requestBudget, 'Browser request budget exceeded');
        if (directory && locale === 'zh' && mode === 'interactive') await page.screenshot({ path: resolve(directory, `web-${width}.png`) });
        observations.push({ path, locale, width, mode, delayedScripts, prefetchRequests: prefetches.length, runtimeErrors: errors.length, failedAssets: failedAssets.length, accountRequests: accountRequests.length, cumulativeRequests: requests });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return observations;
}

async function main() {
  const [app, ...extra] = process.argv.slice(2);
  if (!ROLLOUT_APPS.includes(app) || extra.length) throw new Error('Usage: runtime-rollout-smoke.mjs web|game-genshin|game-lvmeng');
  const records = resolve(ROOT, '.release-records');
  mkdirSync(records, { recursive: true });
  const lock = resolve(records, `${app.replace(/^game-/, '')}.lock`);
  writeFileSync(lock, JSON.stringify({ pid: process.pid, action: 'runtime_rollout_smoke' }), { flag: 'wx', mode: 0o600 });
  const runId = randomUUID();
  const directory = resolve(records, `rollout-${app}-${runId}`);
  mkdirSync(directory, { mode: 0o700 });
  const record = { schemaVersion: 1, app, runId, startedAt: new Date().toISOString(), status: 'running', cloudVerification: 'not_performed' };
  try {
    record.runtimePolicy = verifyAppRuntime(resolve(ROOT, 'apps', app));
    record.workerEntrypointSha256 = sha(readFileSync(resolve(ROOT, 'apps', app, '.open-next/worker.js')));
    const config = localFixtureConfig(app, ROOT);
    const configPath = resolve(directory, 'wrangler.json');
    const persistTo = resolve(directory, 'state');
    writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    const plan = { app: `apps/${app}`, wranglerEnvironment: '', buildEnvironment: {} };
    Object.assign(record, await verifyLocalWorker(plan, ROOT, { configPath, persistTo,
      onOutput: output => appendFileSync(resolve(directory, 'worker.log'), output, { mode: 0o600 }),
      verify: async (_, origin) => ({ http: await verifyHttp(app, origin), browser: await verifyBrowser(app, origin) }),
    }));
    record.status = 'local_runtime_verified';
    record.syntheticDatabase = false;
    record.accountPolicy = 'disabled_without_database_or_auth_secrets';
    record.realOAuth = 'not_performed';
  } catch (error) {
    record.status = 'failed'; record.error = error.message; throw error;
  } finally {
    record.finishedAt = new Date().toISOString();
    writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n');
    unlinkSync(lock);
    console.log(`Local rollout record: ${resolve(directory, 'result.json')}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
