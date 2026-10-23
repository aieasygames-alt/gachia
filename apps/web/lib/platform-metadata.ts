import type { Metadata } from 'next';
import { LOCALES, type SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from './seo-metadata';

type PlatformPath = '' | '/about' | '/contact' | '/privacy' | '/terms';

export function platformMetadata(locale: SupportedLocale, path: PlatformPath, title: string, description: string): Metadata {
  const url = `https://gachia.com/${locale}${path}`;
  return {
    title,
    description,
    alternates: buildLocalizedAlternates(locale, language => `/${language}${path}`, LOCALES),
    openGraph: {
      type: 'website', title, description, url, siteName: 'Gachia',
      locale: { zh: 'zh_CN', en: 'en_US', ja: 'ja_JP' }[locale],
      images: [{ url: '/images/og/default.webp', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/images/og/default.webp'], site: '@gachia' },
  };
}
