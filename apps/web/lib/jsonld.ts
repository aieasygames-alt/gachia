import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';

interface GuideJsonLdOptions {
  gameId: GameId;
  locale: SupportedLocale;
  title: string;
  summary?: string;
  slug: string;
  tags?: string[];
  categoryLabel?: string;
  updatedAt?: string;
  faq?: { question: string; answer: string }[];
}

interface EntityJsonLdOptions {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  url: string;
  image?: string;
  faq?: { question: string; answer: string }[];
  categoryLabel?: string;
  tags?: string[];
}

interface ItemJsonLdOptions {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  itemId: string;
  image?: string;
  faq?: { question: string; answer: string }[];
  categoryLabel?: string;
  tags?: string[];
}

const BASE_URL = 'https://gachia.com';
const PUBLISHER = {
  '@type': 'Organization',
  name: 'Gachia',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.svg`,
};

function homeLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
}

function buildWebPageSchema(options: EntityJsonLdOptions) {
  const { name, description, url, image } = options;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    mainEntity: {
      '@type': 'Thing',
      name,
      description,
      url,
      ...(image ? { image } : {}),
    },
  };
}

/**
 * Build combined JSON-LD for guide pages: BreadcrumbList + Article + FAQPage
 */
export function buildGuideJsonLd(options: GuideJsonLdOptions) {
  const { gameId, locale, title, summary, slug, tags, categoryLabel, updatedAt, faq } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const guidesLabel = CATEGORY_LABELS.guides?.[locale] ?? 'Guides';
  const url = `${BASE_URL}/${locale}/${gameId}/guides/${slug}`;
  const keywords = tags?.filter(Boolean) ?? [];

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
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    articleSection: categoryLabel ?? guidesLabel,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    isPartOf: {
      '@type': 'CollectionPage',
      name: `${gameName} ${guidesLabel}`,
      url: `${BASE_URL}/${locale}/${gameId}/guides`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gachia',
      url: BASE_URL,
    },
  });
  schemas.push(buildWebPageSchema({ gameId, locale, name: title, description: summary || title, url }));

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
  image?: string;
  faq?: { question: string; answer: string }[];
  tags?: string[];
  categoryLabel?: string;
}) {
  const { gameId, locale, name, description, charId, image, faq, tags, categoryLabel } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const charsLabel = CATEGORY_LABELS.characters?.[locale] ?? 'Characters';
  const url = `${BASE_URL}/${locale}/${gameId}/characters/${charId}`;
  const keywords = tags?.filter(Boolean) ?? [];

  const schemas: object[] = [
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
      articleSection: categoryLabel ?? charsLabel,
      keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
      isPartOf: {
        '@type': 'CollectionPage',
        name: `${gameName} ${charsLabel}`,
        url: `${BASE_URL}/${locale}/${gameId}/characters`,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
      },
    },
    buildWebPageSchema({ gameId, locale, name, description, url, image }),
  ];

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
 * Build JSON-LD for weapon detail pages: BreadcrumbList + Article
 */
export function buildWeaponJsonLd(options: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  weaponId: string;
  image?: string;
  faq?: { question: string; answer: string }[];
  categoryLabel?: string;
  tags?: string[];
}) {
  const { gameId, locale, name, description, weaponId, image, faq, categoryLabel, tags } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const weaponsLabel = CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons';
  const url = `${BASE_URL}/${locale}/${gameId}/weapons/${weaponId}`;
  const keywords = tags?.filter(Boolean) ?? [];

  const schemas: object[] = [
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
      articleSection: categoryLabel ?? weaponsLabel,
      keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
      isPartOf: {
        '@type': 'CollectionPage',
        name: `${gameName} ${weaponsLabel}`,
        url: `${BASE_URL}/${locale}/${gameId}/weapons`,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
      },
    },
    buildWebPageSchema({ gameId, locale, name, description, url, image }),
  ];

  if (faq && faq.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return schemas;
}

/**
 * Build JSON-LD for item detail pages: BreadcrumbList + Article + FAQPage
 */
export function buildItemJsonLd(options: ItemJsonLdOptions) {
  const { gameId, locale, name, description, itemId, image, faq, categoryLabel, tags } = options;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? gameId;
  const itemsLabel = CATEGORY_LABELS.items?.[locale] ?? 'Items';
  const url = `${BASE_URL}/${locale}/${gameId}/items/${itemId}`;
  const keywords = tags?.filter(Boolean) ?? [];

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel(locale), item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
        { '@type': 'ListItem', position: 3, name: itemsLabel, item: `${BASE_URL}/${locale}/${gameId}/items` },
        { '@type': 'ListItem', position: 4, name },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url,
      articleSection: categoryLabel ?? itemsLabel,
      keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
      isPartOf: {
        '@type': 'CollectionPage',
        name: `${gameName} ${itemsLabel}`,
        url: `${BASE_URL}/${locale}/${gameId}/items`,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
      },
    },
    buildWebPageSchema({ gameId, locale, name, description, url, image }),
  ];

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
  const title = locale === 'zh'
    ? 'Gachia 游戏攻略 Wiki：卡池、版本、兑换码与角色图鉴'
    : locale === 'ja'
      ? 'Gachia ゲーム攻略 Wiki：バナー、版本、コード、キャラ'
      : 'Gachia Game Wiki: Banners, Version Hubs, Codes & Character Guides';
  const description = locale === 'zh'
    ? 'Gachia 是多游戏攻略 Wiki 与实时规划入口，覆盖当前卡池、下期卡池、版本专题、兑换码、角色图鉴、武器数据、配装和热门攻略。'
    : locale === 'ja'
      ? 'Gachia は多ゲーム攻略 Wiki とリアルタイム計画ハブです。現在バナー、次回バナー、版本更新、コード、キャラ、武器、ビルド、攻略を整理します。'
      : 'Gachia is a multi-game wiki and live planning hub for current banners, next banners, version updates, redeem codes, characters, weapons, builds, and guides.';
  const modifiedDate = '2026-09-04';

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: `${BASE_URL}/${locale}`,
      publisher: PUBLISHER,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gachia',
      url: BASE_URL,
      logo: `${BASE_URL}/icon.svg`,
      sameAs: [
        'https://github.com/aieasygames-alt/gachia',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      headline: title,
      description,
      url: `${BASE_URL}/${locale}`,
      inLanguage: locale === 'zh' ? 'zh-Hans' : locale,
      datePublished: '2026-08-01',
      dateModified: modifiedDate,
      author: PUBLISHER,
      publisher: PUBLISHER,
      about: [
        { '@type': 'Thing', name: 'game wiki' },
        { '@type': 'Thing', name: 'gacha game guides' },
        { '@type': 'Thing', name: 'character database' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description,
      url: `${BASE_URL}/${locale}`,
      inLanguage: locale === 'zh' ? 'zh-Hans' : locale,
      datePublished: '2026-08-01',
      dateModified: modifiedDate,
      author: PUBLISHER,
      publisher: PUBLISHER,
      articleSection: locale === 'zh' ? '游戏攻略与资料库' : locale === 'ja' ? 'ゲーム攻略データベース' : 'Game Guides and Database',
      about: [
        { '@type': 'Thing', name: 'gacha games' },
        { '@type': 'Thing', name: 'game banners' },
        { '@type': 'Thing', name: 'character guides' },
      ],
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${BASE_URL}/${locale}`,
      },
    },
  ];
}
