import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

export function genshinMetadata(locale: SupportedLocale, path: string, title: string, description: string): Metadata {
  const normalized = path ? `/${path.replace(/^\/+/, '')}` : '';
  const url = `${BASE_URL}/${locale}/genshin${normalized}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'zh-Hans': `${BASE_URL}/zh/genshin${normalized}`,
        en: `${BASE_URL}/en/genshin${normalized}`,
        ja: `${BASE_URL}/ja/genshin${normalized}`,
        'x-default': `${BASE_URL}/zh/genshin${normalized}`,
      },
    },
    openGraph: { title, description, url, siteName: 'Gachia', type: 'website', images: [{ url: `${BASE_URL}/images/og/genshin.webp`, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE_URL}/images/og/genshin.webp`] },
  };
}

export function entityJsonLd(locale: SupportedLocale, path: string, name: string, description: string, category: string, image?: string) {
  const url = `${BASE_URL}/${locale}/genshin/${path}`;
  const categoryUrl = `${BASE_URL}/${locale}/genshin/${category}`;
  const home = locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
  const game = locale === 'en' ? 'Genshin Impact' : '原神';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home, item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: game, item: `${BASE_URL}/${locale}/genshin` },
        { '@type': 'ListItem', position: 3, name: category, item: categoryUrl },
        { '@type': 'ListItem', position: 4, name },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url,
      articleSection: category,
      isPartOf: { '@type': 'CollectionPage', name: `${game} ${category}`, url: categoryUrl },
      publisher: { '@type': 'Organization', name: 'Gachia', url: BASE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name,
      description,
      url,
      mainEntity: { '@type': 'Thing', name, description, url, ...(image ? { image } : {}) },
    },
  ];
}

export function breadcrumbJsonLd(locale: SupportedLocale, path: string, current: string) {
  const segments = path.split('/').filter(Boolean);
  const items = [
    { '@type': 'ListItem', position: 1, name: locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home', item: `${BASE_URL}/${locale}` },
    { '@type': 'ListItem', position: 2, name: locale === 'en' ? 'Genshin Impact' : '原神', item: `${BASE_URL}/${locale}/genshin` },
  ];
  if (segments.length > 0) items.push({ '@type': 'ListItem', position: 3, name: current, item: `${BASE_URL}/${locale}/genshin/${path}` });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}
