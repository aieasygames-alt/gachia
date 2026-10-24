import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, appendFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { MANAGED_MIRRORS, verifyRawMirrors } from '../packages/data/scripts/raw-mirror-contract.mjs';
import { fixtureIpHeaders, localFixtureConfig } from './runtime-rollout-smoke.mjs';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { ROCO_RETAINED_CN_IMAGE_PATHS } from '../packages/data/scripts/roco-publication-contract.mjs';
import { verifyRetainedWebAssets } from './retain-web-assets.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SLUG = 'daily-events-merchant-guide';
const INDEXNOW_FIXTURE_TOKEN = 'local-indexnow-paused-fixture';

export function verifyWithdrawnRocoAssets(directory) {
  const assets = resolve(directory, 'assets');
  const entries = readdirSync(assets, { recursive: true, withFileTypes: true });
  assert(!entries.some(entry => entry.isSymbolicLink()), 'Linked published assets are not supported by the withdrawal check');
  const files = entries.filter(entry => entry.isFile());
  const withdrawn = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/roco-publication-resolution.json'), 'utf8')).assets;
  assert(files.length > 0, 'No compiled assets inspected');
  const forbidden = /(?:^|\/)images\/roco\/characters\/|(?:^|\/)reports\/content-integrity\/|s2-14\/(?:characters|guides|ledger)\.json$/;
  for (const entry of files) {
    const path = resolve(entry.parentPath, entry.name).slice(assets.length + 1);
    assert(!forbidden.test(path), `Withdrawn Roco asset or private evidence published: ${path}`);
    const hash = createHash('sha256').update(readFileSync(resolve(assets, path))).digest('hex');
    const image = withdrawn.find(row => row.sha256 === hash);
    if (image) {
      const id = image.path.split('/').at(-1).replace('.webp', '');
      assert.equal(path, ROCO_RETAINED_CN_IMAGE_PATHS[id], 'Withdrawn image published under another path');
    }
  }
  return { inspectedFiles: files.length, withdrawnImagesPublished: false, privateEvidencePublished: false, scope: 'international_paths_and_unregistered_byte_aliases; existing_independent_CN_paths_retained_not_newly_verified' };
}

export function verifyNoLegacyIndexNowTransport(directory) {
  let codeFiles = 0;
  for (const entry of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:m?js|cjs)$/.test(entry.name)) continue;
    const path = resolve(entry.parentPath, entry.name);
    assert(!/api\.indexnow\.org|www\.bing\.com\/indexnow|search\.seznam\.cz\/indexnow|yandex\.com\/indexnow/.test(readFileSync(path, 'utf8')), 'Legacy IndexNow transport found in compiled code; refuse to start authenticated fixture');
    codeFiles++;
  }
  assert(codeFiles > 0, 'No compiled code inspected');
  return { codeFiles, legacyTransportStringsPresent: false };
}

export function requireLocalContentOrigin(value) {
  const url = new URL(value);
  assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash,
    'Managed content smoke only accepts an explicit local Worker origin');
  return url.origin;
}

export async function verifyManagedContent(value, directory) {
  const origin = requireLocalContentOrigin(value);
  return verifyContent(origin, directory, { localFixture: true });
}

export function requirePublishedContentOrigin(value) {
  assert(['https://gachia-staging.aieasygames.workers.dev', 'https://gachia.com'].includes(value),
    'Published content acceptance only permits the exact main staging or production origin');
  return value;
}

export async function verifyPublishedManagedContent(value, directory, { proxy } = {}) {
  const origin = requirePublishedContentOrigin(value);
  verifyNoLegacyIndexNowTransport(resolve(ROOT, 'apps/web/.open-next'));
  verifyWithdrawnRocoAssets(resolve(ROOT, 'apps/web/.open-next'));
  return verifyContent(origin, directory, { localFixture: false, proxy });
}

