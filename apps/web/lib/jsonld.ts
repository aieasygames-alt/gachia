import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';

interface GuideJsonLdOptions {
  gameId: GameId;
  locale: SupportedLocale;
  title: string;
  summary?: string;
  slug: string;
  faq?: { question: string; answer: string }[];
}

/**
 * Build combined JSON-LD for guide pages: BreadcrumbList + Article + FAQPage
 */
export function buildGuideJsonLd(options: GuideJsonLdOptions) {
  const { gameId, locale, title, summary, slug, faq } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const guidesLabel = CATEGORY_LABELS.guides?.[locale] ?? 'Guides';
  const homeLabel = locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
  const url = `https://gachia.com/${locale}/${gameId}/guides/${slug}`;

  const schemas: object[] = [];

  // BreadcrumbList
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: `https://gachia.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: gameName, item: `https://gachia.com/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 3, name: guidesLabel, item: `https://gachia.com/${locale}/${gameId}/guides` },
      { '@type': 'ListItem', position: 4, name: title },
    ],
  });

  // Article
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: summary || title,
    url,
    publisher: {
      '@type': 'Organization',
      name: 'Gachia',
      url: 'https://gachia.com',
    },
  });

  // FAQPage (only if FAQ items exist)
  if (faq && faq.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  return schemas;
}

/**
 * Build WebSite + Organization JSON-LD for the homepage
 */
export function buildHomepageJsonLd(locale: SupportedLocale) {
  const siteName = locale === 'zh' ? 'Gachia - 二次元游戏数据库' : locale === 'ja' ? 'Gachia - ゲームWiki' : 'Gachia - Game Wiki Database';

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: `https://gachia.com/${locale}`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `https://gachia.com/${locale}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gachia',
      url: 'https://gachia.com',
    },
  ];
}
