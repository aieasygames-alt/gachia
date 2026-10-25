import assert from 'node:assert/strict';
import http from 'node:http';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { sha256 } from './live-owner-artifact.mjs';
import { wildcardRobotsAllows } from './runtime-rollout-smoke.mjs';
import { localBrowserProxy } from './game-staging-acceptance.mjs';

export function sitemapLocations(xml) {
  assert(Buffer.byteLength(xml) <= 1024 * 1024, 'XML byte budget');
  return JSON.parse(execFileSync('python3', ['-B', '-c', `import sys,json,xml.etree.ElementTree as E
s=sys.stdin.read()
assert '<!DOCTYPE' not in s.upper() and '<!ENTITY' not in s.upper()
n='{http://www.sitemaps.org/schemas/sitemap/0.9}'
r=E.fromstring(s)
assert r.tag==n+'urlset'
a=[]
for x in r:
 assert x.tag==n+'url' and len(x.findall(n+'loc'))==1
 a.append(x.find(n+'loc').text)
assert a and len(a)==len(set(a))
print(json.dumps(sorted(a)))`], { input: xml, encoding: 'utf8' }));
}

const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
const japanese = (s, min) => typeof s === 'string' && Array.from(s.trim()).length >= min && /[\u3040-\u30ff]/.test(s);
export function nteJapaneseGuideIndexable(guide) {
  return japanese(guide?.titleJa, 8) && japanese(guide?.summaryJa, 40) && japanese(guide?.contentJa, 200);
}

export function validateAcceptanceOrigin(game, origin, phase) {
  assert(['nte', 'lvmeng'].includes(game));
  assert(['local', 'preview', 'production'].includes(phase));
  const url = new URL(origin);
  assert.equal(url.origin, origin, 'Origin only, no path or credentials');
  if (phase === 'production') assert.equal(origin, 'https://gachia.com');
  else if (phase === 'local') assert(url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port);
  else assert(new RegExp(`^https://[a-f0-9]{8}-gachia-game-${game}\\.aieasygames\\.workers\\.dev$`).test(origin), 'Exact version preview only');
}

export function missingSectionExpectation(game, phase) {
  assert(['nte', 'lvmeng'].includes(game) && ['local', 'preview', 'production'].includes(phase));
  // Main's existing NTE allowlist redirects unsupported sections to the hub.
  // This is not the dedicated character-detail 404 contract.
  return game === 'nte' && phase === 'production'
    ? { status: 301, location: '/zh/nte' } : { status: 404, location: null };
}

