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

const BASE_URL = 'https://gachia.com';

function homeLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
}

/**
 * Build combined JSON-LD for guide pages: BreadcrumbList + Article + FAQPage
 */
export function buildGuideJsonLd(options: GuideJsonLdOptions) {
  const { gameId, locale, title, summary, slug, faq } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const guidesLabel = CATEGORY_LABELS.guides?.[locale] ?? 'Guides';
  const url = `${BASE_URL}/${locale}/${gameId}/guides/${slug}`;

  const schemas: object[] = [];

  // BreadcrumbList
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel(locale), item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 3, name: guidesLabel, item: `${BASE_URL}/${locale}/${gameId}/guides` },
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
      url: BASE_URL,
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
 * Build JSON-LD for character detail pages: BreadcrumbList + Article
 */
export function buildCharacterJsonLd(options: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  charId: string;
}) {
  const { gameId, locale, name, description, charId } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const charsLabel = CATEGORY_LABELS.characters?.[locale] ?? 'Characters';
  const url = `${BASE_URL}/${locale}/${gameId}/characters/${charId}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel(locale), item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
        { '@type': 'ListItem', position: 3, name: charsLabel, item: `${BASE_URL}/${locale}/${gameId}/characters` },
        { '@type': 'ListItem', position: 4, name },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url,
      publisher: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
      },
    },
  ];
}

/**
 * Build JSON-LD for weapon detail pages: BreadcrumbList + Article
 */
export function buildWeaponJsonLd(options: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  weaponId: string;
}) {
  const { gameId, locale, name, description, weaponId } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const weaponsLabel = CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons';
  const url = `${BASE_URL}/${locale}/${gameId}/weapons/${weaponId}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel(locale), item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
        { '@type': 'ListItem', position: 3, name: weaponsLabel, item: `${BASE_URL}/${locale}/${gameId}/weapons` },
        { '@type': 'ListItem', position: 4, name },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url,
      publisher: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
      },
    },
  ];
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
      url: `${BASE_URL}/${locale}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gachia',
      url: BASE_URL,
    },
  ];
}
