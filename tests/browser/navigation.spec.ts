import { test, expect } from '@playwright/test';

const pages = ['/zh', '/zh/genshin', '/zh/azur-promilia', '/zh/nte'];

for (const path of pages) {
  test(`${path} has usable shared navigation`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header').first()).toBeVisible();
    const moreGames = page.getByText(/更多游戏|More games|その他のゲーム/).first();
    await expect(moreGames).toHaveCount(1);
    if (test.info().project.name === 'desktop') await expect(moreGames).toBeVisible();
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(overflow.documentWidth, `${path} document overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.bodyWidth, `${path} body overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 1);

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
