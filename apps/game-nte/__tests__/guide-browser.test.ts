import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';
import { expect, it } from '../../web/test-support/guide-test-runtime';
import { guides } from '../lib/data';
import Detail from '../app/[lang]/nte/guides/[slug]/page';
import List from '../app/[lang]/nte/guides/page';

it('renders a Chinese-only NTE guide and its list at desktop/mobile sizes without blank fallback or overflow', async () => {
  const fixture = { id: 'cms-browser-source-checklist', title: '异环资源核验：回归玩家的行动清单', summary: '先核对当前客户端与官方公告，再根据自己的角色、库存和目标安排资源。',
    content: '## 先记录当前状态\n\n确认自己的服务器、目标与已有资源，再查看[抽卡规则](/nte/gacha)。\n\n- 以客户端显示为准。\n- 不把过期活动奖励计入当前预算。\n\n## 确认后再投入\n\n每次只处理一个目标，先检查依赖条件，再决定是否消耗已有资源。',
    titleEn: '', contentEn: '', summaryEn: '', titleJa: '', contentJa: '', summaryJa: '' };
  const browser = await chromium.launch({ headless: true });
  guides.push(fixture);
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.abort());
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace('@import "tailwindcss";', '');
    const output = process.env.GUIDE_SCREENSHOT_DIR;
    if (output) mkdirSync(output, { recursive: true });
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]] as const) {
      await page.setViewportSize({ width, height });
      for (const view of ['detail', 'list']) {
        const params = { params: Promise.resolve({ lang: 'en', slug: fixture.id }) };
        const component = view === 'detail' ? await Detail(params) : await List(params);
        await page.setContent(`<html><head><style>${css}</style></head><body>${renderToStaticMarkup(createElement('div', null, component))}</body></html>`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (view === 'detail') {
          expect(await page.locator('[data-guide-content]').textContent()).toContain('以客户端显示为准');
          expect(await page.locator('[data-guide-content]').getAttribute('lang')).toBe('zh-Hans');
          expect(await page.locator('[data-guide-fallback] a').getAttribute('href')).toBe(`/zh/nte/guides/${fixture.id}`);
          expect(await page.locator('[data-guide-content] a').first().getAttribute('href')).toBe('/en/nte/gacha');
          const heading = await page.locator('h1').boundingBox(), content = await page.locator('[data-guide-content]').boundingBox();
          expect(content!.y).toBeGreaterThanOrEqual(heading!.y + heading!.height);
        } else expect(await page.locator(`a[href="/en/nte/guides/${fixture.id}"]`).textContent()).toContain(fixture.title);
        const screenshot = await page.screenshot({ fullPage: true, ...(output ? { path: join(output, `nte-${view}-${name}.png`) } : {}) });
        expect(screenshot.length).toBeGreaterThan(1000);
      }
    }
  } finally { guides.pop(); await browser.close(); }
});
