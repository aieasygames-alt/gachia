import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { parseWrangler } from './game-release.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { verifyAppRuntime } from './require-app-runtime.mjs';

const ROOT = resolve(import.meta.dirname, '..');
export const ROLLOUT_APPS = Object.freeze(['web', 'game-genshin', 'game-lvmeng']);
const HI3_IDS = ['vermillion-liuli', 'vermillion-liuli-full-burn', 'volatile-sparkler'];
const sha = value => createHash('sha256').update(value).digest('hex');
const authOrigin = 'https://runtime-local.invalid';

export function localFixtureConfig(app, root, secret) {
  if (!ROLLOUT_APPS.includes(app)) throw new Error('Unknown rollout application');
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Synthetic fixture secret required');
  const directory = resolve(root, 'apps', app);
  const original = parseWrangler(readFileSync(resolve(directory, 'wrangler.jsonc'), 'utf8'));
  // Do not copy routes, service bindings, real IDs, secrets or environment blocks.
  const config = {
    name: `runtime-local-${app}`, main: resolve(directory, '.open-next/worker.js'),
    compatibility_date: original.compatibility_date, compatibility_flags: ['nodejs_compat'],
    assets: { directory: resolve(directory, '.open-next/assets'), binding: 'ASSETS' },
    vars: { NEXT_PUBLIC_APP_URL: 'https://gachia.com' },
  };
  if (app === 'web') {
    Object.assign(config.vars, { BETTER_AUTH_URL: authOrigin, BETTER_AUTH_SECRET: secret, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' });
    config.d1_databases = [{ binding: 'DB', database_name: 'runtime-local-db', database_id: '00000000-0000-0000-0000-000000000001', migrations_dir: resolve(root, 'packages/db/src/migrations'), remote: false }];
    config.r2_buckets = [{ binding: 'IMAGES', bucket_name: 'runtime-local-images', remote: false }];
  } else {
    config.vars[`${app.slice(5).toUpperCase()}_DEPLOYMENT_MODE`] = 'production';
  }
  return config;
}

export function fixtureD1Args(configPath, persistTo, file) {
  return ['exec', 'wrangler', 'd1', file ? 'execute' : 'migrations', ...(file ? [] : ['apply']), 'DB', '--local', '--config', configPath, '--persist-to', persistTo, ...(file ? ['--file', file] : [])];
}

async function verifyHttp(app, origin, cookie) {
  const observations = [];
  const get = async (path, expected = 200, init = {}) => {
    const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(30000), ...init,
      headers: { 'cf-connecting-ip': '192.0.2.1', ...init.headers } });
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
    first ??= result.body;
  }
  const robots = await get('/robots.txt');
  assert(!/^Disallow:\s*\/\s*$/m.test(robots.body));
  const sitemap = await get('/sitemap.xml');
  assert.match(sitemap.response.headers.get('content-type') ?? '', /xml/);
  for (const path of paths) assert(sitemap.body.includes(`https://gachia.com${path}</loc>`), `Missing sitemap path: ${path}`);
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
  if (app === 'web') {
    const empty = await get('/api/auth/get-session');
    assert.equal(JSON.parse(empty.body), null);
    const denied = await get('/api/favorites', 401);
    assert.match(denied.response.headers.get('cache-control') ?? '', /no-store/);
    const bad = await get('/api/auth/get-session', 200, { headers: { cookie: '__Secure-better-auth.session_token=invalid' } });
    assert.equal(JSON.parse(bad.body), null);
    const authenticated = await get('/api/auth/get-session', 200, { headers: { cookie } });
    assert.equal(JSON.parse(authenticated.body).user.id, 'runtime-fixture-user');
    const favorites = await get('/api/favorites', 200, { headers: { cookie } });
    assert.deepEqual(JSON.parse(favorites.body), []);
    await get('/api/favorites', 200, { method: 'POST', headers: { cookie, 'content-type': 'application/json', origin: authOrigin }, body: JSON.stringify({ gameId: 'hi3', characterId: 'runtime-fixture-character' }) });
    const saved = JSON.parse((await get('/api/favorites', 200, { headers: { cookie } })).body);
    assert.equal(saved[0]?.characterId, 'runtime-fixture-character');
    await get('/api/auth/sign-out', 403, { method: 'POST', headers: { cookie, origin: 'https://untrusted.invalid', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(JSON.parse((await get('/api/auth/get-session', 200, { headers: { cookie } })).body).user.id, 'runtime-fixture-user');
    const signedOut = await get('/api/auth/sign-out', 200, { method: 'POST', headers: { cookie, origin: authOrigin, 'content-type': 'application/json' }, body: '{}' });
    assert.match(signedOut.response.headers.get('set-cookie') ?? '', /httponly/i);
    assert.match(signedOut.response.headers.get('set-cookie') ?? '', /secure/i);
    assert.equal(JSON.parse((await get('/api/auth/get-session', 200, { headers: { cookie } })).body), null);
    for (let i = 0; i < 20; i++) await get('/api/auth/get-session', 200, { headers: { 'cf-connecting-ip': '192.0.2.99' } });
    const limited = await get('/api/auth/get-session', 429, { headers: { 'cf-connecting-ip': '192.0.2.99' } });
    assert(Number(limited.response.headers.get('retry-after')) > 0);
  }
  return observations;
}

async function verifyBrowser(app, origin) {
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  const locales = app === 'game-lvmeng' ? ['zh'] : ['zh', 'en', 'ja'];
  try {
    for (const width of [1440, 390]) for (const locale of locales) for (const mode of ['interactive', 'delayed_scripts', 'no_javascript']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no_javascript', serviceWorkers: 'block', extraHTTPHeaders: { 'cf-connecting-ip': `192.0.2.${observations.length + 10}` } });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const errors = [], failedAssets = [], prefetches = [];
        let delayedScripts = 0;
        await context.route('**/*', async route => {
          const request = route.request();
          if (new URL(request.url()).origin !== origin) return route.abort('blockedbyclient');
          if (mode === 'delayed_scripts' && request.resourceType() === 'script') { delayedScripts++; await new Promise(done => setTimeout(done, 1000)); }
          return route.continue();
        });
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('request', request => { if (request.headers()['next-router-prefetch']) prefetches.push(new URL(request.url()).pathname); });
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
            const login = page.getByRole('button', { name: { zh: '登录', en: 'Login', ja: 'ログイン' }[locale], exact: true });
            await login.click();
            const auth = page.getByRole('dialog', { name: '登录 Gachia', exact: true });
            await auth.getByRole('button', { name: '使用 Google 登录', exact: true }).click();
            await expect(auth.getByRole('alert')).toBeVisible();
            await expect(auth.getByRole('button', { name: '使用 Google 登录', exact: true })).toBeEnabled();
            await page.keyboard.press('Escape');
            await expect(auth).toHaveCount(0); await expect(login).toBeFocused();
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
        assert.deepEqual(errors, [], `${app}/${locale}/${width}/${mode}: runtime errors`);
        assert.deepEqual(failedAssets, [], 'Failed JS/CSS responses');
        observations.push({ path, locale, width, mode, delayedScripts, prefetchRequests: prefetches.length, runtimeErrors: errors.length, failedAssets: failedAssets.length });
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
    const secret = randomBytes(32).toString('hex');
    const token = randomBytes(24).toString('hex');
    const config = localFixtureConfig(app, ROOT, secret);
    const configPath = resolve(directory, 'wrangler.json');
    const persistTo = resolve(directory, 'state');
    writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    const command = args => {
      const result = execFileSync('pnpm', args, { cwd: resolve(ROOT, 'apps', app), encoding: 'utf8', timeout: 120000, env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
      appendFileSync(resolve(directory, 'database.log'), result, { mode: 0o600 });
    };
    if (app === 'web') {
      command(fixtureD1Args(configPath, persistTo));
      const seed = resolve(directory, 'seed.sql');
      writeFileSync(seed, `INSERT INTO user (id,name,email) VALUES ('runtime-fixture-user','Runtime Fixture','runtime@example.invalid');\nINSERT INTO session (id,user_id,token,expires_at) VALUES ('runtime-fixture-session','runtime-fixture-user','${token}',${Math.floor(Date.now()/1000) + 3600});\n`, { mode: 0o600 });
      command(fixtureD1Args(configPath, persistTo, seed));
    }
    const cookie = `__Secure-better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', secret).update(token).digest('base64')}`)}`;
    const plan = { app: `apps/${app}`, wranglerEnvironment: '', buildEnvironment: {} };
    Object.assign(record, await verifyLocalWorker(plan, ROOT, { configPath, persistTo,
      onOutput: output => appendFileSync(resolve(directory, 'worker.log'), output.replaceAll(secret, '[synthetic-secret]'), { mode: 0o600 }),
      verify: async (_, origin) => ({ http: await verifyHttp(app, origin, cookie), browser: await verifyBrowser(app, origin) }),
    }));
    record.status = 'local_runtime_verified';
    record.syntheticDatabase = app === 'web';
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