export async function acceptLiveOwner({ game, origin, phase, directory, artifactDirectory, manifest, previousSitemap, browsers = true }) {
  validateAcceptanceOrigin(game, origin, phase);
  const result = { game, phase, origin, startedAt: new Date().toISOString(), status: 'running', pages: [], assets: [], browsers: [], requests: 0 };
  const preview = phase === 'preview';
  const expected = sitemapLocations(readFileSync(resolve(artifactDirectory, 'candidate-sitemap.xml'), 'utf8'));
  assert.equal(expected.length, game === 'nte' ? 389 : 27);
  assert.deepEqual(expected, sitemapLocations(previousSitemap), 'Unapproved sitemap URL change');
  const guides = game === 'nte' ? JSON.parse(readFileSync(new URL('../packages/data/games/nte/raw-guides.json', import.meta.url))) : [];
  const jaAllowed = guides.filter(nteJapaneseGuideIndexable).map(g => `/ja/nte/guides/${g.id}`);
  async function get(path, { status = 200, target = origin, host, owner = true } = {}) {
    assert(++result.requests <= 2500, 'HTTP request budget');
    assert(path.startsWith('/') && !path.startsWith('//'));
    const url = new URL(path, target);
    assert.equal(url.origin, target);
    const response = host ? await new Promise((done, fail) => {
      assert.equal(phase, 'local');
      const req = http.get(url, { headers: { Host: host } }, res => {
        const parts = []; let total = 0;
        res.on('data', bytes => { total += bytes.length; if (total > 8 * 1024 * 1024) req.destroy(new Error('Host response budget')); else parts.push(bytes); });
        res.on('end', () => done(new Response(Buffer.concat(parts), { status: res.statusCode, headers: res.headers })));
        res.on('error', fail);
      });
      req.setTimeout(30000, () => req.destroy(new Error('Host probe timeout'))); req.on('error', fail);
    }) : await fetch(url, { method: 'GET', redirect: 'manual', credentials: 'omit', headers: { 'X-Gachia-Route-Debug': '1' }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, status, `${game} ${path}: HTTP`);
    if (phase === 'production' && target === origin && owner) assert.equal(response.headers.get('x-gachia-route-target'), game, `${path}: owner`);
    const reader = response.body.getReader(), parts = []; let total = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; assert(total <= 8 * 1024 * 1024, 'Response byte budget'); parts.push(Buffer.from(value)); } }
    finally { await reader.cancel(); }
    const bytes = Buffer.concat(parts);
    return { response, bytes, text: bytes.toString() };
  }
  try {
    const sitemap = await get(phase === 'production' ? `/sitemaps/${game}/index.xml` : '/sitemap.xml');
    assert.match(sitemap.response.headers.get('content-type') ?? '', /xml/);
    assert.deepEqual(sitemapLocations(sitemap.text), expected);
    assert.equal(/noindex/i.test(sitemap.response.headers.get('x-robots-tag') ?? ''), preview);
    result.sitemap = { urls: expected.length, unchangedUrlSet: true, sha256: sha256(sitemap.bytes) };
    const robots = await get('/robots.txt', { owner: phase !== 'production' });
    assert.equal(wildcardRobotsAllows(robots.text, `/zh/${game}`), !preview);
    if (phase === 'local') {
      result.previewHost = [];
      for (const path of ['/robots.txt', '/sitemap.xml', `/zh/${game}`, `/zh/${game}/characters/release-missing`]) {
        const r = await get(path, { status: path.endsWith('release-missing') ? 404 : 200, host: `1234abcd-gachia-game-${game}.aieasygames.workers.dev` });
        assert.match(r.response.headers.get('x-robots-tag') ?? '', /noindex/);
        if (path === '/robots.txt') assert.equal(wildcardRobotsAllows(r.text, `/zh/${game}`), false);
        result.previewHost.push({ path, status: r.response.status, noindex: true });
      }
    }
    const pages = [...new Set([...expected.map(u => new URL(u).pathname), ...(game === 'nte' ? expected.filter(u => u.includes('/zh/nte')).map(u => new URL(u).pathname.replace('/zh/', '/ja/')) : [])])].sort();
    let next = 0;
    await Promise.all([0, 1].map(async () => { while (next < pages.length) {
      const path = pages[next++];
      assert(new RegExp(`^/(zh|en|ja)/${game}(?:/|$)`).test(path));
      const page = await get(path);
      assert.match(page.response.headers.get('content-type') ?? '', /text\/html/);
      assert.match(page.text, /<h1\b/);
      const canonical = decode(page.text.match(/<link\b(?=[^>]*rel="canonical")[^>]*href="([^"]+)"/i)?.[1] ?? '');
      assert.equal(canonical, `https://gachia.com${path}`, `${path}: canonical`);
      const noindex = /<meta\b(?=[^>]*name="robots")(?=[^>]*content="[^"]*noindex)[^>]*>/i.test(page.text);
      assert.equal(noindex, game === 'nte' && path.startsWith('/ja/') && !jaAllowed.includes(path), `${path}: meta indexing`);
      assert.equal(/noindex/i.test(page.response.headers.get('x-robots-tag') ?? ''), preview, `${path}: header indexing`);
      assert(!page.text.includes('.workers.dev'), `${path}: preview hostname leak`);
      for (const match of page.text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
      const alternates = Object.fromEntries([...page.text.matchAll(/<link\b(?=[^>]*hrefLang="([^"]+)")[^>]*href="([^"]+)"/gi)].map(m => [m[1], decode(m[2])]));
      if (game === 'lvmeng') assert.deepEqual(alternates, {}, `${path}: Chinese-only`);
      else {
        const suffix = path.replace(/^\/(zh|en|ja)\/nte/, '');
        const wanted = { 'zh-Hans': `https://gachia.com/zh/nte${suffix}`, en: `https://gachia.com/en/nte${suffix}`, 'x-default': `https://gachia.com/zh/nte${suffix}` };
        if (jaAllowed.includes(`/ja/nte${suffix}`)) wanted.ja = `https://gachia.com/ja/nte${suffix}`;
        assert.deepEqual(alternates, wanted, `${path}: language alternates`);
      }
      result.pages.push({ path, status: 200, canonical, noindex });
    } }));
    for (const file of manifest.entries.filter(e => e.type === 'file' && e.path.startsWith('.open-next/assets/_next/static/'))) {
      const relative = file.path.slice('.open-next/assets/_next/static/'.length).split('/').map(encodeURIComponent).join('/');
      for (const raw of [false, true]) {
        const path = (raw ? '/_next/static/' : `/_games/${game}/_next/static/`) + relative;
        const target = phase === 'production' && raw ? `https://gachia-game-${game}.aieasygames.workers.dev` : origin;
        const asset = await get(path, { target });
        assert.equal(asset.bytes.length, file.bytes); assert.equal(sha256(asset.bytes), file.sha256, path);
        assert.match(asset.response.headers.get('content-type') ?? '', path.endsWith('.css') ? /text\/css/ : /javascript|font|octet-stream/);
        result.assets.push({ path, target, bytes: file.bytes, sha256: file.sha256 });
      }
    }
    await get(`/zh/${game}/characters/release-missing`, { status: 404 });
    const missingPolicy = missingSectionExpectation(game, phase);
    const missingSection = await get(`/zh/${game}/__release_missing__`, { status: missingPolicy.status, owner: phase !== 'production' });
    assert.equal(missingSection.response.headers.get('location'), missingPolicy.location);
    if (phase === 'production') assert.equal(missingSection.response.headers.get('x-gachia-route-target'), null, 'Unknown section belongs to Main');
    result.missingSection = { owner: phase === 'production' ? 'main' : game, ...missingPolicy };
    if (game === 'lvmeng') for (const lang of ['en', 'ja']) await get(`/${lang}/lvmeng`, { status: 404, owner: phase !== 'production' });
    if (browsers) result.browsers = await acceptBrowser({ game, origin, phase, directory });
    result.status = 'candidate_acceptance_passed';
    return result;
  } catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
  finally { result.finishedAt = new Date().toISOString(); appendFileSync(resolve(directory, 'acceptance.jsonl'), JSON.stringify(result) + '\n'); }
}

