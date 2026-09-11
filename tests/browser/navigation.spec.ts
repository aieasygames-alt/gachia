import { test, expect } from '@playwright/test';

const pages = ['/zh', '/zh/genshin', '/zh/azur-promilia', '/zh/nte'];

for (const path of pages) {
  test(`${path} has usable shared navigation`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /更多游戏|More games|その他のゲーム/ }).first()).toBeVisible();
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(overflow.documentWidth, `${path} document overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    expect(overflow.bodyWidth, `${path} body overflows viewport`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  });
}
