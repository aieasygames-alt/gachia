import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';
import { isNteJapanesePathIndexable, isNteLocaleIndexable } from './data';

export const BASE_URL = 'https://gachia.com';

function limit(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function visibleLength(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').length;
}

function limitVisible(value: string, max: number) {
  if (visibleLength(value) <= max) return value;
  let end = value.length;
  while (end > 0 && visibleLength(`${value.slice(0, end).trimEnd()}...`) > max) end -= 1;
  return `${value.slice(0, end).trimEnd()}...`;
}

export function alternates(locale: SupportedLocale, path: string): Metadata['alternates'] {
  const japaneseIndexable = isNteJapanesePathIndexable(path);
  const languages: Record<string, string> = {
    'zh-Hans': `${BASE_URL}/zh/nte${path}`,
    en: `${BASE_URL}/en/nte${path}`,
    'x-default': `${BASE_URL}/zh/nte${path}`,
  };
  if (japaneseIndexable) languages.ja = `${BASE_URL}/ja/nte${path}`;
  return {
    canonical: `${BASE_URL}/${locale}/nte${path}`,
    languages,
  };
}

export function productionMetadata(title: string, description: string, locale: SupportedLocale, path = ''): Metadata {
  const indexable = isNteLocaleIndexable(locale, path);
  return {
    title: limitVisible(title, 68),
    description: limitVisible(description, 155),
    robots: indexable ? undefined : { index: false, follow: true },
    alternates: alternates(locale, path),
    openGraph: { title: limitVisible(title, 68), description: limitVisible(description, 155), url: `${BASE_URL}/${locale}/nte${path}`, siteName: 'Gachia', type: 'website', images: [{ url: `${BASE_URL}/images/og/nte.webp`, width: 1200, height: 630, alt: limitVisible(title, 68) }] },
    twitter: { card: 'summary_large_image', title: limitVisible(title, 68), description: limitVisible(description, 155), images: [`${BASE_URL}/images/og/nte.webp`] },
  };
}

/** @deprecated Use productionMetadata now that NTE is fully live. */
export const previewMetadata = productionMetadata;
