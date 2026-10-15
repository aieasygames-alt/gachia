import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('real React auth dialog ignores stale results and permits retry after returned errors', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url)); const web = resolve(root, 'apps/web');
  const { build } = createRequire(import.meta.url)(resolve(root, 'node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'));
  const bundled = await build({ write: false, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' }, alias: { '@': web },
    stdin: { resolveDir: web, loader: 'tsx', contents: `
      import React, { useState } from 'react'; import { createRoot } from 'react-dom/client';
      import { AuthDialog } from './components/auth/auth-dialog';
      import { SearchDialog } from './components/search/search-dialog';
      function Harness() { const [open,setOpen]=useState(false); const [search,setSearch]=useState(false);
        window.openAuth=()=>setOpen(true); window.openSearch=()=>setSearch(true);
        return <><button id="trigger" onClick={()=>setOpen(true)}>Login</button><AuthDialog open={open} onClose={()=>setOpen(false)}/><SearchDialog locale="en" open={search} onClose={()=>setSearch(false)}/></>; }
      createRoot(document.querySelector('#root')).render(<Harness/>);
    ` }, plugins: [{ name: 'mock-auth', setup(builder) {
      builder.onLoad({ filter: /\/search-dataset\.ts$/ }, () => ({ loader: 'js', contents: 'export const loadSearchDataset = async () => ({});' }));
      builder.onLoad({ filter: /\/auth-client\.ts$/ }, () => ({ loader: 'js', contents: `
        export const signIn = { social: () => new Promise((resolve,reject) => {
          (window.requests ||= []).push({resolve,reject});
        }) };
      ` }));
    } }] });
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } }); const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setContent('<body style="overflow:scroll"><main id="root"></main></body>');
      await page.addScriptTag({ content: bundled.outputFiles[0].text });
      await page.locator('#trigger').click();
      await page.getByRole('button', { name: '使用 Google 登录', exact: true }).click();
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
      await page.locator('#trigger').click();
      await page.getByRole('button', { name: '使用 Google 登录', exact: true }).click();
      await page.evaluate(() => window.requests[0].reject(new Error('old failure')));
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)));
      assert.equal(await page.getByRole('button', { name: '正在跳转...', exact: true }).isDisabled(), true);
      assert.equal(await page.getByRole('alert').count(), 0);
      await page.evaluate(() => window.requests[1].resolve({ error: { message: 'fixture' } }));
      await page.getByRole('alert').waitFor();
      await page.getByRole('button', { name: '使用 Google 登录', exact: true }).click();
      assert.equal(await page.getByRole('alert').count(), 0);
      await page.evaluate(() => window.requests[2].resolve({ data: {} }));
      await page.getByRole('button', { name: '使用 Google 登录', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '使用 Google 登录', exact: true }).isEnabled(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'scroll');
      // Exercise real component listeners, not just the background ownership helper.
      for (const order of ['auth_first', 'search_first']) {
        await page.locator('#trigger').focus();
        await page.evaluate((order) => order === 'auth_first' ? window.openAuth() : window.openSearch(), order);
        await page.getByRole('dialog').waitFor();
        await page.evaluate((order) => order === 'auth_first' ? window.openSearch() : window.openAuth(), order);
        const topName = order === 'auth_first' ? 'Search' : '登录 Gachia';
        const underneathName = order === 'auth_first' ? '登录 Gachia' : 'Search';
        await page.getByRole('dialog', { name: topName, exact: true }).waitFor();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.closest('[role=dialog]')?.getAttribute('aria-label')), topName);
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: topName, exact: true }).waitFor({ state: 'detached' });
        await page.getByRole('dialog', { name: underneathName, exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
        assert.equal(await page.evaluate(() => document.activeElement.closest('[role=dialog]')?.getAttribute('aria-label')), underneathName);
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => document.body.style.overflow), 'scroll');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
