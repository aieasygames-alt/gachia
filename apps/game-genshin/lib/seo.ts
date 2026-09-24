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
