import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import seed from '@gachia/data/cms/starrail-snapshot.json';
import type { StarRailUpdate } from '@gachia/data/cms/starrail-updates';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/starrail-publication', () => ({ loadStarRailUpdates: load }));
vi.mock('@/lib/i18n/navigation', () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement('a', { href }, children) }));
import { StarRailBannerGuide } from '@/components/wiki/starrail-banner-guide';
import { StarRailCurrentOverview } from '@/components/wiki/starrail-current-overview';
import { StarRailEvents } from '@/components/wiki/starrail-events';

describe('Star Rail live CMS readers', () => {
  beforeEach(() => load.mockImplementation(async (locale: string) => ({ source: 'cms', updates: seed.filter(d => d.locale === locale) })));
  it('shows published warp facts and replaces them on the next request', async () => {
    const banner = seed.find(d => d.kind === 'banner') as StarRailUpdate;
    const html = renderToStaticMarkup(await StarRailBannerGuide({ locale: 'zh' }));
    expect(html).toContain(banner.title);
    expect(html).toContain(banner.facts[0]!.text);
    load.mockResolvedValue({ source: 'cms', updates: [{ ...banner, title: '新跃迁公告', facts: [{ text: '新的结束时间已核验' }] }] });
    const changed = renderToStaticMarkup(await StarRailBannerGuide({ locale: 'zh' }));
    expect(changed).toContain('新的结束时间已核验');
    expect(changed).not.toContain(banner.title);
  });
  it('honors withdrawal and language isolation without restoring old static claims', async () => {
    load.mockResolvedValue({ source: 'cms', updates: [] });
    for (const locale of ['zh', 'en', 'ja'] as const) {
      for (const reader of [StarRailBannerGuide, StarRailCurrentOverview, StarRailEvents]) {
        const html = renderToStaticMarkup(await reader({ locale }));
        expect(html).not.toContain(seed[0]!.title);
        expect(html).not.toContain('v4.4 live');
        expect(load).toHaveBeenCalledWith(locale);
      }
    }
  });
  it('renders event facts with sources and region, excluding warp notices', async () => {
    const html = renderToStaticMarkup(await StarRailEvents({ locale: 'zh' }));
    const event = seed.find(d => d.kind === 'event')!;
    expect(html).toContain(event.title);
    expect(html).toContain(event.region);
    expect(html).toContain(event.sources[0]!.url.replaceAll('&', '&amp;'));
    expect(html).not.toContain(seed.find(d => d.kind === 'banner')!.title);
  });
});
