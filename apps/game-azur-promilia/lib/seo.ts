import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

export function metadata(locale: SupportedLocale, title: string, description: string, path = ''): Metadata {
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/azur-promilia${normalizedPath}`,
      siteName: 'Gachia',
      type: 'website',
      images: [{ url: `${BASE_URL}/images/og/azur-promilia.webp`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE_URL}/images/og/azur-promilia.webp`] },
    alternates: {
      canonical: `${BASE_URL}/${locale}/azur-promilia${normalizedPath}`,
      languages: {
        'zh-Hans': `${BASE_URL}/zh/azur-promilia${normalizedPath}`,
        en: `${BASE_URL}/en/azur-promilia${normalizedPath}`,
        ja: `${BASE_URL}/ja/azur-promilia${normalizedPath}`,
        'x-default': `${BASE_URL}/zh/azur-promilia${normalizedPath}`,
      },
    },
  };
}

export function url(locale: SupportedLocale, path = '') {
  return `https://gachia.com/${locale}/azur-promilia${path ? `/${path.replace(/^\/+/, '')}` : ''}`;
}
