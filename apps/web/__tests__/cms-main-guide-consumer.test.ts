import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { isStarRailCmsGuide } from '@gachia/data/cms/starrail-guides';
import { UNIFIED_MAIN_GUIDE_GAMES } from '../../../services/content-cms/src/unified-guide-contract';

vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children }: { children: React.ReactNode }) => createElement('span', null, children) }));

import GuidePage, { generateMetadata, generateStaticParams } from '../app/[lang]/[game]/guides/[slug]/page';
import { isGuideReadable } from '../lib/retired-pages';

describe('CMS Main existing Chinese guide content consumers', () => {
  it('includes every qualified Chinese guide in the actual static route set', async () => {
    const routes = new Set((await generateStaticParams()).map(row => `${row.lang}/${row.game}/${row.slug}`));
    for (const game of UNIFIED_MAIN_GUIDE_GAMES) {
      const mod = await import(`../../../packages/data/games/${game}/guides.ts`);
      const guides = Object.values(mod).find(value => Array.isArray(value)) as Array<{ id: string }>;
      for (const guide of guides) expect(routes.has(`zh/${game}/${guide.id}`), `${game}/${guide.id}`).toBe(true);
    }
    expect(routes.has('en/roco-cn/daily-events-merchant-guide')).toBe(false);
  });
  for (const game of UNIFIED_MAIN_GUIDE_GAMES) it(`${game}: every existing guide renders changed body without changing English output`, async () => {
    const mod = await import(`../../../packages/data/games/${game}/guides.ts`);
    const guides = Object.values(mod).find(value => Array.isArray(value)) as Array<{ id: string; content: string }>;
    expect(guides.length).toBeGreaterThan(0);
    for (const guide of guides) {
      // The warp route now consumes the independent Star Rail publication;
      // its replacement/withdrawal contract is covered separately.
      if (game === 'starrail' && (guide.id === 'banner-schedule-guide' || isStarRailCmsGuide(guide.id))) continue;
      const params = (lang: string) => ({ params: Promise.resolve({ game, slug: guide.id, lang }) });
      const english = isGuideReadable(game, guide.id, 'en') ? renderToStaticMarkup(await GuidePage(params('en'))) : null;
      const previous = guide.content;
      const marker = `CMS-main-body-${game}-${guide.id}`;
      try {
        guide.content = `${previous}\n\n## CMS regression\n\n${marker}`;
        const html = renderToStaticMarkup(await GuidePage(params('zh')));
        expect(html, guide.id).toContain(marker);
        expect(html).toContain('<h1');
        expect(await generateMetadata(params('zh'))).toBeTruthy();
        if (english !== null) expect(renderToStaticMarkup(await GuidePage(params('en')))).toBe(english);
        else await expect(GuidePage(params('en'))).rejects.toThrow('404');
      } finally { guide.content = previous; }
    }
  }, 60000);
});
