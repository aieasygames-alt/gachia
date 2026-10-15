import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('real React search loader transfers focus and ignores late imports after close', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const web = resolve(root, 'apps/web');
  const runtime = readdirSync(resolve(root, 'node_modules/.pnpm')).find((name) => name === 'esbuild@0.28.1');
  assert.ok(runtime, 'Installed test bundler required; do not download');
  const require = createRequire(import.meta.url);
  const { build } = require(resolve(root, 'node_modules/.pnpm', runtime, 'node_modules/esbuild'));
  const bundled = await build({ write: false, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' }, alias: { '@': web },
    stdin: { resolveDir: web, loader: 'tsx', contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SearchLoader } from './components/search/search-loader';
      import { AuthDialog } from './components/auth/auth-dialog';
      function Harness() {
        const [open, setOpen] = useState(false);
        const [auth, setAuth] = useState(false);
        window.setAuth = setAuth;
        window.setOpen = setOpen;
        return <><button id="trigger" onClick={() => setOpen(true)}>Search</button>
          <SearchLoader locale="en" open={open} onClose={() => setOpen(false)} />
          <AuthDialog open={auth} onClose={() => setAuth(false)} /></>;
      }
      createRoot(document.querySelector('#root')).render(<Harness />);
    ` }, plugins: [{ name: 'held-import', setup(builder) {
      builder.onLoad({ filter: /\/auth-client\.ts$/ }, () => ({ loader: 'js', contents: 'export const signIn = { social: async () => ({}) };' }));
      builder.onLoad({ filter: /\/search-module\.ts$/ }, () => ({ loader: 'js', contents: `
        export function loadSearchModule(load) {
          return new Promise((resolve, reject) => {
            window.heldLoads = (window.heldLoads || 0) + 1;
            window.releaseImport = () => load().then(resolve, reject);
          });
        }
      ` }));
    } }] });
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      await page.route('http://127.0.0.1:4317/**', (route) => route.fulfill({ contentType: 'text/html', body: '<body style="overflow:scroll"><main id="root"></main></body>' }));
      await page.goto('http://127.0.0.1:4317/');
      await page.route('**/data-manifest/**', (route) => route.fulfill({ contentType: 'application/json', body: '{"hi3":{"weapons":[]}}' }));
      await page.addScriptTag({ content: bundled.outputFiles[0].text });
      await page.locator('#trigger').click();
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Close');
      await page.evaluate(() => window.releaseImport());
      await page.getByRole('textbox').waitFor();
      assert.equal(await page.getByRole('textbox').evaluate((item) => item === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'scroll');
      await page.locator('#trigger').click(); await page.getByRole('textbox').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.heldLoads), 1);
      // Reset React state by remounting the page to exercise a cancelled first import.
      await page.reload(); await page.addScriptTag({ content: bundled.outputFiles[0].text });
      await page.locator('#trigger').click(); await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.evaluate(() => window.releaseImport());
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
      // A completed import must wait underneath the newer login owner.
      await page.reload(); await page.addScriptTag({ content: bundled.outputFiles[0].text });
      await page.locator('#trigger').click();
      await page.getByRole('dialog', { name: 'Preparing search', exact: true }).waitFor();
      await page.evaluate(() => window.setAuth(true));
      await page.getByRole('dialog', { name: '登录 Gachia', exact: true }).waitFor();
      await page.evaluate(() => window.releaseImport());
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      assert.equal(await page.getByRole('textbox').count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.closest('[role=dialog]')?.getAttribute('aria-label')), '登录 Gachia');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.closest('[role=dialog]')?.getAttribute('aria-label')), '登录 Gachia');
      await page.keyboard.press('Escape');
      await page.getByRole('textbox').waitFor();
      assert.equal(await page.getByRole('textbox').evaluate((item) => item === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'scroll');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
