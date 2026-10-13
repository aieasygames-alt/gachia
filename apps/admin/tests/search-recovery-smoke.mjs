import assert from 'node:assert/strict';

export async function searchRecoverySmoke(browser, origin) {
  const checks = [];
  for (const profile of ['desktop', 'mobile']) for (const locale of ['zh', 'en', 'ja']) {
    const context = await browser.newContext(profile === 'mobile' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    try {
      let requests = 0;
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort();
        if (url.pathname === `/data-manifest/search-${locale}.json`) {
          requests++;
          if (requests === 1) { await new Promise((resolve) => setTimeout(resolve, 700)); return route.fulfill({ status: 503, body: 'unavailable' }); }
        }
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(`${origin}/${locale}/hi3`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.getByRole('button', { name: /搜索|検索|Search/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('status').waitFor({ state: 'visible' });
      await dialog.locator('input').fill('gachia-no-match-7e92d4a1');
      await dialog.getByRole('alert').waitFor({ state: 'visible' });
      const empty = { zh: '未找到相关结果', en: 'No results found', ja: '該当する結果がありません' }[locale];
      assert.equal(await dialog.getByText(empty, { exact: true }).count(), 0);
      await dialog.getByRole('button', { name: /重试|再試行|Retry/ }).click();
      await dialog.getByText(empty, { exact: true }).waitFor({ state: 'visible' });
      assert.equal(requests, 2);
      assert.equal(await dialog.getByRole('alert').count(), 0);
      const response = await page.request.get(`${origin}/data-manifest/search-${locale}.json`);
      const data = await response.json();
      const row = data.hi3.characters[0];
      await dialog.locator('input').fill(row.name);
      await dialog.locator(`a[href="/${locale}/hi3/characters/${row.id}"]`).waitFor({ state: 'visible' });
      checks.push({ ruleId: 'search.ui_load_retry', profile, locale, status: 'passed', message: '加载提示、503不冒充无结果、重试重新请求、索引恢复可搜索' });
    } finally { await context.close(); }
  }
  return checks;
}
