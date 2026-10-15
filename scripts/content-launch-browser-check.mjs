import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'reports/content-launch';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const checks = [
  [3111, '/zh/lvmeng', '公测已开启'],
  [3111, '/zh/lvmeng/download', '25GB以上'],
  [3111, '/zh/lvmeng/redeem-codes', '不是首周到期福利'],
  [3111, '/zh/lvmeng/characters/he-yulian', '何雨莲'],
  [3111, '/zh/lvmeng/launch-check', '同一UID'],
  [3110, '/zh/update-radar', '测试已结束'],
  [3110, '/zh/starrail/version', '月升之前'],
  [3110, '/zh/zzz/guides/v3-3-special-program-prep-guide', '失效'],
  [3110, '/zh/wuwa/guides/v3-7-hsin-suoming-official-reference', '锁暝'],
  [3112, '/zh/genshin/version', '往冥府的安魂歌'],
  [3113, '/zh/nte/version', '国服10月15日更新公告'],
  [3114, '/zh/azur-promilia/version', '测试后优化计划'],
];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    // Local content acceptance does not require advertisements or analytics.
    await context.route(/googlesyndication|google-analytics|googletagmanager|doubleclick/, (route) => route.abort());
    for (const [port, path, expected] of checks) {
      const page = await context.newPage();
      const errors = [];
      const failedAssets = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('/_next/') && response.status() >= 400) failedAssets.push(response.url());
      });
      const response = await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' });
      const main = page.locator('main');
      const text = await main.innerText();
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
      let interactive = true;
      if (path.endsWith('/launch-check')) {
        const checkbox = page.locator('input[type="checkbox"]').first();
        await checkbox.check();
        await page.reload({ waitUntil: 'networkidle' });
        interactive = await page.locator('input[type="checkbox"]').first().isChecked();
      }
      const screenshot = `${output}/${port}-${path.replaceAll('/', '_')}-${viewport.width}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });
      const result = { path, port, width: viewport.width, status: response.status(), canonical, expected, found: text.includes(expected), overflow, errors, failedAssets, interactive, screenshot };
      result.passed = result.status === 200 && result.found && !overflow && !errors.length && !failedAssets.length && interactive && canonical === `https://gachia.com${path}`;
      results.push(result);
      console.log(`${result.passed ? 'PASS' : 'FAIL'} ${viewport.width} ${port}${path}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/browser-2026-10-15.json`, JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'local Next production server, not Cloudflare Worker or production', results }, null, 2));
}
if (results.some((result) => !result.passed)) process.exitCode = 1;
