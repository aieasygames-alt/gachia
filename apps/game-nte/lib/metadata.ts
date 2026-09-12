import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
export function nteMetadata(locale: SupportedLocale, path: string, titles: Record<SupportedLocale, string>, descriptions: Record<SupportedLocale, string>): Metadata {
  const title = titles[locale];
  const description = descriptions[locale];
  const url = `https://gachia.com/${locale}/nte/${path}`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: url,
      languages: {
        'zh-Hans': `https://gachia.com/zh/nte/${path}`,
        en: `https://gachia.com/en/nte/${path}`,
        ja: `https://gachia.com/ja/nte/${path}`,
        'x-default': `https://gachia.com/zh/nte/${path}`,
      },
    },
    openGraph: { title, description, url, images: [{ url: 'https://gachia.com/images/og/nte.webp', width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: ['https://gachia.com/images/og/nte.webp'] },
  };
}
