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
  const observations = { json: [], search: [], browser: [] };
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
  const reviewedEchoes = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/wuwa/raw-echoes.json'), 'utf8')).filter(entry => entry.sourceReview);
  const reviewedRegion = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/wuwa/raw-regions.json'), 'utf8')).find(entry => entry.id === 'simulacrum-nexus');
  const rocoGuides = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/roco/raw-guides.json'), 'utf8')).filter(entry => entry.contentReview?.status === 'needs_verification');
  const rocoCharacters = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/roco/raw-characters.json'), 'utf8')).filter(entry => entry.contentReview?.status === 'needs_verification');
  const rocoPublicReview = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/lib/roco-public-review.json'), 'utf8'));
  for (const locale of ['zh', 'en', 'ja']) {
    const path = `/data-manifest/search-${locale}.json`;
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /json/);
    const manifest = await response.json();
    for (const set of reviewedEchoes) {
      assert.deepEqual(manifest.wuwa.artifacts.find(row => row.id === set.id), {
        id: set.id, name: locale === 'zh' ? set.name : locale === 'ja' ? set.nameJa : set.nameEn,
        nameAlt: locale === 'zh' ? set.nameEn : set.name,
      });
    }
    observations.search.push({ path, status: 200, officialNamesVerified: reviewedEchoes.length });
  }
  const cases = [
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/wuwa/redeem-codes`, kind: 'codes' })),
    ...['zh', 'ja'].map(locale => ({ locale, path: `/${locale}/roco-cn/guides/${SLUG}`, kind: 'archive' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/roco-cn/map`, kind: 'cn-map' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/skjh/guides/season-1-launch`, kind: 'backport' })),
    ...['zh', 'en', 'ja'].flatMap(locale => reviewedEchoes.map(set => ({ locale, path: `/${locale}/wuwa/echoes/${set.id}`, kind: 'echo', id: set.id }))),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/wuwa/artifacts`, kind: 'echo-list' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/wuwa/map`, kind: 'region' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/roco/version`, kind: 'roco-version' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/roco/events`, kind: 'roco-events' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}`, kind: 'roco-home' })),
    ...['zh', 'en', 'ja'].flatMap(locale => rocoGuides.map(row => ({ locale, path: `/${locale}/roco/guides/${row.id}`, kind: 'roco-reviewed-guide', id: row.id }))),
    ...['zh', 'en', 'ja'].flatMap(locale => rocoCharacters.map(row => ({ locale, path: `/${locale}/roco/characters/${row.id}`, kind: 'roco-reviewed-character', id: row.id }))),
    ...['zh', 'en', 'ja'].flatMap(locale => ['guides', 'characters'].map(section => ({ locale, path: `/${locale}/roco/${section}`, kind: `roco-${section}-list` }))),
    ...['zh', 'en', 'ja'].flatMap(locale => Object.keys(rocoPublicReview.pages).map(route => ({ locale, path: `/${locale}/roco${route ? `/${route}` : ''}`, kind: 'roco-public-review', id: route || 'home' }))),
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
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        page.on('requestfailed', request => { if (new URL(request.url()).origin === origin && ['script', 'stylesheet'].includes(request.resourceType())) failedAssets.push(request.url()); });
        for (const { locale, path, kind, id } of cases) {
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
          } else if (kind === 'cn-map') {
            assert.equal(await page.locator('[data-roco-public-review]').count(), 0);
            assert.equal(await page.locator('h1').innerText(), { zh: '国服地图与资源路线入口', en: 'CN Map and Resource Route Hub', ja: '中国版マップ・資源ルート' }[locale]);
            for (const route of ['characters', 'redeem-codes', 'version', 'guides', 'weapons', 'tier-list']) assert((await page.locator(`main a[href="/${locale}/roco-cn/${route}"]`).count()) > 0, `${path}: missing CN map navigation`);
          } else if (kind === 'backport') {
            assert.equal(await page.locator('h1').innerText(), locale === 'zh' ? skjh.title : locale === 'ja' ? (skjh.titleJa ?? skjh.titleEn) : skjh.titleEn);
          } else if (kind === 'echo' || kind === 'echo-list') {
            assert(body.includes({ zh: '二件套效果尚未核实', en: '2-piece effect is not verified', ja: '2セット効果は未確認' }[locale]));
            const sets = kind === 'echo' ? reviewedEchoes.filter(set => set.id === id) : reviewedEchoes;
            for (const set of sets) {
              const name = locale === 'zh' ? set.name : locale === 'ja' ? set.nameJa : set.nameEn;
              const effect = locale === 'zh' ? set.bonus5pc : locale === 'ja' ? set.bonus5pcJa : set.bonus5pcEn;
              assert(body.includes(name) && body.includes(effect), `${path}: localized official text missing`);
              if (kind === 'echo-list') assert.equal(await page.locator(`a[href="/${locale}/wuwa/echoes/${set.id}"]`).count(), 1);
              else {
                assert.equal(await page.locator('h1').innerText(), name);
                assert((await page.title()).includes(name));
                assert.equal(await page.getByRole('heading', { name: /^(推荐角色|Recommended Characters|おすすめキャラクター)$/ }).count(), 0);
                const sources = await page.locator('[data-echo-source] a').evaluateAll(nodes => nodes.map(node => node.href));
                assert.deepEqual(sources, set.sourceReview.sources.map(source => source.url));
              }
            }
          } else if (kind === 'region') {
            const card = page.locator('#simulacrum-nexus');
            assert.equal(await card.count(), 1, 'Keep the stable map anchor');
            const suffix = { zh: '', en: 'En', ja: 'Ja' }[locale];
            assert.equal(await card.locator('h2').innerText(), reviewedRegion[`name${suffix}`]);
            const text = await card.innerText();
            for (const entry of [reviewedRegion[`description${suffix}`], ...reviewedRegion[`subRegions${suffix}`], ...reviewedRegion[`highlights${suffix}`]]) assert(text.includes(entry), `${path}: missing reviewed text`);
            assert.equal(await card.getByRole('heading', { name: /^(区域特产|Specialties|特産品)$/ }).count(), 0);
            for (const withdrawn of ['玉冥蛇', 'COST 4', '沉心域无音区', '烬心域无音区', 'Heartscape Maze', 'Myriad-Aspect Divine Palace']) assert(!text.includes(withdrawn), withdrawn);
            const sources = await card.locator('[data-region-source] a').evaluateAll(nodes => nodes.map(node => node.href));
            assert.deepEqual(sources, reviewedRegion.sourceReview.sources.map(source => source.url));
            assert(text.includes({ zh: '不代表当前版本的实时核验', en: 'not a live check of the current version', ja: '現行版のリアルタイム確認ではありません' }[locale]));
            assert.equal(await page.locator('[data-region-source]').count(), 1, 'Do not label older regions reviewed');
            assert(await card.evaluate(node => node.scrollWidth <= node.clientWidth), `${path}: region card overflows viewport`);
            if (directory && locale === 'zh') await card.screenshot({ path: resolve(directory, `region-card-${width}.png`) });
          } else if (kind === 'roco-public-review') {
            const copy = rocoPublicReview.pages[id === 'home' ? '' : id][locale];
            const article = page.locator(`[data-roco-public-review="${id}"]`);
            assert.equal(await article.count(), 1, path);
            assert.equal(await article.locator('h1').innerText(), copy.title);
            const text = await article.innerText();
            for (const line of [copy.description, ...copy.checks]) assert(text.includes(line), `${path}: missing scoped correction text`);
            assert.equal(await article.locator('[data-content-review]').count(), 1, path);
            assert.equal(await article.locator('[data-review-navigation] a').count(), 3, path);
            assert.equal(await article.locator('a[href^="http"], table, img, button').count(), 0, 'Do not endorse external downloads or render provisional rankings');
            assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), 0, path);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*follow/);
            assert((await page.title()).includes(copy.title), path);
            assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), copy.description, path);
            assert(!/10\/27|10\/20|2026-10-27|3688140|400\+/.test(body), path);
            assert(await article.evaluate(node => node.scrollWidth <= node.clientWidth), `${path}: review content overflows`);
          } else if (kind.startsWith('roco-reviewed-')) {
            const row = (kind === 'roco-reviewed-guide' ? rocoGuides : rocoCharacters).find(row => row.id === id);
            const suffix = { zh: '', en: 'En', ja: 'Ja' }[locale];
            assert.equal(await page.locator('h1').innerText(), row[`${kind === 'roco-reviewed-guide' ? 'title' : 'name'}${suffix}`] ?? row.nameEn);
            assert.equal(await page.locator('[data-content-review]').count(), 1);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*follow/);
            assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), 0);
            const forbidden = /10\/27|10\/20|Oct(?:ober)? 27|Oct(?:ober)? 20|10月27|10月20|2026-10-27|2026-10-20|3688140|400\+|★★★★/;
            for (const text of [body, await page.title(), await page.locator('meta[name="description"]').getAttribute('content'), ...await page.locator('script[type="application/ld+json"]').allTextContents()]) assert(!forbidden.test(text), `${path}: withdrawn claim remains: ${text.slice(0, 180)}`);
            const article = page.locator('main');
            if (kind === 'roco-reviewed-guide') {
              assert(body.includes(row[`summary${suffix}`]));
              for (const line of row[`content${suffix}`].split('\n').map(line => line.replace(/^(?:#{1,6}|-)\s+/, '').trim()).filter(Boolean)) assert(body.includes(line), `${path}: missing checklist text`);
              const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(text => JSON.parse(text));
              assert.equal(schemas.find(schema => schema['@type'] === 'Article')?.dateModified, row.contentReview.reviewedAt, path);
              assert.equal(await article.getByRole('heading', { name: /^(快速回答|快速结论|Quick answer|クイックアンサー|要点|下一步|Next steps|次のステップ|相关推荐|Related guides|関連ガイド)/i }).count(), 0);
              const statusLink = article.getByRole('link', { name: { zh: '查看资料核验状态', en: 'View information review status', ja: '資料の確認状況を見る' }[locale], exact: true });
              assert.equal(await statusLink.count(), 1, path);
              assert.equal(await statusLink.getAttribute('href'), `/${locale}/roco/version`);
              const faq = article.locator('details');
              assert.equal(await faq.count(), 1);
              await faq.first().click();
              assert((await faq.first().innerText()).includes(row.faq[0][{ zh: 'answerZh', en: 'answer', ja: 'answerJa' }[locale]]));
            } else {
              assert(body.includes(row[`description${suffix}`]));
              assert.equal(await page.locator('[data-review-portrait]').innerText(), { zh: '形象待核实', en: 'Appearance unverified', ja: '外見未確認' }[locale]);
              assert.equal(await page.locator('[data-review-portrait] img').count(), 0);
              assert.equal(await article.getByRole('heading', { name: /^(种族值|種族値|Base Stats|技能表|スキル一覧|Skills|基本信息|基本情報|Profile)$/ }).count(), 0);
            }
          } else if (kind === 'roco-guides-list' || kind === 'roco-characters-list') {
            const entries = kind === 'roco-guides-list' ? rocoGuides : rocoCharacters;
            const section = kind === 'roco-guides-list' ? 'guides' : 'characters';
            assert.equal(await page.locator(`[data-roco-list-review="${section}"]`).innerText(), rocoPublicReview.lists[section][locale].notice);
            assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), rocoPublicReview.lists[section][locale].description);
            if (section === 'guides') {
              const directory = page.locator('[data-roco-list-review="guides"]').locator('..');
              for (const route of ['eggs', 'merchant', 'type-chart']) assert.equal(await directory.locator(`a[href="/${locale}/roco/${route}"]`).count(), 0, `${path}: withdrawn action-hub promotion ${route}`);
            }
            for (const row of entries) {
              const card = page.locator(`main a[href="/${locale}/roco/${section}/${row.id}"]`);
              assert((await card.count()) > 0, `${path}: missing ${row.id} card`);
              for (const text of await card.allInnerTexts()) {
                assert(!/10\/27|10\/20|2026-10-27|400\+|★★★★/.test(text), text);
                if (section === 'characters') assert(text.includes({ zh: '待核实', en: 'Unverified', ja: '未確認' }[locale]));
              }
            }
          } else if (kind.startsWith('roco-')) {
            const forbidden = /10\/27|10\/20|Oct(?:ober)? 27|Oct(?:ober)? 20|10月27|10月20|2026-10-27|2026-10-20|3688140/;
            if (kind === 'roco-home') {
              const links = page.locator(`main a[href^="/${locale}/roco/"]`);
              assert((await links.count()) > 0);
              for (const text of await links.allInnerTexts()) assert(!forbidden.test(text), text);
              assert.equal(await page.locator(`a[href="/${locale}/roco/guides/cbt-registration-guide"]`).count(), 0);
            } else {
              assert(!forbidden.test(body), `${path}: withdrawn date or wrong source is still visible`);
              assert(!forbidden.test(await page.title()), path);
              assert(!forbidden.test(await page.locator('meta[name="description"]').getAttribute('content')), path);
              for (const json of await page.locator('script[type="application/ld+json"]').allTextContents()) assert(!forbidden.test(json), path);
              assert(body.includes({ zh: '不代表测试取消', en: 'cancel', ja: '中止' }[locale]));
              if (kind === 'roco-events') assert.equal(await page.locator('[data-roco-schedule-review]').count(), 1);
              else assert.equal(await page.locator(`a[href="/${locale}/roco/guides/cbt-registration-guide"]`).count(), 0);
            }
          } else {
            assert(!body.includes('Last Checked') && !body.includes('最后核验') && !body.includes('最終確認'));
            assert(body.includes(locale === 'zh' ? '不代表实时兑换验证' : locale === 'ja' ? 'リアルタイムの交換確認ではありません' : 'not a live redemption check'));
          }
          assert.deepEqual(errors, [], path);
          assert.deepEqual(failedAssets, [], path);
          observations.browser.push({ path, width, status: 200, kind, errors: 0, failedAssets: 0 });
          if (directory && locale === 'zh' && kind !== 'backport') {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.waitForFunction(() => window.scrollY === 0);
            await page.screenshot({ path: resolve(directory, `${kind}${id ? `-${id}` : ''}-${width}.png`), fullPage: kind.startsWith('roco-reviewed-') || kind === 'roco-public-review' });
          }
          if (kind === 'echo-list') {
            const first = reviewedEchoes[0];
            const href = `/${locale}/wuwa/echoes/${first.id}`;
            await page.locator(`a[href="${href}"]`).click();
            await page.waitForURL(origin + href);
            assert.equal(await page.locator('h1').innerText(), locale === 'zh' ? first.name : locale === 'ja' ? first.nameJa : first.nameEn);
            assert.equal(await page.locator('[data-echo-source]').count(), 1);
            observations.browser.at(-1).detailNavigationVerified = true;
          }
          if (kind === 'roco-guides-list' || kind === 'roco-characters-list') {
            const section = kind === 'roco-guides-list' ? 'guides' : 'characters';
            const first = section === 'guides' ? rocoGuides[0] : rocoCharacters[0];
            const href = `/${locale}/roco/${section}/${first.id}`;
            await page.locator(`main a[href="${href}"]`).first().click();
            await page.waitForURL(origin + href);
            assert.equal(await page.locator('[data-content-review]').count(), 1);
            observations.browser.at(-1).detailNavigationVerified = true;
          }
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