async function acceptBrowser({ game, origin, phase, directory }) {
  const browser = await chromium.launch({ headless: true, proxy: phase === 'local' ? undefined : localBrowserProxy(process.env.STAGING_CHECK_PROXY) });
  const observations = []; let requests = 0;
  try {
    for (const width of [1440, 390]) for (const locale of game === 'nte' ? ['zh', 'en', 'ja'] : ['zh']) for (const mode of ['interactive', 'delayed_scripts', 'no_javascript']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no_javascript', serviceWorkers: 'block' });
      try {
        const page = await context.newPage(), errors = [], failures = [], intentional = [], accountRequests = [];
        page.setDefaultTimeout(25000);
        await context.route('**/*', async route => {
          const request = route.request();
          if (new URL(request.url()).origin !== origin) return route.abort('blockedbyclient');
          assert(['GET', 'HEAD'].includes(request.method()), 'Unexpected browser write');
          if (++requests > 4000) return route.abort('blockedbyclient');
          if (mode === 'delayed_scripts' && request.resourceType() === 'script') await new Promise(r => setTimeout(r, 300));
          return route.continue();
        });
        const log = event => appendFileSync(resolve(directory, 'browser-events.jsonl'), JSON.stringify({ at: new Date().toISOString(), game, width, locale, mode, ...event }) + '\n');
        page.on('pageerror', e => { errors.push(e.message); log({ type: 'pageerror', message: e.message }); });
        page.on('console', m => { if (m.type() === 'error' && /hydration|Minified React error|uncaught/i.test(m.text())) errors.push(m.text()); });
        page.on('request', r => { if (/^\/api\/(auth(?:\/|$)|favorites$|user-characters$|map\/progress$|shared-builds$)/.test(new URL(r.url()).pathname)) accountRequests.push(r.url()); });
        page.on('response', r => { if (['script', 'stylesheet'].includes(r.request().resourceType()) && r.status() >= 400) { failures.push(r.url()); log({ type: 'http-error', url: r.url(), status: r.status() }); } });
        page.on('requestfailed', r => {
          if (new URL(r.url()).origin !== origin || !['script', 'stylesheet'].includes(r.resourceType())) return;
          const reason = r.failure()?.errorText ?? ''; log({ type: 'requestfailed', url: r.url(), reason });
          if (mode === 'no_javascript' && r.resourceType() === 'script' && reason === 'csp') intentional.push(r.url()); else failures.push(r.url());
        });
        const path = game === 'nte' ? `/${locale}/nte/characters` : '/zh/lvmeng/launch-check';
        const response = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 60000 });
        assert.equal(response.status(), 200); await expect(page.locator('h1')).toBeVisible();
        if (mode !== 'no_javascript') {
          if (game === 'nte') {
            const cards = page.locator('.character-directory .card'), input = page.locator('.character-directory input'), count = await cards.count(); assert(count > 1);
            await input.fill('__missing__'); await expect(cards).toHaveCount(0); await input.fill(''); await expect(cards).toHaveCount(count);
            const link = cards.first(), href = await link.getAttribute('href'); assert(href.startsWith(`/${locale}/nte/characters/`));
            await page.evaluate(() => { window.__sameDocument = 'yes'; }); await link.click(); await expect(page).toHaveURL(origin + href); await page.waitForLoadState('networkidle');
            assert.equal(await page.evaluate(() => window.__sameDocument), 'yes'); await expect(page.locator('h1')).toBeVisible();
          } else {
            for (const [suffix, selector, key] of [['launch-check', '.launch-board', 'gachia-lvmeng-launch-verification-v1'], ['progression', '.verification-checklist', 'gachia-lvmeng-progression-verification-v1']]) {
              await page.goto(origin + `/zh/lvmeng/${suffix}`, { waitUntil: 'networkidle' });
              const checkbox = page.locator(`${selector} input[type=checkbox]`).first(); await checkbox.check(); await page.reload({ waitUntil: 'networkidle' }); await expect(checkbox).toBeChecked();
              const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); assert(saved.length > 0);
              const seed = [...saved, 'future-task-id']; await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key, seed });
              await page.reload({ waitUntil: 'networkidle' }); await expect(checkbox).toBeChecked(); assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), seed);
              if (mode === 'interactive') {
                for (const raw of ['null', '{}', '"bad"', '{']) { await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw }); await page.reload({ waitUntil: 'networkidle' }); await expect(checkbox).not.toBeChecked(); }
              }
            }
            if (mode === 'interactive') for (const method of ['setItem', 'getItem']) {
              await context.addInitScript(method => { Storage.prototype[method] = function () { throw new DOMException('storage fixture', 'SecurityError'); }; }, method);
              for (const [suffix, selector] of [['launch-check', '.launch-board'], ['progression', '.verification-checklist']]) {
                await page.goto(origin + `/zh/lvmeng/${suffix}`, { waitUntil: 'networkidle' });
                await expect(page.locator(`${selector} [role=status]`)).toBeVisible();
                const checkbox = page.locator(`${selector} input[type=checkbox]`).first(); const before = await checkbox.isChecked(); await checkbox.click(); assert.equal(await checkbox.isChecked(), !before);
              }
            }
          }
        }
        assert.deepEqual(errors, [], `${game}/${width}/${locale}/${mode}: browser errors`);
        assert.deepEqual(failures, [], `${game}/${width}/${locale}/${mode}: failed assets`);
        assert.deepEqual(accountRequests, [], 'Account polling must remain disabled'); assert(requests <= 4000);
        if (mode === 'interactive' && locale === 'zh') await page.screenshot({ path: resolve(directory, `${game}-${width}.png`) });
        observations.push({ width, locale, mode, errors: 0, failedAssets: 0, intentionalDisabledScripts: intentional.length, accountRequests: 0 });
      } finally { await context.close(); }
    }
    return observations;
  } finally { await browser.close(); }
}
