import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { isNteJapanesePathIndexable, isNteLocaleIndexable } from './indexing-policy';

const isPreview = process.env.NTE_DEPLOYMENT_MODE !== 'live';

export function nteMetadata(locale: SupportedLocale, path: string, titles: Record<SupportedLocale, string>, descriptions: Record<SupportedLocale, string>): Metadata {
  const title = titles[locale];
  const description = descriptions[locale];
  const url = `https://gachia.com/${locale}/nte/${path}`;
  const indexable = isNteLocaleIndexable(locale, `/${path}`);
  const japaneseIndexable = isNteJapanesePathIndexable(`/${path}`);
  const languages: Record<string, string> = {
    'zh-Hans': `https://gachia.com/zh/nte/${path}`,
    en: `https://gachia.com/en/nte/${path}`,
    'x-default': `https://gachia.com/zh/nte/${path}`,
  };
  if (japaneseIndexable) languages.ja = `https://gachia.com/ja/nte/${path}`;
  return {
    title,
    description,
    robots: isPreview ? { index: false, follow: false } : indexable ? undefined : { index: false, follow: true },
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: { title, description, url, images: [{ url: 'https://gachia.com/images/og/nte.webp', width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: ['https://gachia.com/images/og/nte.webp'] },
  };
}
