import { afterEach, describe, expect, it, vi } from 'vitest';
import { genshinGuides } from '@gachia/data/games/genshin/guides';
import { guideAlternates, guideFaq, guideReadingLocale, isGuideLocaleIndexable } from '../../game-genshin/lib/guide-policy';
import { genshinGuideMetadata } from '../../game-genshin/lib/seo';
import sitemap from '../../game-genshin/app/sitemap';

afterEach(() => vi.unstubAllEnvs());

describe('Genshin guide reading and indexing contract', () => {
  const guide = genshinGuides.find(entry => entry.id === 'banner-schedule-guide')!;
  const translated = genshinGuides.find(entry => entry.id === 'lightrace-wish-phase-ii-faq')!;

  it('retains untranslated reading paths without advertising them as translations', () => {
    expect(guideReadingLocale(guide, 'ja')).toBe('en');
    expect(isGuideLocaleIndexable(guide, 'ja')).toBe(false);
    expect(guideAlternates(guide, 'ja')).toEqual({
      canonical: 'https://gachia.com/ja/genshin/guides/banner-schedule-guide',
      languages: {
        'zh-Hans': 'https://gachia.com/zh/genshin/guides/banner-schedule-guide',
        en: 'https://gachia.com/en/genshin/guides/banner-schedule-guide',
        'x-default': 'https://gachia.com/zh/genshin/guides/banner-schedule-guide',
      },
    });
  });

  it('requires actual title, summary and a substantial body, not just a Japanese teaser', () => {
    const partial = genshinGuides.find(entry => entry.id === 'phase-ii-columbina-raiden-pull-plan')!;
    expect(partial.titleJa).toBeTruthy();
    expect(guideReadingLocale(partial, 'ja')).toBe('en');
    for (const patch of [{ titleJa: '' }, { summaryJa: ' ' }, { contentJa: '短い概要' }]) {
      expect(isGuideLocaleIndexable({ ...translated, ...patch }, 'ja')).toBe(false);
    }
    expect(guideReadingLocale(translated, 'ja')).toBe('ja');
    expect(guideAlternates(translated, 'zh').languages.ja).toContain('/ja/genshin/');
  });

  it('allows only localized guide URLs in the dedicated owner sitemap', () => {
    const urls = new Set(sitemap().map(entry => entry.url));
    expect(urls.size).toBe(1572);
    for (const entry of genshinGuides) for (const locale of ['zh', 'en', 'ja'] as const) {
      expect(urls.has(`https://gachia.com/${locale}/genshin/guides/${entry.id}`)).toBe(isGuideLocaleIndexable(entry, locale));
    }
    expect(genshinGuides.filter(entry => isGuideLocaleIndexable(entry, 'ja'))).toHaveLength(1);
  });

  it('sets noindex/follow on a production reading fallback but preserves preview protection', () => {
    vi.stubEnv('GENSHIN_DEPLOYMENT_MODE', 'production');
    expect(genshinGuideMetadata(guide, 'ja', 'Fallback title', 'Fallback summary')).toMatchObject({
      title: 'Fallback title', description: 'Fallback summary', robots: { index: false, follow: true },
      openGraph: { title: 'Fallback title', description: 'Fallback summary' },
    });
    expect(genshinGuideMetadata(translated, 'ja', 'Translated', 'Summary').robots).toEqual({ index: true, follow: true });
    vi.stubEnv('GENSHIN_DEPLOYMENT_MODE', 'preview');
    expect(genshinGuideMetadata(translated, 'ja', 'Translated', 'Summary').robots).toEqual({ index: false, follow: false });
    vi.stubEnv('GENSHIN_DEPLOYMENT_MODE', '');
    expect(genshinGuideMetadata(guide, 'en', 'Title', 'Summary').robots).toEqual({ index: false, follow: false });
  });

  it('uses Japanese FAQ pairs when present and never labels English FAQ as Japanese', () => {
    const faq = { question: 'Question', answer: 'Answer', questionZh: '问题', answerZh: '回答', questionJa: '質問', answerJa: '回答です' };
    expect(guideFaq({ ...guide, faq: [faq] }, 'ja')).toEqual([{ question: '質問', answer: '回答です' }]);
    expect(guideFaq({ ...guide, faq: [{ ...faq, answerJa: undefined }] }, 'ja')).toEqual([]);
    expect(guideFaq({ ...guide, faq: [faq] }, 'en')).toEqual([{ question: 'Question', answer: 'Answer' }]);
  });
});
