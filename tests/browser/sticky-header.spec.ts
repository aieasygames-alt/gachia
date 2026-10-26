import { test, expect, type Page, type Request, type TestInfo } from '@playwright/test';

const locales = ['zh', 'en', 'ja'] as const;
const modes = ['normal', 'delayed-scripts', 'no-js'] as const;

async function captureViewport(page: Page, info: TestInfo, name: string) {
  // A late logo load must not look like content leaking through the header in the paint probe.
  await page.locator('header.gachia-header').evaluate(async (header) => {
    await document.fonts.ready;
    await Promise.all(Array.from(header.querySelectorAll('img'), (image) => image.decode()));
  });
  const image = await page.screenshot({ animations: 'disabled' });
  await info.attach(name, { body: image, contentType: 'image/png' });
}

async function checkScrolledHeader(page: Page, info: TestInfo, name: string) {
  const header = page.locator('header.gachia-header');
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(0);
  await captureViewport(page, info, name);

  if (page.viewportSize()!.width >= 1024) return;

  const main = page.locator('main').first();
  const headerBox = (await header.boundingBox())!;
  const mainBox = (await main.boundingBox())!;
  const gamesBox = (await header.locator(':scope > .gachia-header__games').boundingBox())!;
  expect(gamesBox.height, 'mobile game navigation must be visible').toBeGreaterThan(0);
  expect(mainBox.y, 'probe must paint beneath the mobile game row').toBeLessThan(gamesBox.y);
  expect(mainBox.y + mainBox.height).toBeGreaterThan(headerBox.y + headerBox.height);

  const originalStyle = await main.getAttribute('style');
  try {
    // A paint-level oracle: changing content behind the sticky rows must not change their pixels.
    await main.evaluate((element) => element.style.setProperty('background', '#ff00ff', 'important'));
    const magenta = await header.screenshot({ animations: 'disabled' });
    await main.evaluate((element) => element.style.setProperty('background', '#00ffff', 'important'));
    const cyan = await header.screenshot({ animations: 'disabled' });
    if (!magenta.equals(cyan)) {
      await info.attach(`${name}-magenta-probe`, { body: magenta, contentType: 'image/png' });
      await info.attach(`${name}-cyan-probe`, { body: cyan, contentType: 'image/png' });
    }
    expect(magenta.equals(cyan), 'content must not show through either mobile header row').toBe(true);
  } finally {
    await main.evaluate((element, style) => {
      if (style === null) element.removeAttribute('style');
      else element.setAttribute('style', style);
    }, originalStyle);
  }
}

for (const width of [390, 768, 1023, 1024, 1440]) {
  // Cover all locales at the reported size, plus wrapping and the lg breakpoint with live scripts.
  for (const mode of width === 390 ? modes : ['normal'] as const) {
    test.describe(`${width}px / ${mode}`, () => {
      test.use({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no-js' });

      for (const locale of locales) {
        test(`${locale} sticky header stays readable when scrolling and returning to the list`, async ({ page, context }, info) => {
          test.setTimeout(90_000);
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          const failedAssets: string[] = [];
          const accountRequests: string[] = [];
          const blockedExternalRequests = new Set<Request>();
          page.on('response', (response) => {
            if (['script', 'stylesheet'].includes(response.request().resourceType()) && response.status() >= 400) {
              failedAssets.push(`${response.status()} ${response.url()}`);
            }
          });
          page.on('requestfailed', (request) => {
            // These requests are deliberately blocked below, not failed application assets.
            if (blockedExternalRequests.has(request)) return;
            // Chromium reports script preloads disabled by javaScriptEnabled:false as CSP failures.
            if (mode === 'no-js' && request.resourceType() === 'script' && request.failure()?.errorText === 'csp') return;
            if (['script', 'stylesheet'].includes(request.resourceType())) failedAssets.push(request.url());
          });

          let releaseScripts!: () => void;
          const scriptGate = new Promise<void>((resolve) => { releaseScripts = resolve; });
          const origin = new URL(info.project.use.baseURL as string).origin;
          await context.route('**/*', async (route) => {
            const request = route.request();
            if (new URL(request.url()).origin !== origin) {
              blockedExternalRequests.add(request);
              return route.abort();
            }
            if (/^\/api\/(?:auth|account|favorites|user-characters|map\/progress)(?:\/|$)/.test(new URL(request.url()).pathname)) {
              accountRequests.push(request.url());
              return route.abort();
            }
            if (mode === 'delayed-scripts' && request.resourceType() === 'script') await scriptGate;
            return route.continue();
          });

          try {
            const path = `/${locale}/hi3/weapons`;
            const response = await page.goto(path, { waitUntil: 'commit' });
            expect(response?.status()).toBe(200);
            const header = page.locator('header.gachia-header');
            await expect(header).toHaveCSS('position', 'sticky');
            await expect(page.locator('main h1')).toBeVisible();
            const search = header.locator('button').first();
            if (mode === 'normal') await expect(search).toBeEnabled();
            else await expect(search).toBeDisabled();
            await captureViewport(page, info, 'top');
            await checkScrolledHeader(page, info, 'scrolled');
            releaseScripts();
            if (mode !== 'no-js') await expect(search).toBeEnabled();

            const detail = page.locator(`main a[href^="${path}/"]`).first();
            await detail.click();
            await expect(page).toHaveURL(new RegExp(`${path}/[^/]+$`));
            await expect(page.locator('main h1')).toBeVisible();
            await page.goBack();
            await expect(page).toHaveURL(new RegExp(`${path}$`));
            await expect(page.locator('main h1')).toBeVisible();
            await checkScrolledHeader(page, info, 'returned-list');
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
            if (locale === 'en' && mode === 'normal' && [390, 768].includes(width)) {
              // Wider font metrics reproduce the Linux card's intrinsic-width pressure on macOS too.
              await page.addStyleTag({ content: 'body { font-family: Verdana, sans-serif !important; }' });
              await checkScrolledHeader(page, info, 'wide-font-returned-list');
              expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
            }
            expect(errors).toEqual([]);
            expect(failedAssets).toEqual([]);
            expect(accountRequests).toEqual([]);
          } finally {
            releaseScripts();
            await info.attach('blocked-external-requests', {
              body: Buffer.from(JSON.stringify([...blockedExternalRequests].map((request) => request.url()))),
              contentType: 'application/json',
            });
          }
        });
      }
    });
  }
}
