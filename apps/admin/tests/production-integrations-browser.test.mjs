import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

test('production integrations isolate origins and deduplicate real Next scripts on remount', {
  skip: process.env.WORKBENCH_BROWSER_TESTS !== '1',
}, async () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const web = resolve(root, 'apps/web');
  const { build } = createRequire(import.meta.url)(resolve(root, 'node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'));
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const mode of ['production', 'development']) {
      const bundle = await build({ write: false, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
        define: { 'process.env.NODE_ENV': JSON.stringify(mode) }, alias: { '@': web },
        stdin: { resolveDir: web, loader: 'tsx', contents: `
          import React, {useState} from 'react';
          import {createRoot} from 'react-dom/client';
          import {ProductionIntegrations} from './components/production-integrations';
          function Harness(){const [shown,setShown]=useState(true);window.toggle=setShown;
            return shown ? <ProductionIntegrations/> : null;}
          createRoot(document.querySelector('#root')).render(<Harness/>);
        ` } });
      for (const origin of ['https://gachia.com', 'https://gachia-staging.aieasygames.workers.dev', 'http://127.0.0.1:4317']) {
        for (const width of [1440, 390]) {
          const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
          const page = await context.newPage();
          const requests = []; const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          // Catch every request: even an unexpected provider can never reach the network.
          await context.route('**/*', async route => {
            const request = route.request();
            if (request.isNavigationRequest() && request.url() === `${origin}/`) {
              return route.fulfill({ contentType: 'text/html', body: '<html><head></head><body><main id="root"></main></body></html>' });
            }
            requests.push(request.url());
            await route.fulfill({ contentType: 'application/javascript', body: '/* intercepted provider fixture */' });
          });
          await page.goto(`${origin}/`);
          await page.addScriptTag({ content: bundle.outputFiles[0].text });
          const allowed = mode === 'production' && origin === 'https://gachia.com';
          if (allowed) await page.waitForFunction(() => window.dataLayer?.length === 2 && document.querySelector('#google-adsense'));
          await page.waitForTimeout(150);
          const expected = allowed ? 3 : 0;
          assert.equal(requests.length, expected, `${mode} ${origin} initial requests`);
          if (allowed) {
            assert.equal(requests.filter(url => url.startsWith('https://www.googletagmanager.com/')).length, 1);
            assert.equal(requests.filter(url => url.startsWith('https://www.clarity.ms/')).length, 1);
            assert.equal(requests.filter(url => url.startsWith('https://pagead2.googlesyndication.com/')).length, 1);
          }
          await page.evaluate(() => window.toggle(false));
          await page.waitForTimeout(50);
          await page.evaluate(() => window.toggle(true));
          await page.waitForTimeout(150);
          assert.equal(requests.length, expected, 'remount does not reload provider scripts');
          assert.equal(await page.evaluate(() => window.dataLayer?.length ?? 0), allowed ? 2 : 0, 'GA initialization is not duplicated');
          assert.deepEqual(errors, []);
          await context.close();
        }
      }
    }
  } finally { await browser.close(); }
});
