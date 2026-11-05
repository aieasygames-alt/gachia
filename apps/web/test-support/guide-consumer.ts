import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@gachia/core';

type Params = { params: Promise<{ lang: string; slug: string }> };

export function guideConsumerSecurityTests<T extends { id: string }>(game: string, guides: T[],
  detail: (params: Params) => Promise<ReactNode>, metadata: (params: Params) => Promise<unknown>) {
  describe(`${game} actual guide page security`, () => {
    it('renders hostile title, summary, body and FAQ as data in a real browser', async () => {
      const attack = '</ScRiPt ><span data-guide-injection>outside</span><script>globalThis.__guideInjected=true</script><!--';
      const input = `中文 日本語のテスト & " \u2028\u2029 ${attack}`;
      const row = Object.assign({}, guides[0]!, { id: 'security-consumer-fixture', title: input, titleEn: input, titleJa: input,
        summary: input, summaryEn: input, summaryJa: input, content: input.repeat(4), contentEn: input.repeat(4), contentJa: input.repeat(4),
        faq: [{ question: input, answer: input, questionZh: input, answerZh: input, questionJa: input, answerJa: input }] });
      const browser = await chromium.launch({ headless: true });
      guides.push(row);
      try {
        const page = await browser.newPage();
        await page.route('**/*', route => route.abort());
        for (const lang of ['zh', 'en', 'ja']) {
          const params = { params: Promise.resolve({ lang, slug: row.id }) };
          const html = renderToStaticMarkup(createElement('html', null, createElement('body', null, await detail(params))));
          await page.setContent(html);
          expect(await page.locator('[data-guide-injection]').count()).toBe(0);
          expect(await page.evaluate(() => '__guideInjected' in globalThis)).toBe(false);
          expect(await page.locator('h1').textContent()).toBe(input);
          const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
          expect(scripts.length).toBeGreaterThan(0);
          expect(JSON.stringify(scripts.map(value => JSON.parse(value)))).toContain(JSON.stringify(input).slice(1, -1));
          for (const script of scripts) expect(script).not.toContain('<');
          expect(await metadata(params)).toBeTruthy();
        }
      } finally { guides.pop(); await browser.close(); }
    });

    it('keeps the shared serializer lossless and rejects nonserializable roots', () => {
      expect(JSON.parse(serializeJsonLd({ text: '</SCRIPT> 中文 日本語 & "' }))).toEqual({ text: '</SCRIPT> 中文 日本語 & "' });
      expect(() => serializeJsonLd(undefined)).toThrow(TypeError);
    });
  });
}
