import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { parseArguments, readReleasePlan, verifyBuiltIndexing } from './game-release.mjs';
import { verifyLocalWorker, verifyOrigin } from './game-release-smoke.mjs';
import { verifyAppRuntime } from './require-app-runtime.mjs';

const ROOT = resolve(import.meta.dirname, '..');

export async function verifyBrowser(plan, origin) {
  const address = new URL(origin);
  assert.equal(address.hostname, '127.0.0.1');
  assert.equal(address.protocol, 'http:');
  const browser = await chromium.launch({ headless: true });
  const observations = [];
  const cases = ['desktop', 'mobile'].flatMap(viewport => [
    ...['zh', 'en', 'ja'].map(locale => ({ viewport, locale, mode: 'interactive' })),
    { viewport, locale: 'zh', mode: 'delayed_scripts' },
    ...['zh', 'en', 'ja'].map(locale => ({ viewport, locale, mode: 'no_javascript' })),
  ]);
  try {
    for (const scenario of cases) {
      const context = await browser.newContext({
        viewport: scenario.viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        javaScriptEnabled: scenario.mode !== 'no_javascript',
        serviceWorkers: 'block',
      });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [];
        const prefetches = [];
        const failedAssets = [];
        let delayedScripts = 0;
        await context.route('**/*', async route => {
          const request = route.request();
          if (new URL(request.url()).origin !== address.origin) return route.abort('blockedbyclient');
          if (scenario.mode === 'delayed_scripts' && request.resourceType() === 'script') {
            delayedScripts++;
            await new Promise(resolveDelay => setTimeout(resolveDelay, 1000));
          }
          return route.continue();
        });
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
          if (message.type() === 'error' && /hydration|Minified React error|uncaught/i.test(message.text())) errors.push(message.text());
        });
        page.on('request', request => {
          const headers = request.headers();
          if (headers['next-router-prefetch'] || headers['next-router-segment-prefetch']) prefetches.push(new URL(request.url()).pathname);
        });
        page.on('response', response => {
          if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) failedAssets.push(response.url());
        });
        const path = `/${scenario.locale}/${plan.game}/characters`;
        const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        assert.equal(response.status(), 200);
        await expect(page.locator('h1')).toBeVisible();
        const selector = plan.game === 'nte' ? '.character-directory .card' : 'main > section.grid .card';
        const cards = page.locator(selector);
        const initialCount = await cards.count();
        assert(initialCount > 1, 'Character directory must render actual cards');
        if (scenario.mode !== 'no_javascript') {
          // DOMContentLoaded does not imply async Next chunks have hydrated the
          // controls. Test post-hydration interaction, including delayed chunks.
          await page.waitForLoadState('networkidle');
          // Exercise real client state before navigation, not just server HTML.
          if (plan.game === 'nte') {
            const search = page.locator('.character-directory input');
            await search.fill('__no_matching_character__');
            await expect(cards).toHaveCount(0);
            await search.fill('');
          } else {
            const select = page.locator('.filter-bar select').first();
            const value = await select.locator('option').nth(1).getAttribute('value');
            await select.selectOption(value);
            await expect.poll(() => cards.count()).toBeLessThan(initialCount);
            await select.selectOption('all');
          }
          await expect(cards).toHaveCount(initialCount);
          const href = await cards.first().getAttribute('href');
          await page.evaluate(() => { window.__runtimeNavigationMarker = 'same-document'; });
          await cards.first().hover();
          await cards.first().click();
          await expect(page).toHaveURL(`${origin}${href}`);
          await expect(page.locator('h1')).toBeVisible();
          assert.equal(await page.evaluate(() => window.__runtimeNavigationMarker), 'same-document', 'Link navigation must preserve the document');
          await page.goBack();
          await expect(page).toHaveURL(`${origin}${path}`);
          await expect(cards).toHaveCount(initialCount);
          if (scenario.mode === 'delayed_scripts') assert(delayedScripts > 0, 'Delayed hydration scenario must actually delay scripts');
        }
        assert.deepEqual(errors, [], 'No uncaught or hydration errors');
        assert.deepEqual(failedAssets, [], 'No failed local JS/CSS responses');
        observations.push({ ...scenario, path, serverRenderedCards: initialCount, delayedScripts, prefetchRequests: prefetches.length, clientInteraction: scenario.mode !== 'no_javascript', hydrationErrors: errors.length, failedAssets: failedAssets.length });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return { status: 'local_browser_verified', browser: 'chromium', observations, cloudVerification: 'not_performed', scope: 'reading_filters_navigation_not_full_app_or_authentication_acceptance' };
}

async function main() {
  const options = parseArguments(['plan', ...process.argv.slice(2)]);
  const plan = readReleasePlan(options);
  const directory = resolve(ROOT, '.release-records');
  mkdirSync(directory, { recursive: true });
  const lock = resolve(directory, `${plan.game}.lock`);
  writeFileSync(lock, JSON.stringify({ pid: process.pid, action: 'browser_verification' }), { flag: 'wx', mode: 0o600 });
  try {
    const runtimePolicy = verifyAppRuntime(resolve(ROOT, plan.app));
    const indexing = verifyBuiltIndexing(plan);
    const result = await verifyLocalWorker(plan, ROOT, { verify: async (plan, origin) => ({ http: await verifyOrigin(plan, origin), browser: await verifyBrowser(plan, origin) }) });
    const path = resolve(directory, `runtime-browser-${plan.game}-${plan.environment}.json`);
    writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, at: new Date().toISOString(), game: plan.game, environment: plan.environment, runtimePolicy, indexing, ...result }, null, 2)}\n`);
    console.log(`Local browser verification saved: ${path}`);
  } finally { unlinkSync(lock); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
