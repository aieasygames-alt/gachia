import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { digest } from './desktop-release-assets.mjs';

export async function verifyHomepageResponsive({ origin, directory }) {
  const url = new URL(origin);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:' && url.pathname === '/', 'Loopback origin required');
  directory = resolve(directory); mkdirSync(directory, { mode: 0o700 });
  const require = createRequire(new URL('../package.json', import.meta.url)), { chromium, expect } = require('@playwright/test');
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), observations = [];
  try {
    for (const width of [320, 390, 768, 1280]) for (const locale of ['zh', 'en', 'ja']) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768, locale });
      try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(url.origin + '/' + locale, { waitUntil: 'networkidle', timeout: 120000 });
        assert.equal(response.status(), 200);
        const layout = await page.evaluate(() => ({ innerWidth, documentWidth: document.documentElement.scrollWidth }));
        assert.equal(layout.innerWidth, width, 'Document inflated the mobile viewport');
        assert.equal(layout.documentWidth, width, 'Homepage content overflows horizontally');
        const label = { zh: '搜索', en: 'Search', ja: '検索' }[locale];
        await page.getByRole('button', { name: label, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: label, exact: true });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('textbox').fill('Hu Tao');
        await expect(dialog.locator(`[href="/${locale}/genshin/characters/hu-tao"]`)).toBeVisible({ timeout: 30000 });
        const bounds = await dialog.boundingBox();
        assert(bounds && bounds.x >= -0.5 && bounds.x + bounds.width <= width + 0.5, 'Search dialog extends outside the viewport');
        const screenshot = `${width}-${locale}.png`;
        await page.screenshot({ path: join(directory, screenshot) });
        await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
        assert.deepEqual(errors, [], 'Browser runtime errors');
        observations.push({ width, locale, layout, dialogBounds: bounds, screenshot, screenshotPin: digest(readFileSync(join(directory, screenshot))), errors });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  const result = { kind: 'homepage_responsive_browser_acceptance', observations, cloudWrites: false };
  const bytes = JSON.stringify(result, null, 2) + '\n';
  writeFileSync(join(directory, 'result.json'), bytes, { flag: 'wx', mode: 0o600 });
  return { directory, pin: digest(bytes), scenarios: observations.length };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  assert.equal(process.argv.length, 6, 'Usage: --origin <loopback-origin> --output <new-directory>');
  assert.equal(process.argv[2], '--origin'); assert.equal(process.argv[4], '--output');
  console.log(JSON.stringify(await verifyHomepageResponsive({ origin: process.argv[3], directory: process.argv[5] })));
}
