import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { verifyLocalWorker } from './game-release-smoke.mjs';
import { sitemapLocations } from './live-owner-acceptance.mjs';

// Local compiled production Worker only; this command cannot upload or promote it.
const root = resolve(import.meta.dirname, '..');
const output = process.argv[2];
assert(output && process.argv.length === 3, 'Usage: node scripts/azur-runtime-guard-smoke.mjs OUTPUT.json');
const expected = sitemapLocations(readFileSync(resolve(root, 'apps/game-azur-promilia/.next/server/app/sitemap.xml.body'), 'utf8'));
const result = { status: 'running', hosts: [], pages: [], assets: [], browsers: [] };

function request(origin, path, host, forwardedHost) {
  return new Promise((done, fail) => {
    const req = http.get(new URL(path, origin), { headers: { Host: host, ...(forwardedHost ? { 'X-Forwarded-Host': forwardedHost } : {}) } }, res => {
      const parts = []; let size = 0;
      res.on('data', bytes => { size += bytes.length; if (size > 8 * 1024 * 1024) req.destroy(new Error('Response budget')); else parts.push(bytes); });
      res.on('error', fail);
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts).toString() }));
    });
    req.setTimeout(30000, () => req.destroy(new Error('Request timeout')));
    req.on('error', fail);
  });
}

try {
  await verifyLocalWorker({ app: 'apps/game-azur-promilia', wranglerEnvironment: '', buildEnvironment: { AZUR_PROMILIA_DEPLOYMENT_MODE: 'production' } }, root, {
    verify: async (_, origin) => {
      for (const host of ['gachia.com', 'gachia-game-azur-promilia.aieasygames.workers.dev', '1234abcd-gachia-game-azur-promilia.aieasygames.workers.dev', 'gachia-game-azur-promilia-staging.aieasygames.workers.dev']) {
        const preview = host !== 'gachia.com';
        for (const path of ['/robots.txt', '/sitemap.xml', '/zh/azur-promilia', '/zh/azur-promilia/characters/release-missing']) {
          const r = await request(origin, path, host, preview ? 'gachia.com' : 'fake.workers.dev');
          assert.equal(r.status, path.endsWith('release-missing') ? 404 : 200, `${host}${path}`);
          assert.equal(/noindex/i.test(r.headers['x-robots-tag'] ?? ''), preview, `${host}${path}: header`);
          if (path === '/robots.txt') {
            assert.match(r.body, preview ? /Disallow: \/\s/ : /Allow: \/\s/);
            if (!preview) assert.match(r.body, /Sitemap: https:\/\/gachia.com\/sitemaps\/azur-promilia\/index.xml/);
          }
          if (path === '/sitemap.xml') assert.deepEqual(sitemapLocations(r.body), expected);
          if (path === '/zh/azur-promilia') assert.match(r.body, /rel="canonical" href="https:\/\/gachia.com\/zh\/azur-promilia"/);
          result.hosts.push({ host, path, status: r.status, noindex: preview });
        }
      }
      const assets = new Set();
      for (const url of expected) {
        const path = new URL(url).pathname;
        const r = await request(origin, path, 'gachia.com');
        assert.equal(r.status, 200, path);
        assert(!/noindex/i.test(r.headers['x-robots-tag'] ?? ''), path);
        assert(r.body.includes(`rel="canonical" href="${url}"`), `${path}: canonical`);
        for (const match of r.body.matchAll(/(?:src|href)="(\/_games\/azur-promilia\/_next\/[^"?]+)/g)) assets.add(match[1]);
        result.pages.push(path);
      }
      assert(assets.size > 0, 'Expected isolated static assets');
      for (const path of assets) {
        const r = await request(origin, path, 'gachia.com');
        assert.equal(r.status, 200, path);
        assert(!/text\/html/i.test(r.headers['content-type'] ?? ''), `${path}: asset fallback`);
        result.assets.push(path);
      }
      const browser = await chromium.launch({ headless: true });
      try {
        for (const width of [390, 1440]) for (const locale of ['zh', 'en', 'ja']) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          const response = await page.goto(`${origin}/${locale}/azur-promilia`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          assert(await page.locator('h1').count() > 0);
          assert.deepEqual(errors, [], 'Browser runtime errors');
          result.browsers.push({ width, locale, status: 'passed' });
          await page.close();
        }
      } finally { await browser.close(); }
    },
  });
  result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.error = error.stack; throw error;
} finally {
  writeFileSync(resolve(output), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ status: result.status, hosts: result.hosts.length, pages: result.pages.length, assets: result.assets.length, browsers: result.browsers.length }));
