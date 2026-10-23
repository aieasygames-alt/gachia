import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { MANAGED_MIRRORS, verifyRawMirrors } from '../packages/data/scripts/raw-mirror-contract.mjs';
import { fixtureIpHeaders, localFixtureConfig } from './runtime-rollout-smoke.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SLUG = 'daily-events-merchant-guide';

export function requireLocalContentOrigin(value) {
  const url = new URL(value);
  assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
    'Managed content smoke only accepts an explicit local Worker origin');
  return url.origin;
}

export async function verifyManagedContent(value, directory) {
  const origin = requireLocalContentOrigin(value);
  const observations = { json: [], browser: [] };
  for (const { game, file } of MANAGED_MIRRORS) {
    const path = `/data/${game}/${file}`;
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /json/);
    assert.deepEqual(await response.json(), JSON.parse(readFileSync(resolve(ROOT, `packages/data/games/${game}/${file}`), 'utf8')), path);
    observations.json.push({ path, status: 200, sourceEqual: true });
  }
  const raw = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/roco-cn/raw-guides.json'), 'utf8'));
  const guide = raw.find(entry => entry.id === SLUG);
  const skjh = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/skjh/raw-guides.json'), 'utf8')).find(entry => entry.id === 'season-1-launch');
  const cases = [
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/wuwa/redeem-codes`, kind: 'codes' })),
    ...['zh', 'ja'].map(locale => ({ locale, path: `/${locale}/roco-cn/guides/${SLUG}`, kind: 'archive' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/skjh/guides/season-1-launch`, kind: 'backport' })),
  ];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', extraHTTPHeaders: fixtureIpHeaders(origin, '192.0.2.202') });
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
        const page = await context.newPage();
        const errors = [], failedAssets = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        for (const { locale, path, kind } of cases) {
          const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
          assert.equal(response.status(), 200, path);
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://gachia.com${path}`);
          const body = await page.locator('body').innerText();
          if (kind === 'archive') {
            assert.equal(await page.locator('h1').innerText(), locale === 'zh' ? guide.title : guide.titleJa);
            assert(body.includes(locale === 'zh' ? '历史归档说明' : '過去の記録について'));
            const languages = await page.locator('link[rel="alternate"][hreflang]').evaluateAll(nodes => nodes.map(node => node.getAttribute('hreflang')));
            assert(!languages.includes('en') && languages.includes('ja') && languages.includes('zh-Hans'));
            assert.equal(await page.locator(`a[href="/en/roco-cn/guides/${SLUG}"]`).count(), 0, 'Language switcher must not link to a retired page');
          } else if (kind === 'backport') {
            assert.equal(await page.locator('h1').innerText(), locale === 'zh' ? skjh.title : locale === 'ja' ? (skjh.titleJa ?? skjh.titleEn) : skjh.titleEn);
          } else {
            assert(!body.includes('Last Checked') && !body.includes('最后核验') && !body.includes('最終確認'));
            assert(body.includes(locale === 'zh' ? '不代表实时兑换验证' : locale === 'ja' ? 'リアルタイムの交換確認ではありません' : 'not a live redemption check'));
          }
          assert.deepEqual(errors, [], path);
          assert.deepEqual(failedAssets, [], path);
          observations.browser.push({ path, width, status: 200, kind, errors: 0, failedAssets: 0 });
          if (directory && locale === 'zh' && kind !== 'backport') await page.screenshot({ path: resolve(directory, `${kind}-${width}.png`) });
        }
        for (const path of ['/en/roco-cn', '/en/roco-cn/guides', '/en/roco-cn/guides/starter-guide-cn']) {
          assert.equal((await page.goto(origin + path, { waitUntil: 'networkidle' })).status(), 200);
          assert.equal(await page.locator(`a[href="/en/roco-cn/guides/${SLUG}"]`).count(), 0, path);
        }
        assert.equal((await page.goto(`${origin}/en/roco-cn/guides/${SLUG}`, { waitUntil: 'domcontentloaded' })).status(), 404);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return observations;
}

async function main() {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/managed-content-smoke.mjs');
  await verifyRawMirrors();
  const records = resolve(ROOT, '.release-records');
  mkdirSync(records, { recursive: true });
  const lock = resolve(records, 'web.lock');
  writeFileSync(lock, JSON.stringify({ pid: process.pid, action: 'managed_content_smoke' }), { flag: 'wx', mode: 0o600 });
  const directory = resolve(records, `managed-content-${randomUUID()}`);
  const record = { status: 'running', cloudVerification: 'not_performed', startedAt: new Date().toISOString() };
  try {
    mkdirSync(directory, { mode: 0o700 });
    const configPath = resolve(directory, 'wrangler.json');
    writeFileSync(configPath, JSON.stringify(localFixtureConfig('web', ROOT)), { mode: 0o600 });
    await verifyLocalWorker({ app: 'apps/web', wranglerEnvironment: '', buildEnvironment: {} }, ROOT, {
      configPath, persistTo: resolve(directory, 'state'), onOutput: output => appendFileSync(resolve(directory, 'worker.log'), output),
      verify: async (_, origin) => {
        execFileSync('python3', ['-B', 'scripts/web-sitemap-contract-audit.py', '--origin', origin, '--output', resolve(directory, 'xml-report.json')], { cwd: ROOT, stdio: 'inherit' });
        writeFileSync(resolve(directory, 'main-sitemap.xml'), await (await fetch(`${origin}/sitemaps/main/sitemap.xml`)).text());
        record.acceptance = await verifyManagedContent(origin, directory);
        return {};
      },
    });
    record.status = 'local_managed_content_verified';
  } catch (error) { record.status = 'failed'; record.error = error.message; throw error; }
  finally {
    record.finishedAt = new Date().toISOString();
    writeFileSync(resolve(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n');
    unlinkSync(lock);
    console.log(`Managed content record: ${directory}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
