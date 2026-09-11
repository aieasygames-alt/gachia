import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

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
  return {
    canonical: `${BASE_URL}/${locale}/nte${path}`,
    languages: {
      'zh-Hans': `${BASE_URL}/zh/nte${path}`,
      en: `${BASE_URL}/en/nte${path}`,
      ja: `${BASE_URL}/ja/nte${path}`,
      'x-default': `${BASE_URL}/zh/nte${path}`,
    },
  };
}

export function productionMetadata(title: string, description: string, locale: SupportedLocale, path = ''): Metadata {
  return {
    title: limitVisible(title, 68),
    description: limitVisible(description, 155),
    alternates: alternates(locale, path),
    openGraph: { title: limitVisible(title, 68), description: limitVisible(description, 155), url: `${BASE_URL}/${locale}/nte${path}`, siteName: 'Gachia', type: 'website' },
    twitter: { card: 'summary_large_image', title: limitVisible(title, 68), description: limitVisible(description, 155) },
  };
}

/** @deprecated Use productionMetadata now that NTE is fully live. */
export const previewMetadata = productionMetadata;
