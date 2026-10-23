import { test, expect } from '@playwright/test';

const pages = ['/zh', '/zh/genshin', '/zh/azur-promilia', '/zh/nte'];

for (const path of pages) {
  test(`${path} has usable shared navigation`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header').first()).toBeVisible();
    const moreGames = page.getByText(/更多游戏|More games|その他のゲーム/).first();
    await expect(moreGames).toHaveCount(1);
    if (test.info().project.name === 'desktop') await expect(moreGames).toBeVisible();
    const overflow = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const scrollContainers = [...document.querySelectorAll<HTMLElement>('*')]
        .filter((element) => ['auto', 'scroll'].includes(getComputedStyle(element).overflowX));
      const maxVisibleRight = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => !scrollContainers.some((container) => container.contains(element)))
        .reduce((max, element) => Math.max(max, element.getBoundingClientRect().right), 0);
      return { documentWidth: maxVisibleRight, viewportWidth, bodyWidth: maxVisibleRight };
    });
    expect(overflow.documentWidth, `${path} document overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 8);
    expect(overflow.bodyWidth, `${path} body overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 8);

    const seo = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      hreflangCount: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      breadcrumbCount: document.querySelectorAll('.breadcrumb-bar').length,
    }));
    expect(seo.canonical, `${path} canonical should use production host`).toMatch(/^https:\/\/gachia\.com\//);
    expect(seo.hreflangCount, `${path} should expose locale alternates`).toBeGreaterThanOrEqual(4);
    if (path === '/zh') expect(seo.ogImage, `${path} should expose an OG image`).toMatch(/^https:\/\/gachia\.com\//);
    if (path === '/zh/nte') expect(seo.breadcrumbCount, 'NTE should not render duplicate top breadcrumbs').toBe(0);
  });
}

for (const game of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) {
  test(`main game directory crosses ${game} ownership without RSC prefetch`, async ({ page }) => {
    const requests: { document: boolean; rsc: boolean }[] = [];
    await page.route(new RegExp(`/zh/${game}(?:[/?]|$)`), async (route) => {
      const request = route.request();
      requests.push({ document: request.isNavigationRequest(), rsc: request.headers().rsc === '1' });
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1>Independent Worker fixture</h1>' });
    });
    await page.goto('/zh/games', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeEnabled();
    await page.evaluate(() => { (window as Window & { ownerDocument?: string }).ownerDocument = 'main'; });
    const link = page.locator(`main a[href="/zh/${game}"]`).first();
    await link.hover();
    expect(requests).toEqual([]);
    await link.click();
    await expect(page.getByRole('heading', { name: 'Independent Worker fixture' })).toBeVisible();
    expect(requests).toEqual([{ document: true, rsc: false }]);
    expect(await page.evaluate(() => (window as Window & { ownerDocument?: string }).ownerDocument)).toBeUndefined();
    await page.goBack();
    await expect(page).toHaveURL(/\/zh\/games$/);
    await expect(page.locator('main h1')).toBeVisible();
  });
}
