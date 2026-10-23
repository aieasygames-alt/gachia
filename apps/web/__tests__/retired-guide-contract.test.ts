import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isGuideReadable, isRetiredPage } from '../lib/retired-pages';
import { getGuideListData } from '../lib/game-data/guides';
import { buildLocalizedAlternates, hasLocalizedContent } from '../lib/seo-metadata';
import sitemap from '../app/sitemaps/main/sitemap';
import middleware from '../middleware';
import raw from '../../../packages/data/games/roco-cn/raw-guides.json';

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');
  return { default: () => () => NextResponse.next() };
});
const slug = 'daily-events-merchant-guide';

describe('retired guide language contract', () => {
  it('keeps English retired, including its trailing slash, without blocking readable translations', () => {
    for (const suffix of ['', '/']) {
      expect(isRetiredPage(`/en/roco-cn/guides/${slug}${suffix}`)).toBe(true);
      expect(middleware(new NextRequest(`https://gachia.com/en/roco-cn/guides/${slug}${suffix}`)).status).toBe(404);
    }
    expect(isGuideReadable('roco-cn', slug, 'zh')).toBe(true);
    expect(isGuideReadable('roco-cn', slug, 'ja')).toBe(true);
    expect(isGuideReadable('roco-cn', 'starter-guide-cn', 'en')).toBe(true);
  });
  it('uses the same retirement decision in lists, home data and XML entries', async () => {
    const urls = (await sitemap()).map(entry => entry.url);
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const list = await getGuideListData('roco-cn', locale);
      expect(list.guides.some(guide => guide.id === slug)).toBe(locale !== 'en');
      expect(urls.includes(`https://gachia.com/${locale}/roco-cn/guides/${slug}`)).toBe(locale !== 'en');
      if (locale === 'en') expect(list.categories).not.toContain('daily');
    }
  });
  it('does not advertise a retired URL through hreflang and keeps the old article as historical context', () => {
    const guide = raw.find(entry => entry.id === slug)!;
    const metadata = buildLocalizedAlternates('zh', locale => `/${locale}/roco-cn/guides/${slug}`, ['zh', 'en', 'ja'], {
      includeLocale: locale => isGuideReadable('roco-cn', slug, locale) && hasLocalizedContent(guide, locale),
    });
    expect(metadata.languages).not.toHaveProperty('en');
    expect(metadata.languages).toHaveProperty('ja');
    expect(guide.updatedAt).toBe('2026-09-07');
    expect(guide).toMatchObject({ currentVersion: 'historical: 2026-09-07' });
    expect(guide.content).toContain('## 今日必做总览（2026-09-07）');
    expect(guide.contentJa).toContain('## 今日のチェックリスト（2026年9月7日）');
  });
});
