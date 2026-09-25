import { test, expect } from '@playwright/test';

const canaryToken = process.env.GENSHIN_CANARY_TOKEN;

test.skip(!canaryToken, 'GENSHIN_CANARY_TOKEN is required for the production Genshin canary suite.');

test.beforeEach(async ({ context }) => {
  await context.addCookies([{
    name: 'gachia_genshin_canary',
    value: canaryToken!,
    domain: 'gachia.com',
    path: '/',
    secure: true,
    sameSite: 'Lax',
  }]);
});

for (const path of ['/zh/genshin', '/zh/genshin/characters/hu-tao', '/zh/genshin/map']) {
  test(`canary ${path} renders and survives a hard reload`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`^https://gachia\\.com${path}`));
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });
}

test('canary map keeps anonymous API access separate from private progress', async ({ page }) => {
  await page.goto('/zh/genshin/map', { waitUntil: 'networkidle' });
  const results = await page.evaluate(async () => {
    const [points, progress] = await Promise.all([
      fetch('/api/map/points?map_id=2'),
      fetch('/api/map/progress?map_id=teyvat'),
    ]);
    return {
      points: { status: points.status, cacheControl: points.headers.get('cache-control') ?? '' },
      progress: { status: progress.status, cacheControl: progress.headers.get('cache-control') ?? '' },
    };
  });
  expect(results.points.status).toBe(200);
  expect(results.points.cacheControl).toMatch(/public/i);
  expect(results.progress.status).toBe(401);
  expect(results.progress.cacheControl).toMatch(/(?:private|no-store)/i);
});