export async function verifyPublishedIndexNow(value, request = fetch) {
  const origin = requirePublishedContentOrigin(value);
  const response = await request(`${origin}/api/indexnow`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls: ['https://gachia.com/zh'] }),
    redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 401, 'Published IndexNow must reject unauthenticated requests');
  assert.equal((await response.json()).error, 'Unauthorized');
  return [{ name: 'unauthorized', status: 401, submissionAttempted: false,
    pauseEvidence: 'sealed_code_transport_absence_and_local_authenticated_fixture_not_cloud_authenticated_probe' }];
}

export function assertMainFallbackSnapshot(snapshot, path, expectedName) {
  assert.equal(snapshot.canonical, `https://gachia.com${path}`, path);
  assert.match(snapshot.robots ?? '', /^index\s*,\s*follow$/, path);
  assert.equal(snapshot.name, expectedName, path);
  assert(snapshot.scripts.some(src => src.startsWith('/_next/static/')), path);
  assert(!snapshot.scripts.some(src => src.startsWith('/_games/')), path);
}

export function assertRocoLegacyRedirect(location, origin, suffix, { localFixture = false } = {}) {
  assert(typeof location === 'string' && location.length > 0, 'Missing legacy redirect Location');
  const target = new URL(location, origin);
  assert.equal(target.pathname, `/zh/roco/${suffix}`);
  if (localFixture) {
    assert.equal(target.protocol, 'http:');
    assert(['127.0.0.1', 'localhost'].includes(target.hostname));
    assert.equal(target.port, new URL(origin).port);
  } else assert.equal(target.origin, origin);
  assert(!target.username && !target.password && !target.search && !target.hash);
  return target;
}

async function verifyContent(origin, directory, { localFixture, proxy }) {
  const observations = { http: [], fallbackHttp: [], json: [], search: [], browser: [], indexnow: [], retainedAssets: [] };
  const nteMaterials = JSON.parse(readFileSync(resolve(ROOT, 'packages/data/games/nte/raw-materials.json'), 'utf8'));
  assert(nteMaterials.length > 0 && new Set(nteMaterials.map(item => item.id)).size === nteMaterials.length);
  const retentionPath = resolve(ROOT, 'apps/web/.open-next/retained-web-assets.json');
  if (existsSync(retentionPath)) {
    const retained = JSON.parse(readFileSync(retentionPath, 'utf8'));
    verifyRetainedWebAssets(resolve(ROOT, 'apps/web/.open-next'), retained.source.versionId);
    const selected = [...retained.files.filter(file => /(?:webpack[^/]*\.js|\.css)$/.test(file.path)), ...retained.files];
    for (const file of [...new Map(selected.map(file => [file.path, file])).values()].slice(0, 12)) {
      const path = '/_next/static/' + file.path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, path);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.length, file.bytes, path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, path);
      observations.retainedAssets.push({ path, status: 200, byteEqual: true, versionId: retained.source.versionId });
    }
  }
  for (const id of ['meewee', 'sparka', 'cerulla']) {
    for (const suffix of ['', '?withdrawal-probe=1']) for (const method of ['GET', 'HEAD']) {
      const path = `/images/roco/characters/${id}.webp${suffix}`;
      const response = await fetch(origin + path, { method, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 404, `Withdrawn image ${method} ${path}`);
      assert.equal(response.headers.get('location'), null, path);
      assert(!/^image\//i.test(response.headers.get('content-type') ?? ''), path);
      await response.arrayBuffer();
      observations.http.push({ path, method, status: 404, withdrawnImage: true });
    }
  }
  for (const locale of ['zh', 'en', 'ja']) {
    for (const suffix of ['items', 'items/gulu-ball', 'items/not-a-record']) {
      const path = `/${locale}/roco/${suffix}`;
      const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 404, path);
      assert.equal(response.headers.get('location'), null, path);
      observations.http.push({ path, status: 404, redirected: false });
    }
  }
  for (const suffix of ['items', 'items/gulu-ball']) {
    const path = `/roco/${suffix}`;
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 301, path);
    const location = response.headers.get('location');
    assertRocoLegacyRedirect(location, origin, suffix, { localFixture });
    observations.http.push({ path, status: 301, location });
  }
  const indexnowCases = [
    ['unauthorized', 'wrong-local-token', { urls: ['https://gachia.com/zh'] }, 401],
    ['paused-page', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://gachia.com/zh'] }, 503],
    ['paused-held-detail', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://gachia.com/en/roco/characters/meewee'], approved: true }, 503],
    ['paused-dedicated-owner', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://gachia.com/ja/genshin/guides/starter-guide'] }, 503],
    ['invalid-external', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://evil.example/zh'] }, 400],
    ['invalid-query', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://gachia.com/zh?x=1'] }, 400],
    ['invalid-credentials', INDEXNOW_FIXTURE_TOKEN, { urls: ['https://u:p@gachia.com/zh'] }, 400],
    ['invalid-empty', INDEXNOW_FIXTURE_TOKEN, { urls: [] }, 400],
  ];
  // Real cloud secrets and synthetic trusted-IP headers never leave the local fixture.
  if (!localFixture) observations.indexnow = await verifyPublishedIndexNow(origin);
  for (const [name, token, payload, status] of localFixture ? indexnowCases : []) {
    const response = await fetch(`${origin}/api/indexnow`, { method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, status, `IndexNow ${name}`);
    const body = await response.json();
    if (status === 503) assert.equal(body.submissionApproved, false, name);
    observations.indexnow.push({ name, status, submissionAttempted: false });
  }
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
  // Keep negative identity checks non-vacuous after stripping names from public raw.
  const archivedCharacters = JSON.parse(readFileSync(resolve(ROOT, 'reports/content-integrity/archive/s2-14/characters.json'), 'utf8'));
  assert.equal(archivedCharacters.length, 6);
  const rocoPublicReview = JSON.parse(readFileSync(resolve(ROOT, 'apps/web/lib/roco-public-review.json'), 'utf8'));
  const { legacyWeaponIds } = JSON.parse(readFileSync(resolve(ROOT, 'reports/content-integrity/s2-10-source-decisions-2026-10-24.json'), 'utf8'));
  const reviewedTools = ['type-chart', 'eggs', 'merchant', 'weapons', 'redeem-codes'];
  const messages = Object.fromEntries(['zh', 'en', 'ja'].map(locale => [locale, JSON.parse(readFileSync(resolve(ROOT, `apps/web/messages/${locale}.json`), 'utf8'))]));
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
    ...['zh', 'en', 'ja'].flatMap(locale => [nteMaterials[0], nteMaterials.at(-1)].map(item => ({ locale, path: `/${locale}/nte/items/${item.id}`, kind: 'nte-main-item', id: item.id }))),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/tools/market-intel`, kind: 'market-intel-review' })),
    ...['zh', 'en', 'ja'].map(locale => ({ locale, path: `/${locale}/roco-cn`, kind: 'cn-home' })),
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
    ...['zh', 'en', 'ja'].flatMap(locale => legacyWeaponIds.map(id => ({ locale, path: `/${locale}/roco/weapons/${id}`, kind: 'roco-weapon-review', id }))),
    ...['zh', 'en', 'ja'].flatMap(locale => [...reviewedTools, 'items', `weapons/${legacyWeaponIds[0]}`].map(id => ({ locale, path: `/${locale}/roco-cn/${id}`, kind: 'roco-cn-tool', id }))),
  ];
  const browser = await chromium.launch({ headless: true, proxy });
  let requests = 0;
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', extraHTTPHeaders: fixtureIpHeaders(origin, '192.0.2.202') });
      try {
        await context.route('**/*', route => {
          if (new URL(route.request().url()).origin !== origin) return route.abort('blockedbyclient');
          assert(++requests <= 20000, 'Managed browser request budget exceeded');
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [], failedAssets = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text()); });
        page.on('response', response => { if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url()); });
        page.on('requestfailed', request => { if (new URL(request.url()).origin === origin && ['script', 'stylesheet'].includes(request.resourceType())) failedAssets.push(request.url()); });
        if (width === 1440) {
          // Check every restored URL; DOMParser inspects HTTP HTML without executing it.
          for (const locale of ['zh', 'en', 'ja']) for (const item of nteMaterials) {
            const path = `/${locale}/nte/items/${item.id}`;
            const response = await fetch(origin + path, { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000) });
            assert.equal(response.status, 200, path);
            assert.equal(response.headers.get('location'), null, path);
            assert.match(response.headers.get('content-type') ?? '', /text\/html/, path);
            assert.equal(/noindex/i.test(response.headers.get('x-robots-tag') ?? ''), origin === 'https://gachia-staging.aieasygames.workers.dev', path);
            const metadata = await page.evaluate(html => {
              const document = new DOMParser().parseFromString(html, 'text/html');
              return {
                canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
                robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
                name: document.querySelector('h1')?.textContent,
                scripts: [...document.querySelectorAll('script[src]')].map(node => node.getAttribute('src')),
              };
            }, await response.text());
            assertMainFallbackSnapshot(metadata, path, locale === 'zh' ? item.name : item.nameEn);
            observations.fallbackHttp.push({ path, status: 200, mainAssets: true, canonical: metadata.canonical, robots: metadata.robots });
          }
        }
        for (const locale of ['zh', 'en', 'ja']) {
          for (const suffix of ['items', 'items/gulu-ball', 'items/not-a-record']) {
            const path = `/${locale}/roco/${suffix}`;
            const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
            assert.equal(response.status(), 404, path);
            const robots = await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('content')));
            assert(robots.some(value => /noindex/.test(value ?? '')), path);
            assert.equal(await page.locator(`link[rel="canonical"][href="https://gachia.com${path}"]`).count(), 0, path);
            const alternateHrefs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
            assert(!alternateHrefs.some(href => /\/roco\/items(?:\/|$)/.test(href ?? '')), path);
            assert(!(await page.locator('main').innerText()).includes('Coming Soon'), path);
            assert.deepEqual(errors, [], path);
            assert.deepEqual(failedAssets, [], path);
            if (directory && locale === 'zh' && suffix === 'items') await page.screenshot({ path: resolve(directory, `roco-disabled-items-${width}.png`) });
            observations.browser.push({ path, width, status: 404, kind: 'roco-disabled-items', robots, alternateHrefs });
          }
        }
        for (const { locale, path, kind, id } of cases) {
          const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
          assert.equal(response.status(), 200, path);
          assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://gachia.com${path}`);
          const body = await page.locator('body').innerText();
          assert.equal(await page.locator('[data-source-disclaimer]').innerText(), messages[locale].footer.disclaimer, path);
          if (kind === 'nte-main-item') {
            const item = nteMaterials.find(item => item.id === id);
            assert.equal(await page.locator('h1').innerText(), locale === 'zh' ? item.name : item.nameEn);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /^index,\s*follow$/);
            assert.equal(await page.locator('script[src^="/_games/"]').count(), 0, path);
            const target = `/${locale}/nte/items`;
            const navigation = [];
            const listener = request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigation.push(new URL(request.url()).pathname); };
            page.on('request', listener);
            try {
              await page.locator(`main nav a[href="${target}"]`).last().click();
              await page.waitForURL(origin + target);
              assert(navigation.includes(target), `${path}: crossing to the dedicated list must request a document, not Main RSC`);
              // This local fixture hosts only Main; real owner selection is covered by Router tests.
              await page.goto(origin + path, { waitUntil: 'networkidle' });
            } finally { page.off('request', listener); }
          } else if (kind === 'market-intel-review') {
            const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Roco Global source review (unverified)', exact: true }) });
            assert.equal(await card.count(), 1, path);
            const text = await card.innerText();
            assert(text.includes('不是新的独立来源或官方测试公告'), path);
            assert(!/Quack Quack|October 27|10\/27|3688140|rocokingdom\.com/.test(text), path);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*nofollow/);
          } else if (kind === 'cn-home') {
            assert(!/Quack Quack|CBT/i.test(body), path);
            assert(!/CBT/i.test(await page.locator('meta[name="description"]').getAttribute('content')), path);
            assert(body.includes({ zh: '国际服入口是纠错说明，不是测试公告', en: 'the global link is a correction notice, not a test announcement', ja: '国際版へのリンクは訂正説明で、テスト告知ではありません' }[locale]), path);
            assert((await page.locator(`a[href="/${locale}/roco/version"]`).count()) > 0, path);
          } else if (kind === 'archive') {
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
          } else if (kind === 'roco-cn-tool') {
            assert.equal(await page.locator('[data-roco-public-review], [data-content-review]').count(), 0, path);
            assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), id === 'redeem-codes' ? 0 : 4, path);
            assert(!/noindex/.test(await page.locator('meta[name="robots"]').getAttribute('content') ?? ''), path);
            if (id === 'type-chart') {
              assert.equal(await page.locator('table tbody tr').count(), 12);
              assert.equal(await page.locator('table tbody td').count(), 144);
              assert.equal(await page.locator('table tbody tr').first().locator('td').nth(2).innerText(), '2x');
            } else if (id === 'eggs') assert.equal(await page.locator('main article').count(), 3);
            else if (id === 'merchant') assert.equal(await page.locator('main article').count(), 2);
            else if (id === 'weapons') assert.equal(await page.locator('main section > h2').filter({ hasText: /^\s*[345]★/ }).locator('..').locator('h3').count(), 10);
            else if (id === 'redeem-codes') {
              assert(body.includes({ zh: '兑换码', en: 'Redeem Codes', ja: '交換コード' }[locale]), path);
              assert.equal(await page.locator('main code').count() > 0, true, path);
            } else if (id === 'items') {
              assert((await page.locator(`main a[href^="/${locale}/roco-cn/items/"]`).count()) > 0, path);
              assert(!body.includes('Coming Soon'), path);
            } else {
              assert(body.includes({ zh: '幻影星光法杖', en: 'Phantom Starlight Staff', ja: 'Phantom Starlight Staff' }[locale]), path);
              assert(body.includes('5'), path);
            }
          } else if (kind === 'roco-public-review' || kind === 'roco-weapon-review') {
            const reviewId = kind === 'roco-weapon-review' ? 'weapons' : id;
            const copy = rocoPublicReview.pages[reviewId === 'home' ? '' : reviewId][locale];
            const article = page.locator(`[data-roco-public-review="${reviewId}"]`);
            assert.equal(await article.count(), 1, path);
            assert.equal(await article.locator('h1').innerText(), copy.title);
            const text = await article.innerText();
            for (const line of [copy.description, ...copy.checks]) assert(text.includes(line), `${path}: missing scoped correction text`);
            assert.equal(await article.locator('[data-content-review]').count(), 1, path);
            assert.equal(await article.locator('[data-review-navigation] a').count(), 3, path);
            assert.equal(await article.locator('a[href^="http"], table, img, button').count(), 0, 'Do not endorse external downloads or render provisional rankings');
            if (kind === 'roco-weapon-review') {
              assert.equal(await article.locator('[data-legacy-weapon-id]').getAttribute('data-legacy-weapon-id'), id);
              assert((await article.innerText()).includes(rocoPublicReview.navigation[locale].legacyId));
            }
            for (const route of reviewedTools) {
              const link = page.locator(`nav a[href="/${locale}/roco/${route}"]`);
              assert.equal(await link.count(), 1, path);
              assert((await link.innerText()).endsWith(rocoPublicReview.navigation[locale].reviewSuffix), path);
            }
            assert.equal(await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.filter(node => /"(?:Product|VideoGame)"/.test(node.textContent ?? '')).length), 0, path);
            assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), 0, path);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*follow/);
            assert((await page.title()).includes(copy.title), path);
            assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), copy.description, path);
            assert(!/10\/27|10\/20|2026-10-27|3688140|400\+/.test(body), path);
            if (id === 'redeem-codes') {
              for (const text of [body, await page.title(), await page.locator('meta[name="description"]').getAttribute('content'), ...await page.locator('script[type="application/ld+json"]').allTextContents()]) {
                assert(!/2026-09-07|2026-10-27|rocokingdom\.com|CBT eligibility email|Pre-registration milestones|Steam \/ Epic \/ Microsoft Store/.test(text), path);
              }
              assert.equal(await article.locator('code').count(), 0, path);
            }
            assert(await article.evaluate(node => node.scrollWidth <= node.clientWidth), `${path}: review content overflows`);
          } else if (kind.startsWith('roco-reviewed-')) {
            const row = (kind === 'roco-reviewed-guide' ? rocoGuides : rocoCharacters).find(row => row.id === id);
            const suffix = { zh: '', en: 'En', ja: 'Ja' }[locale];
            assert.equal(await page.locator('h1').innerText(), kind === 'roco-reviewed-guide' ? row[`title${suffix}`] : `${{ zh: '历史条目', en: 'Legacy entry', ja: '過去の項目' }[locale]} · ${id}`);
            assert.equal(await page.locator('[data-content-review]').count(), 1);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*follow/);
            assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(), 0);
            const forbidden = /10\/27|10\/20|Oct(?:ober)? 27|Oct(?:ober)? 20|10月27|10月20|2026-10-27|2026-10-20|3688140|400\+|★★★★/;
            for (const text of [body, await page.title(), await page.locator('meta[name="description"]').getAttribute('content'), ...await page.locator('script[type="application/ld+json"]').allTextContents()]) assert(!forbidden.test(text), `${path}: withdrawn claim remains: ${text.slice(0, 180)}`);
            const article = page.locator('main');
            if (kind === 'roco-reviewed-guide') {
              if (row.contentReview.kind === 'editorial_proposal_archive') {
                assert.equal(await page.locator('[data-content-review]').getAttribute('data-content-review'), 'editorial_proposal_archive', path);
                assert(body.includes({ zh: '非官方编辑设想归档', en: 'Unofficial editorial proposal archive', ja: '非公式の編集提案アーカイブ' }[locale]), path);
                assert(await page.locator('[data-content-review]').evaluate(node => node.scrollWidth <= node.clientWidth), `${path}: archive notice overflows`);
                if (locale === 'ja') assert.equal(await article.getByText(row.categoryEn, { exact: true }).count(), 0, `${path}: archive breadcrumb must not fall back to English`);
              }
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
              assert.equal(await article.locator('[data-roco-character-review]').getAttribute('data-roco-character-review'), id);
              assert.equal(await article.locator('img, table, button').count(), 0, path);
              assert.equal(await page.locator('meta[property="og:image"]').count(), 0, path);
              assert(body.includes({ zh: '使用权', en: 'usage rights', ja: '利用権' }[locale]), path);
              const archived = archivedCharacters.find(entry => entry.id === id);
              assert(archived?.name && archived?.nameEn, `${path}: missing archived negative assertion inputs`);
              for (const name of [archived.name, archived.nameEn, archived.nameJa].filter(Boolean)) assert(!body.includes(name), `${path}: unverified name ${name}`);
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
              if (section === 'characters') {
                assert.equal(await card.locator('img').count(), 0, path);
                assert.equal(await card.locator('[data-review-card-portrait]').count(), 1, path);
                assert((await card.innerText()).includes(`${{ zh: '历史条目', en: 'Legacy entry', ja: '過去の項目' }[locale]} · ${row.id}`), path);
              }
              if (section === 'guides') {
                const kind = row.contentReview.kind === 'editorial_proposal_archive' ? 'editorial_proposal_archive' : 'verification_checklist';
                for (const node of await card.all()) assert.equal(await node.locator(`[data-guide-review="${kind}"]`).count(), 1, `${path}: missing publication kind for ${row.id}`);
                if (kind === 'editorial_proposal_archive') assert.equal(await card.count(), 1, `${path}: do not feature archived product proposals`);
              }
            }
          } else if (kind.startsWith('roco-')) {
            const forbidden = /10\/27|10\/20|Oct(?:ober)? 27|Oct(?:ober)? 20|10月27|10月20|2026-10-27|2026-10-20|3688140/;
            if (kind === 'roco-home') {
              assert.equal(await page.locator(`main a[href^="/${locale}/roco/characters/"]`).count(), 0, path);
              assert.equal(await page.locator('img[src*="/images/roco/characters/"]').count(), 0, path);
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
          observations.browser.push({ path, width, status: 200, kind, errors: 0, failedAssets: 0,
            ...(kind === 'nte-main-item' ? { dedicatedListDocumentNavigationVerified: true } : {}) });
          if (directory && locale === 'zh' && kind !== 'backport') {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.waitForFunction(() => window.scrollY === 0);
            await page.screenshot({ path: resolve(directory, `${kind}${id ? `-${id.replaceAll('/', '-')}` : ''}-${width}.png`), fullPage: kind.startsWith('roco-reviewed-') || kind === 'roco-public-review' || kind === 'roco-weapon-review' });
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
          if (kind === 'roco-public-review' && reviewedTools.includes(id)) {
            const target = reviewedTools[(reviewedTools.indexOf(id) + 1) % reviewedTools.length];
            const href = `/${locale}/roco/${target}`;
            await page.locator(`nav a[href="${href}"]`).click();
            await page.waitForURL(origin + href);
            await page.waitForSelector(`[data-roco-public-review="${target}"]`);
            assert.equal(await page.locator('h1').innerText(), rocoPublicReview.pages[target][locale].title);
            assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://gachia.com${href}`);
            assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,\s*follow/);
            assert.deepEqual(errors, [], href);
            observations.browser.at(-1).reviewNavigationVerified = true;
          }
        }
        for (const path of ['/en/roco-cn', '/en/roco-cn/guides', '/en/roco-cn/guides/starter-guide-cn']) {
          assert.equal((await page.goto(origin + path, { waitUntil: 'networkidle' })).status(), 200);
          assert.equal(await page.locator(`a[href="/en/roco-cn/guides/${SLUG}"]`).count(), 0, path);
        }
        assert.equal((await page.goto(`${origin}/en/roco-cn/guides/${SLUG}`, { waitUntil: 'domcontentloaded' })).status(), 404);
        for (const locale of ['zh', 'en', 'ja']) {
          for (const id of ['not-a-record', `${rocoCharacters[0].id}/extra`]) {
            const path = `/${locale}/roco/characters/${id}`;
            assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 404, path);
            observations.browser.push({ path, width, status: 404, kind: 'roco-unknown-character' });
          }
          for (const id of ['not-a-record', `${legacyWeaponIds[0]}/extra`]) {
            const path = `/${locale}/roco/weapons/${id}`;
            assert.equal((await page.goto(origin + path, { waitUntil: 'domcontentloaded' })).status(), 404, path);
            observations.browser.push({ path, width, status: 404, kind: 'roco-unknown-weapon' });
          }
        }
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
    record.indexnowTransport = verifyNoLegacyIndexNowTransport(resolve(ROOT, 'apps/web/.open-next'));
    record.withdrawnAssets = verifyWithdrawnRocoAssets(resolve(ROOT, 'apps/web/.open-next'));
    const configPath = resolve(directory, 'wrangler.json');
    const config = localFixtureConfig('web', ROOT);
    config.vars.INDEXNOW_AUTH_TOKEN = INDEXNOW_FIXTURE_TOKEN;
    writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
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
